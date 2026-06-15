/**
 * migrateToPatientDashboard.js
 * Run from: nurse-dashboard/nurse-backend/
 *   node migrateToPatientDashboard.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017';
const TARGET_DB = 'patient_dashboard';

const SOURCES = [
  {
    db: 'hospital_admin',
    collections: [
      'users', 'doctors', 'patients', 'appointments', 'departments',
      'roles', 'inventories', 'pharmacyorders', 'labtests', 'payments',
      'notifications', 'auditlogs', 'prescriptions', 'patientreports',
      'reports', 'vitals', 'consultations', 'tokens',
    ],
  },
  {
    db: 'nurse_dashboard',
    collections: [
      'users', 'patients', 'appointments', 'vitals', 'notifications',
    ],
  },
  {
    db: 'pharmacy_dashboard',
    collections: [
      'users', 'patients', 'orders', 'inventories', 'notifications',
      'medicines', 'prescriptions',
    ],
  },
];

async function migrate() {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const targetDb = client.db(TARGET_DB);

    // ── Nuclear option: drop ALL collections in target DB first for a clean slate ──
    console.log(`🗑  Dropping all collections in ${TARGET_DB} for clean migration...`);
    const existingTargetColls = await targetDb.listCollections().toArray();
    for (const c of existingTargetColls) {
      await targetDb.collection(c.name).drop();
      console.log(`   Dropped ${c.name}`);
    }
    console.log('   Done — target DB is clean.\n');

    let grandTotal = 0;

    for (const source of SOURCES) {
      const sourceDb = client.db(source.db);
      console.log(`\n📦 Source: ${source.db}`);
      console.log('─'.repeat(55));

      const existingColls = await sourceDb.listCollections().toArray()
        .then(list => list.map(c => c.name));

      for (const collName of source.collections) {
        if (!existingColls.includes(collName)) {
          console.log(`   ⚠  ${collName.padEnd(22)} — not found, skipping`);
          continue;
        }

        const docs = await sourceDb.collection(collName).find({}).toArray();
        if (docs.length === 0) {
          console.log(`   —  ${collName.padEnd(22)} — empty, skipping`);
          continue;
        }

        const targetColl = targetDb.collection(collName);
        let inserted = 0, updated = 0;

        for (const doc of docs) {
          const result = await targetColl.replaceOne(
            { _id: doc._id }, doc, { upsert: true }
          );
          if (result.upsertedCount) inserted++;
          else if (result.modifiedCount) updated++;
        }

        grandTotal += inserted + updated;
        console.log(
          `   ✓  ${collName.padEnd(22)} ${String(docs.length).padStart(5)} docs` +
          `  (${inserted} new, ${updated} updated)`
        );
      }
    }

    console.log('\n' + '═'.repeat(55));
    console.log(`✅  Done — ${grandTotal} total documents written to "${TARGET_DB}"`);
    console.log('═'.repeat(55));

    // Summary of target collections
    console.log(`\n📊  Final collections in ${TARGET_DB}:`);
    const cols = await targetDb.listCollections().toArray();
    for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
      const n = await targetDb.collection(c.name).countDocuments();
      console.log(`     ${c.name.padEnd(26)} ${n}`);
    }

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

migrate();
