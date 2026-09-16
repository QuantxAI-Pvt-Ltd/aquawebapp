const express = require('express');
const router = express.Router();
const multer = require('multer');
const Farmer = require('../models/Farmer');
const { isAadhaarDocument, extractAadhaarDetailsFromText } = require('../utils/ocrUtils');
const { spawn } = require('child_process');
const path = require('path');
const pdf = require('pdf-parse');

// Multer: store in memory (we need the buffer for OCR)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
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

// @route   POST /api/farmers
// @desc    Register a new farmer
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        const farmerData = {
            ...data,
            registration: {
                ...data.registration,
                regCertificate: base64ToBuffer(data.registration?.regCertificate)
            },
            identity: {
                ...data.identity,
                aadharFile: base64ToBuffer(data.identity?.aadharFile),
                panFile: base64ToBuffer(data.identity?.panFile),
                photo: base64ToBuffer(data.identity?.photo)
            }
        };

        const farmer = await Farmer.create(farmerData);
        res.status(201).json({ success: true, data: farmer });
    } catch (err) {
        console.error('Error in POST /api/farmers:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   PATCH /api/farmers/:farmerId
// @desc    Fill in registration details on the skeleton farmer doc created at login
router.patch('/:farmerId', async (req, res) => {
    try {
        const data = req.body;

        const farmerData = {
            ...data,
            registration: {
                ...data.registration,
                regCertificate: base64ToBuffer(data.registration?.regCertificate)
            },
            identity: {
                ...data.identity,
                aadharFile: base64ToBuffer(data.identity?.aadharFile),
                panFile: base64ToBuffer(data.identity?.panFile),
                photo: base64ToBuffer(data.identity?.photo)
            }
        };

        const farmer = await Farmer.findByIdAndUpdate(
            req.params.farmerId,
            { $set: farmerData },
            { new: true, runValidators: false } // runValidators:false because address placeholder is already set
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
        const farmer = await Farmer.findById(req.params.farmerId)
            .select('-identity.aadharFile -identity.panFile -identity.photo -registration.regCertificate');
        if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });
        res.status(200).json({ success: true, data: farmer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

