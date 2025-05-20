


import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import EditingStudio from './EditingStudio'; // Import the EditingStudio component

const socket = io('http://localhost:5000');

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate(); // For programmatic navigation
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const remoteMediaRecorderRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const chunksRef = useRef([]);
  const remoteChunksRef = useRef([]);
  const uploadedPartsRef = useRef([]);
  const remoteUploadedPartsRef = useRef([]);
  const allRecordedChunksRef = useRef([]);
  const allRemoteRecordedChunksRef = useRef([]);
  const uploadIdRef = useRef(null);
  const remoteUploadIdRef = useRef(null);
  const partNumberRef = useRef(1);
  const remotePartNumberRef = useRef(1);
  const keyRef = useRef(null);
  const remoteKeyRef = useRef(null);
  const recordingIdRef = useRef(null);
  const remoteRecordingIdRef = useRef(null);
  const s3BucketRef = useRef(null);
  const joinedRef = useRef(false);
  const renderCheckIntervalRef = useRef(null);
  const isUploadingRef = useRef(false);
  const isRemoteUploadingRef = useRef(false);
  const remoteStreamRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [remoteDownloadUrl, setRemoteDownloadUrl] = useState('');
  const [renderStatus, setRenderStatus] = useState(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState(null);
  const [isRenderRequested, setIsRenderRequested] = useState(false);
  const [bothStreamsUploaded, setBothStreamsUploaded] = useState(false);
  // New state for controlling EditingStudio display
  const [showEditingStudio, setShowEditingStudio] = useState(false);

  const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB

  useEffect(() => {
    const init = async () => {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          // Store remote stream for recording
          remoteStreamRef.current = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('candidate', { candidate: event.candidate, roomId });
        }
      };

      socket.emit("join-room", { roomId });

      socket.on("user-joined", async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { offer, roomId });
      });

      socket.on("offer", async ({ offer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { answer, roomId });
      });

      socket.on("answer", async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("candidate", async ({ candidate }) => {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    };

    if (!joinedRef.current) {
      joinedRef.current = true;
      init();
    }

    return () => {
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      if (renderCheckIntervalRef.current) {
        clearInterval(renderCheckIntervalRef.current);
      }
    };
  }, [roomId]);

  // Check render status periodically when rendering is in progress
useEffect(() => {
  if (isRenderRequested && recordingIdRef.current && renderStatus === 'processing') {
    const checkRenderStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/render-video/${recordingIdRef.current}/status`);
        if (response.ok) {
          const data = await response.json();
          setRenderStatus(data.renderStatus);
          
          // Only set the renderedVideoUrl when we actually have a URL from the server
          if (data.renderedVideoUrl) {
            console.log("Received rendered video URL:", data.renderedVideoUrl);
            setRenderedVideoUrl(data.renderedVideoUrl);
            
            // Clear interval once rendering is complete
            if (data.renderStatus === 'completed' && renderCheckIntervalRef.current) {
              clearInterval(renderCheckIntervalRef.current);
              renderCheckIntervalRef.current = null;
              
              // Add a small delay before transitioning to make sure state is updated
              setTimeout(() => {
                console.log("Ready to navigate with URL:", data.renderedVideoUrl);
                setShowEditingStudio(true);
              }, 1000);
            }
          }
        }
      } catch (error) {
        console.error('Error checking render status:', error);
      }
    };

    // Start checking status immediately
    checkRenderStatus();
    
    // Then check every 5 seconds
    renderCheckIntervalRef.current = setInterval(checkRenderStatus, 5000);
    
    return () => {
      if (renderCheckIntervalRef.current) {
        clearInterval(renderCheckIntervalRef.current);
        renderCheckIntervalRef.current = null;
      }
    };
  }
}, [isRenderRequested, renderStatus]);

// Improved navigation logic with proper checks
useEffect(() => {
  if (showEditingStudio && renderedVideoUrl && recordingIdRef.current) {
    console.log("Navigating to editing studio with these props:", {
      recordingId: recordingIdRef.current,
      renderedVideoUrl: renderedVideoUrl
    });
    
    // Ensure all required props are available before navigation
    if (!renderedVideoUrl) {
      console.error("Cannot navigate: renderedVideoUrl is not available");
      return;
    }
    
    // Navigate to the editing studio with all required props
    navigate(`/editing/${recordingIdRef.current}`, {
      state: {
        recordingId: recordingIdRef.current,
        localVideoUrl: downloadUrl,
        remoteVideoUrl: remoteDownloadUrl,
        renderedVideoUrl: renderedVideoUrl
      }
    });
  }
}, [showEditingStudio, renderedVideoUrl, recordingIdRef.current, navigate, downloadUrl, remoteDownloadUrl]);

  const startRecording = async () => {
    setUploading(false);
    setUploadComplete(false);
    setDownloadUrl('');
    setRemoteDownloadUrl('');
    setRenderStatus(null);
    setRenderedVideoUrl(null);
    setIsRenderRequested(false);
    setBothStreamsUploaded(false);
    setShowEditingStudio(false); // Reset editing studio flag
    recordingIdRef.current = null;
    remoteRecordingIdRef.current = null;
    s3BucketRef.current = null;

    // Initialize local stream recording
    const localStream = localVideoRef.current?.srcObject;
    const mediaRecorder = new MediaRecorder(localStream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    allRecordedChunksRef.current = [];

    // Initialize remote stream recording if available
    const remoteStream = remoteStreamRef.current;
    if (!remoteStream) {
      console.warn("Remote stream not available. Only recording local stream.");
    } else {
      const remoteMediaRecorder = new MediaRecorder(remoteStream);
      remoteMediaRecorderRef.current = remoteMediaRecorder;
      remoteChunksRef.current = [];
      allRemoteRecordedChunksRef.current = [];
    }

    // Initiate multipart upload for local stream
    const localRes = await fetch('http://localhost:5000/api/multipart-upload/initiate-multipart-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'local_recorded.webm' }),
    });

    const localData = await localRes.json();
    uploadIdRef.current = localData.uploadId;
    keyRef.current = localData.key;
    uploadedPartsRef.current = [];
    partNumberRef.current = 1;
    isUploadingRef.current = false;

    // Initiate multipart upload for remote stream if available
    if (remoteStreamRef.current) {
      const remoteRes = await fetch('http://localhost:5000/api/multipart-upload/initiate-multipart-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'remote_recorded.webm' }),
      });

      const remoteData = await remoteRes.json();
      remoteUploadIdRef.current = remoteData.uploadId;
      remoteKeyRef.current = remoteData.key;
      remoteUploadedPartsRef.current = [];
      remotePartNumberRef.current = 1;
      isRemoteUploadingRef.current = false;
    }

    // Configure local media recorder
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        allRecordedChunksRef.current.push(event.data);

        const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);

        if (totalSize >= MIN_PART_SIZE) {
          setUploading(true);
          const combinedBlob = new Blob(chunksRef.current, { type: 'video/webm' });
          await uploadChunk(combinedBlob, "local");
          chunksRef.current = [];
        }
      }
    };

    // Configure remote media recorder if available
    if (remoteMediaRecorderRef.current) {
      remoteMediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          remoteChunksRef.current.push(event.data);
          allRemoteRecordedChunksRef.current.push(event.data);

          const totalSize = remoteChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);

          if (totalSize >= MIN_PART_SIZE) {
            setUploading(true);
            const combinedBlob = new Blob(remoteChunksRef.current, { type: 'video/webm' });
            await uploadChunk(combinedBlob, "remote");
            remoteChunksRef.current = [];
          }
        }
      };
    }

    // Handle recording stop for local stream
    mediaRecorder.onstop = async () => {
      setUploading(true);
      console.log("Local recorder stopped, preparing final upload");

      if (chunksRef.current.length > 0) {
        const finalBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        await uploadChunk(finalBlob, "local");
      }

      await completeUpload("local");

      if (allRecordedChunksRef.current.length > 0) {
        const fullBlob = new Blob(allRecordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(fullBlob);
        setDownloadUrl(url);
      }

      // Check if both streams are uploaded
      checkBothStreamsUploaded();
    };

    // Handle recording stop for remote stream
    if (remoteMediaRecorderRef.current) {
      remoteMediaRecorderRef.current.onstop = async () => {
        console.log("Remote recorder stopped, preparing final upload");

        if (remoteChunksRef.current.length > 0) {
          const finalBlob = new Blob(remoteChunksRef.current, { type: 'video/webm' });
          await uploadChunk(finalBlob, "remote");
        }

        await completeUpload("remote");

        if (allRemoteRecordedChunksRef.current.length > 0) {
          const fullBlob = new Blob(allRemoteRecordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(fullBlob);
          setRemoteDownloadUrl(url);
        }

        // Check if both streams are uploaded
        checkBothStreamsUploaded();
      };
    }

    // Start recording both streams
    mediaRecorder.start(1000);
    if (remoteMediaRecorderRef.current) {
      remoteMediaRecorderRef.current.start(1000);
    }
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (remoteMediaRecorderRef.current && remoteMediaRecorderRef.current.state !== 'inactive') {
      remoteMediaRecorderRef.current.stop();
    }
    
    setRecording(false);
    console.log("Recording stopped, finalizing uploads...");
  };

  // Modified to handle both local and remote uploads
  const uploadChunk = async (blob, streamType) => {
    const isLocal = streamType === "local";
    const currentUploadIdRef = isLocal ? uploadIdRef : remoteUploadIdRef;
    const currentKeyRef = isLocal ? keyRef : remoteKeyRef;
    const currentPartNumberRef = isLocal ? partNumberRef : remotePartNumberRef;
    const currentUploadedPartsRef = isLocal ? uploadedPartsRef : remoteUploadedPartsRef;
    const currentIsUploadingRef = isLocal ? isUploadingRef : isRemoteUploadingRef;
    
    if (!currentUploadIdRef.current || !currentKeyRef.current || currentIsUploadingRef.current) return;

    // If the blob is too small, just keep it in chunks for now
    if (blob.size < MIN_PART_SIZE && recording) {
      return;
    }

    try {
      currentIsUploadingRef.current = true;
      const currentPartNumber = currentPartNumberRef.current;
      
      console.log(`Uploading ${streamType} part ${currentPartNumber}, size: ${blob.size} bytes`);
      
      const res = await fetch(
        `http://localhost:5000/api/multipart-upload/upload-part?uploadId=${currentUploadIdRef.current}&key=${currentKeyRef.current}&partNumber=${currentPartNumber}`,
        {
          method: "PUT",
          headers: { "Content-Length": blob.size.toString() },
          body: blob,
        }
      );

      const data = await res.json();
      if (res.ok && data.ETag) {
        // Remove quotes from ETag as we'll add them back when needed
        const etag = data.ETag.replace(/"/g, "");
        
        // Check if this part number already exists
        const existingIndex = currentUploadedPartsRef.current.findIndex(p => p.PartNumber === currentPartNumber);
        if (existingIndex >= 0) {
          console.warn(`Replacing existing ${streamType} part ${currentPartNumber}`);
          currentUploadedPartsRef.current[existingIndex].ETag = etag;
        } else {
          currentUploadedPartsRef.current.push({
            ETag: etag,
            PartNumber: currentPartNumber
          });
        }
        
        // Increment for next part
        if (isLocal) {
          partNumberRef.current = currentPartNumber + 1;
        } else {
          remotePartNumberRef.current = currentPartNumber + 1;
        }
        console.log(`${streamType} part ${currentPartNumber} uploaded successfully`);
      } else {
        console.error(`Upload ${streamType} part failed`, data);
      }
    } catch (error) {
      console.error(`Error uploading ${streamType} part:`, error);
    } finally {
      currentIsUploadingRef.current = false;
    }
  };

  // Modified to handle both local and remote uploads
  const completeUpload = async (streamType) => {
    const isLocal = streamType === "local";
    const currentUploadIdRef = isLocal ? uploadIdRef : remoteUploadIdRef;
    const currentKeyRef = isLocal ? keyRef : remoteKeyRef;
    const currentUploadedPartsRef = isLocal ? uploadedPartsRef : remoteUploadedPartsRef;
    const currentRecordingIdRef = isLocal ? recordingIdRef : remoteRecordingIdRef;
    
    if (!currentUploadIdRef.current || !currentKeyRef.current) {
      console.error(`Cannot complete ${streamType} upload: missing uploadId or key`);
      return;
    }

    try {
      const sortedParts = [...currentUploadedPartsRef.current]
        .sort((a, b) => a.PartNumber - b.PartNumber);

      const formattedParts = sortedParts.map(part => ({
        ETag: `"${part.ETag}"`,
        PartNumber: part.PartNumber
      }));

      if (formattedParts.length === 0) {
        console.error(`No parts to complete the ${streamType} upload`);
        return;
      }

      const completeRes = await fetch("http://localhost:5000/api/multipart-upload/complete-multipart-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: currentKeyRef.current,
          uploadId: currentUploadIdRef.current,
          parts: formattedParts
        }),
      });

      const completeData = await completeRes.json();
      if (completeRes.ok) {
        // Save all the data returned from the server
        if (isLocal) {
          recordingIdRef.current = completeData.recordingId;
          s3BucketRef.current = completeData.bucket;
        } else {
          remoteRecordingIdRef.current = completeData.recordingId;
          // We use the same bucket for both uploads
          if (!s3BucketRef.current) {
            s3BucketRef.current = completeData.bucket;
          }
        }
        console.log(`✅ ${streamType} upload completed successfully:`, completeData);
        console.log(`${streamType} Recording ID:`, isLocal ? recordingIdRef.current : remoteRecordingIdRef.current);
        console.log(`${streamType} S3 Key:`, currentKeyRef.current);
      } else {
        console.error(`❌ ${streamType} finalization failed:`, completeData);
        if (isLocal) {
          recordingIdRef.current = null;
        } else {
          remoteRecordingIdRef.current = null;
        }
      }
    } catch (error) {
      console.error(`Error completing ${streamType} multipart upload:`, error);
      if (isLocal) {
        recordingIdRef.current = null;
      } else {
        remoteRecordingIdRef.current = null;
      }
    } finally {
      if (isLocal) {
        console.log(`${streamType} upload process finished.`);
      } else {
        console.log(`${streamType} upload process finished.`);
      }

      // Check if both uploads are complete
      checkBothStreamsUploaded();
    }
  };

  // New function to check if both streams are uploaded
  const checkBothStreamsUploaded = () => {
    const localUploaded = recordingIdRef.current !== null;
    const remoteUploaded = remoteMediaRecorderRef.current ? remoteRecordingIdRef.current !== null : true;
    
    if (localUploaded && remoteUploaded) {
      setUploading(false);
      setUploadComplete(true);
      setBothStreamsUploaded(true);
      console.log("Both streams uploaded successfully!");
    }
  };

  // Updated requestRenderVideo to ensure layout processing
  const requestRenderVideo = async () => {
    if (!recordingIdRef.current) {
      alert("Local recording ID is not available. Please ensure the upload completed successfully.");
      console.error("Cannot render: No local recording ID available");
      return;
    }

    try {
      setRenderStatus('requesting');

      // Create the request payload with both stream information
      const requestPayload = {
        localRecordingId: recordingIdRef.current,
        localS3Key: keyRef.current,
        bucket: s3BucketRef.current,
        hasRemoteStream: remoteRecordingIdRef.current !== null,
        renderType: 'grid', // Explicitly request grid layout
      };

      // Add remote stream info if available
      if (remoteRecordingIdRef.current) {
        requestPayload.remoteRecordingId = remoteRecordingIdRef.current;
        requestPayload.remoteS3Key = remoteKeyRef.current;
      }

      console.log("Sending render request with payload:", requestPayload);

      const response = await fetch('http://localhost:5000/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setRenderStatus('processing');
        setIsRenderRequested(true);
        console.log("Render request accepted by server:", data);
        
        // If the server gave us a new recordingId (e.g. MongoDB ID), update our ref
        if (data.recordingId && data.recordingId !== recordingIdRef.current) {
          recordingIdRef.current = data.recordingId;
          console.log("Updated recording ID from server:", recordingIdRef.current);
        }
      } else {
        console.error("Render request failed:", data);
        setRenderStatus('failed');
      }
    } catch (error) {
      console.error("Error requesting render:", error);
      setRenderStatus('failed');
    }
  };

  // Auto-navigate to editing studio
  const goToEditingStudio = () => {
    if (recordingIdRef.current && renderedVideoUrl) {
      setShowEditingStudio(true);
    } else {
      alert("Rendering must be completed before entering the editing studio");
    }
  };

  // If showEditingStudio is true and we want to show it inline instead of navigating
  if (showEditingStudio && renderedVideoUrl && recordingIdRef.current) {
    return (
      <EditingStudio
        recordingId={recordingIdRef.current}
        localVideoUrl={downloadUrl}
        remoteVideoUrl={remoteDownloadUrl}
        renderedVideoUrl={renderedVideoUrl}
        onSave={(editedUrl) => {
          console.log("Edited video saved:", editedUrl);
          // Handle saving edited video
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Room: {roomId}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">Local Video</h2>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded border" />
        </div>
        <div>
          <h2 className="font-semibold">Remote Video</h2>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded border" />
        </div>
      </div>

      <div className="space-x-4">
        {!recording ? (
          <button onClick={startRecording} className="bg-green-600 text-white px-4 py-2 rounded" disabled={uploading}>
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded">
            Stop Recording
          </button>
        )}
        {uploading && <span>Uploading...</span>}
        {uploadComplete && <span className="text-green-600">Upload Complete!</span>}
        
        {bothStreamsUploaded && (
          <button 
            onClick={requestRenderVideo} 
            className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
            disabled={isRenderRequested || renderStatus === 'processing' || renderStatus === 'completed'}
          >
            Render Combined Video
          </button>
        )}
        
        {renderStatus && (
          <div className="mt-2">
            <span className="font-medium">Render status: </span>
            <span className={`
              ${renderStatus === 'completed' ? 'text-green-600' : ''} 
              ${renderStatus === 'processing' ? 'text-yellow-600' : ''}
              ${renderStatus === 'failed' ? 'text-red-600' : ''}
            `}>
              {renderStatus}
            </span>
          </div>
        )}

        {renderStatus === 'completed' && (
          <button 
            onClick={goToEditingStudio} 
            className="bg-purple-600 text-white px-4 py-2 rounded ml-2"
          >
            Open Editing Studio
          </button>
        )}
      </div>

      {(downloadUrl || remoteDownloadUrl) && !renderedVideoUrl && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {downloadUrl && (
            <div>
              <h2 className="font-semibold">Local Video Preview:</h2>
              <video src={downloadUrl} controls className="w-full rounded border mt-2" />
            </div>
          )}
          
          {remoteDownloadUrl && (
            <div>
              <h2 className="font-semibold">Remote Video Preview:</h2>
              <video src={remoteDownloadUrl} controls className="w-full rounded border mt-2" />
            </div>
          )}
          
          <div className="col-span-2">
            <p className="text-sm text-gray-500 mt-1">
              These are local previews. Click "Render Combined Video" to create a grid layout with both streams.
            </p>
          </div>
        </div>
      )}

      {renderedVideoUrl && (
        <div>
          <h2 className="mt-6 font-semibold">Combined Video:</h2>
          <video src={renderedVideoUrl} controls className="w-full rounded border mt-2" />
          <p className="text-sm text-green-600 mt-1">
            This video has both local and remote streams combined in a grid layout.
            <span className="font-bold ml-2">Click "Open Editing Studio" to edit this video.</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default Room;