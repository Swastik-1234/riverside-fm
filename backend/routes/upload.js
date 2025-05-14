const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

module.exports = router;
