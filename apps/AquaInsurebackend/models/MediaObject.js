const mongoose = require('mongoose');

const mediaObjectSchema = new mongoose.Schema({
  key: { type: String, default: '' },
  bucket: { type: String, default: 'aquainsure-media' },
  url: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

module.exports = mediaObjectSchema;
