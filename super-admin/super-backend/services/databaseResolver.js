'use strict';
/**
 * databaseResolver.js (super-admin backend)
 * Provides masterDb + sharedSaasDb connections for use by super-admin controllers.
 * Also exposes testExternalConnection for the "Test Connection" button
 * and invalidateCache for signaling backend resolvers (no-op here, done per-backend).
 */
const { Sequelize } = require('sequelize');
const { decrypt }   = require('./encryptionService');
require('dotenv').config();

// ── Shared SaaS DB ──────────────────────────────────────────────
const saasDbName = process.env.SAAS_DB_NAME || process.env.DB_NAME;
const saasDbUser = process.env.SAAS_DB_USER || process.env.DB_USER;
const saasDbPassword = process.env.SAAS_DB_PASSWORD || process.env.DB_PASSWORD;
const saasDbHost = process.env.SAAS_DB_HOST || process.env.DB_HOST;
const saasDbPort = process.env.SAAS_DB_PORT || process.env.DB_PORT || 3306;

if (!saasDbName || !saasDbUser || !saasDbHost) {
  throw new Error('SaaS shared database environment variables are not fully configured.');
}

const sharedSaasDb = new Sequelize(
  saasDbName,
  saasDbUser,
  saasDbPassword,
  {
    host:    saasDbHost,
    port:    parseInt(saasDbPort),
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false,
    pool:    { max: 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      connectTimeout: 60000,
      ...(process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {})
    },
  }
);

/**
 * One-shot connection test — does NOT cache.
 * Used by Super Admin "Test Connection" button before saving credentials.
 */
async function testExternalConnection({ host, port = 3306, database_name, username, password, ssl_enabled = false }) {
  const db = new Sequelize(database_name, username, password, {
    host, port: parseInt(port), dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
    pool: { max: 1, min: 0, acquire: 15000, idle: 5000 },
    dialectOptions: ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
  try {
    await db.authenticate();
  } finally {
    await db.close().catch(() => {});
  }
}

/**
 * Invalidate connection cache on a backend.
 * Super-admin backend itself has no cache, but we call this pattern for consistency.
 */
function invalidateCache(/* hospitalId */) {
  // No-op in super-admin backend.
  // The actual HMS backends (admin, doctor, etc.) each maintain their own cache.
}

module.exports = { sharedSaasDb, testExternalConnection, invalidateCache };
