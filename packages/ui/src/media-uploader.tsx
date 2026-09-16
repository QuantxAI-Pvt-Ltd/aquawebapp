'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File, Film, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface UploadedMediaResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

export interface MediaUploaderProps {
  apiBaseUrl?: string;
  folder?: string;
  accept?: string;
  maxSizeBytes?: number; // default: 50MB
  onUploadSuccess?: (result: UploadedMediaResult) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  label?: string;
  description?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  apiBaseUrl = 'http://localhost:5001',
  folder = 'general',
  accept = 'image/*,video/*,application/pdf',
  maxSizeBytes = 50 * 1024 * 1024,
  onUploadSuccess,
  onUploadError,
  className,
  label = 'Upload Media Document',
  description = 'Drag and drop image, sampling video or PDF bill',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<UploadedMediaResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeBytes) {
      const err = `File size exceeds maximum allowed ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`;
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setProgress(10);

    // Create local preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    try {
      // Step 1: Request S3 presigned URL from backend
      setProgress(25);
      const presignRes = await fetch(`${apiBaseUrl}/api/media/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          folder,
        }),
      });

      if (presignRes.ok) {
        const { data } = await presignRes.json();
        setProgress(45);

        // Step 2: Upload directly to SeaweedFS via presigned S3 PUT
        const uploadRes = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Direct storage upload failed with status ${uploadRes.status}`);
        }

        setProgress(100);
        const result: UploadedMediaResult = {
          url: data.finalUrl,
          key: data.key,
          mimeType: file.type,
          size: file.size,
        };

        setUploadedResult(result);
        onUploadSuccess?.(result);
      } else {
        // Fallback: Upload via backend multipart stream if presign is unavailable
        setProgress(50);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const backendUploadRes = await fetch(`${apiBaseUrl}/api/media/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!backendUploadRes.ok) {
          throw new Error(`Upload failed with status ${backendUploadRes.status}`);
        }

        const { data } = await backendUploadRes.json();
        setProgress(100);

        const result: UploadedMediaResult = {
          url: data.url,
          key: data.key,
          mimeType: data.mimeType,
          size: data.size,
        };

        setUploadedResult(result);
        onUploadSuccess?.(result);
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      const msg = err.message || 'Upload failed. Please try again.';
      setErrorMessage(msg);
      onUploadError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const clearUpload = () => {
    setUploadedResult(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFile(file);
          }
        }}
      />

      {!uploadedResult ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer select-none',
            'bg-[#0c1527]/50 border-cyan-500/30 hover:border-cyan-400 hover:bg-[#0c1527]/80',
            isDragging && 'border-cyan-400 bg-cyan-950/30 scale-[0.99]',
            isUploading && 'cursor-not-allowed opacity-80'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="text-sm font-medium text-cyan-200">
                Streaming to SeaweedFS... {progress}%
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100">{label}</h4>
              <p className="text-xs text-slate-400 mt-1 text-center">{description}</p>
            </>
          )}

          {errorMessage && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-14 h-14 object-cover rounded-xl border border-cyan-500/30"
            />
          ) : uploadedResult.mimeType.startsWith('video/') ? (
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Film className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <File className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Stored in SeaweedFS</span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5 font-mono">{uploadedResult.key}</p>
            <p className="text-[11px] text-slate-500">
              {(uploadedResult.size / 1024).toFixed(1)} KB • S3 Direct
            </p>
          </div>

          <button
            type="button"
            onClick={clearUpload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
