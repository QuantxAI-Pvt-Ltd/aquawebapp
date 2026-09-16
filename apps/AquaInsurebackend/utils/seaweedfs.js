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

module.exports = {
  s3Client,
  DEFAULT_BUCKET,
  S3_ENDPOINT,
  FILER_ENDPOINT,
  ensureBucket,
  getPublicUrl,
  uploadBuffer,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getObjectStream,
  deleteObject,
};
