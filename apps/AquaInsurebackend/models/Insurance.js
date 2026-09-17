const mongoose = require('mongoose');
const mediaObjectSchema = require('./MediaObject');

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
    status: {
        type: String,
        enum: ['active', 'expired', 'claim_pending', 'claim_approved', 'claim_rejected', 'claimed'],
        default: 'active'
    },

    claim: {
        claimedAt: { type: Date },
        reason: {
            type: String,
            enum: ['disease_outbreak', 'mass_mortality', 'flooding_calamity', 'water_toxicity', 'other']
        },
        description: { type: String, default: '' },
        estimatedLossPercent: { type: Number, default: 0 },
        evidencePhoto: { type: mediaObjectSchema, default: null },
        status: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewedAt: { type: Date },
        reviewerNotes: { type: String, default: '' },
        settlementAmount: { type: Number, default: 0 }
    }

}, {
    timestamps: true
});

// Compound indexes for quick status lookups by farmer and claims filtering
insuranceSchema.index({ farmerId: 1, status: 1 });
insuranceSchema.index({ pondId: 1 });
insuranceSchema.index({ status: 1 });
insuranceSchema.index({ 'claim.status': 1 });

module.exports = mongoose.model('Insurance', insuranceSchema);
