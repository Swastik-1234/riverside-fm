// src/components/JoinRoomForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoomForm() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Join a Room</h2>
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter Room ID"
        className="border p-2 rounded w-full max-w-md"
      />
      <button
        onClick={handleJoin}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Join Room
      </button>
    </div>
  );
}
