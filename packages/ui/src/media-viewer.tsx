'use client';

import React from 'react';
import { X, Download, ExternalLink, Film, FileText, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  title?: string;
  mimeType?: string;
  description?: string;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  title = 'Media Viewer',
  mimeType,
  description,
}) => {
  if (!isOpen || !mediaUrl) return null;

  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(mediaUrl);
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(mediaUrl);
  const isImage = !isVideo && !isPdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-[#0c1527] border border-cyan-500/30 shadow-2xl shadow-cyan-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070c14]/60">
          <div className="flex items-center gap-2.5">
            {isVideo ? (
              <Film className="w-5 h-5 text-teal-400" />
            ) : isPdf ? (
              <FileText className="w-5 h-5 text-cyan-400" />
            ) : (
              <ImageIcon className="w-5 h-5 text-cyan-400" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              {description && <p className="text-xs text-slate-400">{description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              title="Open in new tab / Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-4 bg-[#070c14] overflow-auto min-h-[300px]">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[70vh] w-auto max-w-full rounded-xl border border-slate-800 shadow-lg"
            >
              Your browser does not support the video tag.
            </video>
          ) : isPdf ? (
            <iframe
              src={mediaUrl}
              className="w-full h-[70vh] rounded-xl border border-slate-800 bg-white"
              title={title}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={title}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800/80"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#070c14]/40 text-xs text-slate-400">
          <span className="font-mono truncate max-w-md">{mediaUrl}</span>
          <span className="text-teal-400 font-medium">SeaweedFS S3 Storage</span>
        </div>
      </div>
    </div>
  );
};
