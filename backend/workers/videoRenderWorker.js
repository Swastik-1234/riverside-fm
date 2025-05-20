

const { Worker } = require('bullmq');
const { downloadFromS3, uploadToS3 } = require('../utils/s3');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const Recording = require('../models/Recording');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riverside-fm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000
}).then(() => {
  console.log('[RenderWorker] Connected to MongoDB');
}).catch(err => {
  console.error('[RenderWorker] Failed to connect to MongoDB:', err);
});

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const worker = new Worker(
  'videoRenderQueue',
  async job => {
    const { recordingId, streams } = job.data;

    console.log(`[RenderWorker] Received job for recordingId=${recordingId} with ${streams.length} streams`);
    console.log(`[RenderWorker] Streams data:`, JSON.stringify(streams));

    try {
      // Update recording status to processing
      await Recording.findByIdAndUpdate(recordingId, { renderStatus: 'processing' });

      // Download all streams from S3
      const inputFiles = [];
      for (const stream of streams) {
        const streamType = stream.kind || 'unknown';
        const localPath = path.join(TEMP_DIR, `${streamType}_${uuidv4()}.webm`);
        
        console.log(`[RenderWorker] Downloading ${streamType} stream ${stream.s3Key} to ${localPath}`);
        await downloadFromS3(stream.s3Key, localPath);
        
        // Validate downloaded file
        if (!fs.existsSync(localPath)) {
          throw new Error(`Failed to download ${streamType} stream to ${localPath}`);
        }
        
        const stats = fs.statSync(localPath);
        if (stats.size === 0) {
          throw new Error(`Downloaded ${streamType} stream is empty: ${localPath}`);
        }
        
        console.log(`[RenderWorker] Successfully downloaded ${streamType} stream (${stats.size} bytes)`);
        
        // Add to input files array with kind information for clearer logging
        inputFiles.push({
          path: localPath,
          kind: streamType,
          size: stats.size
        });
      }

      console.log(`[RenderWorker] All files downloaded: ${JSON.stringify(inputFiles.map(f => ({ kind: f.kind, size: f.size })))}`);

      // Skip processing if no input files
      if (inputFiles.length === 0) {
        throw new Error('No input files to process');
      }
      
      // Skip grid processing if only one file
      if (inputFiles.length === 1) {
        console.log('[RenderWorker] Only one stream found, skipping grid rendering');
        const outputFilename = `${recordingId}_rendered.mp4`;
        const outputPath = path.join(TEMP_DIR, outputFilename);
        
        // Simple conversion for single file
        await runFfmpegSingleFileConversion(inputFiles[0].path, outputPath);
        
        const s3Key = `rendered/${outputFilename}`;
        const s3Url = await uploadToS3(outputPath, s3Key);
        console.log(`[RenderWorker] Uploaded single stream rendered video to S3 at ${s3Url}`);
        
        await Recording.findByIdAndUpdate(recordingId, {
          renderStatus: 'completed',
          renderedVideoUrl: s3Url,
        });
        
        // Clean up
        fs.unlinkSync(inputFiles[0].path);
        fs.unlinkSync(outputPath);
        return;
      }

      // Extract just the paths for ffmpeg processing
      const inputPaths = inputFiles.map(file => file.path);

      const outputFilename = `${recordingId}_rendered.mp4`;
      const outputPath = path.join(TEMP_DIR, outputFilename);

      console.log(`[RenderWorker] Starting FFmpeg grid render with ${inputPaths.length} streams to ${outputPath}`);
      await runFfmpegGridRender(inputPaths, outputPath);
      console.log(`[RenderWorker] FFmpeg render completed`);

      // Verify output file exists and is not empty
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Output file was not created: ${outputPath}`);
      }
      
      const outputStats = fs.statSync(outputPath);
      if (outputStats.size === 0) {
        throw new Error(`Output file is empty: ${outputPath}`);
      }
      
      console.log(`[RenderWorker] Rendered output file size: ${outputStats.size} bytes`);

      const s3Key = `rendered/${outputFilename}`;
      const s3Url = await uploadToS3(outputPath, s3Key);
      console.log(`[RenderWorker] Uploaded rendered video to S3 at ${s3Url}`);

      await Recording.findByIdAndUpdate(recordingId, {
        renderStatus: 'completed',
        renderedVideoUrl: s3Url,
      });

      // Clean up temp files
      for (const file of inputFiles) {
        fs.unlinkSync(file.path);
      }
      fs.unlinkSync(outputPath);
      console.log(`[RenderWorker] Cleaned up temp files for recordingId=${recordingId}`);

    } catch (err) {
      console.error(`[RenderWorker] Failed for recordingId=${recordingId}:`, err);
      await Recording.findByIdAndUpdate(recordingId, {
        renderStatus: 'failed',
        renderError: err.message
      });
      
      // Try to clean up any files that might remain
      try {
        const tempFiles = fs.readdirSync(TEMP_DIR);
        for (const file of tempFiles) {
          if (file.includes(recordingId)) {
            fs.unlinkSync(path.join(TEMP_DIR, file));
          }
        }
      } catch (cleanupErr) {
        console.error('[RenderWorker] Error during cleanup:', cleanupErr);
      }
    }
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

// Simple conversion for single file
function runFfmpegSingleFileConversion(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-crf', '23',
      '-preset', 'fast',
      outputPath
    ];

    console.log('[RenderWorker] Single file FFmpeg args:', args.join(' '));

    const ffmpeg = spawn(ffmpegPath, args);
    let ffmpegLogs = '';

    ffmpeg.stderr.on('data', data => {
      const log = data.toString();
      ffmpegLogs += log;
      console.log(`[ffmpeg] ${log}`);
    });
    
    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        console.error(`[RenderWorker] FFmpeg failed with exit code ${code}`);
        console.error(`[RenderWorker] FFmpeg logs: ${ffmpegLogs}`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', err => {
      console.error('[RenderWorker] FFmpeg process error:', err);
      reject(err);
    });
  });
}

function runFfmpegGridRender(inputPaths, outputPath) {
  return new Promise((resolve, reject) => {
    // First, probe each input file to verify it's valid and get info
    const probePromises = inputPaths.map(inputPath => probeFfmpeg(inputPath));
    
    Promise.all(probePromises)
      .then(probeResults => {
        console.log('[RenderWorker] All input files successfully probed:', 
          probeResults.map((r, i) => `${inputPaths[i]}: ${r.hasVideo ? 'has video' : 'no video'}, ${r.hasAudio ? 'has audio' : 'no audio'}`));
        
        // Improved filter complex for grid layout
        const filterComplex = buildFilterComplex(inputPaths, probeResults);
        
        // Build FFmpeg arguments based on probe results
        const args = buildFfmpegArgs(inputPaths, filterComplex, outputPath, probeResults);
        
        console.log('[RenderWorker] FFmpeg args:', args.join(' '));

        const ffmpeg = spawn(ffmpegPath, args);
        let ffmpegLogs = '';

        ffmpeg.stderr.on('data', data => {
          const log = data.toString();
          ffmpegLogs += log;
          console.log(`[ffmpeg] ${log}`);
        });
        
        ffmpeg.on('close', code => {
          if (code === 0) {
            resolve();
          } else {
            console.error(`[RenderWorker] FFmpeg failed with exit code ${code}`);
            console.error(`[RenderWorker] FFmpeg logs: ${ffmpegLogs}`);
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
        
        ffmpeg.on('error', err => {
          console.error('[RenderWorker] FFmpeg process error:', err);
          reject(err);
        });
      })
      .catch(err => {
        console.error('[RenderWorker] Error probing input files:', err);
        reject(err);
      });
  });
}

// Probe a file with ffmpeg to verify it has valid streams
function probeFfmpeg(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-hide_banner'
    ];
    
    const ffprobe = spawn(ffmpegPath, args);
    let output = '';
    
    ffprobe.stderr.on('data', data => {
      output += data.toString();
    });
    
    ffprobe.on('close', code => {
      // We expect an error code since we're just probing
      const hasVideo = output.includes('Video:');
      const hasAudio = output.includes('Audio:');
      
      console.log(`[RenderWorker] Probe result for ${filePath}: video=${hasVideo}, audio=${hasAudio}`);
      
      if (!hasVideo && !hasAudio) {
        reject(new Error(`No valid streams found in ${filePath}`));
      } else {
        resolve({ hasVideo, hasAudio });
      }
    });
    
    ffprobe.on('error', err => {
      reject(err);
    });
  });
}

// Build the filter complex based on probed information
function buildFilterComplex(inputPaths, probeResults) {
  const videoStreams = probeResults.filter(r => r.hasVideo);
  
  // If no video streams, there's nothing to stack
  if (videoStreams.length === 0) {
    return '';
  }
  
  // If only one video stream, just scale it
  if (videoStreams.length === 1) {
    const index = probeResults.findIndex(r => r.hasVideo);
    return `[${index}:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[outv]`;
  }
  
  // Build scale filters for each video stream
  const scaleFilters = [];
  const videoInputs = [];
  
  probeResults.forEach((result, i) => {
    if (result.hasVideo) {
      scaleFilters.push(`[${i}:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
      videoInputs.push(`[v${i}]`);
    }
  });
  
  // Build audio mix filter if multiple audio streams
  const audioStreams = probeResults.filter(r => r.hasAudio);
  let audioMixing = '';
  
  if (audioStreams.length > 1) {
    const audioInputs = [];
    
    probeResults.forEach((result, i) => {
      if (result.hasAudio) {
        audioInputs.push(`[${i}:a]`);
      }
    });
    
    if (audioInputs.length > 1) {
      audioMixing = `;${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest[outa]`;
    }
  }
  
  // Build the xstack layout
  const videoCount = videoInputs.length;
  const layout = generateGridLayout(videoCount);
  
  return `${scaleFilters.join('; ')}; ${videoInputs.join('')}xstack=inputs=${videoCount}:layout=${layout}[outv]${audioMixing}`;
}

// Build FFmpeg args based on the filter complex and probe results
function buildFfmpegArgs(inputPaths, filterComplex, outputPath, probeResults) {
  // Input arguments
  const inputArgs = [];
  inputPaths.forEach(path => {
    inputArgs.push('-i', path);
  });
  
  // Check if we have any video streams
  const hasVideo = probeResults.some(r => r.hasVideo);
  
  // Check if we have any audio streams
  const hasAudio = probeResults.some(r => r.hasAudio);
  
  // Build output mapping arguments
  const outputArgs = [];
  
  if (hasVideo) {
    outputArgs.push('-map', '[outv]');
  }
  
  if (hasAudio) {
    const audioStreams = probeResults.filter(r => r.hasAudio);
    if (audioStreams.length > 1 && filterComplex.includes('[outa]')) {
      outputArgs.push('-map', '[outa]');
    } else {
      // Use the first available audio stream
      const firstAudioIndex = probeResults.findIndex(r => r.hasAudio);
      outputArgs.push('-map', `${firstAudioIndex}:a`);
    }
  }
  
  return [
    ...inputArgs,
    ...(filterComplex ? ['-filter_complex', filterComplex] : []),
    ...outputArgs,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-crf', '23',
    '-preset', 'fast',
    outputPath
  ];
}

function generateGridLayout(n) {
  // Enhanced grid layouts that work better for 2-person calls
  const layouts = {
    1: '0_0',                               // Single video
    2: '0_0|w0_0',                          // Side by side - better format for 2 people
    3: '0_0|w0_0|0_h0',                     // Two on top, one on bottom
    4: '0_0|w0_0|0_h0|w0_h0',               // 2x2 grid
    5: '0_0|w0_0|0_h0|w0_h0|0_h0+h0',       // 2x2 grid + 1 on bottom
    6: '0_0|w0_0|0_h0|w0_h0|0_h0+h0|w0_h0+h0', // 2x3 grid
    9: '0_0|w0_0|w0+w0_0|0_h0|w0_h0|w0+w0_h0|0_h0+h0|w0_h0+h0|w0+w0_h0+h0' // 3x3 grid
  };

  // Default to the 2x2 grid if the exact layout isn't defined
  return layouts[n] || layouts[4];
}

module.exports = worker;

