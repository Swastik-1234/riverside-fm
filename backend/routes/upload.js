const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand ,GetObjectCommand,HeadObjectCommand} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const stream = require('stream');

require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// GET /generate-presigned-url?filename=abc.mp4&type=video/mp4
router.get('/generate-presigned-url', async (req, res) => {
  const { filename, type } = req.query;

  if (!filename || !type) {
    return res.status(400).json({ error: 'Missing filename or type' });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `raw/${filename}`,
    ContentType: type,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // valid for 5 minutes
    return res.json({ url });
  } catch (err) {
    console.error('Error generating pre-signed URL:', err);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});



router.get('/stream-video/:filename', async (req, res) => {
  const { filename } = req.params;

  const range = req.headers.range;
  if (!range) {
    return res.status(400).send("Requires Range header");
  }

  try {
    // Get the total file size first
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `raw/${filename}`,
    });

    const headData = await s3.send(headCommand);
    const fileSize = headData.ContentLength;

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

    const contentLength = end - start + 1;

    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `raw/${filename}`,
      Range: `bytes=${start}-${end}`,
    });

    const s3Response = await s3.send(getObjectCommand);

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": headData.ContentType || "video/webm",
    });

    s3Response.Body.pipe(res);
  } catch (err) {
    console.error('Error streaming video:', err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

module.exports = router;

