'use strict';
const { masterDb, getHospitalConnection } = require('./services/databaseResolver');

async function run() {
  try {
    const [hospitals] = await masterDb.query(
      "SELECT id, name FROM hospitals WHERE status IN ('active', 'trial')"
    );
    for (const h of hospitals) {
      try {
        const db = await getHospitalConnection(h.id);
        const [docs] = await db.query(
          "SELECT id, name, role, consultation_fee, license_number, bio, address FROM users WHERE role = 'DOCTOR'"
        );
        if (docs.length > 0) {
          console.log(`Hospital ${h.id} (${h.name}):`);
          console.table(docs);
        }
      } catch (e) {
        console.error(`❌ Hospital ${h.id}:`, e.message);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e.message);
    process.exit(1);
  }
}

run();
