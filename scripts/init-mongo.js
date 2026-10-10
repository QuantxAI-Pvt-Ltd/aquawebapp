// scripts/init-mongo.js
// Runs automatically on the first boot when the /data/db directory is empty.

const dbName = process.env.MONGO_DATABASE || process.env.MONGO_INITDB_DATABASE || 'aquainsure';
const appUser = process.env.MONGO_APP_USERNAME || 'aquainsure_app';
const appPassword = process.env.MONGO_APP_PASSWORD || 'AquaInsureAppSecret2026!';

db = db.getSiblingDB(dbName);

// Create the application user with readWrite permissions
db.createUser({
  user: appUser,
  pwd: appPassword,
  roles: [
    { role: 'readWrite', db: dbName }
  ]
});

// Create core collections
db.createCollection('farmers');
db.createCollection('farms');
db.createCollection('ponds');
db.createCollection('insurances');
db.createCollection('dailyentries');
db.createCollection('onetimeentries');

// Build baseline indexes
db.farmers.createIndex({ phone: 1 }, { unique: true });
db.insurances.createIndex({ policyNumber: 1 }, { unique: true });
db.dailyentries.createIndex({ pondId: 1, date: -1 });

print(`>> [MongoDB Init] Database '${dbName}', collections, and application user '${appUser}' initialized successfully.`);
