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
 * Converts a standard browser File object into a Base64 string (legacy fallback).
 */
export const fileToBase64 = (file: File | null | undefined): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!file) {
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
 * Uploads a file directly to SeaweedFS distributed storage via S3 Presigned URL,
 * with graceful fallback to backend streaming proxy.
 *
 * @param file - The browser File object
 * @param folder - Destination folder key prefix (e.g. 'sampling-videos', 'kyc', 'bills')
 * @returns MediaObject metadata { url, key, mimeType, size }
 */
export async function uploadToSeaweedFS(
  file: File | null | undefined,
  folder = 'general'
): Promise<MediaObjectResult | null> {
  if (!file) return null;

  // 1. Upload multipart stream through backend (avoids direct browser-to-storage CORS preflight issues)
  try {
    const formData = new FormData();
    formData.append('file', file);
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
          mimeType: data.mimeType || file.type,
          size: data.size || file.size,
        };
      }
    }
  } catch (err) {
    console.warn('[SeaweedFS] Backend upload proxy failed:', err);
  }

  // 2. Fallback to base64 if backend storage is completely unreachable
  const b64 = await fileToBase64(file);
  return b64 ? { url: b64, key: '', mimeType: file.type, size: file.size } : null;
}
