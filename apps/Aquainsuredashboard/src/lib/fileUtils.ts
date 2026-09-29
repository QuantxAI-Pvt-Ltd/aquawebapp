/**
 * File & Media utility functions for AquaInsure Admin Dashboard.
 * Universally resolves SeaweedFS Filer streams, MediaObjects, S3 keys, and legacy URLs.
 */
import { API_BASE } from './api';

export function resolveMediaUrl(media: any): string | null {
  if (!media) return null;

  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001')
    : (API_BASE || 'http://localhost:5001');

  // 1. MediaObject with url or key property
  if (typeof media === 'object') {
    if (media.url && typeof media.url === 'string') {
      return resolveMediaUrl(media.url);
    }
    if (media.key && typeof media.key === 'string') {
      return `${base}/api/media/stream?key=${encodeURIComponent(media.key)}`;
    }
  }

  if (typeof media === 'string') {
    const trimmed = media.trim();
    if (!trimmed) return null;

    // Intercept legacy SeaweedFS S3 gateway URLs (:8333) to prevent socket timeouts
    if (trimmed.includes(':8333')) {
      try {
        const urlObj = new URL(trimmed);
        let cleanKey = urlObj.pathname.replace(/^\/+/, '');
        if (cleanKey.startsWith('aquainsure/')) {
          cleanKey = cleanKey.replace(/^aquainsure\//, '');
        }
        return `${base}/api/media/stream?key=${encodeURIComponent(cleanKey)}`;
      } catch {
        // Continue to standard URL handling if parsing fails
      }
    }

    // Auto-heal corrupted data URI wrappers around relative stream endpoints
    if (
      trimmed.startsWith('data:image/jpeg;base64,/api/media/stream') ||
      trimmed.startsWith('data:image/png;base64,/api/media/stream') ||
      trimmed.startsWith('data:image/webp;base64,/api/media/stream')
    ) {
      const match = trimmed.match(/\/api\/media\/stream.+$/);
      if (match) return `${base}${match[0]}`;
    }

    // Relative /api/media/stream endpoint
    if (trimmed.startsWith('/api/media/stream')) {
      return `${base}${trimmed}`;
    }

    // Already an absolute HTTP(S), blob, or valid data URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('data:')) {
      if (trimmed.includes('/api/media/stream')) {
        const match = trimmed.match(/\/api\/media\/stream.+$/);
        if (match) return `${base}${match[0]}`;
      }
      return trimmed;
    }

    if (trimmed.startsWith('/')) {
      return `${base}${trimmed}`;
    }

    // SeaweedFS volume FID or S3/Filer key
    if (
      /^\d+,[0-9a-zA-Z]+$/.test(trimmed) ||
      ((trimmed.startsWith('farmers/') ||
        trimmed.startsWith('farms/') ||
        trimmed.startsWith('ponds/') ||
        trimmed.startsWith('claims/') ||
        trimmed.startsWith('aquainsure/')) &&
        trimmed.length < 500)
    ) {
      return `${base}/api/media/stream?key=${encodeURIComponent(trimmed)}`;
    }

    // Raw Base64 string fallback
    return `data:image/jpeg;base64,${trimmed}`;
  }

  return null;
}
