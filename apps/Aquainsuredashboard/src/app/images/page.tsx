'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ImageIcon, Download, ExternalLink } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';
import type { ImageItem, Pagination, ApiResponse } from '@/types';

const IMAGE_SOURCES = [
  { value: 'farmer-photo', label: 'Farmer Profile Photos' },
  { value: 'aadhar-card', label: 'Aadhaar Documents' },
  { value: 'pan-card', label: 'PAN Documents' },
  { value: 'reg-cert', label: 'Registration Certificates' },
  { value: 'farm-photo', label: 'Farm Photos' },
  { value: 'pond-photo', label: 'Pond Photos' },
  { value: 'shrimp-photo', label: 'Shrimp Health Photos' },
];

export default function ImagesPage() {
  const [source, setSource] = useState('farmer-photo');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          source,
          page: String(pagination.page),
          limit: String(pagination.limit),
        });
        const json = await apiFetch<ApiResponse<ImageItem[]>>(`/api/dashboard/images/list?${params}`);
        if (!ignore && json.success) {
          setImages(json.data);
          if (json.pagination) {
            setPagination(json.pagination);
          }
        }
      } catch (err) {
        if (!ignore) console.error('Failed to fetch images:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [source, pagination.page, pagination.limit]);

  const handleSourceChange = (newSource: string | null) => {
    if (newSource && newSource !== source) {
      setSource(newSource);
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Source:</span>
          </div>
          <Select value={source} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-[240px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground font-medium">
            {pagination.total} item{pagination.total !== 1 ? 's' : ''} found
          </div>
        </CardContent>
      </Card>

      {/* ── Image Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No files or images found for this category
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {images.map((img) => (
            <button
              key={img._id}
              onClick={() => setSelectedImage(img)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-card/60 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {img.image?.toLowerCase().endsWith('.pdf') ? (
                <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 p-2 text-center">
                  <ImageIcon className="h-8 w-8 text-cyan-400 mb-1" />
                  <span className="text-[11px] font-medium text-foreground">PDF Document</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={img.image}
                  alt={img.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-2.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 text-left">
                <p className="truncate text-xs font-medium text-white">
                  {img.label}
                </p>
                <p className="truncate text-[10px] text-white/70">
                  {img.sublabel}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Image Preview Modal ────────────────────────────────────────────── */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-semibold">{selectedImage?.label}</DialogTitle>
              {selectedImage?.image && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => window.open(selectedImage.image, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedImage.image;
                      link.download = selectedImage.label || 'download';
                      link.click();
                    }}
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4 px-6 py-5">
              {/* Media Display */}
              <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background flex items-center justify-center min-h-[300px]">
                {selectedImage.image?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={selectedImage.image}
                    className="w-full h-[55vh] rounded-lg"
                    title={selectedImage.label}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedImage.image}
                    alt={selectedImage.label}
                    className="mx-auto max-h-[55vh] w-auto object-contain"
                  />
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                <MetaItem label="Source" value={IMAGE_SOURCES.find(s => s.value === selectedImage.source)?.label || selectedImage.source} />
                <MetaItem label="Title" value={selectedImage.label} />
                <MetaItem label="Associated With" value={selectedImage.sublabel} />
                <MetaItem label="Uploaded" value={formatDateTime(selectedImage.timestamp)} />
                {selectedImage.meta && Object.entries(selectedImage.meta).map(([key, val]) => (
                  <MetaItem key={key} label={key} value={String(val)} />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-medium text-foreground truncate">{value || '—'}</p>
    </div>
  );
}

