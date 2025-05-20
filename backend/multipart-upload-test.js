const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/multipart-upload';
const FILE_PATH = path.resolve(__dirname, 'test-video.webm'); // Change to your file path
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk, adjust as needed
const RECORDING_ID = 'test-recording-123'; // your internal ID for the video

async function initiateUpload(filename) {
  const res = await axios.post(`${API_BASE}/initiate-multipart-upload`, {
    filename,
    contentType: 'video/webm',
  });
  return res.data;
}

async function uploadPart(key, uploadId, partNumber, chunk) {
  const res = await axios.put(
    `${API_BASE}/upload-part`,
    chunk,
    {
      params: { key, uploadId, partNumber },
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );
  return res.data;
}

async function completeUpload(key, uploadId, parts, recordingId) {
  const res = await axios.post(`${API_BASE}/complete-multipart-upload`, {
    key,
    uploadId,
    parts,
    recordingId,
  });
  return res.data;
}

async function multipartUpload() {
  const filename = path.basename(FILE_PATH);

  console.log(`Starting multipart upload for ${filename}`);

  // 1. Initiate upload
  const { uploadId, key } = await initiateUpload(filename);
  console.log('Upload initiated:', { uploadId, key });

  const fileSize = fs.statSync(FILE_PATH).size;
  const parts = [];

  const fileStream = fs.createReadStream(FILE_PATH, { highWaterMark: CHUNK_SIZE });

  let partNumber = 1;

  for await (const chunk of fileStream) {
    console.log(`Uploading part ${partNumber}, size: ${chunk.length} bytes`);

    // 2. Upload part
    const { ETag } = await uploadPart(key, uploadId, partNumber, chunk);
    parts.push({ ETag, PartNumber: partNumber });
    partNumber++;
  }

  // 3. Complete upload
  const result = await completeUpload(key, uploadId, parts, RECORDING_ID);
  console.log('Upload complete:', result);
}

multipartUpload().catch(err => {
  console.error('Upload failed:', err.response?.data || err.message);
});
