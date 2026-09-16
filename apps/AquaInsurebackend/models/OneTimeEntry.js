const mongoose = require('mongoose');

const oneTimeEntrySchema = new mongoose.Schema({
    pondId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pond',
        required: true
    },

    pondPreparation: {
        followedPractices: { type: Boolean, default: false },
        pondPrepBills: { type: mongoose.Schema.Types.Mixed } // SeaweedFS MediaObject or legacy Buffer
    },

    seedSelection: {
        pcrTesting: { type: Boolean, default: false },
        pcrCertificate: { type: mongoose.Schema.Types.Mixed }, // SeaweedFS MediaObject or legacy Buffer
        seedBills: { type: mongoose.Schema.Types.Mixed }       // SeaweedFS MediaObject or legacy Buffer
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OneTimeEntry', oneTimeEntrySchema);
