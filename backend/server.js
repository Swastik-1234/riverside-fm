// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const connectDB = require("./config/db");
// const http = require("http");
// const socketIO = require("socket.io");

// dotenv.config();
// connectDB();

// const app = express();
// const server = http.createServer(app);
// const io = socketIO(server, {
//   cors: {
//     origin: "*", // Allow all origins for now
//     methods: ["GET", "POST"],
//   },
// });

// app.use(cors());
// app.use(express.json());

// // Routes
// app.use("/api/auth", require("./routes/auth"));
// app.use("/api/recordings", require("./routes/recordings"));
// app.use("/api/rooms", require("./routes/rooms"));


// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   socket.on("join-room", ({ roomId }) => {
//     socket.join(roomId);

//     // Notify existing users in the room about the new user
//     socket.to(roomId).emit("user-joined", { socketId: socket.id });
//   });

//   // Handle signaling between two users
//   socket.on("signal", ({ to, signalData }) => {
//     io.to(to).emit("signal", {
//       from: socket.id,
//       signalData,
//     });
//   });

 

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const socketIO = require("socket.io");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const uploadRoutes = require('./routes/upload');

// Allow CORS for all routes or specify certain routes
app.use(cors({
  origin: "*", // Allows all origins. Replace with your frontend URL for more security (e.g., 'http://localhost:5173')
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"], // Allow headers for content type
}));

// Set up routes for uploading files
app.use('/api/upload', uploadRoutes);

// Set up Socket.IO with CORS settings
const io = socketIO(server, {
  cors: {
    origin: "*",  // Allows all origins. Replace with your frontend URL for more security (e.g., 'http://localhost:5173')
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/recordings", require("./routes/recordings"));
app.use("/api/rooms", require("./routes/rooms"));

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
