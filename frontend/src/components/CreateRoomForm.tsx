import { useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const [title, setTitle] = useState("");
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

  return (
    <Card className="max-w-md mx-auto mt-8">
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
  );
}
