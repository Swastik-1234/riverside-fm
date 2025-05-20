import React, { useState, useRef } from "react";

// export default function UploadRecorder() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   let mediaRecorder: MediaRecorder;
//   let videoStream: MediaStream;

//   const startRecording = async () => {
//     try {
//       // Request access to camera and microphone
//       videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       const videoElement = document.createElement("video");
//       videoElement.srcObject = videoStream;

//       // Create a MediaRecorder instance
//       mediaRecorder = new MediaRecorder(videoStream);
//       const chunks: Blob[] = [];

//       mediaRecorder.ondataavailable = (event) => {
//         chunks.push(event.data);
//       };

//       mediaRecorder.onstop = () => {
//         const recordedBlob = new Blob(chunks, { type: "video/webm" });
//         setVideoBlob(recordedBlob);
//       };

//       mediaRecorder.start();
//       setIsRecording(true);
//       setError(null); // Reset error message if recording starts successfully

//       // Log stream state for debugging
//       console.log("Video stream started:", videoStream);
//     } catch (err) {
//       setError("Failed to start video source: " + err.message);
//       console.error("Error starting video:", err);
//     }
//   };

//   const stopRecording = () => {
//   if (mediaRecorder && mediaRecorder.state !== "inactive") {
//     mediaRecorder.stop();

//     // Stop all tracks (video and audio)
//     videoStream.getTracks().forEach((track) => {
//       track.stop();
//       console.log(`Stopped track: ${track.kind}`);
//     });

//     // Remove the video element if it was attached
//     const videoElement = document.querySelector("video");
//     if (videoElement) {
//       videoElement.srcObject = null;
//       videoElement.remove();
//     }

//     // Close the stream to release resources
//     if (videoStream) {
//       videoStream = null as any; // Clear the stream reference
//     }

//     setIsRecording(false);
//   }
// };


//   return (
//     <div>
//       {error && <p className="text-red-500">{error}</p>} {/* Show error if exists */}
//       <div>
//         {isRecording ? (
//           <button onClick={stopRecording} className="bg-red-600 text-white py-2 px-4 rounded">
//             Stop Recording
//           </button>
//         ) : (
//           <button onClick={startRecording} className="bg-green-600 text-white py-2 px-4 rounded">
//             Start Recording
//           </button>
//         )}
//       </div>

//       {videoBlob && (
//         <div className="mt-4">
//           <h3 className="text-lg font-semibold mb-2">Recorded Video:</h3>
//           <video controls>
//             <source src={URL.createObjectURL(videoBlob)} type="video/webm" />
//             Your browser does not support the video element.
//           </video>
//         </div>
//       )}
//     </div>
//   );
// }


// import { useState, useRef } from "react";

// export default function UploadRecorder() {
//   const [isRecording, setIsRecording] = useState(false);
//   const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // Use refs to keep track of mediaRecorder and videoStream across re-renders
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const videoStreamRef = useRef<MediaStream | null>(null);

//   const startRecording = async () => {
//     try {
//       // Request access to camera and microphone
//       const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       const videoElement = document.createElement("video");
//       videoElement.srcObject = videoStream;

//       // Set the video element to display the stream
//       document.body.appendChild(videoElement); // You can remove this if you don't want the video to appear

//       // Store the video stream and media recorder in refs
//       videoStreamRef.current = videoStream;
//       mediaRecorderRef.current = new MediaRecorder(videoStream);

//       const chunks: Blob[] = [];

//       mediaRecorderRef.current.ondataavailable = (event) => {
//         chunks.push(event.data);
//       };

//       mediaRecorderRef.current.onstop = () => {
//         const recordedBlob = new Blob(chunks, { type: "video/webm" });
//         setVideoBlob(recordedBlob);
//       };

//       // Start recording
//       mediaRecorderRef.current.start();
//       setIsRecording(true);
//       setError(null); // Reset error message if recording starts successfully

//       // Log stream state for debugging
//       console.log("Video stream started:", videoStream);
//     } catch (err) {
//       setError("Failed to start video source: " + (err as Error).message);
//       console.error("Error starting video:", err);
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//       mediaRecorderRef.current.stop();

//       // Stop all tracks (video and audio)
//       if (videoStreamRef.current) {
//         videoStreamRef.current.getTracks().forEach((track) => {
//           track.stop();
//           console.log(`Stopped track: ${track.kind}`);
//         });
//       }

//       // Clean up the video element if it was attached
//       const videoElement = document.querySelector("video");
//       if (videoElement) {
//         videoElement.srcObject = null;
//         videoElement.remove();
//       }

//       // Reset video stream and media recorder refs
//       videoStreamRef.current = null;
//       mediaRecorderRef.current = null;

//       setIsRecording(false);
//     }
//   };

//   return (
//     <div>
//       {error && <p className="text-red-500">{error}</p>} {/* Show error if exists */}
//       <div>
//         {isRecording ? (
//           <button onClick={stopRecording} className="bg-red-600 text-white py-2 px-4 rounded">
//             Stop Recording
//           </button>
//         ) : (
//           <button onClick={startRecording} className="bg-green-600 text-white py-2 px-4 rounded">
//             Start Recording
//           </button>
//         )}
//       </div>

//       {videoBlob && (
//         <div className="mt-4">
//           <h3 className="text-lg font-semibold mb-2">Recorded Video:</h3>
//           <video controls>
//             <source src={URL.createObjectURL(videoBlob)} type="video/webm" />
//             Your browser does not support the video element.
//           </video>
//         </div>
//       )}
//     </div>
//   );
// }







export default function UploadRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      videoElement.style.display = 'none'; // Hide the temporary video
      document.body.appendChild(videoElement);

      videoStreamRef.current = videoStream;
      const mediaRecorder = new MediaRecorder(videoStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(recordedBlob);
        await uploadVideoToS3(recordedBlob);  // Upload video after recording
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to start video source: ' + (err as Error).message);
      console.error('Error starting video:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.remove();
    }

    setIsRecording(false);
  };

const uploadVideoToS3 = async (videoBlob: Blob) => {
  try {
    const filename = `video-${Date.now()}.webm`;
    const filetype = "video/webm";

    // Step 1: Get pre-signed URL for uploading
    const res = await fetch(`http://localhost:5000/api/upload/generate-presigned-url?filename=${filename}&type=${filetype}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (!data.url) throw new Error("Failed to get pre-signed URL");

    // Step 2: Upload the video to S3
    const uploadRes = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": filetype },
      body: videoBlob,
    });

    if (!uploadRes.ok) throw new Error("Upload to S3 failed");

    // Step 3: Set the video URL for playback
    // Update this line to reflect the new route that streams the video from S3
    setVideoUrl(`http://localhost:5000/api/upload/stream-video/${filename}`);
  } catch (err: any) {
    setError("Upload failed: " + err.message);
    console.error("Upload error:", err);
  }
};


  return (
    <div className="p-4">
      {error && <p className="text-red-500">{error}</p>}
      <div>
        {isRecording ? (
          <button onClick={stopRecording} className="bg-red-600 text-white py-2 px-4 rounded">
            Stop Recording
          </button>
        ) : (
          <button onClick={startRecording} className="bg-green-600 text-white py-2 px-4 rounded">
            Start Recording
          </button>
        )}
      </div>

      {videoBlob && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Recorded Video:</h3>
          <video controls>
            <source src={URL.createObjectURL(videoBlob)} type="video/webm" />
            Your browser does not support the video element.
          </video>
        </div>
      )}

      {videoUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Uploaded Video (from S3):</h3>
          <video controls>
            <source src={videoUrl} type="video/webm" />
            Your browser does not support the video element.
          </video>
        </div>
      )}
    </div>
  );
}
