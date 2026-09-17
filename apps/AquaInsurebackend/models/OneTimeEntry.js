const mongoose = require('mongoose');
const mediaObjectSchema = require('./MediaObject');

const oneTimeEntrySchema = new mongoose.Schema({
    pondId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pond',
        required: true
    },

    pondPreparation: {
        followedPractices: { type: Boolean, default: false },
        pondPrepBills: { type: mediaObjectSchema, default: null }
    },

    seedSelection: {
        pcrTesting: { type: Boolean, default: false },
        pcrCertificate: { type: mediaObjectSchema, default: null },
        seedBills: { type: mediaObjectSchema, default: null }
    }
}, {
    timestamps: true
});

// Unique index: each pond has only one one-time setup entry
oneTimeEntrySchema.index({ pondId: 1 }, { unique: true });

module.exports = mongoose.model('OneTimeEntry', oneTimeEntrySchema);
