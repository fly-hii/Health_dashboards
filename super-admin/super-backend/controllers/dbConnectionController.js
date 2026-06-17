'use strict';

const { encrypt, decrypt } = require('../services/encryptionService');
const { testExternalConnection, invalidateCache } = require('../services/databaseResolver');
const { DbConnection, Hospital, AuditLog } = require('../models');
const { masterDb } = require('../config/masterDatabase');

// ── GET /api/super/hospitals/:id/db-config ─────────────────────
const getDbConfig = async (req, res) => {
  try {
    const conn = await DbConnection.findOne({ where: { hospital_id: req.params.id } });
    if (!conn) return res.status(404).json({ success: false, message: 'No external DB configured for this hospital' });

    // Never expose the encrypted password
    const safeConn = conn.toJSON();
    delete safeConn.password_encrypted;

    res.json({ success: true, data: safeConn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/super/hospitals/:id/db-config ─────────────────────
const upsertDbConfig = async (req, res) => {
  const t = await masterDb.transaction();
  try {
    const { host, port = 3306, database_name, username, password, ssl_enabled = false, notes } = req.body;
    const hospitalId = parseInt(req.params.id);

    const existingConn = await DbConnection.findOne({ where: { hospital_id: hospitalId } });
    let finalPassword = password;
    if (existingConn && !password) {
      finalPassword = decrypt(existingConn.password_encrypted);
    }

    if (!host || !database_name || !username || !finalPassword) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'host, database_name, username, password required' });
    }

    // Test before saving
    try {
      await testExternalConnection({ host, port, database_name, username, password: finalPassword, ssl_enabled });
    } catch (err) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Connection test failed: ${err.message}` });
    }

    const encPwd = encrypt(finalPassword);

    const [conn, created] = await DbConnection.findOrCreate({
      where: { hospital_id: hospitalId },
      defaults: {
        hospital_id: hospitalId, host, port: parseInt(port),
        database_name, username, password_encrypted: encPwd,
        ssl_enabled: !!ssl_enabled, notes,
        is_active: true, test_status: 'success', last_tested_at: new Date(),
      },
      transaction: t,
    });

    if (!created) {
      await conn.update({
        host, port: parseInt(port), database_name, username,
        password_encrypted: encPwd, ssl_enabled: !!ssl_enabled, notes,
        test_status: 'success', last_tested_at: new Date(),
      }, { transaction: t });
    }

    // Update hospital database_type
    await Hospital.update({ database_type: 'external' }, { where: { id: hospitalId }, transaction: t });

    // Invalidate cached connection so it re-connects with new creds
    invalidateCache(hospitalId);

    await AuditLog.create({
      admin_id: req.user?.id, hospital_id: hospitalId,
      action: 'UPDATE', module: 'DbConnection',
      description: `DB config ${created ? 'created' : 'updated'} for hospital ${hospitalId}`,
      ip_address: req.ip,
    }, { transaction: t });

    await t.commit();

    const safe = conn.toJSON();
    delete safe.password_encrypted;
    res.json({ success: true, message: `External DB config ${created ? 'created' : 'updated'} and verified`, data: safe });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/super/hospitals/:id/test-db ──────────────────────
const testDbConnection = async (req, res) => {
  try {
    const hospitalId = parseInt(req.params.id);

    // If body has credentials, test those directly
    if (req.body.host) {
      const { host, port = 3306, database_name, username, password, ssl_enabled } = req.body;
      let finalPassword = password;
      if (!finalPassword) {
        const conn = await DbConnection.findOne({ where: { hospital_id: hospitalId } });
        if (conn) {
          finalPassword = decrypt(conn.password_encrypted);
        }
      }
      await testExternalConnection({ host, port, database_name, username, password: finalPassword, ssl_enabled });
      return res.json({ success: true, message: '✅ Connection successful — credentials are valid' });
    }

    // Otherwise test the saved (encrypted) credentials
    const conn = await DbConnection.findOne({ where: { hospital_id: hospitalId, is_active: true } });
    if (!conn) return res.status(404).json({ success: false, message: 'No DB config found for this hospital' });

    const password = decrypt(conn.password_encrypted);
    await testExternalConnection({
      host: conn.host, port: conn.port,
      database_name: conn.database_name,
      username: conn.username, password,
      ssl_enabled: conn.ssl_enabled,
    });

    await conn.update({ test_status: 'success', last_tested_at: new Date() });
    await AuditLog.create({
      admin_id: req.user?.id, hospital_id: hospitalId,
      action: 'TEST_DB', module: 'DbConnection',
      description: `DB connection test passed for hospital ${hospitalId}`, ip_address: req.ip,
    });

    res.json({ success: true, message: '✅ Connection test passed' });
  } catch (error) {
    // Update test_status to failed if we tested saved creds
    try {
      await DbConnection.update(
        { test_status: 'failed', last_tested_at: new Date() },
        { where: { hospital_id: req.params.id } }
      );
    } catch (_) {}

    res.status(400).json({ success: false, message: `❌ Connection failed: ${error.message}` });
  }
};

// ── PATCH /api/super/hospitals/:id/db-config/toggle ────────────
const toggleDbConnection = async (req, res) => {
  try {
    const conn = await DbConnection.findOne({ where: { hospital_id: req.params.id } });
    if (!conn) return res.status(404).json({ success: false, message: 'Not found' });

    await conn.update({ is_active: !conn.is_active });
    invalidateCache(parseInt(req.params.id));

    res.json({ success: true, message: `DB connection ${conn.is_active ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/super/db-connections ─────────────────────────────
const listDbConnections = async (req, res) => {
  try {
    const conns = await DbConnection.findAll({
      include: [{ model: Hospital, as: 'hospital', attributes: ['id','name','code','status'] }],
      attributes: { exclude: ['password_encrypted'] },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: conns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/super/hospitals/:id/db-config ──────────────────
const deleteDbConfig = async (req, res) => {
  const t = await masterDb.transaction();
  try {
    const hospitalId = parseInt(req.params.id);

    // 1. Delete DbConnection record
    const deletedCount = await DbConnection.destroy({
      where: { hospital_id: hospitalId },
      transaction: t,
    });

    if (deletedCount === 0) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'No external DB configuration found for this hospital' });
    }

    // 2. Set database_type back to 'shared'
    await Hospital.update({ database_type: 'shared' }, { where: { id: hospitalId }, transaction: t });

    // 3. Invalidate cached connection
    invalidateCache(hospitalId);

    // 4. Create Audit Log
    await AuditLog.create({
      admin_id: req.user?.id, hospital_id: hospitalId,
      action: 'DELETE', module: 'DbConnection',
      description: `DB config deleted for hospital ${hospitalId}. Switched back to shared database.`,
      ip_address: req.ip,
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'External DB config deleted successfully. Switched back to shared database.' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDbConfig, upsertDbConfig, testDbConnection, toggleDbConnection, listDbConnections, deleteDbConfig };
