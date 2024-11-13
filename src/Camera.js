/* global google */
import React, { useRef, useEffect, useState } from 'react';
import { CLIENT_ID, SCOPES } from './googleDrive';

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const MAX_PHOTOS = 10;

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null); // New state variable

  // Initialize Google Identity Services client
  useEffect(() => {
    const initializeGisClient = () => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Error obtaining access token:', tokenResponse.error);
            return;
          }
          setIsSignedIn(true);
          setAccessToken(tokenResponse.access_token); // Store the access token
        },
      });
      setTokenClient(client);
    };

    if (window.google && window.google.accounts) {
      initializeGisClient();
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.accounts) {
          initializeGisClient();
          clearInterval(interval);
        }
      }, 1000);
    }
  }, []);

  // Access the camera
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          alert('Camera access was denied. Please allow camera permissions in your browser settings.');
        } else if (error.name === 'AbortError') {
          console.warn('Camera access was aborted.');
        } else {
          console.error('Error accessing the camera:', error);
        }
      }
    };
    getMedia();
  }, []);

  // Take a picture from the video stream
  const takePicture = () => {
    if (photos.length >= MAX_PHOTOS) {
      alert('You have reached the maximum number of photos.');
      return;
    }

    const width = 400;
    const height = 300;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const data = canvas.toDataURL('image/png');
    setPhotos((oldPhotos) => [...oldPhotos, data]);
  };

  // Sign in and sign out handlers
  const handleSignIn = () => {
    tokenClient.requestAccessToken(); // Must be called in response to user interaction
  };

  const handleSignOut = () => {
    google.accounts.oauth2.revoke(accessToken, () => {
      setIsSignedIn(false);
      setAccessToken(null);
    });
  };

  // Save photos to Google Drive
  const savePhotos = () => {
    if (!isSignedIn) {
      alert('Please sign in to Google to save photos to Drive.');
      return;
    }

    if (!accessToken) {
      alert('Access token is not available. Please sign in again.');
      return;
    }

    photos.forEach((photo, index) => {
      const fileName = `photo_${index + 1}.png`;
      uploadFile(photo, fileName);
    });
  };

  // Upload a file to Google Drive using fetch
  const uploadFile = (photoDataURL, fileName) => {
    const contentType = 'image/png';
    const metadata = {
      name: fileName,
      mimeType: contentType,
      parents: ['YOUR-FOLDER-ID'], // Replace with your folder ID
    };

    const base64Data = photoDataURL.split(',')[1];

    const form = new FormData();
    const blob = b64toBlob(base64Data, contentType);

    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', blob);

    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
      body: form,
    })
      .then((response) => response.json())
      .then((value) => {
        console.log('File uploaded successfully:', value);
      })
      .catch((error) => {
        console.error('Error uploading file:', error);
      });
  };

  // Helper function to convert base64 to Blob
  const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  };

  return (
    <div>
      {!isSignedIn ? (
        <button onClick={handleSignIn}>Sign in with Google</button>
      ) : (
        <button onClick={handleSignOut}>Sign out</button>
      )}
      <video ref={videoRef} style={{ width: '100%' }} />
      <button onClick={takePicture}>Take Picture</button>
      <button onClick={savePhotos}>Save Photos to Google Drive</button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default Camera;