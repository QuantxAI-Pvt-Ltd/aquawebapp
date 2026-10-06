const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const Farmer = require('../models/Farmer');

const base64ToBuffer = (base64Str) => {
    if (!base64Str) return null;
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
};

const { uploadBase64, parseBase64Media, StorageHierarchy } = require('../utils/seaweedfs');
const mongoose = require('mongoose');

const safeUploadBase64 = async (val, keyFn) => {
    if (!val) return null;
    if (typeof val === 'object' && (val.url || val.key)) {
        const cleanKey = (val.key || '').replace(/^\/+/, '').replace(/^aquainsure\/?/, '');
        return {
            key: cleanKey,
            bucket: val.bucket || 'aquainsure',
            url: val.url || (cleanKey ? `/api/media/stream?key=${encodeURIComponent(cleanKey)}` : ''),
            mimeType: val.mimeType || 'image/jpeg',
            size: val.size || 0,
            uploadedAt: val.uploadedAt || new Date()
        };
    }
    const parsed = parseBase64Media(val);
    if (parsed && parsed.isMediaObject) {
        return parsed.mediaObject;
    }
    if (parsed && parsed.buffer) {
        try {
            const res = await uploadBase64(val, keyFn);
            if (res && res.url) return res;
        } catch (err) {
            console.warn('[SeaweedFS] Farm upload failed, fallback to inline MediaObject:', err.message);
        }
        const key = typeof keyFn === 'function' ? keyFn(parsed.ext || 'bin') : 'fallback';
        const dataUrl = typeof val === 'string' && val.startsWith('data:')
            ? val
            : `data:${parsed.mimeType || 'application/octet-stream'};base64,${parsed.buffer.toString('base64')}`;
        return {
            key,
            bucket: 'aquainsure',
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
// @desc    Register or update a farm and reconcile its associated Ponds
router.post('/', requireAuth, async (req, res) => {
    try {
        const { pondsCount, latitude, longitude, farmerId: bodyFarmerId, location, ownership, infrastructure, ...restBody } = req.body;
        const farmerId = bodyFarmerId || req.user?.farmerId;

        if (!farmerId) {
            return res.status(400).json({ success: false, error: 'farmerId is required' });
        }

        // Check if an existing farm exists for this farmer
        const existingFarm = await Farm.findOne({ farmerId });

        // Resolve location: Ensure district, taluk, and place are non-empty
        let resolvedLocation = location || {};
        if (!resolvedLocation.district || !resolvedLocation.taluk || resolvedLocation.district === '-' || resolvedLocation.taluk === '-') {
            if (existingFarm && existingFarm.location?.district && existingFarm.location.district !== '-') {
                resolvedLocation = {
                    place: resolvedLocation.place || existingFarm.location.place || 'My Farm',
                    taluk: resolvedLocation.taluk || existingFarm.location.taluk || 'Local Taluk',
                    district: resolvedLocation.district || existingFarm.location.district || 'Local District',
                };
            } else {
                const farmerDoc = await Farmer.findById(farmerId).lean();
                resolvedLocation = {
                    place: resolvedLocation.place || farmerDoc?.address?.village || farmerDoc?.address?.taluk || 'My Farm',
                    taluk: resolvedLocation.taluk || farmerDoc?.address?.taluk || farmerDoc?.address?.village || 'Local Taluk',
                    district: resolvedLocation.district || farmerDoc?.address?.district || 'Local District',
                };
            }
        }

        const totalPondsNum = parseInt(pondsCount || restBody.totalPonds || (ownership && ownership.totalPonds) || 1, 10) || 1;

        const farmPayload = {
            farmerId,
            location: {
                place: resolvedLocation.place || 'My Farm',
                taluk: resolvedLocation.taluk || 'Local Taluk',
                district: resolvedLocation.district || 'Local District',
            },
            latitude: latitude ? parseFloat(latitude) : (existingFarm?.latitude || 13.0827),
            longitude: longitude ? parseFloat(longitude) : (existingFarm?.longitude || 80.2707),
            ownership: {
                type: ownership?.type || existingFarm?.ownership?.type || 'owned',
                patta: ownership?.patta || existingFarm?.ownership?.patta || restBody.patta || '123456',
            },
            totalPonds: totalPondsNum,
            infrastructure: infrastructure || existingFarm?.infrastructure || {},
            ...restBody
        };

        let farm;
        if (existingFarm) {
            farm = await Farm.findByIdAndUpdate(
                existingFarm._id,
                { $set: farmPayload },
                { new: true, runValidators: true }
            );
        } else {
            farm = await Farm.create(farmPayload);
        }

        // Reconcile ponds for this farm
        let existingPonds = await Pond.find({ farmId: farm._id }).sort({ pondNumber: 1 });
        if (existingPonds.length === 0) {
            existingPonds = await Pond.find({ farmerId: farm.farmerId }).sort({ pondNumber: 1 });
            if (existingPonds.length > 0) {
                await Pond.updateMany({ farmerId: farm.farmerId }, { $set: { farmId: farm._id } });
            }
        }

        const inputPonds = Array.isArray(req.body.ponds) ? req.body.ponds : [];
        const pondPromises = [];

        // Update or create ponds based on totalPondsNum or inputPonds
        for (let i = 1; i <= totalPondsNum; i++) {
            const inputP = inputPonds.find(p => p.pondNumber === i) || inputPonds[i - 1] || {};
            const existingP = existingPonds.find(p => p.pondNumber === i);

            const pondData = {
                farmId: farm._id,
                farmerId: farm.farmerId,
                pondNumber: i,
                name: inputP.name || (existingP ? existingP.name : `Pond ${i}`),
                dimensionAcres: inputP.dimensionAcres != null ? parseFloat(inputP.dimensionAcres) : (existingP?.dimensionAcres || 1.0),
                surveyNumber: inputP.surveyNumber || existingP?.surveyNumber || (farm.ownership?.patta ? `${farm.ownership.patta}/${i}` : ''),
                pattaNumber: inputP.pattaNumber || existingP?.pattaNumber || farm.ownership?.patta || '',
            };

            if (existingP) {
                pondPromises.push(Pond.findByIdAndUpdate(existingP._id, { $set: pondData }, { new: true }));
            } else {
                pondPromises.push(Pond.create(pondData));
            }
        }

        const allPonds = await Promise.all(pondPromises);

        res.status(201).json({
            success: true,
            data: farm,
            ponds: allPonds
        });
    } catch (err) {
        console.error('Error in POST /api/farms:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET /api/farms/ponds
// @desc    Get all real Pond documents for a farmer
// @query   farmerId, farmId
router.get('/ponds', async (req, res) => {
    try {
        const { farmerId, farmId } = req.query;
        const query = {};
        if (farmerId) {
            query.farmerId = mongoose.Types.ObjectId.isValid(farmerId) ? new mongoose.Types.ObjectId(farmerId) : farmerId;
        }
        if (farmId) {
            query.farmId = mongoose.Types.ObjectId.isValid(farmId) ? new mongoose.Types.ObjectId(farmId) : farmId;
        }
        if (!query.farmerId && !query.farmId) {
            return res.status(400).json({ success: false, error: 'farmerId or farmId required' });
        }
        const ponds = await Pond.find(query).sort({ pondNumber: 1 }).lean();

        // Convert photo: SeaweedFS MediaObject URL or Buffer → accessible URL
        const pondsWithPhoto = ponds.map(p => {
            let photoUrl = null;
            if (p.photo) {
                if (typeof p.photo === 'object') {
                    if (p.photo.url) {
                        photoUrl = p.photo.url;
                    } else if (p.photo.key) {
                        photoUrl = `/api/media/stream?key=${encodeURIComponent(p.photo.key)}`;
                    } else if (p.photo.buffer && Buffer.isBuffer(p.photo.buffer)) {
                        photoUrl = `data:image/jpeg;base64,${p.photo.buffer.toString('base64')}`;
                    }
                } else if (typeof p.photo === 'string' && (p.photo.startsWith('http://') || p.photo.startsWith('https://') || p.photo.startsWith('/') || p.photo.startsWith('data:'))) {
                    photoUrl = p.photo;
                } else if (typeof p.photo === 'string' && (p.photo.includes('/') || p.photo.includes(','))) {
                    photoUrl = `/api/media/stream?key=${encodeURIComponent(p.photo)}`;
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
