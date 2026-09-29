'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
} from 'lucide-react';

export interface MediaViewerTarget {
  title: string;
  url: string;
  type?: 'image' | 'video' | 'document' | 'auto';
  subtitle?: string;
  category?: string;
  dayNumber?: number;
  pondName?: string;
  timestamp?: string;
}

interface MediaViewerDialogProps {
  media: MediaViewerTarget | null;
  onClose: () => void;
}

export function MediaViewerDialog({ media, onClose }: MediaViewerDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset controls when media changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPlaybackRate(1);
    setIsPlaying(false);
  }, [media?.url]);

  if (!media) return null;

  const url = media.url;
  const lowerUrl = url.toLowerCase();

  // Detect media type
  let inferredType = media.type || 'auto';
  if (inferredType === 'auto') {
    if (
      lowerUrl.endsWith('.mp4') ||
      lowerUrl.endsWith('.webm') ||
      lowerUrl.endsWith('.mov') ||
      lowerUrl.includes('video')
    ) {
      inferredType = 'video';
    } else if (
      lowerUrl.endsWith('.pdf') ||
      lowerUrl.includes('application/pdf') ||
      lowerUrl.includes('.doc')
    ) {
      inferredType = 'document';
    } else {
      inferredType = 'image';
    }
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleRestartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <Dialog open={!!media} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden bg-card border-border/80 p-0 shadow-2xl flex flex-col">
        {/* ── Dialog Header ── */}
        <DialogHeader className="p-4 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {inferredType === 'video' ? (
                  <VideoIcon className="h-4 w-4 text-rose-400" />
                ) : inferredType === 'document' ? (
                  <FileText className="h-4 w-4 text-amber-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                )}
                <DialogTitle className="text-base font-semibold text-foreground">
                  {media.title}
                </DialogTitle>
                {media.category && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                    {media.category}
                  </Badge>
                )}
                {media.dayNumber !== undefined && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                    Day {media.dayNumber}
                  </Badge>
                )}
              </div>
              {media.subtitle && (
                <p className="text-xs text-muted-foreground">{media.subtitle}</p>
              )}
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => window.open(url, '_blank')}
                title="Open in new window"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </Button>
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2.5 text-xs font-medium transition-colors"
                title="Download original file"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>
        </DialogHeader>

        {/* ── Main Media Display Area ── */}
        <div className="relative flex-1 overflow-auto bg-black/90 p-4 min-h-[420px] max-h-[calc(92vh-130px)] flex items-center justify-center">
          {inferredType === 'video' ? (
            <div className="w-full max-w-4xl flex flex-col items-center gap-3">
              <video
                ref={videoRef}
                src={url}
                controls
                playsInline
                className="max-h-[62vh] w-full rounded-xl bg-black object-contain shadow-2xl border border-white/10"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          ) : inferredType === 'document' ? (
            <div className="w-full h-full min-h-[62vh] rounded-xl overflow-hidden bg-white shadow-xl">
              <iframe
                src={url}
                className="w-full h-full min-h-[62vh] border-0"
                title={media.title}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={media.title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
              />
            </div>
          )}
        </div>

        {/* ── Bottom Control Bar ── */}
        <div className="p-3 border-t border-border/50 bg-background/90 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {inferredType === 'image' ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono mr-1">Zoom: {Math.round(zoom * 100)}%</span>
              <Button variant="secondary" size="sm" className="h-7 px-2" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="secondary" size="sm" className="h-7 px-2" onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleResetZoom}>
                Reset
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button variant="outline" size="sm" className="h-7 px-2 gap-1" onClick={handleRotate}>
                <RotateCw className="h-3.5 w-3.5" />
                <span className="text-[11px]">{rotation}°</span>
              </Button>
            </div>
          ) : inferredType === 'video' ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="h-7 px-2 gap-1.5" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleRestartVideo} title="Restart">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <span className="text-muted-foreground mr-1">Speed:</span>
              {[0.5, 1, 1.5, 2].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackRate === speed ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-[11px] font-mono"
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Document Viewer • PDF / Image Record</span>
            </div>
          )}

          {/* Right side info */}
          <div className="text-[11px] text-muted-foreground flex items-center gap-3">
            {media.pondName && <span className="font-medium text-foreground">📍 {media.pondName}</span>}
            {media.timestamp && <span>{new Date(media.timestamp).toLocaleDateString()}</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
