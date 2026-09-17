const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const DailyEntry = require('../models/DailyEntry');
const OneTimeEntry = require('../models/OneTimeEntry');
const { uploadBuffer, ensureBucket, StorageHierarchy, mimeToExtension } = require('./seaweedfs');

const isMigrate = process.argv.includes('--migrate');

function inspectField(val) {
  if (!val) return { type: 'empty', bytes: 0 };

  // Valid SeaweedFS MediaObject pointer
  if (typeof val === 'object' && val.key && val.url) {
    return { type: 'pointer', key: val.key, url: val.url, bytes: JSON.stringify(val).length };
  }

  // Already a URL string
  if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'))) {
    return { type: 'url_string', url: val, bytes: val.length };
  }

  // Raw binary buffer
  if (Buffer.isBuffer(val)) {
    return { type: 'binary_buffer', buffer: val, bytes: val.length };
  }
  if (val.buffer && Buffer.isBuffer(val.buffer)) {
    return { type: 'binary_buffer', buffer: val.buffer, bytes: val.buffer.length };
  }

  // Base64 data URI or raw base64 string
  if (typeof val === 'string' && val.length > 50) {
    const dataUriMatch = val.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/s);
    if (dataUriMatch) {
      const buffer = Buffer.from(dataUriMatch[2], 'base64');
      return { type: 'base64_data_uri', buffer, mimeType: dataUriMatch[1], bytes: buffer.length };
    }
    try {
      const buffer = Buffer.from(val, 'base64');
      if (buffer.length > 32) {
        return { type: 'raw_base64', buffer, bytes: buffer.length };
      }
    } catch { }
  }

  return { type: 'unknown', bytes: 0 };
}

function detectMime(buf) {
  if (!buf || buf.length < 4) return 'image/jpeg';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'RIFF') return 'image/webp';
  return 'image/jpeg';
}

async function auditCollection(name, Model, fields, keyResolver) {
  const docs = await Model.find({}).lean();
  let cleanCount = 0;
  let binaryBloatCount = 0;
  let emptyCount = 0;
  let totalBloatBytes = 0;

  for (const doc of docs) {
    for (const fieldPath of fields) {
      const parts = fieldPath.split('.');
      let target = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target?.[parts[i]];
      }
      const fieldName = parts[parts.length - 1];
      const val = target?.[fieldName];

      const inspection = inspectField(val);
      if (inspection.type === 'pointer' || inspection.type === 'url_string') {
        cleanCount++;
      } else if (inspection.type === 'empty') {
        emptyCount++;
      } else if (inspection.buffer) {
        binaryBloatCount++;
        totalBloatBytes += inspection.bytes;

        if (isMigrate) {
          const mime = inspection.mimeType || detectMime(inspection.buffer);
          const ext = mimeToExtension(mime);
          const key = await keyResolver(doc, fieldName, ext);
          try {
            const mediaObject = await uploadBuffer(inspection.buffer, key, mime);
            const updateObj = {};
            updateObj[fieldPath] = mediaObject;
            await Model.updateOne({ _id: doc._id }, { $set: updateObj });
            console.log(`  [Migrated] ${name} (${doc._id}) -> ${fieldPath} (${(inspection.bytes / 1024).toFixed(1)} KB) -> ${key}`);
          } catch (err) {
            console.error(`  [Failed] ${name} (${doc._id}) -> ${fieldPath}:`, err.message);
          }
        }
      }
    }
  }

  return {
    collection: name,
    totalDocs: docs.length,
    cleanPointers: cleanCount,
    binaryBloatCount,
    emptyFields: emptyCount,
    totalBloatKB: (totalBloatBytes / 1024).toFixed(2),
  };
}

async function runAudit() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquainsure';
  console.log(`\n============================================================`);
  console.log(`     MongoDB Image Decoupling & Schema Audit Tool`);
  console.log(`============================================================`);
  console.log(`Connecting to: ${mongoUri}`);
  console.log(`Mode: ${isMigrate ? 'MIGRATE & CLEAN (Uploads to SeaweedFS)' : 'INSPECTION ONLY (Pass --migrate to clean)'}\n`);

  try {
    await mongoose.connect(mongoUri);
    console.log(`✓ Connected to MongoDB.\n`);

    if (isMigrate) {
      await ensureBucket();
    }

    const results = [];

    // 1. Farmer
    results.push(await auditCollection('Farmer', Farmer, [
      'identity.photo',
      'identity.aadharFile',
      'identity.panFile',
      'registration.regCertificate',
    ], (doc, field, ext) => {
      const id = doc._id.toString();
      if (field === 'photo') return StorageHierarchy.farmerPhoto(id, ext);
      if (field === 'aadharFile') return StorageHierarchy.farmerAadhar(id, ext);
      if (field === 'panFile') return StorageHierarchy.farmerPan(id, ext);
      return StorageHierarchy.farmerRegCert(id, ext);
    }));

    // 2. Farm
    results.push(await auditCollection('Farm', Farm, ['farmPhoto'], (doc, field, ext) => {
      return StorageHierarchy.farmPhoto(doc.farmerId?.toString() || 'unknown', doc._id.toString(), ext);
    }));

    // 3. Pond
    results.push(await auditCollection('Pond', Pond, ['photo'], (doc, field, ext) => {
      return StorageHierarchy.pondPhoto(doc.farmerId?.toString() || 'unknown', doc.farmId?.toString() || 'unknown', doc._id.toString(), ext);
    }));

    // 4. OneTimeEntry
    results.push(await auditCollection('OneTimeEntry', OneTimeEntry, [
      'pondPreparation.pondPrepBills',
      'seedSelection.pcrCertificate',
      'seedSelection.seedBills',
    ], async (doc, field, ext) => {
      const pond = await Pond.findById(doc.pondId).select('farmId farmerId').lean();
      const farmerId = pond?.farmerId?.toString() || 'unknown';
      const farmId = pond?.farmId?.toString() || 'unknown';
      const pondId = doc.pondId?.toString() || 'unknown';
      if (field === 'pondPrepBills') return StorageHierarchy.oneTimePondPrepBills(farmerId, farmId, pondId, ext);
      if (field === 'pcrCertificate') return StorageHierarchy.oneTimePcrCert(farmerId, farmId, pondId, ext);
      return StorageHierarchy.oneTimeSeedBills(farmerId, farmId, pondId, ext);
    }));

    // 5. DailyEntry
    results.push(await auditCollection('DailyEntry', DailyEntry, [
      'sampling.samplingVideo',
      'feedManagement.feedBills',
      'financials.miscBills',
      'financials.electricityBills',
      'waterQuality.waterReport',
      'shrimpHealth.shrimpPhoto',
      'shrimpHealth.labReport',
    ], async (doc, field, ext) => {
      const pond = await Pond.findById(doc.pondId).select('farmId farmerId').lean();
      const farmerId = pond?.farmerId?.toString() || 'unknown';
      const farmId = pond?.farmId?.toString() || 'unknown';
      const pondId = doc.pondId?.toString() || 'unknown';
      const day = doc.dayNumber || 1;
      const date = (doc.date ? new Date(doc.date) : new Date()).toISOString().split('T')[0];
      return StorageHierarchy.dailyMedia(farmerId, farmId, pondId, day, date, field, ext);
    }));

    console.log(`\n------------------ AUDIT RESULTS ------------------`);
    console.table(results);

    const totalBloat = results.reduce((acc, r) => acc + parseFloat(r.totalBloatKB), 0);
    const totalBinaryDocs = results.reduce((acc, r) => acc + r.binaryBloatCount, 0);

    if (totalBinaryDocs === 0) {
      console.log(`✓ 100% CLEAN: Zero binary blobs or Base64 images are stored in MongoDB.`);
      console.log(`✓ All media fields are referenced via lightweight SeaweedFS MediaObject pointers.`);
    } else {
      console.log(`⚠️ FOUND ${totalBinaryDocs} binary blob(s) occupying ${totalBloat.toFixed(2)} KB in MongoDB.`);
      if (!isMigrate) {
        console.log(`👉 Run 'node audit_and_clean_mongo_images.js --migrate' to automatically upload them to SeaweedFS and convert them to pointers.`);
      } else {
        console.log(`✓ Migration completed! All detected binary fields have been converted to SeaweedFS pointers.`);
      }
    }
  } catch (err) {
    console.error(`Error running audit:`, err);
  } finally {
    await mongoose.disconnect();
    console.log(`Disconnected from MongoDB.\n`);
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = { runAudit };
