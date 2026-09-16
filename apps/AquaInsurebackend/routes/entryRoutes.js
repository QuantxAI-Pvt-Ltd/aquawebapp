const express = require('express');
const router = express.Router();
const OneTimeEntry = require('../models/OneTimeEntry');
const DailyEntry = require('../models/DailyEntry');

const base64ToBuffer = (base64Str) => {
    if (!base64Str) return null;
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
};

// Fields to exclude from responses (large binary buffers)
const EXCLUDE_BUFFERS = '-sampling.samplingVideo -feedManagement.feedBills -financials.miscBills -financials.electricityBills -waterQuality.waterReport -shrimpHealth.shrimpPhoto -shrimpHealth.labReport';

const Pond = require('../models/Pond');

// @route   GET /api/entries/daily
// @desc    Fetch daily entries with optional pondId + date range + farmerId filters
// @query   farmerId, pondId, from (ISO date), to (ISO date)
router.get('/daily', async (req, res) => {
    try {
        const { pondId, farmerId, from, to } = req.query;

        const query = {};

        // Scope by farmerId — look up all ponds that belong to this farmer
        if (farmerId) {
            const farmerPonds = await Pond.find({ farmerId }).select('_id').lean();
            const pondIds = farmerPonds.map(p => p._id);
            query.pondId = { $in: pondIds };
        }

        // Narrower scope: specific pond overrides the farmerId pond list
        if (pondId) query.pondId = pondId;

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                query.date.$lte = toDate;
            }
        }

        const entries = await DailyEntry.find(query)
            .select(EXCLUDE_BUFFERS)
            .sort({ date: -1 })
            .lean();

        res.status(200).json({ success: true, data: entries });
    } catch (err) {
        console.error('Error in GET /api/entries/daily:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/entries/one-time
// @desc    Save one-time pond setup entry
router.post('/one-time', async (req, res) => {
    try {
        const data = req.body;

        const entryData = {
            ...data,
            pondPreparation: {
                ...data.pondPreparation,
                pondPrepBills: base64ToBuffer(data.pondPreparation?.pondPrepBills)
            },
            seedSelection: {
                ...data.seedSelection,
                pcrCertificate: base64ToBuffer(data.seedSelection?.pcrCertificate),
                seedBills: base64ToBuffer(data.seedSelection?.seedBills)
            }
        };

        const entry = await OneTimeEntry.create(entryData);
        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        console.error('Error in POST /api/entries/one-time:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/entries/daily
// @desc    Save or update a daily entry (tagged with current date)
router.post('/daily', async (req, res) => {
    try {
        const data = req.body;

        // Fetch existing to preserve files if not re-uploaded
        const existingEntry = await DailyEntry.findOne({ pondId: data.pondId, dayNumber: data.dayNumber }).lean();

        const getBuffer = (newBase64, oldBuffer) => {
            if (newBase64) return base64ToBuffer(newBase64);
            return oldBuffer;
        };

        const entryData = {
            ...data,
            // Stamp date server-side — frontend sends it, server ensures it's a proper Date
            date: data.date ? new Date(data.date) : new Date(),
            sampling: {
                ...data.sampling,
                samplingVideo: getBuffer(data.sampling?.samplingVideo, existingEntry?.sampling?.samplingVideo)
            },
            feedManagement: {
                ...data.feedManagement,
                feedBills: getBuffer(data.feedManagement?.feedBills, existingEntry?.feedManagement?.feedBills)
            },
            financials: {
                ...data.financials,
                miscBills: getBuffer(data.financials?.miscBills, existingEntry?.financials?.miscBills),
                electricityBills: getBuffer(data.financials?.electricityBills, existingEntry?.financials?.electricityBills)
            },
            waterQuality: {
                ...data.waterQuality,
                waterReport: getBuffer(data.waterQuality?.waterReport, existingEntry?.waterQuality?.waterReport)
            },
            shrimpHealth: {
                ...data.shrimpHealth,
                shrimpPhoto: getBuffer(data.shrimpHealth?.shrimpPhoto, existingEntry?.shrimpHealth?.shrimpPhoto),
                labReport: getBuffer(data.shrimpHealth?.labReport, existingEntry?.shrimpHealth?.labReport)
            }
        };

        // UPSERT: overwrite if same pond + day logged again
        const entry = await DailyEntry.findOneAndUpdate(
            { pondId: data.pondId, dayNumber: data.dayNumber },
            entryData,
            { new: true, upsert: true, runValidators: true }
        );

        // Return lean copy without buffers
        const lean = entry.toObject();
        delete lean['sampling']?.samplingVideo;
        delete lean['feedManagement']?.feedBills;
        delete lean['financials']?.miscBills;
        delete lean['financials']?.electricityBills;
        delete lean['waterQuality']?.waterReport;
        delete lean['shrimpHealth']?.shrimpPhoto;
        delete lean['shrimpHealth']?.labReport;

        res.status(200).json({ success: true, data: lean });
    } catch (err) {
        console.error('Error in POST /api/entries/daily:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
