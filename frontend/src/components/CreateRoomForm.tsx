import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const [title, setTitle] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem("token"); // Get token from localStorage
      const res = await axios.post(
        "http://localhost:5000/api/rooms",
        { title },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // After room is created, navigate to the room's page
      navigate(`/room/${res.data._id}`);
    } catch (err) {
      console.error("Error creating room:", err);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      navigate(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      {/* Create Room Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="roomTitle">Room Title</Label>
            <Input
              id="roomTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Room Title"
              required
            />
          </div>
          <Button onClick={handleCreateRoom} className="w-full mt-4">
            Create Room
          </Button>
        </CardContent>
      </Card>

      {/* Join Room Section */}
      <Card>
        <CardHeader>
          <CardTitle>Join Existing Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="joinRoomId">Room ID</Label>
            <Input
              id="joinRoomId"
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Enter Room ID"
              required
            />
          </div>
          <Button onClick={handleJoinRoom} className="w-full mt-4">
            Join Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
