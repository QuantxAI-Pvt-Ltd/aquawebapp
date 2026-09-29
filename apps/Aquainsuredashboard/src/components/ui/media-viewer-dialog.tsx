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
  Maximize2,
  Minimize2,
  Columns,
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
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
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
      <DialogContent
        className={`transition-all duration-200 overflow-hidden bg-card border-border/80 p-0 shadow-2xl flex flex-col ${
          isFullscreenMode
            ? 'w-[99vw] max-w-[99vw] h-[98vh] max-h-[98vh] rounded-lg'
            : 'w-[96vw] max-w-[96vw] 2xl:max-w-[1600px] h-[92vh] max-h-[94vh] rounded-2xl'
        }`}
      >
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/50 bg-background/90 backdrop-blur-md shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {inferredType === 'video' ? (
                  <VideoIcon className="h-4 w-4 text-rose-400" />
                ) : inferredType === 'document' ? (
                  <FileText className="h-4 w-4 text-amber-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                )}
                <DialogTitle className="text-base font-bold text-foreground">
                  {media.title}
                </DialogTitle>
                {media.category && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                    {media.category}
                  </Badge>
                )}
                {media.dayNumber !== undefined && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono">
                    Day {media.dayNumber}
                  </Badge>
                )}
                {media.pondName && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    • 📍 {media.pondName}
                  </span>
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
                onClick={() => setIsFullscreenMode(!isFullscreenMode)}
                title={isFullscreenMode ? 'Standard Width' : 'Expand Widescreen'}
              >
                {isFullscreenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isFullscreenMode ? 'Compact' : 'Widescreen'}</span>
              </Button>
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

        {/* ── Main Media Display Canvas (Expansive Horizontal Layout) ── */}
        <div className="relative flex-1 overflow-hidden bg-black/95 p-3 flex items-center justify-center w-full min-h-0">
          {inferredType === 'video' ? (
            <div className="w-full h-full max-w-6xl flex flex-col items-center justify-center gap-2">
              <video
                ref={videoRef}
                src={url}
                controls
                playsInline
                autoPlay
                className="h-full max-h-[75vh] w-full rounded-xl bg-black object-contain shadow-2xl border border-white/10"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          ) : inferredType === 'document' ? (
            <div className="w-full h-full min-h-[70vh] rounded-xl overflow-hidden bg-white shadow-2xl flex flex-col">
              <iframe
                src={url}
                className="w-full flex-1 h-full min-h-[70vh] border-0"
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
                className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
              />
            </div>
          )}
        </div>

        {/* ── Bottom Control Bar (Horizontal Bar) ── */}
        <div className="px-5 py-3 border-t border-border/50 bg-background/95 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {inferredType === 'image' ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono mr-1">Zoom: {Math.round(zoom * 100)}%</span>
              <Button variant="secondary" size="sm" className="h-7 px-2.5" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="secondary" size="sm" className="h-7 px-2.5" onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium" onClick={handleResetZoom}>
                Reset 100%
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button variant="outline" size="sm" className="h-7 px-2.5 gap-1.5" onClick={handleRotate}>
                <RotateCw className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">{rotation}°</span>
              </Button>
            </div>
          ) : inferredType === 'video' ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="h-7 px-3 gap-1.5 font-medium" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2.5" onClick={handleRestartVideo} title="Restart from beginning">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <span className="text-muted-foreground mr-1">Playback Speed:</span>
              {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
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
              <FileText className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-foreground">Interactive Document / Lab Report Reader</span>
              <span className="text-[11px]">• Supports scroll, PDF zoom & print</span>
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
