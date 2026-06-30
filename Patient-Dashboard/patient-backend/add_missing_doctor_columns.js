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
        
        // Add license_number
        const [licenseCols] = await db.query("SHOW COLUMNS FROM users LIKE 'license_number'");
        if (licenseCols.length === 0) {
          await db.query('ALTER TABLE users ADD COLUMN license_number VARCHAR(100) DEFAULT NULL');
          console.log(`✅ Added license_number column to hospital ${h.id}`);
        } else {
          console.log(`ℹ️  license_number column already exists in hospital ${h.id}`);
        }

        // Add bio
        const [bioCols] = await db.query("SHOW COLUMNS FROM users LIKE 'bio'");
        if (bioCols.length === 0) {
          await db.query('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL');
          console.log(`✅ Added bio column to hospital ${h.id}`);
        } else {
          console.log(`ℹ️  bio column already exists in hospital ${h.id}`);
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
