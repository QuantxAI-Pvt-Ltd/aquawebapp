/**
 * File utility functions for SeaweedFS S3 storage and legacy conversions.
 */
import { API_BASE_URL } from './api';

export interface MediaObjectResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

/**
 * Compresses an image file on the client side before upload.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  // If already under 400KB, skip re-compression
  if (file.size < 400 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/**
 * Converts a standard browser File object into a Base64 string (legacy fallback).
 */
export const fileToBase64 = (file: File | string | null | undefined): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (typeof file === 'string') {
      resolve(file);
      return;
    }
    if (!(file instanceof Blob)) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Uploads a file directly to SeaweedFS distributed storage with automatic client-side compression
 * and graceful fallback to backend streaming proxy.
 *
 * @param file - The browser File object
 * @param folder - Destination folder key prefix (e.g. 'farmers/123/kyc', 'farmers/123/farms/abc')
 * @returns MediaObject metadata { url, key, mimeType, size }
 */
export async function uploadToSeaweedFS(
  file: File | null | undefined,
  folder = 'general'
): Promise<MediaObjectResult | null> {
  if (!file) return null;

  // 1. Client-side compress images if applicable
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file);
    } catch {
      fileToUpload = file;
    }
  }

  // 2. Upload multipart stream through backend proxy
  try {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('folder', folder);

    const streamRes = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
    });

    if (streamRes.ok) {
      const { data } = await streamRes.json();
      if (data && (data.url || data.key)) {
        return {
          url: data.url || `/api/media/stream?key=${encodeURIComponent(data.key)}`,
          key: data.key,
          mimeType: data.mimeType || fileToUpload.type,
          size: data.size || fileToUpload.size,
        };
      }
    }
  } catch (err) {
    console.warn('[SeaweedFS] Backend upload proxy failed:', err);
  }

  // 3. Fallback to base64 if backend storage is completely unreachable
  const b64 = await fileToBase64(fileToUpload);
  return b64 ? { url: b64, key: '', mimeType: fileToUpload.type, size: fileToUpload.size } : null;
}

/**
 * Universally resolves any media object, stream endpoint, http url, blob url, data uri,
 * S3 key, SeaweedFS FID, or raw base64 string into a safe, valid image source URL for <img> tags.
 */
export function resolveMediaUrl(media: any): string | null {
  if (!media) return null;

  // 1. MediaObject with url or key property
  if (typeof media === 'object') {
    if (media.url && typeof media.url === 'string') {
      return resolveMediaUrl(media.url);
    }
    if (media.key && typeof media.key === 'string') {
      return `/api/media/stream?key=${encodeURIComponent(media.key)}`;
    }
  }

  if (typeof media === 'string') {
    const trimmed = media.trim();
    if (!trimmed) return null;

    // Auto-heal corrupted data URI wrappers around relative stream endpoints
    if (
      trimmed.startsWith('data:image/jpeg;base64,/api/media/stream') ||
      trimmed.startsWith('data:image/png;base64,/api/media/stream') ||
      trimmed.startsWith('data:image/webp;base64,/api/media/stream')
    ) {
      const match = trimmed.match(/\/api\/media\/stream.+$/);
      if (match) return match[0];
    }

    // 2. Already an HTTP, relative stream, blob, or valid data URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('data:')) {
      if (trimmed.includes('/api/media/stream')) {
        const match = trimmed.match(/\/api\/media\/stream.+$/);
        if (match) return match[0];
      }
      return trimmed;
    }

    // 3. SeaweedFS volume FID or S3 key
    if (
      /^\d+,[0-9a-zA-Z]+$/.test(trimmed) ||
      ((trimmed.startsWith('farmers/') ||
        trimmed.startsWith('farms/') ||
        trimmed.startsWith('ponds/') ||
        trimmed.startsWith('claims/') ||
        trimmed.startsWith('aquainsure/')) &&
        trimmed.length < 500)
    ) {
      return `/api/media/stream?key=${encodeURIComponent(trimmed)}`;
    }

    // 4. Raw Base64 string fallback
    return `data:image/jpeg;base64,${trimmed}`;
  }

  return null;
}
