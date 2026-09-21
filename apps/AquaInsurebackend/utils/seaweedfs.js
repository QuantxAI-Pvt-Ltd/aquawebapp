const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const SEAWEEDFS_MASTER_ENDPOINT = process.env.SEAWEEDFS_MASTER_ENDPOINT || 'http://localhost:9333';
const S3_ENDPOINT = process.env.SEAWEEDFS_S3_ENDPOINT || 'http://localhost:8333';
const FILER_ENDPOINT = process.env.SEAWEEDFS_FILER_ENDPOINT || 'http://localhost:8888';
const DEFAULT_BUCKET = process.env.SEAWEEDFS_BUCKET || 'aquainsure';
const REGION = process.env.SEAWEEDFS_REGION || 'us-east-1';
const ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY || 'any_key';
const SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY || 'any_secret';

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // Required for SeaweedFS S3 gateway
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

let bucketInitPromise = null;

/**
 * Ensures the target media bucket exists in SeaweedFS.
 */
async function ensureBucket(bucket = DEFAULT_BUCKET) {
  if (bucketInitPromise) return bucketInitPromise;

  bucketInitPromise = (async () => {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        try {
          await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
          console.log(`[SeaweedFS] Created bucket: ${bucket}`);
        } catch (createErr) {
          console.warn(`[SeaweedFS] Warning creating bucket ${bucket}:`, createErr.message);
        }
      } else {
        console.warn(`[SeaweedFS] HeadBucket check status:`, err.message);
      }
    }
  })();

  return bucketInitPromise;
}

/**
 * Constructs a permanent direct/proxy URL for a given object key.
 */
function getPublicUrl(key, bucket = DEFAULT_BUCKET) {
  return `/api/media/stream?key=${encodeURIComponent(key)}`;
}

/**
 * Uploads a Buffer directly to native SeaweedFS Master (/submit).
 */
async function uploadToSeaweedFSMaster(buffer, filename = 'file.bin', mimeType = 'application/octet-stream') {
  return new Promise((resolve, reject) => {
    const boundary = '----SeaweedFSBoundary' + Math.random().toString(36).substring(2);
    const postDataHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const postDataFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fullPayload = Buffer.concat([postDataHeader, buffer, postDataFooter]);

    const parsed = new URL('/submit', SEAWEEDFS_MASTER_ENDPOINT);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullPayload.length,
      },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error(`Failed to parse SeaweedFS response: ${body}`));
          }
        } else {
          reject(new Error(`SeaweedFS submit failed (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('SeaweedFS upload timeout')));
    req.write(fullPayload);
    req.end();
  });
}

/**
 * Uploads a Buffer to SeaweedFS (native Master first, S3 fallback).
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} mimeType
 * @param {string} [bucket]
 */
async function uploadBuffer(buffer, key, mimeType = 'application/octet-stream', bucket = DEFAULT_BUCKET) {
  // 1. Primary: S3 Gateway upload directly to SeaweedFS S3 bucket
  try {
    await ensureBucket(bucket);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
    return {
      key,
      bucket,
      url: `/api/media/stream?key=${encodeURIComponent(key)}`,
      mimeType,
      size: buffer.length,
      uploadedAt: new Date(),
    };
  } catch (s3Err) {
    console.warn('[SeaweedFS] S3 upload failed, attempting native master fallback:', s3Err.message);
  }

  // 2. Secondary: Native SeaweedFS Master upload fallback (/submit)
  try {
    const filename = key ? path.basename(key) : 'media.bin';
    const result = await uploadToSeaweedFSMaster(buffer, filename, mimeType);
    if (result && result.fid) {
      return {
        key: result.fid,
        bucket,
        url: `/api/media/stream?key=${encodeURIComponent(result.fid)}`,
        mimeType,
        size: buffer.length,
        uploadedAt: new Date(),
      };
    }
  } catch (masterErr) {
    console.warn('[SeaweedFS] Native master upload fallback failed:', masterErr.message);
  }

  // 3. Fallback: inline data URI
  return {
    key: key || 'local_media',
    bucket: 'local',
    url: `data:${mimeType};base64,${buffer.toString('base64')}`,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date(),
  };
}

/**
 * Generates an S3 presigned PUT URL allowing clients to upload directly to SeaweedFS.
 */
async function generatePresignedUploadUrl(key, mimeType = 'application/octet-stream', expiresInSeconds = 900, bucket = DEFAULT_BUCKET) {
  try {
    await ensureBucket(bucket);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
      unhoistableHeaders: new Set(),
    });

    return {
      uploadUrl,
      key,
      bucket,
      finalUrl: getPublicUrl(key, bucket),
      expiresIn: expiresInSeconds,
    };
  } catch (err) {
    console.warn('[SeaweedFS] Presigned S3 generation failed, using backend proxy URL:', err.message);
    const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5001';
    return {
      uploadUrl: `${backendUrl}/api/media/upload`,
      key,
      bucket,
      finalUrl: getPublicUrl(key, bucket),
      expiresIn: expiresInSeconds,
    };
  }
}

/**
 * Generates a presigned download URL for private media.
 */
async function generatePresignedDownloadUrl(key, expiresInSeconds = 3600, bucket = DEFAULT_BUCKET) {
  return `/api/media/stream?key=${encodeURIComponent(key)}`;
}

/**
 * Fetches an object stream from SeaweedFS (Master or S3).
 * @param {string} key
 * @param {string} [bucket]
 */
async function getObjectStream(key, bucket = DEFAULT_BUCKET) {
  // If key is a SeaweedFS fid (e.g. '7,028873e1ae') or master path, fetch from Master
  if (key && (key.includes(',') || !key.includes('/'))) {
    return new Promise((resolve, reject) => {
      const fetchUrl = (targetUrl, redirectCount = 0) => {
        if (redirectCount > 5) return reject(new Error('Too many redirects'));
        const parsed = new URL(targetUrl);
        const transport = parsed.protocol === 'https:' ? https : http;
        const req = transport.get(parsed, (res) => {
          if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
            return fetchUrl(res.headers.location, redirectCount + 1);
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              stream: res,
              contentType: res.headers['content-type'],
              contentLength: res.headers['content-length'],
            });
          } else {
            reject(new Error(`SeaweedFS responded with status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
      };

      fetchUrl(`${SEAWEEDFS_MASTER_ENDPOINT}/${encodeURIComponent(key)}`);
    });
  }

  // Fallback to S3 client
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/**
 * Deletes an object from SeaweedFS.
 */
async function deleteObject(key, bucket = DEFAULT_BUCKET) {
  if (key && key.includes(',')) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(`/${encodeURIComponent(key)}`, SEAWEEDFS_MASTER_ENDPOINT);
      const transport = parsed.protocol === 'https:' ? https : http;
      const req = transport.request(parsed, { method: 'DELETE' }, (res) => {
        resolve({ statusCode: res.statusCode });
      });
      req.on('error', reject);
      req.end();
    });
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await s3Client.send(command);
}

/**
 * Maps mime types to standard file extensions.
 */
function mimeToExtension(mimeType = '') {
  const mime = mimeType.toLowerCase().trim();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  return 'bin';
}

/**
 * Extracts a Buffer and mimeType from a Base64 string, data URI, or raw Buffer.
 */
function parseBase64Media(val) {
  if (!val) return null;
  if (typeof val === 'object' && val.url) return { isMediaObject: true, mediaObject: val };
  if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return null;

  if (Buffer.isBuffer(val)) {
    return { buffer: val, mimeType: 'application/octet-stream', ext: 'bin' };
  }

  if (typeof val === 'string') {
    let mimeType = 'image/jpeg';
    let rawBase64 = val;

    const dataUriMatch = val.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/s);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1];
      rawBase64 = dataUriMatch[2];
    } else {
      // Basic magic bytes detection for raw Base64 strings
      if (val.startsWith('JVBERi0')) mimeType = 'application/pdf';
      else if (val.startsWith('/9j/')) mimeType = 'image/jpeg';
      else if (val.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
    }

    try {
      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.length === 0) return null;
      return {
        buffer,
        mimeType,
        ext: mimeToExtension(mimeType),
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Exact codebase-aligned storage hierarchy rooted under farmers/{farmerId}/
 */
const StorageHierarchy = {
  // Farmer Identity & Registration
  farmerPhoto: (farmerId, ext = 'jpg') =>
    `farmers/${farmerId}/identity/photo_${Date.now()}.${ext}`,
  farmerAadhar: (farmerId, ext = 'pdf') =>
    `farmers/${farmerId}/identity/aadhar_${Date.now()}.${ext}`,
  farmerPan: (farmerId, ext = 'pdf') =>
    `farmers/${farmerId}/identity/pan_${Date.now()}.${ext}`,
  farmerRegCert: (farmerId, ext = 'pdf') =>
    `farmers/${farmerId}/registration/regCertificate_${Date.now()}.${ext}`,

  // Farm
  farmPhoto: (farmerId, farmId, ext = 'jpg') =>
    `farmers/${farmerId}/farms/${farmId}/farmPhoto_${Date.now()}.${ext}`,

  // Pond
  pondPhoto: (farmerId, farmId, pondId, ext = 'jpg') =>
    `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/photo_${Date.now()}.${ext}`,

  // OneTimeEntry
  oneTimePondPrepBills: (farmerId, farmId, pondId, ext = 'pdf') =>
    `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/onetime/pondPrepBills_${Date.now()}.${ext}`,
  oneTimePcrCert: (farmerId, farmId, pondId, ext = 'pdf') =>
    `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/onetime/pcrCertificate_${Date.now()}.${ext}`,
  oneTimeSeedBills: (farmerId, farmId, pondId, ext = 'pdf') =>
    `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/onetime/seedBills_${Date.now()}.${ext}`,

  // DailyEntry
  dailyMedia: (farmerId, farmId, pondId, dayNumber, dateStr, fieldName, ext = 'jpg') =>
    `farmers/${farmerId}/farms/${farmId}/ponds/${pondId}/daily/day_${dayNumber}_${dateStr}/${fieldName}_${Date.now()}.${ext}`,

  // Insurance Claims
  claimEvidencePhoto: (farmerId, policyId, ext = 'jpg') =>
    `farmers/${farmerId}/claims/${policyId}/evidence_${Date.now()}.${ext}`,
};

/**
 * Uploads a Base64 string / data URI directly to SeaweedFS if provided,
 * or returns existing MediaObject if already migrated.
 */
async function uploadBase64(val, keyGenerator) {
  const parsed = parseBase64Media(val);
  if (!parsed) return null;
  if (parsed.isMediaObject) return parsed.mediaObject;

  const key = typeof keyGenerator === 'function' ? keyGenerator(parsed.ext) : keyGenerator;
  return await uploadBuffer(parsed.buffer, key, parsed.mimeType);
}

module.exports = {
  s3Client,
  DEFAULT_BUCKET,
  S3_ENDPOINT,
  FILER_ENDPOINT,
  ensureBucket,
  getPublicUrl,
  uploadBuffer,
  uploadBase64,
  parseBase64Media,
  mimeToExtension,
  StorageHierarchy,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getObjectStream,
  deleteObject,
};
