// const { Queue } = require('bullmq');

// // Create a queue for video rendering jobs
// const videoRenderQueue = new Queue('videoRenderQueue', {
//   connection: {
//     host: 'localhost',
//     port: 6379,
//   },
// });

// module.exports = { videoRenderQueue };

const { Queue } = require('bullmq');

// Queue for video rendering
const videoRenderQueue = new Queue('videoRenderQueue', {
  connection: {
    host: 'localhost',
    port: 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5 seconds initial delay
    },
    removeOnComplete: 100, // Keep the last 100 completed jobs
    removeOnFail: 200 // Keep the last 200 failed jobs
  }
});

// Queue for processing individual videos if needed
const videoQueue = new Queue('videoQueue', {
  connection: {
    host: 'localhost',
    port: 6379
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 3000
    },
    removeOnComplete: 50,
    removeOnFail: 100
  }
});

module.exports = {
  videoRenderQueue,
  videoQueue
};