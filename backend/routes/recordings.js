// const express = require("express");
// const router = express.Router();
// const { createRecording, getAllRecordings, getRecordingById } = require("../controllers/recordingController");

// // Route to create a new recording
// router.post("/", createRecording);

// // Route to get all recordings
// router.get("/", getAllRecordings);

// // Route to get a specific recording by ID
// router.get("/:id", getRecordingById);

// module.exports = router;

const express = require("express");
const router = express.Router();
const recordingController = require("../controllers/recordingController");

router.post("/", recordingController.createRecording);
router.get("/", recordingController.getAllRecordings);
router.get("/by-room/:roomId", recordingController.getRecordingsByRoomId); // ✅ NEW
router.get("/:id", recordingController.getRecordingById);

module.exports = router;

