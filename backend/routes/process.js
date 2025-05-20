const express = require('express');
const router = express.Router();
const { videoQueue } = require('../queues/videoQueue');

router.post('/process-video', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  try {
    const job = await videoQueue.add('process', { filename });
    res.json({ message: 'Job enqueued successfully', jobId: job.id });
  } catch (err) {
    console.error('Error adding job to queue:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

module.exports = router;
