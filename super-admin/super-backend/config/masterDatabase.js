/**
 * masterDatabase.js
 * Sequelize connection to careplus_master
 * Used exclusively by the Super Admin backend
 */
'use strict';

const { Sequelize } = require('sequelize');
require('dotenv').config();

const masterDbName = process.env.MASTER_DB_NAME;
const masterDbUser = process.env.MASTER_DB_USER || process.env.DB_USER;
const masterDbPassword = process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD;
const masterDbHost = process.env.MASTER_DB_HOST || process.env.DB_HOST;
const masterDbPort = process.env.MASTER_DB_PORT || process.env.DB_PORT || 3306;

if (!masterDbName || !masterDbUser || !masterDbHost) {
  throw new Error('Master database environment variables are not fully configured.');
}

const masterDb = new Sequelize(
  masterDbName,
  masterDbUser,
  masterDbPassword,
  {
    host:    masterDbHost,
    port:    parseInt(masterDbPort),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    define: { timestamps: true, underscored: true },
  }
);

const connectMasterDB = async () => {
  try {
    await masterDb.authenticate();
    console.log('✅ careplus_master connected');
    await masterDb.sync({ force: false, alter: process.env.NODE_ENV === 'development' });
    console.log('✅ careplus_master schema synced');
  } catch (err) {
    console.error('❌ careplus_master connection failed:', err.message);
    throw err;
  }
};

module.exports = { masterDb, connectMasterDB };
