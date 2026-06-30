'use strict';
const { masterDb, getHospitalConnection } = require('./services/databaseResolver');

async function run() {
  try {
    const [hospitals] = await masterDb.query(
      "SELECT id FROM hospitals WHERE status IN ('active', 'trial')"
    );
    console.log(`Found ${hospitals.length} hospitals:`, hospitals.map(h => h.id));

    for (const h of hospitals) {
      try {
        const db = await getHospitalConnection(h.id);
        const [cols] = await db.query("SHOW COLUMNS FROM users LIKE 'consultation_fee'");
        if (cols.length === 0) {
          await db.query('ALTER TABLE users ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT NULL');
          console.log(`✅ Added consultation_fee column to hospital ${h.id}`);
        } else {
          console.log(`ℹ️  Column already exists in hospital ${h.id}`);
        }
      } catch (e) {
        console.error(`❌ Hospital ${h.id}:`, e.message);
      }
    }
    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e.message);
    process.exit(1);
  }
}

run();
