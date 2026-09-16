const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
    pondId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pond',
        required: true
    },
    insuredPondIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pond'
    }],
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: true
    },
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },

    stockingDate: { type: Date, required: true },
    stockingDensity: { type: Number, required: true },
    species: { type: String, enum: ['vannamei', 'tiger'], required: true },
    insuranceType: { type: String, enum: ['basic', 'comprehensive'], required: true },
    insurancePeriodDays: { type: Number, required: true },

    plannedHarvestDate: { type: Date },
    maxHarvestDate: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'claimed'], default: 'active' }

}, {
    timestamps: true
});

module.exports = mongoose.model('Insurance', insuranceSchema);
