import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Room from "./components/Room";
import LoginForm from "./components/loginForm";
import CreateRoom from "./components/CreateRoomForm";
import { useState } from "react";

function App() {
  const [user, setUser] = useState<any>(null); // User state is ONLY set during login

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginForm setUser={setUser} />} />
        <Route path="/create-room" element={user ? <CreateRoom /> : <Navigate to="/" />} />
        <Route path="/room/:roomId" element={user ? <Room /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
