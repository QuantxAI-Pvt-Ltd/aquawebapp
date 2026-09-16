/**
 * File utility functions for SeaweedFS S3 storage and legacy conversions.
 */

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

  try {
    // 1. Request S3 presigned PUT URL
    const presignRes = await fetch('/api/media/presign-upload', {
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
      const putRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (putRes.ok) {
        return {
          url: data.finalUrl,
          key: data.key,
          mimeType: file.type,
          size: file.size,
        };
      }
    }
  } catch (err) {
    console.warn('[SeaweedFS] Direct S3 upload failed, attempting streaming fallback:', err);
  }

  // 2. Fallback to multipart stream through backend
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const streamRes = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
    });

    if (streamRes.ok) {
      const { data } = await streamRes.json();
      return data;
    }
  } catch (err) {
    console.error('[SeaweedFS] Backend upload fallback failed:', err);
  }

  // 3. Fallback to base64 if storage is completely unreachable
  const b64 = await fileToBase64(file);
  return b64 ? { url: b64, key: '', mimeType: file.type, size: file.size } : null;
}
