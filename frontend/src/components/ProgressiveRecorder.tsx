// import React, { useRef, useState } from 'react';

// const ProgressiveRecorder: React.FC = () => {
//   const [recording, setRecording] = useState(false);
//   const [paused, setPaused] = useState(false);
//   const [recordedURL, setRecordedURL] = useState<string | null>(null);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [uploadQueue, setUploadQueue] = useState<string[]>([]);
//   const [status, setStatus] = useState<string>('Idle');

//   const previewRef = useRef<HTMLVideoElement | null>(null);
//   const playbackRef = useRef<HTMLVideoElement | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordedChunksRef = useRef<Blob[]>([]);
//   const filenameRef = useRef<string>(`video-${Date.now()}.webm`);

//   const startRecording = async () => {
//   console.log('Starting recording...');
//   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

//   if (previewRef.current) {
//     previewRef.current.srcObject = stream;
//     await previewRef.current.play(); // <- VERY IMPORTANT
//   }

//   const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
//     ? 'video/webm;codecs=vp8,opus'
//     : 'video/webm';

//   const mediaRecorder = new MediaRecorder(stream, { mimeType });
//   recordedChunksRef.current = [];
//   filenameRef.current = `video-${Date.now()}.webm`;

//   mediaRecorder.ondataavailable = async (event) => {
//     console.log('Data available from MediaRecorder', event.data);
//     if (event.data.size > 0) {
//       const isFinal = mediaRecorder.state === 'inactive';
//       recordedChunksRef.current.push(event.data);
//       await uploadChunk(event.data, isFinal);
//     }
//   };

//   mediaRecorder.onstart = () => {
//     console.log('Recording started');
//     setStatus('Recording...');
//     setRecording(true);
//   };

//   mediaRecorder.onstop = () => {
//     console.log('Stopping recording...');
//     stream.getTracks().forEach((track) => track.stop());
//     setStatus('Stopped');
//     setRecording(false);
//     setPaused(false);

//     console.log('Recording stopped');
//     console.log('Combining recorded chunks...');
//     console.log('Chunks count:', recordedChunksRef.current.length);

//     const finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
//     console.log('Final Blob size:', finalBlob.size);

//     const localURL = URL.createObjectURL(finalBlob);
//     setRecordedURL(localURL);
//     console.log('Generated local video URL:', localURL);

//     setTimeout(() => {
//       if (playbackRef.current) {
//         playbackRef.current.src = localURL;
//         playbackRef.current.load();
//         playbackRef.current.play().then(() => {
//           console.log('Local video playback started');
//         }).catch(err => {
//           console.error('Local video playback error', err);
//         });
//       }
//     }, 100);
//   };

//   mediaRecorder.start(3000); // wait until preview is playing before this is called!
//   mediaRecorderRef.current = mediaRecorder;
// };


//   const pauseRecording = () => {
//     if (mediaRecorderRef.current?.state === 'recording') {
//       mediaRecorderRef.current.pause();
//       setPaused(true);
//       setStatus('Paused');
//       console.log('Recording paused');
//     }
//   };

//   const resumeRecording = () => {
//     if (mediaRecorderRef.current?.state === 'paused') {
//       mediaRecorderRef.current.resume();
//       setPaused(false);
//       setStatus('Recording...');
//       console.log('Recording resumed');
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
//       mediaRecorderRef.current.stop();
//     }
//   };

//   const uploadChunk = async (blob: Blob, isFinal: boolean) => {
//     setStatus('Uploading...');
//     console.log(`Uploading chunk (${blob.size} bytes), isFinal: ${isFinal}`);

//     try {
//       const response = await fetch(`http://localhost:5000/api/progressive-upload?filename=${filenameRef.current}&isFinal=${isFinal}`, {
//         method: 'POST',
//         body: blob,
//         headers: {
//           'Content-Type': 'video/webm',
//         },
//       });

//       if (response.ok) {
//         console.log('Chunk uploaded successfully');
//         setUploadProgress((prev) => prev + 1);
//         setUploadQueue((prev) => prev.slice(1));
//         if (isFinal) {
//           console.log('Final chunk uploaded');
//           setStatus('Upload complete');
//         }
//       } else {
//         console.error('Upload failed:', response.statusText);
//         setStatus('Upload failed');
//       }
//     } catch (err) {
//       console.error('Upload error:', err);
//       setStatus('Upload error');
//     }
//   };

//   return (
//     <div className="p-4 rounded-xl border shadow bg-white space-y-4 w-full max-w-2xl">
//       <h2 className="text-xl font-bold">🎥 Progressive Recorder</h2>

//       <video ref={previewRef} className="w-full rounded-md border" autoPlay muted playsInline />

//       {recordedURL && (
//         <video
//           ref={playbackRef}
//           className="w-full mt-4 rounded-md border"
//           controls
//           autoPlay
//           playsInline
//           muted={false}
//           src={recordedURL}
//           onLoadedMetadata={() => {
//             console.log("Local video metadata loaded");
//             playbackRef.current?.play().catch(err => {
//               console.error("Playback error", err);
//             });
//           }}
//         />
//       )}

//       <div className="flex gap-2">
//         {!recording && (
//           <button onClick={startRecording} className="bg-green-600 text-white px-4 py-2 rounded">
//             Start
//           </button>
//         )}
//         {recording && !paused && (
//           <button onClick={pauseRecording} className="bg-yellow-500 text-white px-4 py-2 rounded">
//             Pause
//           </button>
//         )}
//         {recording && paused && (
//           <button onClick={resumeRecording} className="bg-blue-500 text-white px-4 py-2 rounded">
//             Resume
//           </button>
//         )}
//         {recording && (
//           <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded">
//             Stop
//           </button>
//         )}
//       </div>

//       <div className="text-sm text-gray-700">Status: <strong>{status}</strong></div>

//       {uploadQueue.length > 0 && (
//         <div className="text-sm text-gray-600">
//           Upload Queue: {uploadQueue.length} chunk(s)
//         </div>
//       )}

//       <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
//         <div
//           className="bg-green-500 h-full transition-all"
//           style={{ width: `${uploadProgress * 10}%` }}
//         />
//       </div>
//     </div>
//   );
// };

// export default ProgressiveRecorder;


import React, { useRef, useState } from 'react';

const ProgressiveRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordedURL, setRecordedURL] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Idle');

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const filenameRef = useRef<string>(`video-${Date.now()}.webm`);

  const startRecording = async () => {
    console.log('Starting recording...');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    previewRef.current!.srcObject = stream;
    previewRef.current!.play();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });
    filenameRef.current = `video-${Date.now()}.webm`;
    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Data available from MediaRecorder', event.data);
        recordedChunksRef.current.push(event.data);
        const isFinal = mediaRecorder.state === 'inactive';
        setUploadQueue((prev) => [...prev, `Chunk (${event.data.size} bytes)`]);
        await uploadChunk(event.data, isFinal);
      }
    };

    mediaRecorder.onstart = () => {
      console.log('Recording started');
      setStatus('Recording...');
      setRecording(true);
    };

    mediaRecorder.onstop = () => {
      console.log('Stopping recording...');
      stream.getTracks().forEach((track) => track.stop());
      setStatus('Stopped');
      setRecording(false);

      console.log('Recording stopped');
      console.log('Combining recorded chunks...');
      console.log('Chunks count:', recordedChunksRef.current.length);

      const finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      console.log('Final Blob size:', finalBlob.size);
      const localURL = URL.createObjectURL(finalBlob);
      console.log('Generated local video URL:', localURL);
      setRecordedURL(localURL);
    };

    mediaRecorder.start(3000); // record in 3s chunks
    mediaRecorderRef.current = mediaRecorder;
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      setStatus('Paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      setStatus('Recording...');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setPaused(false);
    }
  };

  const uploadChunk = async (blob: Blob, isFinal: boolean) => {
    console.log(`Uploading chunk (${blob.size} bytes), isFinal: ${isFinal}`);
    setStatus('Uploading...');
    try {
      const response = await fetch(
        `http://localhost:5000/api/progressive-upload?filename=${filenameRef.current}&isFinal=${isFinal}`,
        {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'video/webm',
          },
        }
      );

      if (response.ok) {
        setUploadProgress((prev) => prev + 1);
        setUploadQueue((prev) => prev.slice(1));
        console.log('Chunk uploaded successfully');
        if (isFinal) {
          console.log('Final chunk uploaded');
          setStatus('Upload complete');
        }
      } else {
        console.error('Upload failed', response.statusText);
        setStatus('Upload failed');
      }
    } catch (error) {
      console.error('Upload error', error);
      setStatus('Upload error');
    }
  };

  const downloadLocalVideo = () => {
    if (recordedChunksRef.current.length === 0) {
      console.warn('No recorded chunks to download');
      return;
    }
    const finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameRef.current || `recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log('Download triggered for local recording');
  };

  return (
    <div className="p-4 rounded-xl border shadow bg-white space-y-4 w-full max-w-2xl">
      <h2 className="text-xl font-bold">🎥 Progressive Recorder</h2>

      <video ref={previewRef} className="w-full rounded-md border" autoPlay muted />

      {recordedURL && (
        <>
          <video
            ref={playbackRef}
            className="w-full mt-4 rounded-md border"
            controls
            src={recordedURL}
            onLoadedMetadata={() => {
              console.log('Local video metadata loaded');
              playbackRef.current?.play();
              console.log('Local video playback started');
            }}
          />
          <button
            onClick={downloadLocalVideo}
            className="bg-green-600 text-white px-4 py-2 rounded mt-2"
          >
            Download Local Video
          </button>
        </>
      )}

      <div className="flex gap-2">
        {!recording && (
          <button onClick={startRecording} className="bg-green-600 text-white px-4 py-2 rounded">
            Start
          </button>
        )}
        {recording && !paused && (
          <button onClick={pauseRecording} className="bg-yellow-500 text-white px-4 py-2 rounded">
            Pause
          </button>
        )}
        {recording && paused && (
          <button onClick={resumeRecording} className="bg-blue-500 text-white px-4 py-2 rounded">
            Resume
          </button>
        )}
        {recording && (
          <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded">
            Stop
          </button>
        )}
      </div>

      <div className="text-sm text-gray-700">Status: <strong>{status}</strong></div>

      {uploadQueue.length > 0 && (
        <div className="text-sm text-gray-600">
          Upload Queue: {uploadQueue.length} chunk(s)
        </div>
      )}

      <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
        <div
          className="bg-green-500 h-full transition-all"
          style={{ width: `${Math.min(uploadProgress * 10, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressiveRecorder;


// import React, { useRef, useState } from 'react';

// const ProgressiveRecorder: React.FC = () => {
//   const [recording, setRecording] = useState(false);
//   const [paused, setPaused] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [uploadQueue, setUploadQueue] = useState<string[]>([]);
//   const [status, setStatus] = useState<string>('Idle');

//   const previewRef = useRef<HTMLVideoElement | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordedChunksRef = useRef<Blob[]>([]);
//   const filenameRef = useRef<string>(`video-${Date.now()}.webm`);

//   const startRecording = async () => {
//     console.log('Starting recording...');
//     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     previewRef.current!.srcObject = stream;
//     previewRef.current!.play();

//     const mediaRecorder = new MediaRecorder(stream, {
//       mimeType: 'video/webm;codecs=vp8,opus',
//     });
//     filenameRef.current = `video-${Date.now()}.webm`;
//     recordedChunksRef.current = [];

//     mediaRecorder.ondataavailable = async (event) => {
//       if (event.data && event.data.size > 0) {
//         console.log('Data available from MediaRecorder', event.data);
//         recordedChunksRef.current.push(event.data);
//         const isFinal = mediaRecorder.state === 'inactive';
//         setUploadQueue((prev) => [...prev, `Chunk (${event.data.size} bytes)`]);
//         await uploadChunk(event.data, isFinal);
//       }
//     };

//     mediaRecorder.onstart = () => {
//       console.log('Recording started');
//       setStatus('Recording...');
//       setRecording(true);
//     };

//     mediaRecorder.onstop = () => {
//       console.log('Stopping recording...');
//       stream.getTracks().forEach((track) => track.stop());
//       setStatus('Stopped');
//       setRecording(false);

//       console.log('Recording stopped');
//       console.log('Combining recorded chunks...');
//       console.log('Chunks count:', recordedChunksRef.current.length);

//       const finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
//       console.log('Final Blob size:', finalBlob.size);
//       const localURL = URL.createObjectURL(finalBlob);
//       console.log('Generated local video URL:', localURL);
//     };

//     mediaRecorder.start(3000); // record in 3s chunks
//     mediaRecorderRef.current = mediaRecorder;
//   };

//   const pauseRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.pause();
//       setPaused(true);
//       setStatus('Paused');
//     }
//   };

//   const resumeRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
//       mediaRecorderRef.current.resume();
//       setPaused(false);
//       setStatus('Recording...');
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
//       mediaRecorderRef.current.stop();
//       setPaused(false);
//     }
//   };

//   const uploadChunk = async (blob: Blob, isFinal: boolean) => {
//     console.log(`Uploading chunk (${blob.size} bytes), isFinal: ${isFinal}`);
//     setStatus('Uploading...');
//     try {
//       const response = await fetch(
//         `http://localhost:5000/api/progressive-upload?filename=${filenameRef.current}&isFinal=${isFinal}`,
//         {
//           method: 'POST',
//           body: blob,
//           headers: {
//             'Content-Type': 'video/webm',
//           },
//         }
//       );

//       if (response.ok) {
//         setUploadProgress((prev) => prev + 1);
//         setUploadQueue((prev) => prev.slice(1));
//         console.log('Chunk uploaded successfully');
//         if (isFinal) {
//           console.log('Final chunk uploaded');
//           setStatus('Upload complete');
//         }
//       } else {
//         console.error('Upload failed', response.statusText);
//         setStatus('Upload failed');
//       }
//     } catch (error) {
//       console.error('Upload error', error);
//       setStatus('Upload error');
//     }
//   };

//   return (
//     <div className="p-4 rounded-xl border shadow bg-white space-y-4 w-full max-w-2xl">
//       <h2 className="text-xl font-bold">🎥 Progressive Recorder</h2>

//       <video ref={previewRef} className="w-full rounded-md border" autoPlay muted />

//       <div className="flex gap-2">
//         {!recording && (
//           <button onClick={startRecording} className="bg-green-600 text-white px-4 py-2 rounded">
//             Start
//           </button>
//         )}
//         {recording && !paused && (
//           <button onClick={pauseRecording} className="bg-yellow-500 text-white px-4 py-2 rounded">
//             Pause
//           </button>
//         )}
//         {recording && paused && (
//           <button onClick={resumeRecording} className="bg-blue-500 text-white px-4 py-2 rounded">
//             Resume
//           </button>
//         )}
//         {recording && (
//           <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded">
//             Stop
//           </button>
//         )}
//       </div>

//       <div className="text-sm text-gray-700">Status: <strong>{status}</strong></div>

//       {uploadQueue.length > 0 && (
//         <div className="text-sm text-gray-600">
//           Upload Queue: {uploadQueue.length} chunk(s)
//         </div>
//       )}

//       <div className="w-full bg-gray-200 rounded h-2 overflow-hidden relative">
//         <div className="absolute w-full h-full animate-stripes bg-[repeating-linear-gradient(90deg,_#22c55e_0_10px,_#a7f3d0_10px_20px)] transition-opacity duration-300" style={{ opacity: recording ? 1 : 0 }} />
//         {!recording && (
//           <div
//             className="bg-green-600 h-full transition-all duration-500"
//             style={{ width: `100%` }}
//           />
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProgressiveRecorder;