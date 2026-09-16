const mongoose = require('mongoose');
const DailyEntry = require('./models/DailyEntry');
const { processBillBuffer } = require('./utils/ocrUtils');

mongoose.connect('mongodb://127.0.0.1/aquainsure_dev').then(async () => {
    console.log('Connected to DB...');
    const entry = await DailyEntry.findOne({
        $or: [
            { 'feedManagement.feedBills': { $exists: true, $ne: null } },
            { 'financials.miscBills': { $exists: true, $ne: null } },
            { 'financials.electricityBills': { $exists: true, $ne: null } }
        ]
    }).lean();
    if (!entry) {
        console.log('No entries with ANY bills found in database.');
        process.exit(0);
    }

    // Find which property holds the buffer
    let buf = null;
    if (entry.feedManagement?.feedBills) buf = entry.feedManagement.feedBills.buffer || entry.feedManagement.feedBills;
    else if (entry.financials?.miscBills) buf = entry.financials.miscBills.buffer || entry.financials.miscBills;
    else if (entry.financials?.electricityBills) buf = entry.financials.electricityBills.buffer || entry.financials.electricityBills;

    const isBuf = Buffer.isBuffer(buf);
    console.log('Got bill buffer?', isBuf, buf ? buf.length : 0);

    // Test the header guessing logic 
    const getMimeType = (fileBuf) => {
        if (!fileBuf) return null;
        try {
            const header = fileBuf.toString('utf8', 0, 4);
            if (header === '%PDF') return 'application/pdf';
        } catch (e) { }
        return 'image/jpeg';
    };

    const trueBuf = isBuf ? buf : Buffer.from(buf);
    const mime = getMimeType(trueBuf);
    console.log('Detected Mime Type:', mime);

    console.log('Calling OCR...');
    const result = await processBillBuffer(trueBuf, mime);
    console.log('OCR Extracted Result (Total Amount Found):', result);
    process.exit(0);
}).catch(console.error);
