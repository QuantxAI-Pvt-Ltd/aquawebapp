const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');

const base64ToBuffer = (base64Str) => {
    if (!base64Str) return null;
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
};

const { uploadBase64, parseBase64Media, StorageHierarchy } = require('../utils/seaweedfs');
const mongoose = require('mongoose');

const safeUploadBase64 = async (val, keyFn) => {
    if (!val) return null;
    if (typeof val === 'object' && val.url) return val;
    try {
        const res = await uploadBase64(val, keyFn);
        if (res && res.url) return res;
    } catch (err) {
        console.warn('[SeaweedFS] Farm upload failed, fallback to inline MediaObject:', err.message);
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

const { requireAuth } = require('../middleware/auth');

// @route   POST /api/farms
// @desc    Register a farm and create its associated Ponds
router.post('/', requireAuth, async (req, res) => {
    try {
        const { pondsCount, latitude, longitude, ...farmBody } = req.body;
        const farmObjectId = new mongoose.Types.ObjectId();
        const farmId = farmObjectId.toString();
        const farmerId = farmBody.farmerId?.toString();

        const farmPhotoObj = farmBody.farmPhoto
            ? await safeUploadBase64(farmBody.farmPhoto, (ext) => StorageHierarchy.farmPhoto(farmerId, farmId, ext))
            : null;

        const farmData = {
            ...farmBody,
            _id: farmObjectId,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            farmPhoto: farmPhotoObj
        };

        const farm = await Farm.create(farmData);

        // Pre-create pond records tied to this farm based on count
        const pondPromises = [];
        const count = parseInt(pondsCount || farm.totalPonds, 10) || 1;

        for (let i = 1; i <= count; i++) {
            pondPromises.push(Pond.create({
                farmId: farm._id,
                farmerId: farm.farmerId,   // denormalized for direct farmer queries
                pondNumber: i,
                name: `Pond ${i}`
            }));
        }

        const createdPonds = await Promise.all(pondPromises);

        res.status(201).json({
            success: true,
            data: farm,
            ponds: createdPonds
        });
    } catch (err) {
        console.error('Error in POST /api/farms:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET /api/farms/ponds
// @desc    Get all real Pond documents for a farmer
// @query   farmerId
router.get('/ponds', async (req, res) => {
    try {
        const { farmerId } = req.query;
        if (!farmerId) return res.status(400).json({ success: false, error: 'farmerId required' });
        const ponds = await Pond.find({ farmerId }).sort({ pondNumber: 1 }).lean();

        // Convert photo: SeaweedFS MediaObject URL or Buffer → accessible URL
        const pondsWithPhoto = ponds.map(p => {
            let photoUrl = null;
            if (p.photo) {
                if (typeof p.photo === 'object' && p.photo.url) {
                    photoUrl = p.photo.url;
                } else if (typeof p.photo === 'string' && (p.photo.startsWith('http://') || p.photo.startsWith('https://') || p.photo.startsWith('/') || p.photo.startsWith('data:'))) {
                    photoUrl = p.photo;
                } else if (typeof p.photo === 'string' && (p.photo.includes('/') || p.photo.includes(','))) {
                    photoUrl = `/api/media/stream?key=${encodeURIComponent(p.photo)}`;
                } else if (p.photo.buffer && Buffer.isBuffer(p.photo.buffer)) {
                    photoUrl = `data:image/jpeg;base64,${p.photo.buffer.toString('base64')}`;
                } else if (Buffer.isBuffer(p.photo)) {
                    photoUrl = `data:image/jpeg;base64,${p.photo.toString('base64')}`;
                } else if (typeof p.photo === 'string') {
                    photoUrl = p.photo.startsWith('data:') ? p.photo : `data:image/jpeg;base64,${p.photo}`;
                }
            }
            return {
                ...p,
                photo: photoUrl
            };
        });

        res.status(200).json({ success: true, data: pondsWithPhoto });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET /api/farms/:farmerId
// @desc    Get all farms for a specific farmer (useful for frontend context)
router.get('/:farmerId', async (req, res) => {
    try {
        const farms = await Farm.find({ farmerId: req.params.farmerId }).lean();
        const resolvedFarms = farms.map(farm => {
            let farmPhotoUrl = null;
            if (farm.farmPhoto) {
                if (typeof farm.farmPhoto === 'object' && farm.farmPhoto.url) {
                    farmPhotoUrl = farm.farmPhoto.url;
                } else if (typeof farm.farmPhoto === 'string' && (farm.farmPhoto.startsWith('http://') || farm.farmPhoto.startsWith('https://') || farm.farmPhoto.startsWith('/') || farm.farmPhoto.startsWith('data:'))) {
                    farmPhotoUrl = farm.farmPhoto;
                } else if (typeof farm.farmPhoto === 'string' && (farm.farmPhoto.includes('/') || farm.farmPhoto.includes(','))) {
                    farmPhotoUrl = `/api/media/stream?key=${encodeURIComponent(farm.farmPhoto)}`;
                } else if (farm.farmPhoto.buffer && Buffer.isBuffer(farm.farmPhoto.buffer)) {
                    farmPhotoUrl = `data:image/jpeg;base64,${farm.farmPhoto.buffer.toString('base64')}`;
                } else if (Buffer.isBuffer(farm.farmPhoto)) {
                    farmPhotoUrl = `data:image/jpeg;base64,${farm.farmPhoto.toString('base64')}`;
                } else if (typeof farm.farmPhoto === 'string') {
                    farmPhotoUrl = farm.farmPhoto.startsWith('data:') ? farm.farmPhoto : `data:image/jpeg;base64,${farm.farmPhoto}`;
                }
            }
            return {
                ...farm,
                farmPhoto: farmPhotoUrl || farm.farmPhoto
            };
        });
        res.status(200).json({ success: true, data: resolvedFarms });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   PATCH /api/farms/:farmId/ponds
// @desc    Save dimension, photo and address for each insured pond
router.patch('/:farmId/ponds', requireAuth, async (req, res) => {
    try {
        const { farmId } = req.params;
        const { farmerId, ponds } = req.body; // ponds: [{ pondId, pondNumber, dimensionAcres, photo, address }]

        if (!ponds || !Array.isArray(ponds)) {
            return res.status(400).json({ success: false, error: 'ponds array required' });
        }

        const resolvedFarmerId = farmerId?.toString() || (await Farm.findById(farmId).select('farmerId').lean())?.farmerId?.toString();

        const updated = await Promise.all(ponds.map(async (pd) => {
            const updateFields = {};

            if (pd.dimensionAcres != null) updateFields.dimensionAcres = pd.dimensionAcres;
            if (pd.address) updateFields.address = pd.address;

            if (pd.photo) {
                const pondIdStr = pd.pondId ? pd.pondId.toString() : `pond_${pd.pondNumber}`;
                updateFields.photo = await safeUploadBase64(
                    pd.photo,
                    (ext) => StorageHierarchy.pondPhoto(resolvedFarmerId, farmId, pondIdStr, ext)
                );
            }

            // Try to update by _id first (if a real ObjectId was sent)
            const isValidId = pd.pondId && pd.pondId.length === 24;
            if (isValidId) {
                return Pond.findByIdAndUpdate(
                    pd.pondId,
                    { $set: updateFields },
                    { new: true, runValidators: true }
                );
            }

            // Fallback: match by farmId + pondNumber
            return Pond.findOneAndUpdate(
                { farmId, pondNumber: pd.pondNumber },
                { $set: updateFields },
                { new: true, upsert: true, runValidators: true }
            );
        }));

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('Error in PATCH /api/farms/:farmId/ponds:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
