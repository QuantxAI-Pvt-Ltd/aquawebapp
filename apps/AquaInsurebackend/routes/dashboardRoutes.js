const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const Insurance = require('../models/Insurance');
const DailyEntry = require('../models/DailyEntry');
const OneTimeEntry = require('../models/OneTimeEntry');

// ─── Helper: convert Buffer/BinData or SeaweedFS MediaObject to URL ──────────
const bufferToDataUrl = (media, mime = 'image/jpeg') => {
    if (!media) return null;
    if (typeof media === 'object' && media.url) return media.url;
    if (typeof media === 'string' && (media.startsWith('http://') || media.startsWith('https://') || media.startsWith('/'))) {
        return media;
    }
    let raw;
    if (media.buffer && Buffer.isBuffer(media.buffer)) raw = media.buffer;
    else if (Buffer.isBuffer(media)) raw = media;
    else {
        try {
            raw = Buffer.from(media);
        } catch (e) {
            return null;
        }
    }
    return `data:${mime};base64,${raw.toString('base64')}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/dashboard/stats — aggregate counts
router.get('/stats', async (req, res) => {
    try {
        const [totalFarmers, totalFarms, totalPonds, totalInsurances, activeInsurances, expiredInsurances, claimedInsurances, pendingClaims, totalDailyEntries, totalOneTimeEntries] = await Promise.all([
            Farmer.countDocuments(),
            Farm.countDocuments(),
            Pond.countDocuments(),
            Insurance.countDocuments(),
            Insurance.countDocuments({ status: 'active' }),
            Insurance.countDocuments({ status: 'expired' }),
            Insurance.countDocuments({ status: { $in: ['claimed', 'claim_approved'] } }),
            Insurance.countDocuments({ status: 'claim_pending' }),
            DailyEntry.countDocuments(),
            OneTimeEntry.countDocuments()
        ]);

        res.json({
            success: true,
            data: {
                totalFarmers, totalFarms, totalPonds,
                totalInsurances, activeInsurances, expiredInsurances, claimedInsurances, pendingClaims,
                totalDailyEntries, totalOneTimeEntries
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FARMERS — paginated, searchable
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/farmers', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { 'address.district': { $regex: search, $options: 'i' } }
            ];
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [farmers, total] = await Promise.all([
            Farmer.find(query)
                .select('-identity.aadharFile -identity.panFile -identity.photo -registration.regCertificate')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Farmer.countDocuments(query)
        ]);

        // Attach pond/insurance counts per farmer
        const enriched = await Promise.all(farmers.map(async (f) => {
            const [pondCount, insuranceCount] = await Promise.all([
                Pond.countDocuments({ farmerId: f._id }),
                Insurance.countDocuments({ farmerId: f._id })
            ]);
            return { ...f, pondCount, insuranceCount };
        }));

        res.json({
            success: true,
            data: enriched,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/farmers/:id — single farmer with full detail including SeaweedFS media pointers
router.get('/farmers/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid farmer ID format' });
        }
        const farmer = await Farmer.findById(req.params.id).lean();
        if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });

        const [farms, ponds, insurances] = await Promise.all([
            Farm.find({ farmerId: farmer._id }).lean(),
            Pond.find({ farmerId: farmer._id }).lean(),
            Insurance.find({ farmerId: farmer._id }).lean()
        ]);

        res.json({ success: true, data: { ...farmer, farms, ponds, insurances } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY ENTRIES — paginated with filters
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/entries', async (req, res) => {
    try {
        const { page = 1, limit = 20, farmerId, from, to, sortBy = 'date', sortOrder = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {};

        if (farmerId) {
            const farmerPonds = await Pond.find({ farmerId }).select('_id').lean();
            query.pondId = { $in: farmerPonds.map(p => p._id) };
        }

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                query.date.$lte = toDate;
            }
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const EXCLUDE = '-sampling.samplingVideo -feedManagement.feedBills -financials.miscBills -financials.electricityBills -waterQuality.waterReport -shrimpHealth.shrimpPhoto -shrimpHealth.labReport';

        const [entries, total] = await Promise.all([
            DailyEntry.find(query)
                .select(EXCLUDE)
                .populate('pondId', 'name pondNumber farmerId')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            DailyEntry.countDocuments(query)
        ]);

        // Attach farmer name to each entry via pond's farmerId
        const enriched = await Promise.all(entries.map(async (e) => {
            let farmerName = 'Unknown';
            if (e.pondId?.farmerId && mongoose.Types.ObjectId.isValid(e.pondId.farmerId)) {
                const farmer = await Farmer.findById(e.pondId.farmerId).select('name phone').lean();
                if (farmer) farmerName = farmer.name;
                e.farmerPhone = farmer?.phone;
            }
            return { ...e, farmerName };
        }));

        res.json({
            success: true,
            data: enriched,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGES — serve binary fields as base64
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/dashboard/images/list — list all records that have image fields
router.get('/images/list', async (req, res) => {
    try {
        const { source = 'farmer-photo', page = 1, limit = 24 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let items = [];
        let total = 0;

        switch (source) {
            case 'farmer-photo': {
                total = await Farmer.countDocuments({ 'identity.photo': { $exists: true, $ne: null } });
                const farmers = await Farmer.find({ 'identity.photo': { $exists: true, $ne: null } })
                    .select('name phone identity.photo createdAt')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = farmers.map(f => ({
                    _id: f._id, label: f.name, sublabel: f.phone,
                    image: bufferToDataUrl(f.identity?.photo),
                    timestamp: f.createdAt, source: 'farmer-photo'
                }));
                break;
            }
            case 'farm-photo': {
                total = await Farm.countDocuments({ farmPhoto: { $exists: true, $ne: null } });
                const farms = await Farm.find({ farmPhoto: { $exists: true, $ne: null } })
                    .select('farmPhoto location farmerId createdAt')
                    .populate('farmerId', 'name')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = farms.map(f => ({
                    _id: f._id, label: f.farmerId?.name || 'Unknown', sublabel: `${f.location?.place || ''}, ${f.location?.district || ''}`,
                    image: bufferToDataUrl(f.farmPhoto),
                    timestamp: f.createdAt, source: 'farm-photo'
                }));
                break;
            }
            case 'pond-photo': {
                total = await Pond.countDocuments({ photo: { $exists: true, $ne: null } });
                const ponds = await Pond.find({ photo: { $exists: true, $ne: null } })
                    .select('name photo farmerId pondNumber createdAt')
                    .populate('farmerId', 'name')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = ponds.map(p => ({
                    _id: p._id, label: p.name, sublabel: p.farmerId?.name || 'Unknown',
                    image: bufferToDataUrl(p.photo),
                    timestamp: p.createdAt, source: 'pond-photo'
                }));
                break;
            }
            case 'shrimp-photo': {
                total = await DailyEntry.countDocuments({ 'shrimpHealth.shrimpPhoto': { $exists: true, $ne: null } });
                const entries = await DailyEntry.find({ 'shrimpHealth.shrimpPhoto': { $exists: true, $ne: null } })
                    .select('shrimpHealth.shrimpPhoto shrimpHealth.status pondId dayNumber date createdAt')
                    .populate('pondId', 'name farmerId')
                    .sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean();
                for (const e of entries) {
                    let farmerName = 'Unknown';
                    if (e.pondId?.farmerId && mongoose.Types.ObjectId.isValid(e.pondId.farmerId)) {
                        const farmer = await Farmer.findById(e.pondId.farmerId).select('name').lean();
                        if (farmer) farmerName = farmer.name;
                    }
                    items.push({
                        _id: e._id, label: `Day ${e.dayNumber} — ${e.pondId?.name || ''}`, sublabel: farmerName,
                        image: bufferToDataUrl(e.shrimpHealth?.shrimpPhoto),
                        timestamp: e.date || e.createdAt, source: 'shrimp-photo',
                        meta: { status: e.shrimpHealth?.status }
                    });
                }
                break;
            }
            case 'aadhar-card': {
                total = await Farmer.countDocuments({ 'identity.aadharFile': { $exists: true, $ne: null } });
                const farmers = await Farmer.find({ 'identity.aadharFile': { $exists: true, $ne: null } })
                    .select('name phone identity.aadharNumber identity.aadharFile createdAt')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = farmers.map(f => ({
                    _id: f._id, label: `${f.name} — Aadhaar`, sublabel: f.phone,
                    image: bufferToDataUrl(f.identity?.aadharFile),
                    timestamp: f.createdAt, source: 'aadhar-card',
                    meta: { 'Aadhaar Number': f.identity?.aadharNumber || '—' }
                }));
                break;
            }
            case 'pan-card': {
                total = await Farmer.countDocuments({ 'identity.panFile': { $exists: true, $ne: null } });
                const farmers = await Farmer.find({ 'identity.panFile': { $exists: true, $ne: null } })
                    .select('name phone identity.panNumber identity.panFile createdAt')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = farmers.map(f => ({
                    _id: f._id, label: `${f.name} — PAN`, sublabel: f.phone,
                    image: bufferToDataUrl(f.identity?.panFile),
                    timestamp: f.createdAt, source: 'pan-card',
                    meta: { 'PAN Number': f.identity?.panNumber || '—' }
                }));
                break;
            }
            case 'reg-cert': {
                total = await Farmer.countDocuments({ 'registration.regCertificate': { $exists: true, $ne: null } });
                const farmers = await Farmer.find({ 'registration.regCertificate': { $exists: true, $ne: null } })
                    .select('name phone registration.regType registration.regNumber registration.regCertificate createdAt')
                    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
                items = farmers.map(f => ({
                    _id: f._id, label: `${f.name} — ${f.registration?.regType?.toUpperCase() || 'Registration'} Cert`, sublabel: f.phone,
                    image: bufferToDataUrl(f.registration?.regCertificate),
                    timestamp: f.createdAt, source: 'reg-cert',
                    meta: { 'Reg Number': f.registration?.regNumber || '—', 'Authority': f.registration?.regType?.toUpperCase() || '—' }
                }));
                break;
            }
            default:
                return res.status(400).json({ success: false, error: 'Invalid source' });
        }

        res.json({
            success: true,
            data: items,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// Entries over time (grouped by day)
router.get('/analytics/entries-over-time', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        const pipeline = [
            { $match: { date: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ];

        const data = await DailyEntry.aggregate(pipeline);
        res.json({ success: true, data: data.map(d => ({ date: d._id, count: d.count })) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Farmer distribution by district
router.get('/analytics/farmer-distribution', async (req, res) => {
    try {
        const pipeline = [
            { $group: { _id: '$address.district', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ];
        const data = await Farmer.aggregate(pipeline);
        res.json({ success: true, data: data.map(d => ({ district: d._id || 'Unknown', count: d.count })) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Insurance status breakdown
router.get('/analytics/insurance-status', async (req, res) => {
    try {
        const pipeline = [
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ];
        const data = await Insurance.aggregate(pipeline);
        res.json({ success: true, data: data.map(d => ({ status: d._id, count: d.count })) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Water quality trends
router.get('/analytics/water-quality', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        const pipeline = [
            { $match: { date: { $gte: since }, 'waterQuality.ph': { $exists: true } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                    avgPh: { $avg: '$waterQuality.ph' },
                    avgDo: { $avg: '$waterQuality.do' },
                    avgTemp: { $avg: '$waterQuality.temperature' },
                    avgAmmonia: { $avg: '$waterQuality.ammonia' }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const data = await DailyEntry.aggregate(pipeline);
        res.json({
            success: true,
            data: data.map(d => ({
                date: d._id,
                ph: d.avgPh ? +d.avgPh.toFixed(2) : null,
                dissolvedOxygen: d.avgDo ? +d.avgDo.toFixed(2) : null,
                temperature: d.avgTemp ? +d.avgTemp.toFixed(1) : null,
                ammonia: d.avgAmmonia ? +d.avgAmmonia.toFixed(3) : null
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Farmer-wise entry counts (top N)
router.get('/analytics/top-farmers', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Get all ponds grouped by farmerId
        const pondsByFarmer = await Pond.aggregate([
            { $group: { _id: '$farmerId', pondIds: { $push: '$_id' } } }
        ]);

        const results = [];
        for (const pf of pondsByFarmer) {
            const count = await DailyEntry.countDocuments({ pondId: { $in: pf.pondIds } });
            if (count > 0 && pf._id && mongoose.Types.ObjectId.isValid(pf._id)) {
                const farmer = await Farmer.findById(pf._id).select('name phone').lean();
                results.push({ farmerId: pf._id, name: farmer?.name || 'Unknown', phone: farmer?.phone, entryCount: count });
            }
        }

        results.sort((a, b) => b.entryCount - a.entryCount);
        res.json({ success: true, data: results.slice(0, parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// All farmers list (for filter dropdown)
router.get('/farmers-list', async (req, res) => {
    try {
        const farmers = await Farmer.find().select('name phone _id').sort({ name: 1 }).lean();
        res.json({ success: true, data: farmers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/ponds/:pondId/entries — Get daily and one-time entries for a pond (without images to keep it light)
router.get('/ponds/:pondId/entries', async (req, res) => {
    try {
        const { pondId } = req.params;
        const EXCLUDE = '-sampling.samplingVideo -feedManagement.feedBills -financials.miscBills -financials.electricityBills -waterQuality.waterReport -shrimpHealth.shrimpPhoto -shrimpHealth.labReport';
        
        const [dailyEntries, oneTimeEntries] = await Promise.all([
            DailyEntry.find({ pondId }).select(EXCLUDE).sort({ date: -1 }).lean(),
            OneTimeEntry.find({ pondId }).select('-pondPreparation.pondPrepBills -seedSelection.pcrCertificate -seedSelection.seedBills').sort({ createdAt: -1 }).lean()
        ]);
        
        res.json({ success: true, data: { dailyEntries, oneTimeEntries } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/entries/:id — single entry detail with images
router.get('/entries/:id', async (req, res) => {
    try {
        const entry = await DailyEntry.findById(req.params.id).lean();
        if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
        
        if (entry.feedManagement?.feedBills) entry.feedManagement.feedBills = bufferToDataUrl(entry.feedManagement.feedBills, 'application/pdf');
        if (entry.financials?.miscBills) entry.financials.miscBills = bufferToDataUrl(entry.financials.miscBills, 'application/pdf');
        if (entry.financials?.electricityBills) entry.financials.electricityBills = bufferToDataUrl(entry.financials.electricityBills, 'application/pdf');
        if (entry.waterQuality?.waterReport) entry.waterQuality.waterReport = bufferToDataUrl(entry.waterQuality.waterReport, 'application/pdf');
        if (entry.shrimpHealth?.shrimpPhoto) entry.shrimpHealth.shrimpPhoto = bufferToDataUrl(entry.shrimpHealth.shrimpPhoto, 'image/jpeg');
        if (entry.shrimpHealth?.labReport) entry.shrimpHealth.labReport = bufferToDataUrl(entry.shrimpHealth.labReport, 'application/pdf');

        res.json({ success: true, data: entry });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// INSURANCES & CLAIMS — list, search, filter, review
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/dashboard/insurances
router.get('/insurances', async (req, res) => {
    try {
        const { status = 'all', search = '', page = 1, limit = 50 } = req.query;
        const query = {};

        if (status && status !== 'all') {
            if (status === 'claims_all') {
                query.$or = [
                    { 'claim.claimedAt': { $ne: null } },
                    { status: { $in: ['claim_pending', 'claim_approved', 'claim_rejected', 'claimed'] } }
                ];
            } else if (status === 'claim_pending') {
                query.$or = [
                    { status: 'claim_pending' },
                    { 'claim.status': { $in: ['pending', 'under_review'] } }
                ];
            } else if (status === 'claim_approved') {
                query.$or = [
                    { status: { $in: ['claim_approved', 'claimed'] } },
                    { 'claim.status': 'approved' }
                ];
            } else if (status === 'claim_rejected') {
                query.$or = [
                    { status: 'claim_rejected' },
                    { 'claim.status': 'rejected' }
                ];
            } else {
                query.status = status;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let matchingFarmerIds = [];
        if (search) {
            const farmers = await Farmer.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            }).select('_id').lean();
            matchingFarmerIds = farmers.map(f => f._id);
        }

        if (search) {
            const searchOr = [
                { species: { $regex: search, $options: 'i' } },
                { insuranceType: { $regex: search, $options: 'i' } },
                { 'claim.reason': { $regex: search, $options: 'i' } }
            ];
            if (matchingFarmerIds.length > 0) {
                searchOr.push({ farmerId: { $in: matchingFarmerIds } });
            }
            if (query.$or) {
                query.$and = [{ $or: query.$or }, { $or: searchOr }];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        const [total, insurances] = await Promise.all([
            Insurance.countDocuments(query),
            Insurance.find(query)
                .populate('farmerId', 'name phone aadharNumber address')
                .populate('pondId', 'name pondNumber dimensionAcres address photo')
                .populate('farmId', 'name state district mandal village')
                .sort({ 'claim.claimedAt': -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                insurances
            }
        });
    } catch (err) {
        console.error('Error in GET /api/dashboard/insurances:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/dashboard/insurances/:id/claim — Review claim (approve / reject)
router.patch('/insurances/:id/claim', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, settlementAmount, reviewerNotes } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: "Action must be 'approve' or 'reject'" });
        }

        const policy = await Insurance.findById(id);
        if (!policy) {
            return res.status(404).json({ success: false, error: 'Policy not found' });
        }

        if (action === 'approve') {
            policy.status = 'claim_approved';
            policy.claim = policy.claim || {};
            policy.claim.status = 'approved';
            policy.claim.settlementAmount = Number(settlementAmount) || 0;
        } else {
            policy.status = 'claim_rejected';
            policy.claim = policy.claim || {};
            policy.claim.status = 'rejected';
            policy.claim.settlementAmount = 0;
        }

        policy.claim.reviewerNotes = reviewerNotes || '';
        policy.claim.reviewedAt = new Date();

        await policy.save();

        const updated = await Insurance.findById(id)
            .populate('farmerId', 'name phone aadharNumber address')
            .populate('pondId', 'name pondNumber dimensionAcres address photo')
            .populate('farmId', 'name state district mandal village')
            .lean();

        res.json({
            success: true,
            message: `Claim successfully ${action === 'approve' ? 'approved' : 'rejected'}.`,
            data: updated
        });
    } catch (err) {
        console.error('Error in PATCH /api/dashboard/insurances/:id/claim:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
