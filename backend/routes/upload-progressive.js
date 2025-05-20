// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const router = express.Router();

// const tempDir = path.join(__dirname, '..', 'temp');
// if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// router.post('/api/progressive-upload', async (req, res) => {
//   const { filename, isFinal } = req.query;
//   const filePath = path.join(tempDir, filename);

//   const writeStream = fs.createWriteStream(filePath, { flags: 'a' }); // append mode
//   req.pipe(writeStream);

//   req.on('end', () => {
//     console.log(`🧩 Received chunk for ${filename}`);
    
//     if (isFinal === 'true') {
//       console.log(`✅ Final chunk received for ${filename}`);
//       // Trigger processing job
//       // enqueue FFmpeg processing job here
//     }

//     res.status(200).json({ message: 'Chunk received' });
//   });

//   req.on('error', err => {
//     console.error('❌ Error receiving chunk:', err);
//     res.status(500).send('Error receiving chunk');
//   });
// });

// module.exports = router;



const express = require('express');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../utils/s3');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const router = express.Router();

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Redis connection for BullMQ
const redisConnection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create BullMQ queue
const videoQueue = new Queue('video-processing', {
  connection: redisConnection,
});

router.post('/api/progressive-upload', async (req, res) => {
  const { filename, isFinal } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const filePath = path.join(tempDir, filename);
  const writeStream = fs.createWriteStream(filePath, { flags: 'a' }); // append mode

  req.pipe(writeStream);

  req.on('end', async () => {
    console.log(`🧩 Received chunk for ${filename}`);

    if (isFinal === 'true') {
      console.log(`✅ Final chunk received for ${filename}`);

      try {
        // Upload final assembled file to S3
        const fileStream = fs.createReadStream(filePath);
        const uploadCmd = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `raw/${filename}`,
          Body: fileStream,
          ContentType: 'video/webm', // adjust if needed
        });

        await s3Client.send(uploadCmd);
        console.log(`📤 Uploaded raw video to S3: raw/${filename}`);

        // Enqueue video processing job
        await videoQueue.add('process-video', { filename });
        console.log(`📦 Enqueued processing job for ${filename}`);
      } catch (err) {
        console.error('❌ Failed during final chunk handling:', err);
        return res.status(500).json({ error: 'Failed to upload or enqueue job' });
      }
    }

    res.status(200).json({ message: 'Chunk received' });
  });

  req.on('error', (err) => {
    console.error('❌ Error receiving chunk:', err);
    res.status(500).send('Error receiving chunk');
  });
});

module.exports = router;
