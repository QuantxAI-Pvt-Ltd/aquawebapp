require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');
const {
  s3Client,
  DEFAULT_BUCKET,
  ensureBucket,
  uploadBuffer,
  StorageHierarchy,
  mimeToExtension,
} = require('./seaweedfs');
const http = require('http');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

// Models
const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const DailyEntry = require('../models/DailyEntry');
const OneTimeEntry = require('../models/OneTimeEntry');
const Insurance = require('../models/Insurance');

const MASTER_URL = process.env.SEAWEEDFS_MASTER_ENDPOINT || 'http://localhost:9333';

/**
 * Fetch buffer from SeaweedFS Volume Server given a Volume FID (e.g. 1,28a335fbc5)
 */
async function fetchMediaFromVolume(fid) {
  const [volumeId] = fid.split(',');
  const lookupUrl = `${MASTER_URL}/dir/lookup?volumeId=${volumeId}`;

  const lookupRes = await new Promise((resolve, reject) => {
    http.get(lookupUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  const location = lookupRes.locations?.[0] || lookupRes;
  const volumeUrl = location.publicUrl || location.url;
  if (!volumeUrl) {
    throw new Error(`Could not resolve volume server for FID: ${fid}`);
  }

  const fileUrl = volumeUrl.startsWith('http') ? `${volumeUrl}/${fid}` : `http://${volumeUrl}/${fid}`;

  return new Promise((resolve, reject) => {
    http.get(fileUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          mimeType: res.headers['content-type'] || 'image/jpeg',
          size: buffer.length
        });
      });
    }).on('error', reject);
  });
}

function isVolumeFid(key) {
  return typeof key === 'string' && /^\d+,[0-9a-zA-Z]+$/.test(key.trim());
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 Starting SeaweedFS S3 Hierarchy Migration');
  console.log('   Target Bucket:', DEFAULT_BUCKET);
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquainsure');
  await ensureBucket(DEFAULT_BUCKET);

  let migratedCount = 0;

  // 1. Migrate Ponds
  console.log('--- Inspecting Ponds ---');
  const ponds = await Pond.find({ photo: { $ne: null } });
  for (const pond of ponds) {
    const photoKey = pond.photo?.key || (typeof pond.photo === 'string' ? pond.photo : null);
    if (photoKey && isVolumeFid(photoKey)) {
      console.log(`Pond ${pond.pondNumber} (${pond._id}) has Volume FID: ${photoKey}`);
      try {
        const { buffer, mimeType } = await fetchMediaFromVolume(photoKey);
        const ext = mimeToExtension(mimeType) || 'jpg';
        const farm = await Farm.findById(pond.farmId).select('farmerId').lean();
        const farmerId = farm?.farmerId?.toString() || pond.farmerId?.toString() || 'unknown';
        const farmId = pond.farmId?.toString() || 'unknown';
        const pondId = pond._id.toString();

        const s3Key = StorageHierarchy.pondPhoto(farmerId, farmId, pondId, ext);
        console.log(`  -> Uploading to S3 Key: ${s3Key}`);

        const mediaObj = await uploadBuffer(buffer, s3Key, mimeType, DEFAULT_BUCKET);
        pond.photo = mediaObj;
        await pond.save();
        console.log(`  ✅ Pond ${pond.pondNumber} updated to S3: ${mediaObj.url}`);
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate pond photo:`, err.message);
      }
    }
  }

  // 2. Migrate Farmers
  console.log('\n--- Inspecting Farmers ---');
  const farmers = await Farmer.find();
  for (const farmer of farmers) {
    const farmerId = farmer._id.toString();

    // Photo
    const photoKey = farmer.identity?.photo?.key || (typeof farmer.identity?.photo === 'string' ? farmer.identity.photo : null);
    if (photoKey && isVolumeFid(photoKey)) {
      console.log(`Farmer ${farmer.name} (${farmerId}) has Volume FID Photo: ${photoKey}`);
      try {
        const { buffer, mimeType } = await fetchMediaFromVolume(photoKey);
        const ext = mimeToExtension(mimeType) || 'jpg';
        const s3Key = StorageHierarchy.farmerPhoto(farmerId, ext);
        console.log(`  -> Uploading to S3 Key: ${s3Key}`);

        const mediaObj = await uploadBuffer(buffer, s3Key, mimeType, DEFAULT_BUCKET);
        farmer.identity.photo = mediaObj;
        await farmer.save();
        console.log(`  ✅ Farmer photo updated to S3: ${mediaObj.url}`);
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate farmer photo:`, err.message);
      }
    }

    // Aadhaar
    const aadharKey = farmer.identity?.aadharFile?.key;
    if (aadharKey && isVolumeFid(aadharKey)) {
      try {
        const { buffer, mimeType } = await fetchMediaFromVolume(aadharKey);
        const ext = mimeToExtension(mimeType) || 'pdf';
        const s3Key = StorageHierarchy.farmerAadhar(farmerId, ext);
        const mediaObj = await uploadBuffer(buffer, s3Key, mimeType, DEFAULT_BUCKET);
        farmer.identity.aadharFile = mediaObj;
        await farmer.save();
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate Aadhaar:`, err.message);
      }
    }

    // PAN
    const panKey = farmer.identity?.panFile?.key;
    if (panKey && isVolumeFid(panKey)) {
      try {
        const { buffer, mimeType } = await fetchMediaFromVolume(panKey);
        const ext = mimeToExtension(mimeType) || 'pdf';
        const s3Key = StorageHierarchy.farmerPan(farmerId, ext);
        const mediaObj = await uploadBuffer(buffer, s3Key, mimeType, DEFAULT_BUCKET);
        farmer.identity.panFile = mediaObj;
        await farmer.save();
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate PAN:`, err.message);
      }
    }
  }

  // 3. Migrate Farms
  console.log('\n--- Inspecting Farms ---');
  const farms = await Farm.find({ farmPhoto: { $ne: null } });
  for (const farm of farms) {
    const photoKey = farm.farmPhoto?.key || (typeof farm.farmPhoto === 'string' ? farm.farmPhoto : null);
    if (photoKey && isVolumeFid(photoKey)) {
      console.log(`Farm ${farm._id} has Volume FID Photo: ${photoKey}`);
      try {
        const { buffer, mimeType } = await fetchMediaFromVolume(photoKey);
        const ext = mimeToExtension(mimeType) || 'jpg';
        const farmerId = farm.farmerId?.toString() || 'unknown';
        const farmId = farm._id.toString();
        const s3Key = StorageHierarchy.farmPhoto(farmerId, farmId, ext);
        console.log(`  -> Uploading to S3 Key: ${s3Key}`);

        const mediaObj = await uploadBuffer(buffer, s3Key, mimeType, DEFAULT_BUCKET);
        farm.farmPhoto = mediaObj;
        await farm.save();
        console.log(`  ✅ Farm photo updated to S3: ${mediaObj.url}`);
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate farm photo:`, err.message);
      }
    }
  }

  console.log('\n====================================================');
  console.log(`✨ Migration Complete! Successfully migrated ${migratedCount} media objects to S3 hierarchy.`);
  console.log('====================================================');

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
