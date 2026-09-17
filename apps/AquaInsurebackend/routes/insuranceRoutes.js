const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Insurance = require('../models/Insurance');
const Pond = require('../models/Pond');
const Farm = require('../models/Farm');
const { uploadBase64, StorageHierarchy } = require('../utils/seaweedfs');

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

// @route   GET /api/insurances/claims
// @desc    Get all claims (optionally filtered by farmerId or status)
// @query   farmerId, status ('all', 'pending', 'approved', 'rejected')
router.get('/claims', async (req, res) => {
    try {
        const { farmerId, status } = req.query;
        const query = {
            $or: [
                { 'claim.claimedAt': { $ne: null } },
                { status: { $in: ['claim_pending', 'claim_approved', 'claim_rejected', 'claimed'] } }
            ]
        };

        if (farmerId && mongoose.Types.ObjectId.isValid(farmerId)) {
            query.farmerId = new mongoose.Types.ObjectId(farmerId);
        }

        if (status && status !== 'all') {
            if (status === 'pending') {
                query['claim.status'] = { $in: ['pending', 'under_review'] };
            } else {
                query['claim.status'] = status;
            }
        }

        const claims = await Insurance.find(query)
            .populate('pondId', 'name pondNumber dimensionAcres address')
            .populate('farmId', 'name state district mandal village')
            .populate('farmerId', 'name phone aadharNumber')
            .sort({ 'claim.claimedAt': -1, updatedAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: claims });
    } catch (err) {
        console.error('Error in GET /api/insurances/claims:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

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

        const query = {
            $or: [
                { farmerId: new mongoose.Types.ObjectId(farmerId) },
                { pondId: { $in: pondIds } }
            ]
        };

        const insurances = await Insurance.find(query)
            .populate('pondId', 'name pondNumber dimensionAcres')
            .populate('farmId', 'name location')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: insurances });
    } catch (err) {
        console.error('Error in GET /api/insurances:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/insurances/:id/claim
// @desc    Farmer files a claim against an existing active insurance policy
// @body    { reason, description, estimatedLossPercent, evidencePhoto }
router.post('/:id/claim', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid insurance policy ID' });
        }

        const policy = await Insurance.findById(id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Insurance policy not found' });
        }

        if (policy.status === 'expired') {
            return res.status(400).json({ success: false, error: 'Policy has expired and cannot be claimed.' });
        }

        if (['claim_pending', 'claim_approved', 'claimed'].includes(policy.status)) {
            return res.status(400).json({
                success: false,
                error: `A claim is already ${policy.status.replace('_', ' ')} for this policy.`
            });
        }

        const { reason, description, estimatedLossPercent, evidencePhoto } = req.body;

        // Upload evidence photo to SeaweedFS if provided
        let uploadedEvidence = null;
        if (evidencePhoto) {
            uploadedEvidence = await uploadBase64(
                evidencePhoto,
                (ext) => StorageHierarchy.claimEvidencePhoto(policy.farmerId, policy._id, ext)
            );
        }

        // Update policy status and claim subdocument
        policy.status = 'claim_pending';
        policy.claim = {
            claimedAt: new Date(),
            reason: reason || 'other',
            description: description || '',
            estimatedLossPercent: Number(estimatedLossPercent) || 0,
            evidencePhoto: uploadedEvidence || null,
            status: 'pending',
            reviewedAt: null,
            reviewerNotes: '',
            settlementAmount: 0
        };

        await policy.save();

        const updatedPolicy = await Insurance.findById(id)
            .populate('pondId', 'name pondNumber dimensionAcres')
            .populate('farmId', 'name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Claim filed successfully and placed under review.',
            data: updatedPolicy
        });
    } catch (err) {
        console.error('Error in POST /api/insurances/:id/claim:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

