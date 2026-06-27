const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 3306;

let sequelize;
if (!dbName || !dbUser || !dbHost) {
  console.warn('⚠️ Database environment variables (DB_NAME, DB_USER, DB_HOST) are not fully configured. Using dummy connection.');
  sequelize = new Sequelize('dummy', 'dummy', 'dummy', {
    host: 'localhost',
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false
  });
} else {
  sequelize = new Sequelize(
    dbName,
    dbUser,
    dbPassword,
    {
      host: dbHost,
      port: parseInt(dbPort),
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: process.env.NODE_ENV === 'development' ? (sql) => console.log(`[SQL] ${sql}`) : false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000, evict: 10000 },
      dialectOptions: {
        connectTimeout: 60000,
        ...(process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {})
      },
      define: { timestamps: true, underscored: true },
    }
  );
}

const connectDB = async () => {
  if (!dbName || !dbUser || !dbHost) {
    console.error('❌ Database connection skipped: Missing environment variables.');
    return;
  }
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL (AWS RDS) connected successfully');
    await sequelize.sync({ alter: false });
    console.log('✅ Database synced');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

module.exports = { sequelize, connectDB };
