const express = require('express');
const router = express.Router();
const multer = require('multer');
const Farmer = require('../models/Farmer');
const { isAadhaarDocument, extractAadhaarDetailsFromText } = require('../utils/ocrUtils');
const { spawn } = require('child_process');
const path = require('path');
const pdf = require('pdf-parse');

// Multer: store in memory (we need the buffer for OCR)
const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG, PNG or PDF files are allowed'));
    }
});

const base64ToBuffer = (base64Str) => {
    if (!base64Str) return null;
    // Remove data URL prefix if present (e.g., 'data:image/jpeg;base64,')
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
};

// Helper: run PaddleOCR on image buffer
function runPaddleOCR(imageBuffer) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../utils/paddle_ocr.py');
        const proc = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';
        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        proc.on('close', (code) => {
            if (code !== 0) reject(new Error(`paddle_ocr exited ${code}: ${stderr.trim()}`));
            else resolve(stdout);
        });
        proc.on('error', (err) => reject(new Error(`spawn python3: ${err.message}`)));
        proc.stdin.write(imageBuffer);
        proc.stdin.end();
    });
}

// @route   POST /api/farmers/ocr/aadhaar
// @desc    Upload Aadhaar card image, run OCR, return extracted fields
router.post('/ocr/aadhaar', upload.single('aadhaar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const { buffer, mimetype } = req.file;
        let text = '';

        if (mimetype === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else {
            // image — use PaddleOCR
            try {
                text = await runPaddleOCR(buffer);
            } catch (err) {
                console.error('PaddleOCR failed:', err.message);
                return res.status(500).json({ success: false, error: 'OCR processing failed. Ensure Python/PaddleOCR is installed.' });
            }
        }

        // Validate it's an Aadhaar card
        if (!isAadhaarDocument(text)) {
            return res.status(422).json({
                success: false,
                error: 'The uploaded document does not appear to be an Aadhaar card. Please upload a valid Aadhaar card.'
            });
        }

        const details = extractAadhaarDetailsFromText(text);
        // Debug: log raw OCR text and extracted result
        console.log('\n===== AADHAAR OCR RAW TEXT =====\n', text, '\n================================');
        console.log('[Aadhaar] Extracted:', JSON.stringify(details));
        return res.status(200).json({ success: true, data: details });
    } catch (err) {
        console.error('Aadhaar OCR error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const { uploadBase64, parseBase64Media, StorageHierarchy } = require('../utils/seaweedfs');
const mongoose = require('mongoose');

const safeUploadBase64 = async (val, keyFn) => {
    if (!val) return null;
    if (typeof val === 'object' && val.url) return val;
    try {
        const res = await uploadBase64(val, keyFn);
        if (res && res.url) return res;
    } catch (err) {
        console.warn('[SeaweedFS] Farmer upload failed, fallback to inline MediaObject:', err.message);
    }
    const parsed = parseBase64Media(val);
    if (parsed && parsed.buffer) {
        const key = typeof keyFn === 'function' ? keyFn(parsed.ext || 'bin') : 'fallback';
        const dataUrl = typeof val === 'string' && val.startsWith('data:')
            ? val
            : `data:${parsed.mimeType || 'application/octet-stream'};base64,${parsed.buffer.toString('base64')}`;
        return {
            key,
            bucket: 'aquainsure-media',
            url: dataUrl,
            mimeType: parsed.mimeType || 'application/octet-stream',
            size: parsed.buffer.length,
            uploadedAt: new Date()
        };
    }
    return null;
};

// @route   POST /api/farmers
// @desc    Create a new farmer
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const tempId = new mongoose.Types.ObjectId();
        const farmerId = tempId.toString();

        const [regCertObj, aadharObj, panObj, photoObj] = await Promise.all([
            safeUploadBase64(data.registration?.regCertificate, (ext) => StorageHierarchy.farmerRegCert(farmerId, ext)),
            safeUploadBase64(data.identity?.aadharFile, (ext) => StorageHierarchy.farmerAadhar(farmerId, ext)),
            safeUploadBase64(data.identity?.panFile, (ext) => StorageHierarchy.farmerPan(farmerId, ext)),
            safeUploadBase64(data.identity?.photo, (ext) => StorageHierarchy.farmerPhoto(farmerId, ext)),
        ]);

        const farmerData = {
            ...data,
            _id: tempId,
            registration: {
                ...data.registration,
                regCertificate: regCertObj
            },
            identity: {
                ...data.identity,
                aadharFile: aadharObj,
                panFile: panObj,
                photo: photoObj
            }
        };

        if (farmerData.identity) {
            if (!farmerData.identity.aadharNumber || String(farmerData.identity.aadharNumber).trim() === '') {
                delete farmerData.identity.aadharNumber;
            }
            if (!farmerData.identity.panNumber || String(farmerData.identity.panNumber).trim() === '') {
                delete farmerData.identity.panNumber;
            }
        }

        const farmer = await Farmer.create(farmerData);
        res.status(201).json({ success: true, data: farmer });
    } catch (err) {
        console.error('Error in POST /api/farmers:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const { requireAuth } = require('../middleware/auth');

// @route   PATCH /api/farmers/:farmerId
// @desc    Fill in registration details on the skeleton farmer doc created at login
router.patch('/:farmerId', requireAuth, async (req, res) => {
    try {
        const data = req.body;
        const farmerId = req.params.farmerId;
        if (!mongoose.Types.ObjectId.isValid(farmerId)) {
            return res.status(400).json({ success: false, error: 'Invalid farmer ID format' });
        }

        // Verify that authenticated user owns this profile or has admin role
        if (req.user.farmerId && req.user.farmerId.toString() !== farmerId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden. You do not have permission to edit this profile.' });
        }

        const [regCertObj, aadharObj, panObj, photoObj] = await Promise.all([
            data.registration?.regCertificate ? safeUploadBase64(data.registration.regCertificate, (ext) => StorageHierarchy.farmerRegCert(farmerId, ext)) : null,
            data.identity?.aadharFile ? safeUploadBase64(data.identity.aadharFile, (ext) => StorageHierarchy.farmerAadhar(farmerId, ext)) : null,
            data.identity?.panFile ? safeUploadBase64(data.identity.panFile, (ext) => StorageHierarchy.farmerPan(farmerId, ext)) : null,
            data.identity?.photo ? safeUploadBase64(data.identity.photo, (ext) => StorageHierarchy.farmerPhoto(farmerId, ext)) : null,
        ]);

        const updateData = { ...data };
        if (data.registration) {
            updateData.registration = {
                ...data.registration,
                regCertificate: regCertObj !== null ? regCertObj : (data.registration.regCertificate || null)
            };
        }
        if (data.identity) {
            updateData.identity = {
                ...data.identity,
                aadharFile: aadharObj !== null ? aadharObj : (data.identity.aadharFile || null),
                panFile: panObj !== null ? panObj : (data.identity.panFile || null),
                photo: photoObj !== null ? photoObj : (data.identity.photo || null)
            };
            if (!updateData.identity.aadharNumber || String(updateData.identity.aadharNumber).trim() === '') {
                delete updateData.identity.aadharNumber;
            }
            if (!updateData.identity.panNumber || String(updateData.identity.panNumber).trim() === '') {
                delete updateData.identity.panNumber;
            }
        }

        const farmer = await Farmer.findByIdAndUpdate(
            farmerId,
            { $set: updateData },
            { returnDocument: 'after', runValidators: false }
        );

        if (!farmer) {
            return res.status(404).json({ success: false, error: 'Farmer not found' });
        }

        res.status(200).json({ success: true, data: farmer });
    } catch (err) {
        console.error('Error in PATCH /api/farmers/:farmerId:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET /api/farmers/:farmerId
// @desc    Get a single farmer's profile
router.get('/:farmerId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.farmerId)) {
            return res.status(400).json({ success: false, error: 'Invalid farmer ID format' });
        }
        const farmer = await Farmer.findById(req.params.farmerId)
            .select('-identity.aadharFile -identity.panFile -identity.photo -registration.regCertificate');
        if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });
        res.status(200).json({ success: true, data: farmer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

