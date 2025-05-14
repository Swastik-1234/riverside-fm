import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Room from "./components/Room";
import LoginForm from "./components/loginForm";
import { useState } from "react";
import Home from "./pages/Home"; // ✅ new unified page

function App() {
  const [user, setUser] = useState<any>(null); // User state is ONLY set during login

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginForm setUser={setUser} />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/room/:roomId" element={user ? <Room /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
