const mongoose = require('mongoose');
const DailyEntry = require('./models/DailyEntry');

mongoose.connect('mongodb://127.0.0.1/aquainsure_dev').then(async () => {
    console.log('Fetching entries...');
    const entries = await DailyEntry.find({}).lean();
    let foundBuf = false;
    for (const e of entries) {
        if (e.feedManagement?.feedBills) {
            console.log('Found feedBills in ' + e._id);
            console.log('Is buffer?', Buffer.isBuffer(e.feedManagement.feedBills), 'has buffer object prop?', !!e.feedManagement.feedBills.buffer);
            foundBuf = true;
        }
        if (e.financials?.miscBills) {
            console.log('Found miscBills in ' + e._id);
            foundBuf = true;
        }
        if (e.financials?.electricityBills) {
            console.log('Found electricityBills in ' + e._id);
            foundBuf = true;
        }
    }
    if (!foundBuf) console.log('No bills in database whatsoever');
    process.exit(0);
}).catch(console.error);
