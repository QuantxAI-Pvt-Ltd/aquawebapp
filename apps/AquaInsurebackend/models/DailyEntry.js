const mongoose = require('mongoose');
const mediaObjectSchema = require('./MediaObject');

const dailyEntrySchema = new mongoose.Schema({
    pondId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pond',
        required: true
    },

    dayNumber: { type: Number, required: true },
    date: { type: Date, required: true },

    sampling: {
        survival: { type: Number },              // % e.g. 60–100
        biomass: { type: Number },               // kg
        proportionateGrowth: { type: Boolean },  // Yes/No
        samplingVideo: { type: mediaObjectSchema, default: null }
    },

    feedManagement: {
        feedQuantity: { type: Number },          // kg
        feedCost: { type: Number },              // ₹
        feedBills: { type: mediaObjectSchema, default: null }
    },

    financials: {
        labourCost: { type: Number },            // ₹
        otherExpenses: { type: Number },         // ₹
        miscBills: { type: mediaObjectSchema, default: null },
        waterCost: { type: Number },             // ₹
        electricityBills: { type: mediaObjectSchema, default: null }
    },

    waterQuality: {
        do: { type: Number },                    // mg/L
        ph: { type: Number },
        temperature: { type: Number },           // °C
        ammonia: { type: Number },               // mg/L
        hardness: { type: Number },              // mg/L
        alkalinity: { type: Number },            // mg/L
        waterReport: { type: mediaObjectSchema, default: null }
    },

    shrimpHealth: {
        status: { type: String, enum: ['normal', 'deficiency'] },
        measures: { type: String },              // text note
        shrimpPhoto: { type: mediaObjectSchema, default: null },
        labReport: { type: mediaObjectSchema, default: null }
    },

    productionEstimation: {
        expectedCop: { type: Number },           // Cost of Production ₹
        expectedProduction: { type: Number },    // tonnes/ha (1–12)
        expectedAbw: { type: Number }            // Average Body Weight g (10–30)
    }
}, {
    timestamps: true
});

// Compound index: prevents duplicate entry for same pond+day
dailyEntrySchema.index({ pondId: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('DailyEntry', dailyEntrySchema);
