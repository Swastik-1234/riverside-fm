

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const socketIO = require("socket.io");
const renderRoutes = require('./routes/render');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(cors({
  origin: "*", // Allows all origins. Replace with your frontend URL for more security (e.g., 'http://localhost:5173')
  methods: ["GET", "POST","PUT"],
  allowedHeaders: ["Content-Type"], // Allow headers for content type
}));
const uploadRoutes = require('./routes/upload');
const multipartRoutes = require('./routes/multipart');
app.use('/api/multipart-upload', multipartRoutes);
app.use('/api', renderRoutes);
// Allow CORS for all routes or specify certain routes


// Set up routes for uploading files
app.use('/api/upload', multipartRoutes);

// Set up Socket.IO with CORS settings
const io = socketIO(server, {
  cors: {
    origin: "*",  // Allows all origins. Replace with your frontend URL for more security (e.g., 'http://localhost:5173')
    methods: ["GET", "POST"],
  },
});



// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/recordings", require("./routes/recordings"));
app.use("/api/rooms", require("./routes/rooms"));
app.use('/api', require('./routes/process'));
const progressiveUpload = require('./routes/upload-progressive');
app.use(progressiveUpload);


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);


  // Join room
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Notify the room that a new user joined
    socket.to(roomId).emit("user-joined", { socketId: socket.id });
  });

  // Handle signaling between two users
  socket.on("offer", ({ offer, roomId }) => {
    console.log(`Offer received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, roomId }) => {
    console.log(`Answer received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("answer", { answer, from: socket.id });
  });

  socket.on("candidate", ({ candidate, roomId }) => {
    console.log(`Candidate received from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("candidate", { candidate, from: socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
