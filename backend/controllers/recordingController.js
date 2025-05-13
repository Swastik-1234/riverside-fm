const Recording = require("../models/Recording");

// Create a new recording
exports.createRecording = async (req, res) => {
  try {
    const { title, description, userId, fileUrl } = req.body;

    // Create a new recording
    const newRecording = new Recording({
      title,
      description,
      userId,
      fileUrl, // The URL of the recording file (could be a URL to an S3 bucket)
    });

    await newRecording.save();

    res.status(201).json({
      message: "Recording created successfully!",
      recording: newRecording,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all recordings
exports.getAllRecordings = async (req, res) => {
  try {
    const recordings = await Recording.find()
      .populate("userId", "name email") // Populate the user details
      .sort({ dateCreated: -1 }); // Sort by dateCreated in descending order

    res.status(200).json(recordings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Get a specific recording by ID
exports.getRecordingById = async (req, res) => {
  const { id } = req.params;
  try {
    const recording = await Recording.findById(id).populate("userId");

    if (!recording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    res.status(200).json(recording);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
