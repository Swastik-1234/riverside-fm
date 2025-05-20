require('dotenv').config();
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../utils/s3');

const tempDir = path.join(__dirname, '..', 'temp');
const processedDir = path.join(__dirname, '..', 'processed');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Ensure directories exist
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

const connection = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
});

const worker = new Worker('video-processing', async job => {
    const { filename } = job.data;
    const s3Key = `raw/${filename}`;
    const localInputPath = path.join(tempDir, filename);
    const processedFilename = `processed-${filename}`;
    const outputPath = path.join(processedDir, processedFilename);

    // 1. Download from S3
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
    });

    const s3Response = await s3Client.send(command);
    const writeStream = fs.createWriteStream(localInputPath);
    await new Promise((resolve, reject) => {
        s3Response.Body.pipe(writeStream).on('finish', resolve).on('error', reject);
    });

    // 2. Process with FFmpeg (compression)
    await new Promise((resolve, reject) => {
        ffmpeg(localInputPath)
            .outputOptions([
                '-preset veryfast',
                '-map 0:v:0',
                '-map 0:a:0',
                '-c:v libx264',
                '-c:a aac',
                '-b:v 1000k', // video compression: 1000kbps
                '-b:a 192k',
                '-f mp4',
                '-max_muxing_queue_size 1024'
            ])
            .on('start', (commandLine) => {
                console.log('FFmpeg command: ' + commandLine);
            })
            .on('end', () => {
                console.log('✅ FFmpeg processing completed successfully.');
                resolve();
            })
            .on('error', (err, stdout, stderr) => {
                console.error('❌ FFmpeg error: ' + stderr);
                reject(new Error(`FFmpeg processing failed: ${stderr}`));
            })
            .save(outputPath);
    });

    // 3. Generate Thumbnail
    const thumbnailFilename = `thumbnail-${filename}.jpg`;
    const thumbnailPath = path.join(processedDir, thumbnailFilename);

    await new Promise((resolve, reject) => {
        ffmpeg(localInputPath)
            .screenshots({
                timestamps: ['2'],
                filename: thumbnailFilename,
                folder: processedDir,
                size: '320x240'
            })
            .on('end', () => {
                console.log(`✅ Thumbnail generated: ${thumbnailFilename}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`❌ Error generating thumbnail: ${err.message}`);
                reject(err);
            });
    });

    // 4. Upload processed video
    const processedFileStream = fs.createReadStream(outputPath);
    const uploadProcessed = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `processed/${processedFilename}`,
        Body: processedFileStream,
        ContentType: 'video/mp4',
    });
    await s3Client.send(uploadProcessed);
    console.log(`✅ Uploaded processed file to S3: processed/${processedFilename}`);

    // 5. Upload thumbnail
    // 5. Upload thumbnail
if (!fs.existsSync(thumbnailPath)) {
    throw new Error(`❌ Thumbnail file not found at ${thumbnailPath}`);
}

console.log(`📦 Preparing to upload thumbnail: ${thumbnailFilename}`);
const thumbnailFileStream = fs.createReadStream(thumbnailPath);
const uploadThumb = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `thumbnails/${thumbnailFilename}`,
    Body: thumbnailFileStream,
    ContentType: 'image/jpeg',
    
});
await s3Client.send(uploadThumb);
console.log(`✅ Uploaded thumbnail to S3: thumbnails/${thumbnailFilename}`);

    // 6. Cleanup
    fs.unlinkSync(localInputPath);
    fs.unlinkSync(outputPath);
    fs.unlinkSync(thumbnailPath);
}, {
    connection,
    lockDuration: 300000,
});

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err);
});
