const mongoose = require('mongoose');

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
        samplingVideo: { type: mongoose.Schema.Types.Mixed } // SeaweedFS MediaObject or legacy Buffer
    },

    feedManagement: {
        feedQuantity: { type: Number },          // kg
        feedCost: { type: Number },              // ₹
        feedBills: { type: mongoose.Schema.Types.Mixed }     // SeaweedFS MediaObject or legacy Buffer
    },

    financials: {
        labourCost: { type: Number },            // ₹
        otherExpenses: { type: Number },         // ₹
        miscBills: { type: mongoose.Schema.Types.Mixed },    // SeaweedFS MediaObject or legacy Buffer
        waterCost: { type: Number },             // ₹
        electricityBills: { type: mongoose.Schema.Types.Mixed } // SeaweedFS MediaObject or legacy Buffer
    },

    waterQuality: {
        do: { type: Number },                    // mg/L
        ph: { type: Number },
        temperature: { type: Number },           // °C
        ammonia: { type: Number },               // mg/L
        hardness: { type: Number },              // mg/L
        alkalinity: { type: Number },            // mg/L
        waterReport: { type: mongoose.Schema.Types.Mixed }   // SeaweedFS MediaObject or legacy Buffer
    },

    shrimpHealth: {
        status: { type: String, enum: ['normal', 'deficiency'] },
        measures: { type: String },              // text note
        shrimpPhoto: { type: mongoose.Schema.Types.Mixed },  // SeaweedFS MediaObject or legacy Buffer
        labReport: { type: mongoose.Schema.Types.Mixed }     // SeaweedFS MediaObject or legacy Buffer
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
