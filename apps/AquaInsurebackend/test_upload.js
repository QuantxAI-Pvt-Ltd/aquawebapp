const mongoose = require('mongoose');
const DailyEntry = require('./models/DailyEntry');

// use native base64 string mock
const dummyBase64 = 'data:image/png;base64,' + Buffer.from('hello world image').toString('base64');

function base64ToBufferFn(base64Str) {
    if (!base64Str) return null;
    const base64Data = base64Str.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    return Buffer.from(base64Data, 'base64');
}

mongoose.connect('mongodb://127.0.0.1/aquainsure_dev').then(async () => {
    // grab any pond
    const entry = await DailyEntry.findOne().lean();
    if (!entry) {
        console.log('No entry found to test on');
        process.exit(1);
    }

    // Convert
    const testBuf = base64ToBufferFn(dummyBase64);

    // Simulate what the router does:
    const data = {
        pondId: entry.pondId,
        dayNumber: entry.dayNumber,
        feedManagement: {
            feedCost: 9991, // mark
            feedBills: dummyBase64
        }
    };

    // from entryRoutes.js
    const existingEntry = await DailyEntry.findOne({ pondId: data.pondId, dayNumber: data.dayNumber }).lean();
    const getBuffer = (newBase64, oldBuffer) => {
        if (newBase64) return base64ToBufferFn(newBase64);
        return oldBuffer;
    };

    const entryData = {
        ...data,
        feedManagement: {
            ...data.feedManagement,
            feedBills: getBuffer(data.feedManagement?.feedBills, existingEntry?.feedManagement?.feedBills)
        }
    };

    await DailyEntry.findOneAndUpdate(
        { pondId: entry.pondId, dayNumber: entry.dayNumber },
        entryData,
        { new: true, upsert: true, runValidators: true }
    );

    // Fetch it back
    const verify = await DailyEntry.findOne({ pondId: entry.pondId, dayNumber: entry.dayNumber }).lean();
    console.log('Buffer saved?', !!verify.feedManagement?.feedBills);

    if (verify.feedManagement?.feedBills) {
        const buf = verify.feedManagement.feedBills.buffer || verify.feedManagement.feedBills;
        console.log('Buffer content matched?', buf.toString('utf8') === 'hello world image');
    }

    process.exit(0);
}).catch(console.error);
