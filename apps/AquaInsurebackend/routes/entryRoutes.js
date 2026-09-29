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
            .sort({ dayNumber: 1, date: -1 })
            .lean();

        res.status(200).json({ success: true, data: entries });
    } catch (err) {
        console.error('Error in GET /api/entries/daily:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const { uploadBase64, parseBase64Media, StorageHierarchy } = require('../utils/seaweedfs');

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
            console.warn('[SeaweedFS] Entry upload failed, fallback to inline MediaObject:', err.message);
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

// @route   GET /api/entries/one-time
// @desc    Get one-time setup entry for a pond
router.get('/one-time', async (req, res) => {
    try {
        const { pondId } = req.query;
        if (!pondId) {
            return res.status(400).json({ success: false, error: 'pondId is required' });
        }
        const entry = await OneTimeEntry.findOne({ pondId }).lean();
        res.status(200).json({ success: true, data: entry });
    } catch (err) {
        console.error('Error in GET /api/entries/one-time:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/entries/one-time
// @desc    Save one-time pond setup entry
router.post('/one-time', requireAuth, async (req, res) => {
    try {
        const data = req.body;

        const pond = await Pond.findById(data.pondId).select('farmId farmerId').lean();
        const farmerId = pond?.farmerId?.toString() || 'unknown';
        const farmId = pond?.farmId?.toString() || 'unknown';
        const pondIdStr = data.pondId?.toString();

        const [pondPrepBillsObj, pcrCertObj, seedBillsObj] = await Promise.all([
            data.pondPreparation?.pondPrepBills
                ? safeUploadBase64(data.pondPreparation.pondPrepBills, (ext) => StorageHierarchy.oneTimePondPrepBills(farmerId, farmId, pondIdStr, ext))
                : null,
            data.seedSelection?.pcrCertificate
                ? safeUploadBase64(data.seedSelection.pcrCertificate, (ext) => StorageHierarchy.oneTimePcrCert(farmerId, farmId, pondIdStr, ext))
                : null,
            data.seedSelection?.seedBills
                ? safeUploadBase64(data.seedSelection.seedBills, (ext) => StorageHierarchy.oneTimeSeedBills(farmerId, farmId, pondIdStr, ext))
                : null,
        ]);

        const entryData = {
            ...data,
            pondPreparation: {
                ...data.pondPreparation,
                pondPrepBills: pondPrepBillsObj
            },
            seedSelection: {
                ...data.seedSelection,
                pcrCertificate: pcrCertObj,
                seedBills: seedBillsObj
            }
        };

        const entry = await OneTimeEntry.findOneAndUpdate(
            { pondId: data.pondId },
            { $set: entryData },
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, data: entry });
    } catch (err) {
        console.error('Error in POST /api/entries/one-time:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/entries/daily
// @desc    Save or update a daily entry (tagged with current date)
router.post('/daily', requireAuth, async (req, res) => {
    try {
        const data = req.body;

        if (!data.pondId || !data.dayNumber) {
            return res.status(400).json({ success: false, error: 'pondId and dayNumber are required' });
        }

        // Fetch existing to preserve files if not re-uploaded
        const existingEntry = await DailyEntry.findOne({ pondId: data.pondId, dayNumber: data.dayNumber }).lean();

        const pond = await Pond.findById(data.pondId).select('farmId farmerId').lean();
        const farmerId = pond?.farmerId?.toString() || 'unknown';
        const farmId = pond?.farmId?.toString() || 'unknown';
        const pondIdStr = data.pondId?.toString();
        const dayNumber = Number(data.dayNumber) || 1;
        const dateStr = (data.date ? new Date(data.date) : new Date()).toISOString().split('T')[0];

        const uploadDailyField = (val, oldVal, fieldName) => {
            if (val) {
                return safeUploadBase64(val, (ext) =>
                    StorageHierarchy.dailyMedia(farmerId, farmId, pondIdStr, dayNumber, dateStr, fieldName, ext)
                );
            }
            return oldVal || null;
        };

        const [samplingVideo, feedBills, miscBills, electricityBills, waterReport, shrimpPhoto, labReport] = await Promise.all([
            uploadDailyField(data.sampling?.samplingVideo, existingEntry?.sampling?.samplingVideo, 'samplingVideo'),
            uploadDailyField(data.feedManagement?.feedBills, existingEntry?.feedManagement?.feedBills, 'feedBills'),
            uploadDailyField(data.financials?.miscBills, existingEntry?.financials?.miscBills, 'miscBills'),
            uploadDailyField(data.financials?.electricityBills, existingEntry?.financials?.electricityBills, 'electricityBills'),
            uploadDailyField(data.waterQuality?.waterReport, existingEntry?.waterQuality?.waterReport, 'waterReport'),
            uploadDailyField(data.shrimpHealth?.shrimpPhoto, existingEntry?.shrimpHealth?.shrimpPhoto, 'shrimpPhoto'),
            uploadDailyField(data.shrimpHealth?.labReport, existingEntry?.shrimpHealth?.labReport, 'labReport'),
        ]);

        const toNum = (v) => {
            if (v === null || v === undefined || v === '') return undefined;
            const n = Number(v);
            return isNaN(n) ? undefined : n;
        };

        const healthStatus = (data.shrimpHealth?.status === 'normal' || data.shrimpHealth?.status === 'deficiency')
            ? data.shrimpHealth.status
            : (existingEntry?.shrimpHealth?.status || undefined);

        const entryData = {
            pondId: data.pondId,
            dayNumber,
            date: data.date ? new Date(data.date) : new Date(),
            sampling: {
                survival: toNum(data.sampling?.survival) ?? existingEntry?.sampling?.survival,
                biomass: toNum(data.sampling?.biomass) ?? existingEntry?.sampling?.biomass,
                proportionateGrowth: data.sampling?.proportionateGrowth !== undefined
                    ? Boolean(data.sampling.proportionateGrowth)
                    : existingEntry?.sampling?.proportionateGrowth,
                samplingVideo
            },
            feedManagement: {
                feedQuantity: toNum(data.feedManagement?.feedQuantity) ?? existingEntry?.feedManagement?.feedQuantity,
                feedCost: toNum(data.feedManagement?.feedCost) ?? existingEntry?.feedManagement?.feedCost,
                feedBills
            },
            financials: {
                labourCost: toNum(data.financials?.labourCost) ?? existingEntry?.financials?.labourCost,
                otherExpenses: toNum(data.financials?.otherExpenses) ?? existingEntry?.financials?.otherExpenses,
                waterCost: toNum(data.financials?.waterCost) ?? existingEntry?.financials?.waterCost,
                miscBills,
                electricityBills
            },
            waterQuality: {
                do: toNum(data.waterQuality?.do) ?? existingEntry?.waterQuality?.do,
                ph: toNum(data.waterQuality?.ph) ?? existingEntry?.waterQuality?.ph,
                temperature: toNum(data.waterQuality?.temperature) ?? existingEntry?.waterQuality?.temperature,
                ammonia: toNum(data.waterQuality?.ammonia) ?? existingEntry?.waterQuality?.ammonia,
                hardness: toNum(data.waterQuality?.hardness) ?? existingEntry?.waterQuality?.hardness,
                alkalinity: toNum(data.waterQuality?.alkalinity) ?? existingEntry?.waterQuality?.alkalinity,
                waterReport
            },
            shrimpHealth: {
                status: healthStatus,
                measures: data.shrimpHealth?.measures || existingEntry?.shrimpHealth?.measures || '',
                shrimpPhoto,
                labReport
            },
            productionEstimation: {
                expectedCop: toNum(data.productionEstimation?.expectedCop) ?? existingEntry?.productionEstimation?.expectedCop,
                expectedProduction: toNum(data.productionEstimation?.expectedProduction) ?? existingEntry?.productionEstimation?.expectedProduction,
                expectedAbw: toNum(data.productionEstimation?.expectedAbw) ?? existingEntry?.productionEstimation?.expectedAbw
            }
        };

        // UPSERT: overwrite if same pond + day logged again
        const entry = await DailyEntry.findOneAndUpdate(
            { pondId: data.pondId, dayNumber },
            entryData,
            { new: true, upsert: true, runValidators: true }
        );

        // Return lean copy
        const lean = entry.toObject();
        res.status(200).json({ success: true, data: lean });
    } catch (err) {
        console.error('Error in POST /api/entries/daily:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
