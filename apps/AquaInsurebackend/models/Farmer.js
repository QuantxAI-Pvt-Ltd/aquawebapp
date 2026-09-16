const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
    // Basic Details
    name: { type: String, required: true },
    fatherName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    isScSt: { type: Boolean, default: false },
    dob: { type: String }, // ISO date string "YYYY-MM-DD"
    community: { type: String },

    // Address
    address: {
        village: { type: String, required: true },
        taluk: { type: String, required: true },
        district: { type: String, required: true },
        state: { type: String, required: true },
        pinCode: { type: String, required: true }
    },

    // Registration
    registration: {
        regType: { type: String, enum: ['caa', 'mpeda', 'dof'] },
        regNumber: { type: String },
        regCertificate: { type: mongoose.Schema.Types.Mixed } // SeaweedFS MediaObject or legacy Buffer
    },

    // Identity
    identity: {
        aadharNumber: { type: String, unique: true, sparse: true },
        aadharFile: { type: mongoose.Schema.Types.Mixed },    // SeaweedFS MediaObject or legacy Buffer
        hasPan: { type: Boolean, default: false },
        panNumber: { type: String },
        panFile: { type: mongoose.Schema.Types.Mixed },       // SeaweedFS MediaObject or legacy Buffer
        photo: { type: mongoose.Schema.Types.Mixed }          // SeaweedFS MediaObject or legacy Buffer
    },

    // Bank Details
    bankDetails: {
        accountHolderName: { type: String },
        bankName: { type: String },
        branch: { type: String },
        accountType: { type: String, enum: ['savings', 'current'] },
        accountNumber: { type: String },
        ifscCode: { type: String }
    }
}, {
    timestamps: true // createdAt, updatedAt
});

module.exports = mongoose.model('Farmer', farmerSchema);
