const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const DailyEntry = require('../models/DailyEntry');
const OneTimeEntry = require('../models/OneTimeEntry');
const { uploadBuffer, ensureBucket } = require('./seaweedfs');

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

async function migrateCollection(name, Model, fields) {
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
        const key = `aquainsure/${name.toLowerCase()}/${doc._id}/${fieldName}_${Date.now()}`;
        console.log(`[${name}] ${doc._id} -> Found buffer in ${fieldPath} (${(buf.length / 1024).toFixed(1)} KB)`);

        if (!isDryRun) {
          try {
            const mediaObject = await uploadBuffer(buf, key, 'application/octet-stream');
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
    await migrateCollection('Farmer', Farmer, [
      'identity.photo',
      'identity.aadharFile',
      'identity.panFile',
      'registration.regCertificate',
    ]);

    await migrateCollection('Farm', Farm, ['farmPhoto']);

    await migrateCollection('Pond', Pond, ['photo']);

    await migrateCollection('DailyEntry', DailyEntry, [
      'sampling.samplingVideo',
      'feedManagement.feedBills',
      'financials.miscBills',
      'financials.electricityBills',
      'waterQuality.waterReport',
      'shrimpHealth.shrimpPhoto',
      'shrimpHealth.labReport',
    ]);

    await migrateCollection('OneTimeEntry', OneTimeEntry, [
      'pondPreparation.pondPrepBills',
      'seedSelection.pcrCertificate',
      'seedSelection.seedBills',
    ]);

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
