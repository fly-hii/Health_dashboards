const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hospitals_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: process.env.NODE_ENV === 'development' ? false : false,
    pool: { max: 2, min: 0, acquire: 30000, idle: 5000, evict: 5000 },
    dialectOptions: {
      connectTimeout: 60000,
      ...(process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {})
    },
    define: { timestamps: true, underscored: true },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL (AWS RDS) connected - Doctor Backend');
    // Don't sync here - admin backend manages schema
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

module.exports = { sequelize, connectDB };
