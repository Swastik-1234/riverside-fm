// import React, { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";
// import io from "socket.io-client";

// const socket = io("http://localhost:5000");

// const Room = () => {
//   const { roomId } = useParams();
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);
//   const pcRef = useRef<RTCPeerConnection | null>(null);

//   const startLocalMedia = async () => {
//     const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     if (localVideoRef.current) {
//       localVideoRef.current.srcObject = localStream;
//     }

//     const pc = new RTCPeerConnection({
//       iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//     });
//     pcRef.current = pc;

//     // Add local tracks to the peer connection
//     localStream.getTracks().forEach(track => {
//       pc.addTrack(track, localStream);
//     });

//     // Set up ICE handling
//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit("candidate", { candidate: event.candidate, roomId });
//       }
//     };

//     // Set up remote video stream
//     pc.ontrack = (event) => {
//       setTimeout(() => {
//         if (remoteVideoRef.current) {
//           remoteVideoRef.current.srcObject = event.streams[0];
//         }
//       }, 0);
//     };

//     // Join the room
//     socket.emit("join", { roomId });

//     socket.on("joined", async () => {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socket.emit("offer", { offer, roomId });
//     });

//     socket.on("offer", async ({ offer }) => {
//       await pc.setRemoteDescription(new RTCSessionDescription(offer));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socket.emit("answer", { answer, roomId });
//     });

//     socket.on("answer", async ({ answer }) => {
//       await pc.setRemoteDescription(new RTCSessionDescription(answer));
//     });

//     socket.on("candidate", async ({ candidate }) => {
//       try {
//         await pc.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (err) {
//         console.error("Error adding received ice candidate", err);
//       }
//     });
//   };

//   useEffect(() => {
//     startLocalMedia();

//     return () => {
//       socket.disconnect();
//       pcRef.current?.close();
//     };
//   }, []);

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-bold mb-4">
//         Room: <span className="bg-gray-200 px-2 py-1 rounded">{roomId}</span>
//       </h2>
//       <div className="flex gap-4">
//         <video ref={localVideoRef} autoPlay muted className="rounded shadow w-64 h-48" />
//         <video ref={remoteVideoRef} autoPlay className="rounded shadow w-64 h-48" />
//       </div>
//     </div>
//   );
// };

// export default Room;


import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Room = () => {
  const { roomId } = useParams();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Prevent useEffect dependency array from changing size
  const [initialized, setInitialized] = useState(false);

  const startLocalMedia = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // Add local tracks to the peer connection
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Set up ICE handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socket.emit("candidate", { candidate: event.candidate, roomId });
      }
    };

    // Set up remote video stream
    pc.ontrack = (event) => {
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }, 0);
    };

    // Join the room
    socket.emit("join-room", { roomId });

    socket.on("user-joined", ({ socketId }) => {
      console.log("User joined:", socketId);
      // Send offer to the new user
      createOffer();
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Offer received from:", from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId });
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Answer received from:", from);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", async ({ candidate, from }) => {
      console.log("ICE Candidate received from:", from);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });
  };

  const createOffer = async () => {
    try {
      const offer = await pcRef.current?.createOffer();
      await pcRef.current?.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
      console.log("Offer sent to the room:", offer);
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  useEffect(() => {
    if (initialized) return; // Prevent re-initializing if it's already done
    if (roomId) {
      startLocalMedia();
      setInitialized(true); // Mark as initialized
    }
  }, [roomId, initialized]); // Add 'initialized' to prevent reinitializing

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Room: <span className="bg-gray-200 px-2 py-1 rounded">{roomId}</span>
      </h2>
      <div className="flex gap-4">
        <video ref={localVideoRef} autoPlay muted className="rounded shadow w-64 h-48" />
        <video ref={remoteVideoRef} autoPlay className="rounded shadow w-64 h-48" />
      </div>
    </div>
  );
};

export default Room;
