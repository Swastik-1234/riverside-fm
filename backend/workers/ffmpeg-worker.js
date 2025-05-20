require('dotenv').config();

const { Worker } = require('bullmq');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3 = new S3Client({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET;

// Download file from S3 to local temp file
async function downloadFromS3(key) {
  const tempFilePath = path.join(os.tmpdir(), crypto.randomUUID() + path.extname(key));
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const data = await s3.send(command);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempFilePath);
    data.Body.pipe(writeStream);
    data.Body.on('error', reject);
    writeStream.on('finish', () => resolve(tempFilePath));
    writeStream.on('error', reject);
  });
}

// Upload local file to S3
async function uploadToS3(localFilePath, s3Key, contentType) {
  const fileStream = fs.createReadStream(localFilePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream,
    ContentType: contentType,
    ACL: 'public-read', // Adjust based on your bucket policy
  });

  await s3.send(command);
}

// Main FFmpeg processing logic
async function processVideo(job) {
  try {
    console.log('Starting job', job.id);

    const { rawKey, outputKey, thumbnailKey } = job.data;

    // 1. Download raw video from S3
    const rawFilePath = await downloadFromS3(rawKey);
    console.log('Downloaded raw video to', rawFilePath);

    // Temp paths for output video and thumbnail
    const outputFilePath = path.join(os.tmpdir(), crypto.randomUUID() + '.mp4');
    const thumbnailFilePath = path.join(os.tmpdir(), crypto.randomUUID() + '.png');

    // 2. Process video with FFmpeg: compress & generate thumbnail
    await new Promise((resolve, reject) => {
      ffmpeg(rawFilePath)
        .output(outputFilePath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1280x720')
        .on('end', () => {
          console.log('Video processed:', outputFilePath);
          // Generate thumbnail from processed video
          ffmpeg(outputFilePath)
            .screenshots({
              count: 1,
              folder: path.dirname(thumbnailFilePath),
              filename: path.basename(thumbnailFilePath),
              size: '320x240',
            })
            .on('end', () => {
              console.log('Thumbnail generated:', thumbnailFilePath);
              resolve();
            })
            .on('error', reject);
        })
        .on('error', reject)
        .run();
    });

    // 3. Upload processed video and thumbnail to S3
    await uploadToS3(outputFilePath, outputKey, 'video/mp4');
    await uploadToS3(thumbnailFilePath, thumbnailKey, 'image/png');

    console.log('Uploaded processed files to S3');

    // 4. Clean up temp files
    fs.unlinkSync(rawFilePath);
    fs.unlinkSync(outputFilePath);
    fs.unlinkSync(thumbnailFilePath);

    console.log('Job completed:', job.id);
  } catch (error) {
    console.error('Error processing job', job.id, error);
    throw error;
  }
}

// Create BullMQ worker listening to 'ffmpegQueue'
const worker = new Worker('ffmpegQueue', async job => {
  await processVideo(job);
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
  },
});

worker.on('completed', job => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
