import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, RotateCcw, Upload, AlertCircle, Image as ImageIcon } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [currentFacingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsPermissionDenied(false);
      if (stream) {
        stopCamera();
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: currentFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn("Camera access warning:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setError("Camera permission was denied. Please allow camera access or choose a photo from your gallery.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera hardware found on this device.");
      } else {
        setError("Camera is currently not accessible. You can upload a photo from your device instead.");
      }
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

    if (context && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // If user facing mode, flip horizontally for mirror preview
      if (currentFacingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Reset transform
      context.setTransform(1, 0, 0, 1, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCapturedImage(previewUrl);
    setCapturedFile(file);
    stopCamera();
  };

  const confirmPhoto = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const retake = () => {
    if (capturedImage && capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
  };

  const switchCamera = () => {
    setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white select-none">
      {/* Hidden file input for gallery upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[max(1.2rem,env(safe-area-inset-top,0px))] pb-4 z-10 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-base tracking-wide text-white">{title}</h3>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 -mr-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors touch-manipulation"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {error ? (
          <div className="text-white text-center px-6 max-w-md mx-auto py-8">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertCircle size={32} />
            </div>
            <h4 className="text-lg font-bold mb-2 text-white">
              {isPermissionDenied ? "Camera Permission Required" : "Camera Unavailable"}
            </h4>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                <span>Upload from Gallery / Files</span>
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={startCamera}
                className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                <span>{t("common.retry") || "Retry Camera"}</span>
              </Button>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img 
              src={capturedImage} 
              alt="Captured preview" 
              className="w-full h-full object-contain max-h-[80vh]" 
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover ${currentFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {/* Viewfinder Target Guide */}
            <div className="absolute inset-8 sm:inset-16 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
              </div>
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="px-6 py-6 pb-[max(1.8rem,calc(1rem+env(safe-area-inset-bottom,0px)))] bg-slate-950/90 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {capturedImage ? (
            <>
              {/* Retake Button */}
              <button
                type="button"
                onClick={retake}
                className="flex flex-col items-center gap-1.5 p-3 text-slate-300 hover:text-white rounded-2xl active:scale-95 transition-all touch-manipulation"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                  <RotateCcw size={22} />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider">{t("common.retake") || "Retake"}</span>
              </button>
              
              {/* Confirm / Use Photo Button */}
              <button
                type="button"
                onClick={confirmPhoto}
                className="flex flex-col items-center gap-1.5 p-3 text-emerald-400 hover:text-emerald-300 rounded-2xl active:scale-95 transition-all touch-manipulation"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400">
                  <Check size={28} className="stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white">{t("common.usePhoto") || "Use Photo"}</span>
              </button>
            </>
          ) : (
            <>
              {/* Gallery Pick Fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Choose from Gallery"
                className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation"
              >
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                  <ImageIcon size={20} />
                </div>
                <span className="text-[10px] font-medium text-slate-400">Gallery</span>
              </button>
              
              {/* Shutter Button */}
              <button
                type="button"
                onClick={takePhoto}
                aria-label="Take Photo"
                className="relative w-18 h-18 p-1 rounded-full border-4 border-white/80 hover:border-white active:scale-90 transition-all flex items-center justify-center touch-manipulation shadow-xl"
              >
                <div className="w-14 h-14 rounded-full bg-white hover:bg-slate-100 transition-colors shadow-inner" />
              </button>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={switchCamera}
                title="Switch Camera"
                className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation"
              >
                <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                  <RefreshCw size={20} />
                </div>
                <span className="text-[10px] font-medium text-slate-400">Flip</span>
              </button>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;


