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

const isDryRun = process.argv.includes('--dry-run');

/**
 * Detects if a field value is a binary Buffer or MongoDB Binary.
 */
function extractBuffer(val) {
  if (!val) return null;
  if (typeof val === 'object' && val.url) return null; // Already migrated
  if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return null;

  if (val.buffer && Buffer.isBuffer(val.buffer)) return val.buffer;
  if (Buffer.isBuffer(val)) return val;

  if (typeof val === 'string' && val.length > 50) {
    const base64Data = val.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    try {
      return Buffer.from(base64Data, 'base64');
    } catch {
      return null;
    }
  }

  return null;
}

function detectMime(buf) {
  if (!buf || buf.length < 4) return 'image/jpeg';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'RIFF') return 'image/webp';
  return 'image/jpeg';
}

async function migrateCollection(name, Model, fields, keyResolver) {
  console.log(`\n--- Migrating ${name} ---`);
  const docs = await Model.find({});
  let migratedCount = 0;
  let skippedCount = 0;

  for (const doc of docs) {
    let modified = false;

    for (const fieldPath of fields) {
      const parts = fieldPath.split('.');
      let target = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target?.[parts[i]];
      }
      const fieldName = parts[parts.length - 1];
      const val = target?.[fieldName];

      const buf = extractBuffer(val);
      if (buf && buf.length > 0) {
        const mime = detectMime(buf);
        const ext = mimeToExtension(mime);
        const key = await keyResolver(doc, fieldName, ext);
        console.log(`[${name}] ${doc._id} -> Found buffer in ${fieldPath} (${(buf.length / 1024).toFixed(1)} KB) -> ${key}`);

        if (!isDryRun) {
          try {
            const mediaObject = await uploadBuffer(buf, key, mime);
            target[fieldName] = mediaObject;
            modified = true;
            migratedCount++;
          } catch (uploadErr) {
            console.error(`Failed to upload ${fieldPath} for ${doc._id}:`, uploadErr.message);
          }
        } else {
          migratedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    if (modified && !isDryRun) {
      await doc.save();
    }
  }

  console.log(`Result for ${name}: ${migratedCount} migrated, ${skippedCount} skipped`);
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquainsure';
  console.log(`Starting SeaweedFS Buffer Migration (${isDryRun ? 'DRY RUN' : 'LIVE'})`);
  console.log(`Connecting to: ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected.');

  if (!isDryRun) {
    await ensureBucket();
  }

  try {
    // 1. Farmer
    await migrateCollection('Farmer', Farmer, [
      'identity.photo',
      'identity.aadharFile',
      'identity.panFile',
      'registration.regCertificate',
    ], (doc, field, ext) => {
      const farmerId = doc._id.toString();
      if (field === 'photo') return StorageHierarchy.farmerPhoto(farmerId, ext);
      if (field === 'aadharFile') return StorageHierarchy.farmerAadhar(farmerId, ext);
      if (field === 'panFile') return StorageHierarchy.farmerPan(farmerId, ext);
      return StorageHierarchy.farmerRegCert(farmerId, ext);
    });

    // 2. Farm
    await migrateCollection('Farm', Farm, ['farmPhoto'], (doc, field, ext) => {
      const farmerId = doc.farmerId?.toString() || 'unknown';
      return StorageHierarchy.farmPhoto(farmerId, doc._id.toString(), ext);
    });

    // 3. Pond
    await migrateCollection('Pond', Pond, ['photo'], (doc, field, ext) => {
      const farmerId = doc.farmerId?.toString() || 'unknown';
      const farmId = doc.farmId?.toString() || 'unknown';
      return StorageHierarchy.pondPhoto(farmerId, farmId, doc._id.toString(), ext);
    });

    // 4. OneTimeEntry
    await migrateCollection('OneTimeEntry', OneTimeEntry, [
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
    });

    // 5. DailyEntry
    await migrateCollection('DailyEntry', DailyEntry, [
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
      const dayNum = doc.dayNumber || 1;
      const dateStr = (doc.date ? new Date(doc.date) : new Date()).toISOString().split('T')[0];
      return StorageHierarchy.dailyMedia(farmerId, farmId, pondId, dayNum, dateStr, field, ext);
    });

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
