/**
 * One-time migration: drop the stale notifId_1 unique index
 * from the nurse_dashboard.notifications collection.
 *
 * Run once:  node scripts/fixNotificationIndex.js
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard');
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('notifications');
  const indexes    = await collection.indexes();
  const hasStale   = indexes.some(i => i.name === 'notifId_1');

  if (hasStale) {
    await collection.dropIndex('notifId_1');
    console.log('✅  Dropped stale notifId_1 index from notifications collection.');
  } else {
    console.log('ℹ️   notifId_1 index not found — nothing to do.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
