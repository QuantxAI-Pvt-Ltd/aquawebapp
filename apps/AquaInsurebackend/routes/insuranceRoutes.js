const express = require('express');
const router = express.Router();
const Insurance = require('../models/Insurance');

// @route   POST /api/insurances
// @desc    Register a new insurance policy for a pond
router.post('/', async (req, res) => {
    try {
        const insurance = await Insurance.create(req.body);
        res.status(201).json({ success: true, data: insurance });
    } catch (err) {
        console.error('Error in POST /api/insurances:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const Pond = require('../models/Pond');
const mongoose = require('mongoose');

// @route   GET /api/insurances
// @desc    Get insurances for a specific farmer (by farmerId OR associated pondIds)
// @query   farmerId
router.get('/', async (req, res) => {
    try {
        const { farmerId } = req.query;
        if (!farmerId) {
            return res.status(400).json({ success: false, error: 'farmerId query param required' });
        }

        // Get all ponds belonging to this farmer so we can match on pondId too
        const farmerPonds = await Pond.find({ farmerId }).select('_id').lean();
        const pondIds = farmerPonds.map(p => p._id);

        // Query: direct farmerId match OR matched via pondId (covers old records saved before farmerId was set)
        const query = {
            $or: [
                { farmerId: new mongoose.Types.ObjectId(farmerId) },
                { pondId: { $in: pondIds } }
            ]
        };

        const insurances = await Insurance.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: insurances });
    } catch (err) {
        console.error('Error in GET /api/insurances:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

