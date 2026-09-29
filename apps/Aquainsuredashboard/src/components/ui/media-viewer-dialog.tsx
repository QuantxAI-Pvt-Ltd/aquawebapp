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
  Waves,
  Calendar,
  Info,
  Copy,
  Check,
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
  metrics?: {
    do?: number;
    ph?: number;
    temperature?: number;
    feedQuantity?: number;
    survival?: number;
    biomass?: number;
    healthStatus?: string;
  };
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
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset controls when media changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPlaybackRate(1);
    setIsPlaying(false);
    setCopied(false);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!media} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] 2xl:!max-w-[1500px] !h-[90vh] !max-h-[92vh] p-0 rounded-2xl bg-card border-border shadow-2xl flex flex-col overflow-hidden">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-6 py-3.5 border-b border-border bg-card/95 backdrop-blur-md shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              {inferredType === 'video' ? (
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                  <VideoIcon className="h-4 w-4" />
                </div>
              ) : inferredType === 'document' ? (
                <div className="h-8 w-8 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-foreground">
                    {media.title}
                  </DialogTitle>
                  {media.category && (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-primary/40 text-primary bg-primary/10">
                      {media.category}
                    </Badge>
                  )}
                  {media.dayNumber !== undefined && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono bg-primary text-white">
                      Day {media.dayNumber}
                    </Badge>
                  )}
                </div>
                {media.subtitle && (
                  <p className="text-xs text-muted-foreground">{media.subtitle}</p>
                )}
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-foreground"
                onClick={handleCopyLink}
                title="Copy Media URL"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-foreground"
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
                className="inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-secondary h-8 px-2.5 text-xs font-medium text-foreground transition-colors"
                title="Download original file"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>
        </DialogHeader>

        {/* ── Main Horizontal Split: Left Viewport (72%) | Right Sidebar (28%) ── */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* ── LEFT: Expansive Media Canvas ── */}
          <div className="flex-1 bg-black/95 relative flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-auto flex items-center justify-center p-3 relative min-h-0">
              {inferredType === 'video' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={url}
                    controls
                    playsInline
                    autoPlay
                    className="max-h-full max-w-full rounded-xl bg-black object-contain shadow-2xl border border-white/10"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              ) : inferredType === 'document' ? (
                <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-2xl">
                  <iframe
                    src={url}
                    className="w-full h-full border-0"
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
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
                  />
                </div>
              )}
            </div>

            {/* Bottom Canvas Toolbar (Image zoom / Video player controls) */}
            <div className="px-4 py-2.5 bg-card/95 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              {inferredType === 'image' ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-[11px]">Zoom: {Math.round(zoom * 100)}%</span>
                  <Button variant="secondary" size="sm" className="h-7 px-2.5 bg-secondary text-foreground" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="secondary" size="sm" className="h-7 px-2.5 bg-secondary text-foreground" onClick={handleZoomIn} disabled={zoom >= 3}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium" onClick={handleResetZoom}>
                    Reset 100%
                  </Button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <Button variant="outline" size="sm" className="h-7 px-2 gap-1 border-border" onClick={handleRotate}>
                    <RotateCw className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold">{rotation}°</span>
                  </Button>
                </div>
              ) : inferredType === 'video' ? (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="h-7 px-3 gap-1.5 font-medium bg-primary text-white" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleRestartVideo} title="Restart">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <span className="text-muted-foreground text-[11px]">Speed:</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                    <Button
                      key={speed}
                      variant={playbackRate === speed ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-7 px-2 text-[11px] font-mono ${playbackRate === speed ? 'bg-primary text-white' : ''}`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Document Preview • SeaweedFS Storage Stream</span>
                </div>
              )}

              <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                {inferredType.toUpperCase()}
              </span>
            </div>
          </div>

          {/* ── RIGHT: Details & Verification Sidebar (Horizontally Adjacent) ── */}
          <div className="w-full lg:w-80 xl:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border p-5 flex flex-col justify-between overflow-y-auto shrink-0 gap-4">
            <div className="space-y-4">
              {/* Header section */}
              <div className="pb-3 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" /> Entry & Evidence Details
                </p>
                <h3 className="text-sm font-bold text-foreground mt-1">
                  {media.title}
                </h3>
              </div>

              {/* Information Cards */}
              <div className="space-y-2.5 text-xs">
                {media.pondName && (
                  <div className="bg-secondary/40 p-3 rounded-xl border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Associated Pond</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Waves className="h-3.5 w-3.5 text-primary" />
                      {media.pondName}
                    </span>
                  </div>
                )}

                {media.dayNumber !== undefined && (
                  <div className="bg-secondary/40 p-3 rounded-xl border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Culture Cycle Day</span>
                    <Badge variant="default" className="font-mono bg-primary text-white">
                      Day {media.dayNumber}
                    </Badge>
                  </div>
                )}

                {media.timestamp && (
                  <div className="bg-secondary/40 p-3 rounded-xl border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Date Logged</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {new Date(media.timestamp).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {media.category && (
                  <div className="bg-secondary/40 p-3 rounded-xl border border-border flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Category</span>
                    <span className="font-semibold text-foreground uppercase text-[11px]">
                      {media.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Operational Metrics if available */}
              {media.metrics && (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Day Operations Log
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {media.metrics.do !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">DO (Oxygen)</span>
                        <span className="font-bold text-primary">{media.metrics.do} mg/L</span>
                      </div>
                    )}
                    {media.metrics.ph !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">pH</span>
                        <span className="font-bold text-foreground">{media.metrics.ph}</span>
                      </div>
                    )}
                    {media.metrics.temperature !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">Temperature</span>
                        <span className="font-bold text-primary">{media.metrics.temperature}°C</span>
                      </div>
                    )}
                    {media.metrics.feedQuantity !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">Feed Given</span>
                        <span className="font-bold text-foreground">{media.metrics.feedQuantity} kg</span>
                      </div>
                    )}
                    {media.metrics.survival !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">Survival Rate</span>
                        <span className="font-bold text-primary">{media.metrics.survival}%</span>
                      </div>
                    )}
                    {media.metrics.biomass !== undefined && (
                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground block">Biomass</span>
                        <span className="font-bold text-primary">{media.metrics.biomass} kg</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-border space-y-2">
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white h-10 text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="h-4 w-4" /> Download Original File
              </a>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs gap-1.5 border-border hover:bg-secondary text-foreground"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in Full Browser Tab
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
