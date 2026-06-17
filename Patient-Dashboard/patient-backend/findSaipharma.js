const { masterDb, sharedSaasDb } = require('./services/databaseResolver');
const { decrypt } = require('./services/encryptionService');
const { Sequelize } = require('sequelize');

async function findUser() {
  const email = 'saipharma@gmail.com';
  console.log(`Searching for email "${email}"...`);

  try {
    // 1. Check super admin
    const [superAdmins] = await masterDb.query("SELECT * FROM super_admin_users WHERE email = ?", { replacements: [email] });
    if (superAdmins.length > 0) {
      console.log('Found in super_admin_users (masterDb):', superAdmins[0]);
    }

    // 2. Check shared DB users
    const [users] = await sharedSaasDb.query("SELECT * FROM users WHERE email = ?", { replacements: [email] });
    if (users.length > 0) {
      console.log('Found in users (sharedSaasDb):', users[0]);
    }

    // 3. Check shared DB patients
    const [patients] = await sharedSaasDb.query("SELECT * FROM patients WHERE email = ?", { replacements: [email] });
    if (patients.length > 0) {
      console.log('Found in patients (sharedSaasDb):', patients[0]);
    }

    // 4. Check external connections
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    for (const conn of connections) {
      try {
        const decryptedPassword = decrypt(conn.password_encrypted);
        const externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
          host: conn.host, port: conn.port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false
        });
        const [extUsers] = await externalDb.query("SELECT * FROM users WHERE email = ?", { replacements: [email] });
        if (extUsers.length > 0) {
          console.log(`Found in users (external DB ${conn.database_name}):`, extUsers[0]);
        }
        const [extPatients] = await externalDb.query("SELECT * FROM patients WHERE email = ?", { replacements: [email] });
        if (extPatients.length > 0) {
          console.log(`Found in patients (external DB ${conn.database_name}):`, extPatients[0]);
        }
        await externalDb.close();
      } catch (err) {
        // ignore
      }
    }

    console.log('Search completed.');
  } catch (err) {
    console.error('Error during search:', err);
  } finally {
    process.exit(0);
  }
}

findUser();
