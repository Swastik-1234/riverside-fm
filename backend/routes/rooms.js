const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  createRoom,
  getRooms,
  joinRoom,
  endRoom
} = require("../controllers/roomController");

router.post("/", auth, createRoom);
router.get("/", auth, getRooms);
router.post("/:id/join", auth, joinRoom);
router.post("/:id/end", auth, endRoom);

module.exports = router;
