const { sequelize } = require('./config/database');
const Hospital = require('./models/Hospital');

const run = async () => {
  try {
    const hospital = await Hospital.findByPk(15);
    console.log('Hospital ID 15 info:');
    console.log('Name:', hospital.name);
    console.log('Logo URL:', hospital.logo_url);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

run();
