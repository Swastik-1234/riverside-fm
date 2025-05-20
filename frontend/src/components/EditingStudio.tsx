import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { useLocation } from 'react-router-dom';


const EditingStudio = () => {
  const location = useLocation();
  const {
    recordingId,
    localVideoUrl,
    remoteVideoUrl,
    renderedVideoUrl,
    onSave
  } = location.state || {};
  // State for editing features
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100); // Will be updated with actual duration
  const [volume, setVolume] = useState({ local: 1.0, remote: 1.0 });
  const [layout, setLayout] = useState('grid'); // grid, side-by-side, speaker-focus
  const [positions, setPositions] = useState({ local: 'top-left', remote: 'bottom-right' });
  const [overlays, setOverlays] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isWaveSurferReady, setIsWaveSurferReady] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // References
  const videoRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const wavesurferInitializedRef = useRef(false);
  
  // Set the preview URL when renderedVideoUrl prop changes
  useEffect(() => {
    if (renderedVideoUrl) {
      // Ensure URL is not undefined or empty
      const validUrl = renderedVideoUrl.trim();
      if (validUrl) {
        console.log("Setting preview URL:", validUrl);
        setPreviewUrl(validUrl);
      } else {
        console.error("Received empty renderedVideoUrl");
        setVideoError("Invalid video URL received");
      }
    } else {
      console.warn("renderedVideoUrl prop is null or undefined");
    }
  }, [renderedVideoUrl]);
  
  // Wait for the video to be loaded before initializing WaveSurfer
  useEffect(() => {
    const handleVideoMetadataLoaded = () => {
      console.log("Video metadata loaded, video is ready");
      setVideoLoaded(true);
    };

    if (videoRef.current && previewUrl) {
      videoRef.current.addEventListener('loadedmetadata', handleVideoMetadataLoaded);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleVideoMetadataLoaded);
        }
      };
    }
  }, [previewUrl]);
  
  // Initialize WaveSurfer for audio visualization only after video is loaded
  useEffect(() => {
    // Only initialize wavesurfer if video is loaded and waveform container exists
    if (waveformRef.current && previewUrl && videoLoaded && !wavesurferInitializedRef.current) {
      // Destroy previous instance if it exists
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      
      console.log("Initializing WaveSurfer with URL:", previewUrl);
      
      try {
        // Create new WaveSurfer instance
        const wavesurfer = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#4F4F4F',
          progressColor: '#1E88E5',
          cursorColor: '#1E88E5',
          height: 80,
          barWidth: 2,
          barRadius: 3,
          plugins: [
            RegionsPlugin.create({
              regions: [
                {
                  id: 'trim-region',
                  start: trimStart,
                  end: trimEnd,
                  color: 'rgba(64, 169, 255, 0.2)',
                  drag: true,
                  resize: true
                }
              ]
            })
          ]
        });
        
        wavesurferRef.current = wavesurfer;
        
        wavesurfer.on('ready', () => {
          console.log("WaveSurfer is ready");
          setIsWaveSurferReady(true);
          const duration = wavesurfer.getDuration();
          console.log("Audio duration:", duration);
          setTrimEnd(duration);
          
          // Update the region to match the full duration
          const regions = wavesurfer.getRegions();
          if (regions.length > 0) {
            regions[0].update({ end: duration });
          }
        });
        
        wavesurfer.on('error', (err) => {
          console.error("WaveSurfer error:", err);
          setVideoError("Error loading audio waveform: " + (err.message || "Unknown error"));
        });
        
        wavesurfer.on('region-update-end', (region) => {
          setTrimStart(region.start);
          setTrimEnd(region.end);
          
          // Update video position to trim start when region changes
          if (videoRef.current) {
            videoRef.current.currentTime = region.start;
          }
        });
        
        // Use the video element as the media element for WaveSurfer
        // This avoids duplicate audio loading which might be causing the abort errors
        if (videoRef.current) {
          console.log("Loading audio from video element");
          wavesurfer.setMediaElement(videoRef.current);
          wavesurferInitializedRef.current = true;
        } else {
          console.error("Video element not available");
        }
      } catch (err) {
        console.error("Error initializing WaveSurfer:", err);
        setVideoError("Error initializing audio waveform: " + err.message);
      }
      
      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
          wavesurferInitializedRef.current = false;
        }
      };
    }
  }, [previewUrl, videoLoaded, trimStart, trimEnd]);
  
  // Synchronize video playback with waveform
  useEffect(() => {
    if (videoRef.current && wavesurferRef.current && isWaveSurferReady) {
      const handleWaveformSeek = () => {
        const currentTime = wavesurferRef.current.getCurrentTime();
        if (Math.abs(currentTime - videoRef.current.currentTime) > 0.1) {
          videoRef.current.currentTime = currentTime;
        }
      };
      
      // Handle video errors
      const handleVideoError = (e) => {
        console.error("Video error:", e);
        setVideoError(`Error loading video: ${e.target.error ? e.target.error.message : 'Unknown error'}`);
      };
      
      videoRef.current.addEventListener('error', handleVideoError);
      wavesurferRef.current.on('seek', handleWaveformSeek);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handleVideoError);
        }
        if (wavesurferRef.current && isWaveSurferReady) {
          wavesurferRef.current.un('seek', handleWaveformSeek);
        }
      };
    }
  }, [isWaveSurferReady]);
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
          .then(() => {
            console.log("Video playing");
            if (wavesurferRef.current && isWaveSurferReady) {
              wavesurferRef.current.play();
            }
          })
          .catch(err => {
            console.error("Error playing video:", err);
            setVideoError("Error playing video: " + err.message);
          });
      } else {
        videoRef.current.pause();
        if (wavesurferRef.current && isWaveSurferReady) {
          wavesurferRef.current.pause();
        }
      }
    } else {
      console.warn("Video ref not ready for playback");
    }
  };
  
  // Handle volume changes
  const handleVolumeChange = (type, value) => {
    setVolume(prev => ({ ...prev, [type]: parseFloat(value) }));
  };
  
  // Handle layout selection
  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };
  
  // Handle participant position changes
  const handlePositionChange = (stream, position) => {
    setPositions(prev => ({ ...prev, [stream]: position }));
  };
  
  // Add overlay
  const addOverlay = (type) => {
    const newOverlay = {
      id: Date.now(),
      type, // 'text', 'logo', 'background'
      content: type === 'text' ? 'Sample Text' : '/path/to/default/image.png',
      position: { x: 10, y: 10 },
      style: { color: '#FFFFFF', fontSize: '24px' }
    };
    
    setOverlays(prev => [...prev, newOverlay]);
  };
  
  // Update overlay content
  const updateOverlayContent = (id, content) => {
    setOverlays(prev => 
      prev.map(overlay => 
        overlay.id === id ? { ...overlay, content } : overlay
      )
    );
  };
  
  // Remove overlay
  const removeOverlay = (id) => {
    setOverlays(prev => prev.filter(overlay => overlay.id !== id));
  };
  
  // Save changes and process the video
  const saveChanges = async () => {
    if (!recordingId) {
      console.error("Cannot save: recordingId is not set");
      alert("Cannot save changes: recording ID is not available");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const editingData = {
        recordingId,
        trim: { start: trimStart, end: trimEnd },
        volume,
        layout,
        positions,
        overlays
      };
      
      console.log("Sending edit request with data:", editingData);
      
      const response = await fetch('http://localhost:5000/api/edit-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPreviewUrl(data.editedVideoUrl);
        if (onSave) onSave(data.editedVideoUrl);
      } else {
        console.error("Error processing video:", data.error);
        alert(`Error processing video: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert(`Error saving changes: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Generate a preview based on current settings
  const generatePreview = () => {
    // This would typically call the backend to generate a preview
    // For now, we'll just use the existing rendered URL
    console.log("Generating preview with settings:", {
      trim: { start: trimStart, end: trimEnd },
      volume,
      layout,
      positions,
      overlays
    });
  };

  // Retry video loading
  const retryVideoLoading = () => {
    setVideoError(null);
    if (previewUrl) {
      if (videoRef.current) {
        videoRef.current.load();
      }
      
      // Also reinitialize wavesurfer
      wavesurferInitializedRef.current = false;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      setIsWaveSurferReady(false);
    }
  };
  
  return (
    <div className="editing-studio p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Post-Recording Editing Studio</h1>
      
      {/* Video Preview */}
      <div className="mb-6">
        <div className="relative bg-black rounded-lg overflow-hidden">
          {previewUrl ? (
            <video 
              ref={videoRef} 
              src={previewUrl} 
              controls 
              preload="metadata"
              className="w-full h-auto"
              onError={(e) => {
                console.error("Video error event:", e);
                setVideoError(`Error loading video: ${e.target.error ? e.target.error.message : 'Unknown error'}`);
              }}
              onLoadedData={() => {
                console.log("Video loaded successfully");
                setVideoLoaded(true);
              }}
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gray-800 text-white">
              Loading video...
            </div>
          )}
          
          {videoError && (
            <div className="absolute inset-0 bg-red-800 bg-opacity-70 flex flex-col items-center justify-center text-white p-4">
              <p className="mb-2">{videoError}</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setVideoError(null)} 
                  className="px-2 py-1 bg-red-600 rounded"
                >
                  Dismiss
                </button>
                <button 
                  onClick={retryVideoLoading} 
                  className="px-2 py-1 bg-blue-600 rounded"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )}
          
          {/* Render overlays on top of video */}
          {overlays.map(overlay => (
            <div 
              key={overlay.id}
              className="absolute" 
              style={{
                left: `${overlay.position.x}px`,
                top: `${overlay.position.y}px`,
                ...(overlay.type === 'text' ? overlay.style : {})
              }}
            >
              {overlay.type === 'text' ? (
                <div>{overlay.content}</div>
              ) : (
                <img 
                  src={overlay.content} 
                  alt="Overlay" 
                  className="h-16 w-auto object-contain"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Waveform Timeline */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <div ref={waveformRef} className="w-full border rounded-lg h-20 bg-gray-100"></div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>Start: {trimStart.toFixed(2)}s</span>
          <span>End: {trimEnd.toFixed(2)}s</span>
        </div>
        <button 
          onClick={togglePlayPause}
          className="bg-blue-600 text-white px-4 py-1 rounded mt-2"
        >
          Play/Pause
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Layout Selection */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Layout</h2>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => handleLayoutChange('grid')} 
              className={`p-3 border rounded ${layout === 'grid' ? 'bg-blue-100 border-blue-500' : ''}`}
            >
              Grid
            </button>
            <button 
              onClick={() => handleLayoutChange('side-by-side')} 
              className={`p-3 border rounded ${layout === 'side-by-side' ? 'bg-blue-100 border-blue-500' : ''}`}
            >
              Side by Side
            </button>
            <button 
              onClick={() => handleLayoutChange('speaker-focus')} 
              className={`p-3 border rounded ${layout === 'speaker-focus' ? 'bg-blue-100 border-blue-500' : ''}`}
            >
              Speaker Focus
            </button>
          </div>
        </div>
        
        {/* Volume Controls */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Audio Levels</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm mb-1">Local Volume: {volume.local.toFixed(1)}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume.local} 
                onChange={e => handleVolumeChange('local', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Remote Volume: {volume.remote.toFixed(1)}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume.remote} 
                onChange={e => handleVolumeChange('remote', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Positions */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Participant Positions</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Local Stream</label>
              <select 
                value={positions.local} 
                onChange={e => handlePositionChange('local', e.target.value)}
                className="block w-full border rounded p-2"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Remote Stream</label>
              <select 
                value={positions.remote} 
                onChange={e => handlePositionChange('remote', e.target.value)}
                className="block w-full border rounded p-2"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Overlays */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Overlays</h2>
          <div className="flex space-x-2 mb-3">
            <button 
              onClick={() => addOverlay('text')} 
              className="bg-gray-200 px-3 py-1 rounded"
            >
              + Add Text
            </button>
            <button 
              onClick={() => addOverlay('logo')} 
              className="bg-gray-200 px-3 py-1 rounded"
            >
              + Add Logo
            </button>
            <button 
              onClick={() => addOverlay('background')} 
              className="bg-gray-200 px-3 py-1 rounded"
            >
              + Add Background
            </button>
          </div>
          
          {/* List of current overlays */}
          <div className="max-h-40 overflow-y-auto space-y-2">
            {overlays.map(overlay => (
              <div key={overlay.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span>{overlay.type}: {overlay.type === 'text' ? overlay.content : '...'}</span>
                <button 
                  onClick={() => removeOverlay(overlay.id)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
            {overlays.length === 0 && (
              <p className="text-sm text-gray-500">No overlays added</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        <button 
          onClick={generatePreview}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Generate Preview
        </button>
        <button 
          onClick={saveChanges}
          disabled={isProcessing || !recordingId}
          className={`px-4 py-2 rounded text-white ${isProcessing || !recordingId ? 'bg-blue-300' : 'bg-blue-600'}`}
        >
          {isProcessing ? 'Processing...' : 'Save Changes'}
        </button>
      </div>
      
      {/* Debug information */}
      <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-700">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Recording ID: {recordingId || 'Not set'}</p>
        <p>Preview URL: {previewUrl ? `${previewUrl.substring(0, 50)}...` : 'Not set'}</p>
        <p>WaveSurfer Status: {isWaveSurferReady ? 'Ready' : 'Not ready'}</p>
        <p>Video Loaded: {videoLoaded ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default EditingStudio;