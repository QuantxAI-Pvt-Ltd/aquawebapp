const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const DailyEntry = require('../models/DailyEntry');
const Pond = require('../models/Pond');
const { processBillBuffer } = require('../utils/ocrUtils');

// @route   GET /api/export/excel
// @desc    Export daily entries with OCR totals to Excel
router.get('/excel', async (req, res) => {
    try {
        const { pondId, farmerId, from, to } = req.query;

        const query = {};

        // Scope by farmerId
        if (farmerId) {
            const farmerPonds = await Pond.find({ farmerId }).select('_id').lean();
            const pondIds = farmerPonds.map(p => p._id);
            query.pondId = { $in: pondIds };
        }

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

        // Fetch entries WITH buffers to process OCR
        // (feedBills, miscBills, electricityBills)
        const entries = await DailyEntry.find(query)
            .populate('pondId', 'name pondIdentifier')
            .sort({ date: -1 })
            .lean();

        if (!entries || entries.length === 0) {
            return res.status(404).json({ success: false, error: 'No data found' });
        }

        // Initialize Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('AquaInsure Report');

        // Setup Headers
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Day', key: 'day', width: 10 },
            { header: 'Pond', key: 'pond', width: 15 },
            { header: 'Manual Feed Cost (₹)', key: 'feedCost', width: 22 },
            { header: 'Extracted Feed Bill (₹)', key: 'extractedFeedBill', width: 22 },
            { header: 'Extracted Misc Bill (₹)', key: 'extractedMiscBill', width: 22 },
            { header: 'Extracted Electricity (₹)', key: 'extractedElectricityBill', width: 24 },
            { header: 'Manual Labour Cost (₹)', key: 'labourCost', width: 22 },
            { header: 'Manual Water Cost (₹)', key: 'waterCost', width: 22 },
            { header: 'Manual Other Exp (₹)', key: 'otherExpenses', width: 22 },
            { header: 'Grand Total Cost (₹)', key: 'grandTotal', width: 22 },
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

        // Process each entry
        for (const entry of entries) {
            const dateStr = entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '';
            const pondName = entry.pondId?.name || entry.pondId?.pondIdentifier || entry.pondId || '';

            // Default manual costs
            const feedCost = parseFloat(entry.feedManagement?.feedCost) || 0;
            const labourCost = parseFloat(entry.financials?.labourCost) || 0;
            const waterCost = parseFloat(entry.financials?.waterCost) || 0;
            const otherExpenses = parseFloat(entry.financials?.otherExpenses) || 0;

            // OCR Extraction for uploaded bills (supports MediaObject, Base64, and binary Buffers)
            let extractedFeed = 0;
            let extractedMisc = 0;
            let extractedElec = 0;

            const streamToBuffer = async (stream) => {
                return new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on('data', chunk => chunks.push(chunk));
                    stream.on('end', () => resolve(Buffer.concat(chunks)));
                    stream.on('error', reject);
                });
            };

            const getMimeType = (fileBuf) => {
                if (!fileBuf) return null;
                try {
                    const header = fileBuf.toString('utf8', 0, 4);
                    if (header === '%PDF') return 'application/pdf';
                } catch (e) { }
                return 'image/jpeg';
            };

            const resolveBillBufferAndMime = async (val) => {
                if (!val) return null;
                try {
                    if (Buffer.isBuffer(val)) {
                        return { buffer: val, mimeType: getMimeType(val) };
                    }
                    if (val.buffer && (Buffer.isBuffer(val.buffer) || typeof val.buffer === 'object')) {
                        const buf = Buffer.isBuffer(val.buffer) ? val.buffer : Buffer.from(val.buffer);
                        return { buffer: buf, mimeType: getMimeType(buf) };
                    }
                    if (typeof val === 'string' && val.startsWith('data:')) {
                        const match = val.match(/^data:([^;]+);base64,(.+)$/);
                        if (match) {
                            return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
                        }
                    }
                    const key = val.key || (typeof val === 'string' && val.includes('key=') ? decodeURIComponent(val.split('key=')[1].split('&')[0]) : null);
                    if (key) {
                        const { getObjectStream } = require('../utils/seaweedfs');
                        const streamRes = await getObjectStream(key, val.bucket || 'aquainsure');
                        if (streamRes && streamRes.stream) {
                            const buf = await streamToBuffer(streamRes.stream);
                            return { buffer: buf, mimeType: streamRes.contentType || val.mimeType || getMimeType(buf) };
                        }
                    }
                } catch (err) {
                    console.warn('[Export] Bill OCR buffer resolution warning:', err.message);
                }
                return null;
            };

            const extractBillAmount = async (val) => {
                if (!val) return 0;
                try {
                    const resolved = await resolveBillBufferAndMime(val);
                    if (resolved && resolved.buffer && resolved.buffer.length > 0) {
                        return await processBillBuffer(resolved.buffer, resolved.mimeType);
                    }
                } catch (err) {
                    console.warn('[Export] OCR extraction failed for bill, defaulting to 0:', err.message);
                }
                return 0;
            };

            if (entry.feedManagement?.feedBills) {
                extractedFeed = await extractBillAmount(entry.feedManagement.feedBills);
            }
            if (entry.financials?.miscBills) {
                extractedMisc = await extractBillAmount(entry.financials.miscBills);
            }
            if (entry.financials?.electricityBills) {
                extractedElec = await extractBillAmount(entry.financials.electricityBills);
            }

            // Calculate Grand Total (combining manual inputs + extracted OCR values)
            // If the user inputs feedCost manually AND uploads a bill, we add them, or you could do Math.max.
            // Let's add them all for the grand total as requested.
            const grandTotal = feedCost + labourCost + waterCost + otherExpenses + extractedFeed + extractedMisc + extractedElec;

            worksheet.addRow({
                date: dateStr,
                day: entry.dayNumber,
                pond: pondName,
                feedCost: feedCost,
                extractedFeedBill: extractedFeed,
                extractedMiscBill: extractedMisc,
                extractedElectricityBill: extractedElec,
                labourCost: labourCost,
                waterCost: waterCost,
                otherExpenses: otherExpenses,
                grandTotal: grandTotal
            });
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'AquaInsure_Report.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exporting Excel:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
