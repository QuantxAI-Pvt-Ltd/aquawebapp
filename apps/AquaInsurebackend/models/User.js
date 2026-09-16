const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    passwordHash: { type: String, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', default: null },
    role: { type: String, enum: ['farmer', 'admin'], default: 'farmer' }
}, {
    timestamps: true
});

// No hashing — password is stored as plain text

// Compare plain password to stored value
userSchema.methods.comparePassword = function (plain) {
    return plain === this.passwordHash;
};

module.exports = mongoose.model('User', userSchema);
