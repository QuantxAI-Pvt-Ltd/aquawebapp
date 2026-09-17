const mongoose = require('mongoose');
const mediaObjectSchema = require('./MediaObject');

const pondSchema = new mongoose.Schema({
    // Foreign keys — farmerId is denormalized for direct farmer queries
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: true
    },

    pondNumber: { type: Number, required: true }, // e.g. 1, 2, 3
    name:       { type: String, required: true },  // e.g. "Pond 1"

    // Insured Ponds data
    dimensionAcres: { type: Number },              // size in acres
    photo:          { type: mediaObjectSchema, default: null },

    // Per-pond address
    address: {
        village:  { type: String },
        taluk:    { type: String },
        district: { type: String },
        state:    { type: String },
        pinCode:  { type: String }
    }
}, {
    timestamps: true
});

// Indexes for rapid queries by farmer and farm
pondSchema.index({ farmerId: 1, pondNumber: 1 });
pondSchema.index({ farmId: 1 });

module.exports = mongoose.model('Pond', pondSchema);
