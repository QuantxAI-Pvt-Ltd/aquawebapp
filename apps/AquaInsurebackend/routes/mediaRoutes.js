const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadBuffer,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  getObjectStream,
  deleteObject,
  DEFAULT_BUCKET,
} = require('../utils/seaweedfs');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max (covers video uploads)
});

/**
 * Helper to clean filename and generate a structured S3 key.
 */
function generateKey(folder = 'general', filename = 'file') {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename) || '';
  const base = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `aquainsure/${folder}/${timestamp}_${randomStr}_${base}${ext}`;
}

/**
 * @route   POST /api/media/presign-upload
 * @desc    Get an S3 presigned PUT URL to upload directly from the client to SeaweedFS
 */
router.post('/presign-upload', async (req, res) => {
  try {
    const { filename, mimeType, folder = 'general' } = req.body;

    if (!mimeType) {
      return res.status(400).json({ success: false, error: 'mimeType is required' });
    }

    const key = generateKey(folder, filename || 'file');
    const result = await generatePresignedUploadUrl(key, mimeType, 900); // 15 mins validity

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        finalUrl: result.finalUrl,
        bucket: result.bucket,
        expiresIn: result.expiresIn,
      },
    });
  } catch (err) {
    console.error('Error generating presigned upload URL:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/media/upload
 * @desc    Upload multipart file through backend directly into SeaweedFS
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'general';
    const key = generateKey(folder, req.file.originalname);
    const mediaObject = await uploadBuffer(req.file.buffer, key, req.file.mimetype);

    res.status(201).json({
      success: true,
      data: mediaObject,
    });
  } catch (err) {
    console.error('Error uploading file to SeaweedFS:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/media/stream?key=...
 * @desc    Stream or proxy media from SeaweedFS
 */
router.get('/stream', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ success: false, error: 'key query parameter is required' });
    }

    const { stream, contentType, contentLength } = await getObjectStream(key);

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    stream.pipe(res);
  } catch (err) {
    console.error('Error streaming media:', err);
    res.status(404).json({ success: false, error: 'Media not found or inaccessible' });
  }
});

const { requireAuth } = require('../middleware/auth');

/**
 * @route   DELETE /api/media?key=...
 * @desc    Delete media from SeaweedFS
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const key = req.query.key || req.body?.key;
    if (!key) {
      return res.status(400).json({ success: false, error: 'key is required' });
    }

    // Ensure non-admins can only delete files in their own farmer folder
    if (req.user.farmerId && !key.startsWith(`farmers/${req.user.farmerId}/`) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden. You can only delete your own media.' });
    }

    await deleteObject(key);
    res.json({ success: true, message: 'Media deleted' });
  } catch (err) {
    console.error('Error deleting media:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
