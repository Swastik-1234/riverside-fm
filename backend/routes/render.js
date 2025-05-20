const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const mongoose = require('mongoose');
const { videoRenderQueue } = require('../queues/videoQueue');

// POST /api/render-video
router.post('/render-video', async (req, res) => {
  let { 
    localRecordingId, 
    localS3Key,
    remoteRecordingId,
    remoteS3Key,
    bucket,
    renderType  // Added renderType parameter
  } = req.body;

  console.log('Render video request received with data:', req.body);

  // Validate required parameters
  if (!localS3Key) {
    return res.status(400).json({ error: 'Local S3 key is required' });
  }

  // Default render type to grid if not specified
  renderType = renderType || 'grid';
  console.log(`Using render type: ${renderType}`);

  try {
    // Create a new recording document or find existing one
    const userId = new mongoose.Types.ObjectId('64f5c40e95d73d8c9ab0b123'); // Replace with appropriate default or user ID
    
    let recording = null;
    
    // First attempt to find an existing recording if ID is provided
    if (localRecordingId && mongoose.Types.ObjectId.isValid(localRecordingId)) {
      recording = await Recording.findById(localRecordingId);
      console.log('Searched for recording by MongoDB ID:', localRecordingId, recording ? 'Found' : 'Not found');
    }
    
    // If no recording exists, create one
    if (!recording) {
      console.log('Creating new recording with local and remote streams');
      
      // Prepare streams array - always include local stream
      const streams = [
        { kind: 'local', s3Key: localS3Key }
      ];
      
      // Add remote stream if available
      if (remoteS3Key) {
        streams.push({ kind: 'remote', s3Key: remoteS3Key });
        console.log('Added remote stream to recording:', remoteS3Key);
      } else {
        console.log('No remote stream provided');
      }
      
      // Create new recording document
      recording = new Recording({
        title: 'WebRTC Call Recording',
        description: 'Recorded video call with multiple streams',
        userId: userId,
        fileUrl: `https://${bucket || process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${localS3Key}`,
        streams: streams,
        renderStatus: 'queued',
        renderType: renderType  // Save the render type to the database
      });
      
      await recording.save();
      console.log('Created new recording with MongoDB ID:', recording._id.toString());
    } else {
      // Update existing recording with new streams
      console.log('Updating existing recording with new streams');
      
      // Initialize streams array if it doesn't exist
      if (!recording.streams) recording.streams = [];
      
      // Check if local stream already exists, if not add it
      const localStreamExists = recording.streams.some(s => s.s3Key === localS3Key);
      if (!localStreamExists) {
        recording.streams.push({ kind: 'local', s3Key: localS3Key });
        console.log('Added local stream to existing recording:', localS3Key);
      } else {
        console.log('Local stream already exists in recording');
      }
      
      // Add remote stream if available and not already in the streams array
      if (remoteS3Key) {
        const remoteStreamExists = recording.streams.some(s => s.s3Key === remoteS3Key);
        if (!remoteStreamExists) {
          recording.streams.push({ kind: 'remote', s3Key: remoteS3Key });
          console.log('Added remote stream to existing recording:', remoteS3Key);
        } else {
          console.log('Remote stream already exists in recording');
        }
      }
      
      // Update render information
      recording.renderStatus = 'queued';
      recording.renderType = renderType;  // Update render type
      await recording.save();
    }

    console.log('Streams to be processed:', JSON.stringify(recording.streams));
    
    // Verify we have at least one stream
    if (!recording.streams || recording.streams.length === 0) {
      return res.status(400).json({ error: 'No valid streams to process' });
    }

    // Add the video render job to the queue with render type
    await videoRenderQueue.add('render-video', {
      recordingId: recording._id.toString(),
      streams: recording.streams,
      renderType: renderType  // Pass render type to the worker
    });

    recording.renderStatus = 'processing';
    await recording.save();

    return res.status(202).json({ 
      message: 'Render job enqueued', 
      recordingId: recording._id.toString(),
      streamCount: recording.streams.length,
      renderType: renderType
    });
  } catch (err) {
    console.error('[Render Route]', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/render-video/:id/status
router.get('/render-video/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Only try to find by MongoDB ID if it looks like one
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid MongoDB ObjectId in status request:', id);
      return res.status(400).json({ error: 'Invalid recording ID format' });
    }
    
    const recording = await Recording.findById(id);
    if (!recording) {
      console.error('Recording not found in status request:', id);
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Add stream count to the response
    const streamCount = recording.streams ? recording.streams.length : 0;

    res.json({
      renderStatus: recording.renderStatus,
      renderedVideoUrl: recording.renderedVideoUrl || null,
      streamCount: streamCount,
      renderType: recording.renderType || 'grid',  // Include render type in the response
      error: recording.renderError || null
    });
  } catch (err) {
    console.error('[Render Status Route]', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;