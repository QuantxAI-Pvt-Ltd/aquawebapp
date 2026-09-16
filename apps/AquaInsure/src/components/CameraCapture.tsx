import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  title?: string;
  facingMode?: 'user' | 'environment';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onCapture, 
  onClose, 
  title = "Capture Photo",
  facingMode = 'user' 
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [currentFacingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stopCamera();
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(err.name === 'NotAllowedError' ? "Permission denied" : "Camera not accessible");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);

      // Convert dataUrl to File
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
        });
    }
  };

  const confirmPhoto = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
  };

  const switchCamera = () => {
    setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 z-10 text-white bg-black/40 backdrop-blur-md">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-2 -mr-2 bg-white/10 rounded-full">
          <X size={24} />
        </button>
      </div>

      {/* Main Feature Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} className="text-red-500" />
            </div>
            <p className="text-lg font-bold mb-2">{error}</p>
            <p className="text-white/60 mb-6">Please allow camera access in your settings.</p>
            <Button onClick={startCamera}>{t("common.retry") || "Retry"}</Button>
          </div>
        ) : capturedImage ? (
          <motion.img 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            src={capturedImage} 
            className="w-full h-full object-cover" 
            alt="Captured" 
          />
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Shutter UI Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[1.5px] border-white/20 m-6 rounded-3xl" />
          </>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 pt-6 pb-10 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
          {capturedImage ? (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={retake}
                className="w-16 h-16 rounded-full bg-white/10 flex flex-col items-center justify-center gap-1 text-white border border-white/10"
              >
                <RotateCcw size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t("common.retake") || "Retake"}</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={confirmPhoto}
                className="flex-1 h-16 rounded-full bg-teal-500 flex items-center justify-center gap-3 text-white font-bold"
                style={{
                  boxShadow: '0 8px 32px -4px rgba(45, 155, 127, 0.4)'
                }}
              >
                <Check size={28} />
                <span>{t("common.usePhoto") || "Use Photo"}</span>
              </motion.button>
            </>
          ) : (
            <>
              <div className="w-16" /> {/* Placeholder for mobile symmetry */}
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white p-1 bg-transparent"
              >
                <div className="w-full h-full rounded-full bg-white transition-opacity active:opacity-60" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={switchCamera}
                className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10"
              >
                <RefreshCw size={24} />
              </motion.button>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
