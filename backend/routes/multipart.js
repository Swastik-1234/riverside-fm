// routes/multipart.js
const Recording=require('../models/Recording')
const express = require('express');
const {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} = require('@aws-sdk/client-s3');
const { videoQueue } = require('../queues/videoQueue');

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// 1. Initiate multipart upload
router.post('/initiate-multipart-upload', async (req, res) => {
  const { filename, contentType } = req.body;

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `raw/${filename}`,
    ContentType: contentType || 'video/webm',
  });

  try {
    const response = await s3.send(command);
    res.json({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (err) {
    console.error('❌ Failed to initiate multipart upload:', err);
    res.status(500).json({ error: 'Failed to initiate upload' });
  }
});

// 2. Upload a part (streamed from client)
router.put('/upload-part', async (req, res) => {
  const { key, uploadId, partNumber } = req.query;

  if (!key || !uploadId || !partNumber) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const contentLength = req.headers['content-length'];
  try {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
      Body: req, // request stream
      ContentLength: Number(contentLength),
    });

    const response = await s3.send(command);

    res.json({
      ETag: response.ETag,
      PartNumber: Number(partNumber),
    });
  } catch (err) {
    console.error('❌ Failed to upload part:', err);
    res.status(500).json({ error: 'Upload part failed' });
  }
});

// 3. Complete multipart upload
// router.post('/complete-multipart-upload', async (req, res) => {
//   const { key, uploadId, parts, recordingId } = req.body;

//   if (!key || !uploadId || !parts || !recordingId) {
//     return res.status(400).json({ error: 'Missing required fields' });
//   }

//   try {
//     const command = new CompleteMultipartUploadCommand({
//       Bucket: process.env.AWS_S3_BUCKET,
//       Key: key,
//       UploadId: uploadId,
//       MultipartUpload: {
//         Parts: parts.map(p => ({
//           ETag: p.ETag,
//           PartNumber: p.PartNumber,
//         })),
//       },
//     });

//     const response = await s3.send(command);

//     // Enqueue FFmpeg processing job
//     await videoQueue.add('process-video', {
//       recordingId,
//       s3Key: key,
//     });

//     res.json({
//       message: 'Upload complete and processing started',
//       location: response.Location,
//     });
//   } catch (err) {
//     console.error('❌ Failed to complete upload:', err);
//     res.status(500).json({ error: 'Complete upload failed' });
//   }
// });
router.post('/complete-multipart-upload', async (req, res) => {
  const { key, uploadId, parts } = req.body;

  if (!key || !uploadId || !parts) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map(p => ({
          ETag: p.ETag,
          PartNumber: p.PartNumber,
        })),
      },
    });

    const response = await s3.send(command);
    
    // Generate a temporary unique ID for this recording
    // You'll create the actual DB record later when rendering
    const tempRecordingId = new Date().getTime().toString() + '_' + 
                          Math.random().toString(36).substring(2, 15);
    
    // Store this info in a session or temporary storage
    // For simplicity, we'll just return it to the client
    
    res.json({
      message: 'Upload complete',
      location: response.Location,
      recordingId: tempRecordingId,
      s3Key: key,
      bucket: process.env.AWS_S3_BUCKET
    });
  } catch (err) {
    console.error('❌ Failed to complete upload:', err);
    res.status(500).json({ error: 'Complete upload failed' });
  }
});
// 4. Abort multipart upload (optional)
router.post('/abort-multipart-upload', async (req, res) => {
  const { key, uploadId } = req.body;

  if (!key || !uploadId) {
    return res.status(400).json({ error: 'Missing key or uploadId' });
  }

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    });

    await s3.send(command);
    res.json({ message: 'Upload aborted' });
  } catch (err) {
    console.error('❌ Failed to abort upload:', err);
    res.status(500).json({ error: 'Abort upload failed' });
  }
});

module.exports = router;
