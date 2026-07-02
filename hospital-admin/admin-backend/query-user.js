const { sequelize } = require('./config/database');
const { createModels } = require('./services/modelFactory');

const run = async () => {
  try {
    const models = createModels(sequelize);
    const { User } = models;
    const user = await User.findByPk(27);
    console.log('User ID 27 info:');
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Profile Image:', user.profile_image);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

run();
