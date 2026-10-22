'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, Upload, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string, hash: string) => void;
  title?: string;
  instruction?: string;
  overlayText?: string;
  captureType?: 'odometer' | 'receipt' | 'general';
}

export function CameraCapture({
  onCapture,
  title = 'Photograph Odometer Dashboard',
  instruction = 'Position the camera directly in front of the vehicle odometer. Ensure numbers are well lit and clearly legible.',
  overlayText,
  captureType = 'odometer',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Resolved dynamic overlay text based on captureType
  const defaultOverlay =
    captureType === 'receipt'
      ? 'Frame Fuel Receipt Clearly Here'
      : 'Center Odometer Digits Here';
  const effectiveOverlayText = overlayText || defaultOverlay;

  // Reliable stream attachment helper
  const attachStreamToVideo = () => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      video
        .play()
        .catch((err) => console.warn('Camera video play error:', err));
    }
  };

  // Ensure stream is attached whenever cameraActive becomes true
  useEffect(() => {
    if (cameraActive) {
      attachStreamToVideo();
    }
  }, [cameraActive]);

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser. Please use the file upload fallback.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Small timeout to guarantee DOM video node is present if just rendered
      setTimeout(() => {
        attachStreamToVideo();
      }, 50);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Camera error:', error);
      setErrorMsg(error.message || 'Camera permission denied or camera not available. Use file upload fallback.');
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Compute SHA-256 Hash of Data URL
  const computeSha256 = async (dataUrl: string): Promise<string> => {
    try {
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return `hash-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
  };

  // Capture frame
  const takeSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setCapturedImage(dataUrl);
  };

  // Handle fallback file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    const hash = await computeSha256(capturedImage);
    setIsProcessing(false);
    onCapture(capturedImage, hash);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{instruction}</p>
      </div>

      {/* Captured Image Preview */}
      {capturedImage ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured evidence" className="max-h-full object-contain" />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded backdrop-blur">
              Photo Preview
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Retake Photo
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4 text-emerald-400" /> Confirm & Process
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cameraActive ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Target Framing Overlay */}
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-400/80 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-300 bg-black/60 px-2 py-0.5 rounded">
                  {effectiveOverlayText}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-800 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Ready to capture photo</p>
                <p className="text-xs text-slate-500">Tap below to launch live camera or select file</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-2.5 px-4 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 flex items-center justify-center gap-2 shadow-sm"
              >
                <Camera className="w-4 h-4" /> Open Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={takeSnapshot}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm"
              >
                <Camera className="w-4 h-4" /> Capture Snapshot
              </button>
            )}

            <label className="flex-1 py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-slate-500" /> Choose Image File
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
