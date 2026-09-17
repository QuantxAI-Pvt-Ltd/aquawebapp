const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const S3_ENDPOINT = process.env.SEAWEEDFS_S3_ENDPOINT || 'http://localhost:8333';
const FILER_ENDPOINT = process.env.SEAWEEDFS_FILER_ENDPOINT || 'http://localhost:8888';
const DEFAULT_BUCKET = process.env.SEAWEEDFS_BUCKET || 'aquainsure-media';
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
  // Can be configured to direct Filer URL or S3 gateway URL
  return `${S3_ENDPOINT}/${bucket}/${key}`;
}

/**
 * Uploads a Buffer directly to SeaweedFS via S3 API.
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} mimeType
 * @param {string} [bucket]
 */
async function uploadBuffer(buffer, key, mimeType = 'application/octet-stream', bucket = DEFAULT_BUCKET) {
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
    url: getPublicUrl(key, bucket),
    mimeType,
    size: buffer.length,
    uploadedAt: new Date(),
  };
}

/**
 * Generates an S3 presigned PUT URL allowing clients to upload directly to SeaweedFS.
 * @param {string} key
 * @param {string} mimeType
 * @param {number} [expiresInSeconds=900]
 * @param {string} [bucket]
 */
async function generatePresignedUploadUrl(key, mimeType = 'application/octet-stream', expiresInSeconds = 900, bucket = DEFAULT_BUCKET) {
  await ensureBucket(bucket);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    key,
    bucket,
    finalUrl: getPublicUrl(key, bucket),
    expiresIn: expiresInSeconds,
  };
}

/**
 * Generates a presigned download URL for private media.
 * @param {string} key
 * @param {number} [expiresInSeconds=3600]
 * @param {string} [bucket]
 */
async function generatePresignedDownloadUrl(key, expiresInSeconds = 3600, bucket = DEFAULT_BUCKET) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Fetches an object stream from SeaweedFS.
 * @param {string} key
 * @param {string} [bucket]
 */
async function getObjectStream(key, bucket = DEFAULT_BUCKET) {
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
 * @param {string} key
 * @param {string} [bucket]
 */
async function deleteObject(key, bucket = DEFAULT_BUCKET) {
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
