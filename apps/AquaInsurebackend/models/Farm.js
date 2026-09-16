const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: true
    },

    // Location
    location: {
        place: { type: String, required: true },
        taluk: { type: String, required: true },
        district: { type: String, required: true }
    },
    latitude: { type: Number },
    longitude: { type: Number },

    // Ownership
    ownership: {
        type: { type: String, enum: ['owned', 'leased'], required: true },
        patta: { type: String, required: true }
    },

    totalPonds: { type: Number, required: true },
    farmPhoto: { type: mongoose.Schema.Types.Mixed }, // SeaweedFS MediaObject or legacy Buffer

    // Infrastructure — all boolean Yes/No from UI toggles
    infrastructure: {
        filtration: { type: Boolean, default: false },
        reservoir: { type: Boolean, default: false },
        farmFencing: { type: Boolean, default: false },
        birdFencing: { type: Boolean, default: false },
        dips: { type: Boolean, default: false },      // disinfection dips
        power: { type: Boolean, default: false },      // power backup
        aerators: { type: Boolean, default: false },
        nursery: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Farm', farmSchema);
