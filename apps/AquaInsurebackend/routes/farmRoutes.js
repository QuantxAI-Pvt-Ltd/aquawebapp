const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');

const base64ToBuffer = (base64Str) => {
    if (!base64Str) return null;
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
};

// @route   POST /api/farms
// @desc    Register a farm and create its associated Ponds
router.post('/', async (req, res) => {
    try {
        const { pondsCount, latitude, longitude, ...farmBody } = req.body;

        const farmData = {
            ...farmBody,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            farmPhoto: base64ToBuffer(farmBody.farmPhoto)
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

        // Convert photo Buffer → base64 data URL so frontend can render it directly
        const pondsWithPhoto = ponds.map(p => {
            let base64Photo = null;
            if (p.photo) {
                // p.photo might be a Node Buffer or a mongodb.Binary object
                if (p.photo.buffer && Buffer.isBuffer(p.photo.buffer)) {
                    base64Photo = p.photo.buffer.toString('base64');
                } else if (Buffer.isBuffer(p.photo)) {
                    base64Photo = p.photo.toString('base64');
                } else {
                    // Fallback to calling .toString('base64') on the Binary object directly
                    base64Photo = p.photo.toString('base64');
                }
            }
            return {
                ...p,
                photo: base64Photo ? `data:image/jpeg;base64,${base64Photo}` : null
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
        const farms = await Farm.find({ farmerId: req.params.farmerId });
        res.status(200).json({ success: true, data: farms });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   PATCH /api/farms/:farmId/ponds
// @desc    Save dimension, photo and address for each insured pond
router.patch('/:farmId/ponds', async (req, res) => {
    try {
        const { farmId } = req.params;
        const { farmerId, ponds } = req.body; // ponds: [{ pondId, pondNumber, dimensionAcres, photo, address }]

        if (!ponds || !Array.isArray(ponds)) {
            return res.status(400).json({ success: false, error: 'ponds array required' });
        }

        const updated = await Promise.all(ponds.map(async (pd) => {
            const updateFields = {};

            if (pd.dimensionAcres != null) updateFields.dimensionAcres = pd.dimensionAcres;
            if (pd.photo)                  updateFields.photo = base64ToBuffer(pd.photo);
            if (pd.address)                updateFields.address = pd.address;

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
