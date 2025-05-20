

const mongoose = require('mongoose');

const RecordingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  fileUrl: {
    type: String
  },
  // Support multiple streams for combined recording
  streams: [{
    kind: {
      type: String,
      enum: ['local', 'remote'],
      required: true
    },
    s3Key: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  renderStatus: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  renderError: {
    type: String
  },
  renderedVideoUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
RecordingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Recording', RecordingSchema);