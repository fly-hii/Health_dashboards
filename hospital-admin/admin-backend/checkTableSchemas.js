'use strict';

const { sharedSaasDb } = require('./services/databaseResolver');

(async () => {
  try {
    await sharedSaasDb.authenticate();
    console.log('✅ Connected to hospitals_db');

    const [labColumns] = await sharedSaasDb.query('DESCRIBE lab_tests');
    console.log('\n--- LAB TESTS COLUMNS ---');
    console.table(labColumns);

    const [billingColumns] = await sharedSaasDb.query('DESCRIBE billing_payments');
    console.log('\n--- BILLING PAYMENTS COLUMNS ---');
    console.table(billingColumns);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
})();
