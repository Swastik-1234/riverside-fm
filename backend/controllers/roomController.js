const Room = require("../models/Room");

exports.createRoom = async (req, res) => {
  try {
    const { title } = req.body;
    const hostId = req.user.id;

    const newRoom = new Room({ host: hostId, title });
    await newRoom.save();

    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate("host", "email");
    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.participants.includes(req.user.id)) {
      room.participants.push(req.user.id);
      await room.save();
    }

    res.status(200).json(room);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.endRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to end this room" });
    }

    room.isLive = false;
    room.endedAt = new Date();
    await room.save();

    res.status(200).json({ message: "Room ended" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
