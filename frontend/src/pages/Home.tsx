import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import UploadRecorder from "../components/UploadRecorder";

export default function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const handleCreateRoom = () => {
    const newRoomId = uuidv4();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Riverside Clone</h2>

        <button
          onClick={handleCreateRoom}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded mb-4"
        >
          Create Room
        </button>

        <div className="mt-4">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="border p-2 rounded w-full mb-2"
          />
          <button
            onClick={handleJoinRoom}
            className="w-full bg-green-600 text-white py-2 px-4 rounded"
          >
            Join Room
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Or record & upload media:</h3>
        <UploadRecorder />
      </div>
    </div>
  );
}
