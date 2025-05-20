// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import ProgressiveRecorder from "../components/ProgressiveRecorder";

// function Home() {
//   const [showRecorder, setShowRecorder] = useState(false);
//   const navigate = useNavigate();

//   return (
//     <div className="flex flex-col items-center mt-10 space-y-4">
//       <h1 className="text-3xl font-bold mb-6">Welcome to the Studio</h1>

//       <button
//         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
//         onClick={() => navigate("/room/123")} // replace with dynamic room
//       >
//         Create Room
//       </button>

//       <button
//         className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
//         onClick={() => navigate("/room/123")} // replace with join logic
//       >
//         Join Room
//       </button>

//       <button
//         className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
//         onClick={() => setShowRecorder(true)}
//       >
//         Start Recording
//       </button>

//       {showRecorder && (
//         <div className="mt-8 w-full max-w-3xl border border-gray-300 rounded p-4">
//           <ProgressiveRecorder />
//         </div>
//       )}
//     </div>
//   );
// }

// export default Home;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgressiveRecorder from "../components/ProgressiveRecorder"; // Corrected import path

const Home: React.FC = () => {
  const [roomName, setRoomName] = useState("");
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [showRecorder, setShowRecorder] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  // Handle creating a room
  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      alert("Please enter a valid room name.");
      return;
    }
    console.log("Creating room:", roomName);
    
    // Simulating room creation with a generated room ID
    const roomId = Math.floor(Math.random() * 10000);  // You can replace this with your backend logic to create a room
    
    // Navigate to the newly created room's page
    navigate(`/room/${roomId}`);
  };

  // Handle joining an existing room
  const handleJoinRoom = () => {
    if (!roomIdToJoin.trim()) {
      alert("Please enter a valid room ID.");
      return;
    }
    console.log("Joining room with ID:", roomIdToJoin);

    // Navigate to the room's page
    navigate(`/room/${roomIdToJoin}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-purple-700">🎙️ Riverside Clone</h1>

      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-xl space-y-6">
        {/* Create Room */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            placeholder="Enter room name"
          />
          <button
            onClick={handleCreateRoom}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Create Room
          </button>
        </div>

        {/* Join Room */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Room ID</label>
          <input
            type="text"
            value={roomIdToJoin}
            onChange={(e) => setRoomIdToJoin(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            placeholder="Enter room ID"
          />
          <button
            onClick={handleJoinRoom}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Join Room
          </button>
        </div>

        {/* Start Recording */}
        <div className="text-center">
          <button
            onClick={() => setShowRecorder(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
          >
            Start Recording
          </button>
        </div>
      </div>

      {/* Recorder */}
      {showRecorder && (
        <div className="mt-10 w-full max-w-4xl">
          <ProgressiveRecorder />
        </div>
      )}
    </div>
  );
};

export default Home;


// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import ProgressiveRecorder from "../components/ProgressiveRecorder"; // Corrected import path

// const Home: React.FC = () => {
//   const [roomName, setRoomName] = useState("");
//   const [roomIdToJoin, setRoomIdToJoin] = useState("");
//   const [showRecorder, setShowRecorder] = useState(false);
//   const navigate = useNavigate(); // Hook for navigation

//   // Handle creating a room
//   const handleCreateRoom = () => {
//     if (!roomName.trim()) {
//       alert("Please enter a valid room name.");
//       return;
//     }
//     console.log("Creating room:", roomName);
    
//     // Simulating room creation with a generated room ID
//     const roomId = Math.floor(Math.random() * 10000);  // You can replace this with your backend logic to create a room
    
//     // Navigate to the newly created room's page
//     navigate(`/room/${roomId}`);
//   };

//   // Handle joining an existing room
//   const handleJoinRoom = () => {
//     if (!roomIdToJoin.trim()) {
//       alert("Please enter a valid room ID.");
//       return;
//     }
//     console.log("Joining room with ID:", roomIdToJoin);

//     // Navigate to the room's page
//     navigate(`/room/${roomIdToJoin}`);
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-12 px-4">
//       <h1 className="text-3xl font-bold mb-8 text-purple-700">🎙️ Riverside Clone</h1>

//       <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-xl space-y-6">
//         {/* Create Room */}
//         <div>
//           <label className="block text-gray-700 font-semibold mb-1">Room Name</label>
//           <input
//             type="text"
//             value={roomName}
//             onChange={(e) => setRoomName(e.target.value)}
//             className="w-full border border-gray-300 rounded px-4 py-2"
//             placeholder="Enter room name"
//           />
//           <button
//             onClick={handleCreateRoom}
//             className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
//           >
//             Create Room
//           </button>
//         </div>

//         {/* Join Room */}
//         <div>
//           <label className="block text-gray-700 font-semibold mb-1">Room ID</label>
//           <input
//             type="text"
//             value={roomIdToJoin}
//             onChange={(e) => setRoomIdToJoin(e.target.value)}
//             className="w-full border border-gray-300 rounded px-4 py-2"
//             placeholder="Enter room ID"
//           />
//           <button
//             onClick={handleJoinRoom}
//             className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
//           >
//             Join Room
//           </button>
//         </div>

//         {/* Start Recording */}
//         <div className="text-center">
//           <button
//             onClick={() => setShowRecorder(true)}
//             className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
//           >
//             Start Recording
//           </button>
//         </div>
//       </div>

//       {/* Recorder */}
//       {showRecorder && (
//         <div className="mt-10 w-full max-w-4xl">
//           <ProgressiveRecorder />
//         </div>
//       )}
//     </div>
//   );
// };

// export default Home;
