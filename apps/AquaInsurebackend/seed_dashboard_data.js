/**
 * Seed Dashboard Test Data (~100 Farmers with Farms, Ponds, Insurance Policies, and Daily Entries)
 * No real images required — generates pure database telemetry & relational records.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Farmer = require('./models/Farmer');
const Farm = require('./models/Farm');
const Pond = require('./models/Pond');
const Insurance = require('./models/Insurance');
const DailyEntry = require('./models/DailyEntry');
const OneTimeEntry = require('./models/OneTimeEntry');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aquainsure';

const FIRST_NAMES = [
  'Ramesh', 'Suresh', 'Venkata', 'Narasimha', 'Srinivasa', 'Subrahmanyam', 'Rajesh', 'Anand',
  'Satyanarayana', 'Prasad', 'Krishna', 'Venkateswara', 'Raju', 'Babu', 'Mohan', 'Kalyan',
  'Chandra', 'Nagendra', 'Apparao', 'Pothuraju', 'Gopal', 'Naidu', 'Murthy', 'Kishore',
  'Jagadeesh', 'Vamsi', 'Hari', 'Mahesh', 'Siva', 'Deva', 'Bhaskar', 'Kasi', 'Veera',
  'Govind', 'Balaji', 'Vijay', 'Praveen', 'Dharma', 'Sanjay', 'Surya', 'Sunil', 'Kiran'
];

const LAST_NAMES = [
  'Reddy', 'Rao', 'Varma', 'Chowdary', 'Naidu', 'Patnaik', 'Biswal', 'Mandal', 'Das',
  'Pillai', 'Shetty', 'Bhat', 'Raju', 'Goud', 'Kashyap', 'Murthy', 'Shukla', 'Roy'
];

const DISTRICTS_DATA = [
  { district: 'West Godavari', taluks: ['Bhimavaram', 'Palakollu', 'Narsapur', 'Tanuku'], villages: ['Undi', 'Akividu', 'Kalla', 'Mogalthur', 'Yelamanchili'] },
  { district: 'East Godavari', taluks: ['Kakinada', 'Amalapuram', 'Razole', 'Mummidivaram'], villages: ['Tallarevu', 'Sakhinetipalli', 'Malikipuram', 'Katrenikona'] },
  { district: 'Krishna', taluks: ['Machilipatnam', 'Gudivada', 'Bantumilli', 'Kruthivennu'], villages: ['Nagayalanka', 'Avanigadda', 'Kaikalur', 'Koduru'] },
  { district: 'Nellore', taluks: ['Gudur', 'Kavali', 'Kota', 'Indukurpet'], villages: ['Vakadu', 'Chittamur', 'Vidavalur', 'Mypadu', 'Tadipatri'] },
  { district: 'Bapatla', taluks: ['Bapatla', 'Repalle', 'Nizampatnam'], villages: ['Karlapalem', 'Pittalavanipalem', 'Nagaram', 'Adavuladeevi'] },
  { district: 'Guntur', taluks: ['Tenali', 'Ponnur', 'Bhattiprolu'], villages: ['Vemuru', 'Amruthalur', 'Cherukupalli'] },
  { district: 'Kakinada', taluks: ['Peddapuram', 'Pithapuram', 'Thondangi'], villages: ['Uppada', 'Kothapalli', 'U.Kothapalli'] },
  { district: 'Balasore', taluks: ['Balasore', 'Bahanaga', 'Remuna'], villages: ['Chandipur', 'Soro', 'Gopalpur'] },
  { district: 'Nagapattinam', taluks: ['Sirkazhi', 'Tharangambadi', 'Nagapattinam'], villages: ['Poompuhar', 'Thirumullaivasal', 'Velankanni'] },
];

const SPECIES_OPTIONS = ['vannamei', 'tiger'];
const INSURANCE_STATUSES = [
  'active', 'active', 'active', 'active',
  'claim_pending', 'claim_pending',
  'claim_approved', 'claim_approved',
  'expired', 'claim_rejected'
];

const CLAIM_REASONS = ['disease_outbreak', 'mass_mortality', 'flooding_calamity', 'water_toxicity'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const TOTAL_FARMERS_TO_CREATE = 100;
  console.log(`Starting generation of ${TOTAL_FARMERS_TO_CREATE} test farmer dossiers...`);

  let farmerCount = 0;
  let farmCount = 0;
  let pondCount = 0;
  let insuranceCount = 0;
  let dailyEntryCount = 0;
  let oneTimeCount = 0;

  // Let's create farmers in batches
  for (let i = 1; i <= TOTAL_FARMERS_TO_CREATE; i++) {
    const fName = getRandomElement(FIRST_NAMES);
    const lName = getRandomElement(LAST_NAMES);
    const fullName = `${fName} ${lName}`;
    const fatherName = `${getRandomElement(FIRST_NAMES)} ${lName}`;
    
    // Unique phone and aadhar
    const phone = `98${String(10000000 + i + getRandomInt(1000, 9999)).slice(0, 8)}`;
    const aadhar = `5${String(10000000000 + i + getRandomInt(10000, 99999)).slice(0, 11)}`;
    const pan = `ABCDE${String(1000 + i).slice(-4)}F`;

    const distInfo = getRandomElement(DISTRICTS_DATA);
    const village = getRandomElement(distInfo.villages);
    const taluk = getRandomElement(distInfo.taluks);
    const district = distInfo.district;
    const state = district === 'Balasore' ? 'Odisha' : district === 'Nagapattinam' ? 'Tamil Nadu' : 'Andhra Pradesh';
    const pinCode = `53${getRandomInt(1000, 9999)}`;

    // Create Farmer
    const farmer = await Farmer.create({
      name: fullName,
      fatherName,
      phone,
      gender: Math.random() > 0.15 ? 'male' : 'female',
      isScSt: Math.random() < 0.2,
      dob: `198${getRandomInt(0, 9)}-0${getRandomInt(1, 9)}-${getRandomInt(10, 28)}`,
      community: getRandomElement(['OC', 'BC-A', 'BC-B', 'SC', 'ST']),
      address: {
        village,
        taluk,
        district,
        state,
        pinCode
      },
      registration: {
        regType: getRandomElement(['caa', 'mpeda', 'dof']),
        regNumber: `REG/AQ/${2024}/${String(1000 + i).slice(-4)}`
      },
      identity: {
        aadharNumber: aadhar,
        hasPan: true,
        panNumber: pan
      },
      bankDetails: {
        accountHolderName: fullName,
        bankName: getRandomElement(['State Bank of India', 'Union Bank of India', 'Andhra Bank / UBI', 'HDFC Bank', 'Canara Bank']),
        branch: taluk,
        accountType: 'savings',
        accountNumber: `3098${getRandomInt(10000000, 99999999)}`,
        ifscCode: `SBIN000${getRandomInt(1000, 9999)}`
      }
    });
    farmerCount++;

    // Create Farm for Farmer
    const numPonds = getRandomInt(1, 3);
    const farm = await Farm.create({
      farmerId: farmer._id,
      location: {
        place: `${village} Aqua Farm`,
        taluk,
        district
      },
      latitude: getRandomFloat(16.2, 17.5, 4),
      longitude: getRandomFloat(81.2, 82.5, 4),
      ownership: {
        type: Math.random() > 0.3 ? 'owned' : 'leased',
        patta: `PATTA-${getRandomInt(100, 999)}/${village}`
      },
      totalPonds: numPonds,
      infrastructure: {
        filtration: Math.random() > 0.3,
        reservoir: Math.random() > 0.4,
        farmFencing: Math.random() > 0.2,
        birdFencing: Math.random() > 0.3,
        dips: Math.random() > 0.5,
        power: true,
        aerators: true,
        nursery: Math.random() > 0.7
      }
    });
    farmCount++;

    // Create Ponds for Farm
    const createdPonds = [];
    for (let p = 1; p <= numPonds; p++) {
      const pond = await Pond.create({
        farmId: farm._id,
        farmerId: farmer._id,
        pondNumber: p,
        name: `Pond ${p}`,
        dimensionAcres: getRandomFloat(1.2, 3.5, 1),
        surveyNumber: `${getRandomInt(50, 450)}/${p}`,
        pattaNumber: `PT-${getRandomInt(1000, 9999)}`,
        address: {
          village,
          taluk,
          district,
          state,
          pinCode
        }
      });
      createdPonds.push(pond);
      pondCount++;

      // Create OneTimeEntry
      await OneTimeEntry.create({
        pondId: pond._id,
        pondPreparation: {
          followedPractices: true
        },
        seedSelection: {
          pcrTesting: true
        }
      });
      oneTimeCount++;
    }

    // Create Insurance Policy for primary pond
    const primaryPond = createdPonds[0];
    const status = getRandomElement(INSURANCE_STATUSES);
    const stockingDate = new Date(Date.now() - getRandomInt(15, 60) * 24 * 60 * 60 * 1000);
    const insurancePeriodDays = 120;
    const plannedHarvestDate = new Date(stockingDate.getTime() + insurancePeriodDays * 24 * 60 * 60 * 1000);

    const claimObj = {};
    if (status.startsWith('claim')) {
      claimObj.claimedAt = new Date(Date.now() - getRandomInt(2, 10) * 24 * 60 * 60 * 1000);
      claimObj.reason = getRandomElement(CLAIM_REASONS);
      claimObj.description = `Inspection requested for ${claimObj.reason.replace('_', ' ')} incident observed during day telemetry.`;
      claimObj.estimatedLossPercent = getRandomInt(40, 85);
      
      if (status === 'claim_pending') {
        claimObj.status = 'pending';
      } else if (status === 'claim_approved' || status === 'claimed') {
        claimObj.status = 'approved';
        claimObj.settlementAmount = getRandomInt(150000, 450000);
        claimObj.reviewerNotes = 'Verified by field survey telemetry logs and loss estimation report.';
        claimObj.reviewedAt = new Date();
      } else if (status === 'claim_rejected') {
        claimObj.status = 'rejected';
        claimObj.reviewerNotes = 'Incident not compliant with mandatory biosafety aeration logs.';
        claimObj.reviewedAt = new Date();
      }
    }

    await Insurance.create({
      pondId: primaryPond._id,
      insuredPondIds: createdPonds.map(p => p._id),
      farmerId: farmer._id,
      farmId: farm._id,
      stockingDate,
      stockingDensity: getRandomInt(40, 75), // PL/m²
      species: getRandomElement(SPECIES_OPTIONS),
      insuranceType: 'comprehensive',
      insurancePeriodDays,
      plannedHarvestDate,
      maxHarvestDate: plannedHarvestDate,
      status,
      claim: Object.keys(claimObj).length > 0 ? claimObj : undefined
    });
    insuranceCount++;

    // Generate daily entries across the last 30 days for EACH pond created for this farmer
    for (const pond of createdPonds) {
      const numEntries = getRandomInt(3, 10);
      const now = Date.now();
      for (let d = 1; d <= numEntries; d++) {
        const entryDate = new Date(now - (numEntries - d + getRandomInt(0, 1)) * 24 * 60 * 60 * 1000);
        await DailyEntry.create({
          pondId: pond._id,
          dayNumber: d * 5 + getRandomInt(1, 4),
          date: entryDate,
          sampling: {
            survival: getRandomInt(75, 96),
            biomass: getRandomInt(800, 3500),
            proportionateGrowth: true
          },
          feedManagement: {
            feedQuantity: getRandomFloat(25, 120, 1),
            feedCost: getRandomInt(2500, 12000)
          },
          financials: {
            labourCost: getRandomInt(500, 2000),
            waterCost: getRandomInt(300, 1500)
          },
          waterQuality: {
            do: getRandomFloat(4.6, 7.2, 2),
            ph: getRandomFloat(7.4, 8.3, 2),
            temperature: getRandomFloat(27.0, 31.5, 1),
            ammonia: getRandomFloat(0.04, 0.28, 2),
            hardness: getRandomInt(120, 220),
            alkalinity: getRandomInt(110, 180)
          },
          shrimpHealth: {
            status: Math.random() > 0.08 ? 'normal' : 'deficiency',
            measures: 'Normal feeding schedule maintained with regular probiotic application.'
          },
          productionEstimation: {
            expectedCop: getRandomInt(180, 260),
            expectedProduction: getRandomFloat(4.5, 8.5, 1),
            expectedAbw: getRandomFloat(18.0, 28.0, 1)
          }
        });
        dailyEntryCount++;
      }
    }

    if (i % 20 === 0 || i === TOTAL_FARMERS_TO_CREATE) {
      console.log(`Progress: ${i}/${TOTAL_FARMERS_TO_CREATE} farmers generated.`);
    }
  }

  console.log('\n================ SEEDING COMPLETE ================');
  console.log(`• Farmers created: ${farmerCount}`);
  console.log(`• Farms created: ${farmCount}`);
  console.log(`• Ponds created: ${pondCount}`);
  console.log(`• Insurance policies created: ${insuranceCount}`);
  console.log(`• Daily telemetry entries created: ${dailyEntryCount}`);
  console.log(`• One-time pond setup entries: ${oneTimeCount}`);
  console.log('==================================================\n');

  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
