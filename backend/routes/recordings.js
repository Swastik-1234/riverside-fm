const express = require("express");
const router = express.Router();
const { createRecording, getAllRecordings, getRecordingById } = require("../controllers/recordingController");

// Route to create a new recording
router.post("/", createRecording);

// Route to get all recordings
router.get("/", getAllRecordings);

// Route to get a specific recording by ID
router.get("/:id", getRecordingById);

module.exports = router;
