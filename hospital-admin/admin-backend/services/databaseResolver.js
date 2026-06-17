/**
 * databaseResolver.js
 *
 * Resolves the correct Sequelize database connection for a given hospitalId.
 *
 * Flow:
 *   1. Check connectionCache (Map<hospitalId, { sequelize, lastAccessed }>)
 *   2. Query careplus_master.hospitals for database_type
 *   3a. If 'shared'  → return sharedSaasDb (singleton, always kept alive)
 *   3b. If 'external'→ load db_connections, decrypt password, create Sequelize pool,
 *                      authenticate, auto-sync schema, cache & return
 *
 * Cache Strategy: LRU with 30-minute idle TTL.
 * A background interval evicts connections not accessed in TTL_MS.
 */

'use strict';

const { Sequelize } = require('sequelize');
const { decrypt }   = require('./encryptionService');

require('dotenv').config();

// ── Master DB (careplus_master) ─────────────────────────────────
// Used ONLY to look up hospital config and db_connection credentials
const masterDbName = process.env.MASTER_DB_NAME;
const masterDbUser = process.env.MASTER_DB_USER || process.env.DB_USER;
const masterDbPassword = process.env.MASTER_DB_PASSWORD || process.env.DB_PASSWORD;
const masterDbHost = process.env.MASTER_DB_HOST || process.env.DB_HOST;
const masterDbPort = process.env.MASTER_DB_PORT || process.env.DB_PORT || 3306;

if (!masterDbName || !masterDbUser || !masterDbHost) {
  throw new Error('Master database environment variables (MASTER_DB_NAME, MASTER_DB_USER, MASTER_DB_HOST) are not fully configured.');
}

const masterDb = new Sequelize(
  masterDbName,
  masterDbUser,
  masterDbPassword,
  {
    host:    masterDbHost,
    port:    parseInt(masterDbPort),
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  }
);

// ── Shared SaaS DB (hospitals_db) ─────────────────────────────
// Used for all hospitals with database_type = 'shared'
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 3306;

if (!dbName || !dbUser || !dbHost) {
  throw new Error('SaaS shared database environment variables (DB_NAME, DB_USER, DB_HOST) are not fully configured.');
}

const sharedSaasDb = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host:    dbHost,
    port:    parseInt(dbPort),
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 15, min: 2, acquire: 30000, idle: 10000 },
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    define: { timestamps: true, underscored: true },
  }
);

// ── Connection Cache ────────────────────────────────────────────
// Map<hospitalId, { sequelize: Sequelize, lastAccessed: number, type: string }>
const connectionCache = new Map();

const TTL_MS = 30 * 60 * 1000; // 30 minutes idle TTL

// Evict idle external connections every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hospitalId, entry] of connectionCache.entries()) {
    if (entry.type === 'external' && (now - entry.lastAccessed) > TTL_MS) {
      console.log(`[DB Resolver] Evicting idle external connection for hospital ${hospitalId}`);
      try { entry.sequelize.close(); } catch (_) {}
      connectionCache.delete(hospitalId);
    }
  }
}, 10 * 60 * 1000);

// ── Hospital Config Cache ───────────────────────────────────────
// Caches database_type per hospitalId (5-min TTL, cheaper than DB lookup)
const configCache  = new Map();
const CONFIG_TTL   = 5 * 60 * 1000;

async function getHospitalConfig(hospitalId) {
  const cached = configCache.get(hospitalId);
  if (cached && (Date.now() - cached.ts) < CONFIG_TTL) return cached.data;

  const [rows] = await masterDb.query(
    'SELECT id, database_type, status FROM hospitals WHERE id = ? LIMIT 1',
    { replacements: [hospitalId] }
  );

  const hospital = rows?.[0];
  if (!hospital?.id) {
    throw new Error(`Hospital ${hospitalId} not found in master registry`);
  }

  if (hospital.status === 'suspended') {
    const err = new Error('Hospital account is suspended');
    err.status = 403;
    throw err;
  }

  configCache.set(hospitalId, { data: hospital, ts: Date.now() });
  return hospital;
}

// ── Main Resolver ───────────────────────────────────────────────
async function getHospitalConnection(hospitalId) {
  const id = parseInt(hospitalId);

  // 1. Return from connection cache
  if (connectionCache.has(id)) {
    const entry = connectionCache.get(id);
    entry.lastAccessed = Date.now();
    return entry.sequelize;
  }

  // 2. Get hospital config from master DB
  const config = await getHospitalConfig(id);

  // 3a. Shared SaaS DB
  if (config.database_type === 'shared') {
    connectionCache.set(id, {
      sequelize: sharedSaasDb,
      lastAccessed: Date.now(),
      type: 'shared',
    });
    return sharedSaasDb;
  }

  // 3b. External (BYOD) DB
  const [connRows] = await masterDb.query(
    'SELECT * FROM db_connections WHERE hospital_id = ? AND is_active = 1 LIMIT 1',
    { replacements: [id] }
  );

  const conn = connRows?.[0];
  if (!conn?.id) {
    throw new Error(`No active external DB connection configured for hospital ${id}`);
  }

  const password = decrypt(conn.password_encrypted);

  const externalDb = new Sequelize(
    conn.database_name,
    conn.username,
    password,
    {
      host:    conn.host,
      port:    conn.port || 3306,
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: conn.ssl_enabled
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
      define: { timestamps: true, underscored: true },
    }
  );

  // Verify connection before caching
  await externalDb.authenticate();

  // Auto-sync HMS schema on first connection (non-destructive)
  const { createModels } = require('./modelFactory');
  const models = createModels(externalDb);
  await externalDb.sync({ force: false, alter: false });
  console.log(`[DB Resolver] External DB connected + synced for hospital ${id} (${conn.database_name}@${conn.host})`);

  connectionCache.set(id, {
    sequelize: externalDb,
    lastAccessed: Date.now(),
    type: 'external',
  });

  // Update last_tested_at in master
  await masterDb.query(
    'UPDATE db_connections SET last_tested_at = NOW(), test_status = ? WHERE hospital_id = ?',
    { replacements: ['success', id] }
  );

  return externalDb;
}

/**
 * One-shot connection test (for Super Admin "Test Connection" button).
 * Does NOT cache the connection.
 */
async function testExternalConnection(connConfig) {
  const { host, port, database_name, username, password, ssl_enabled } = connConfig;
  const testDb = new Sequelize(database_name, username, password, {
    host, port: port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
    dialectOptions: ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
  await testDb.authenticate();
  await testDb.close();
  return true;
}

/**
 * Invalidate cache for a hospital (call when DB config changes).
 */
function invalidateCache(hospitalId) {
  const id = parseInt(hospitalId);
  const entry = connectionCache.get(id);
  if (entry?.type === 'external') {
    try { entry.sequelize.close(); } catch (_) {}
  }
  connectionCache.delete(id);
  configCache.delete(id);
}

/**
 * Warm-up: authenticate both master and shared SaaS DBs at startup.
 */
async function initConnections() {
  try {
    await masterDb.authenticate();
    console.log('✅ [DB Resolver] careplus_master connected');
    await sharedSaasDb.authenticate();
    console.log('✅ [DB Resolver] hospitals_db connected');

    // Sync shared SaaS schema
    const { createModels } = require('./modelFactory');
    createModels(sharedSaasDb);
    await sharedSaasDb.sync({ force: false, alter: false });
    console.log('✅ [DB Resolver] hospitals_db schema synced');
  } catch (err) {
    console.error('❌ [DB Resolver] DB init failed:', err.message);
    throw err;
  }
}

module.exports = {
  masterDb,
  sharedSaasDb,
  getHospitalConnection,
  testExternalConnection,
  invalidateCache,
  initConnections,
};
