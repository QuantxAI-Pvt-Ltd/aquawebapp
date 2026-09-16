const mongoose = require('mongoose');
const DailyEntry = require('./models/DailyEntry');
const { processBillBuffer } = require('./utils/ocrUtils');

function getMimeType(fileBuf) {
    if (!fileBuf) return null;
    try {
        const buf = Buffer.isBuffer(fileBuf) ? fileBuf : Buffer.from(fileBuf);
        if (buf.toString('utf8', 0, 4) === '%PDF') return 'application/pdf';
    } catch (err) { }
    return 'image/jpeg';
}

mongoose.connect('mongodb://127.0.0.1:27017/aquainsure').then(async () => {
    console.log('Fetching entries...');
    const entries = await DailyEntry.find({
        $or: [
            { 'feedManagement.feedBills': { $exists: true, $ne: null } },
            { 'financials.miscBills': { $exists: true, $ne: null } },
            { 'financials.electricityBills': { $exists: true, $ne: null } }
        ]
    }).lean();

    console.log('Found entries with bills:', entries.length);
    for (const e of entries) {
        console.log('Entry ID:', e._id, 'Date:', e.date, 'Day Number:', e.dayNumber);
        if (e.feedManagement?.feedBills) {
            const buf = e.feedManagement.feedBills.buffer || e.feedManagement.feedBills;
            console.log('Has feedBills buffer of length:', buf.length || buf.byteLength);
            const type = getMimeType(buf);
            const result = await processBillBuffer(Buffer.from(buf), type);
            console.log('---> OCR Feed Result:', result);
        }
        if (e.financials?.miscBills) {
            const buf = e.financials.miscBills.buffer || e.financials.miscBills;
            console.log('Has miscBills buffer of length:', buf.length || buf.byteLength);
            const type = getMimeType(buf);
            const result = await processBillBuffer(Buffer.from(buf), type);
            console.log('---> OCR Misc Result:', result);
        }
        if (e.financials?.electricityBills) {
            const buf = e.financials.electricityBills.buffer || e.financials.electricityBills;
            console.log('Has electricityBills buffer of length:', buf.length || buf.byteLength);
            const type = getMimeType(buf);
            const result = await processBillBuffer(Buffer.from(buf), type);
            console.log('---> OCR Elec Result:', result);
        }
    }
    process.exit(0);
}).catch(console.error);
