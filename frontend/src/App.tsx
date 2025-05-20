import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Room from "./components/Room";
import LoginForm from "./components/loginForm";
import { useState } from "react";
import SignupForm from "./components/SignupForm";
import Home from "./pages/Home"; // ✅ new unified page
import ProgressiveRecorder from "./components/ProgressiveRecorder";
import EditingStudio from './components/EditingStudio';
function App() {
  const [user, setUser] = useState<any>(null); // User state is ONLY set during login

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginForm setUser={setUser} />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/signup" element={<SignupForm setUser={setUser} />} />
        <Route path="/room/:roomId" element={user ? <Room /> : <Navigate to="/" />} />
              <Route path="/record" element={user ? <ProgressiveRecorder /> : <Navigate to="/" />} />
              <Route path="/editing/:recordingId" element={<EditingStudio />} />
      </Routes>
    </Router>
  );
}

export default App;
