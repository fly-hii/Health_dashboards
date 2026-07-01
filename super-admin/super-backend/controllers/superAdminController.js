'use strict';

const bcrypt  = require('bcryptjs');
const { Op }  = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');
const { Hospital, SuperAdmin, Subscription, Payment, AuditLog, DbConnection } = require('../models');
const { encrypt, decrypt } = require('../services/encryptionService');
const { testExternalConnection, invalidateCache } = require('../services/databaseResolver');

// ── Helpers ────────────────────────────────────────────────────
const audit = (adminId, action, data, transaction) => {
  console.log('AUDIT LOG TRANSACTION ID:', transaction ? transaction.id : 'undefined');
  return AuditLog.create({ admin_id: adminId, ...data, action }, { transaction }).catch(console.error);
};

const syncHospitalSubscriptionToTenantDb = async (hospital) => {
  try {
    const { sharedSaasDb } = require('../services/databaseResolver');
    const { Sequelize } = require('sequelize');

    if (hospital.database_type === 'external') {
      const conn = await DbConnection.findOne({ where: { hospital_id: hospital.id } });
      if (!conn) {
        console.warn(`[Tenant DB Sync] No connection details found for hospital ID ${hospital.id}`);
        return;
      }
      const decryptedPassword = decrypt(conn.password_encrypted);
      const externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
        host: conn.host,
        port: parseInt(conn.port) || 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        dialectOptions: conn.ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {},
      });
      try {
        await externalDb.authenticate();
        const { createModels } = require('../../../hospital-admin/admin-backend/services/modelFactory');
        const models = createModels(externalDb);
        const tenantHospital = await models.Hospital.findByPk(hospital.id);
        if (tenantHospital) {
          await tenantHospital.update({
            plan: hospital.plan,
            status: hospital.status,
            plan_expires_at: hospital.plan_expires_at,
          });
          console.log(`[Tenant DB Sync] Successfully synchronized subscription for external hospital ID ${hospital.id}`);
        }
      } catch (err) {
        console.error(`[Tenant DB Sync] Error updating external DB for hospital ID ${hospital.id}:`, err);
      } finally {
        await externalDb.close().catch(() => {});
      }
    } else {
      // Shared SaaS DB
      await sharedSaasDb.query(
        'UPDATE hospitals SET plan = ?, status = ?, plan_expires_at = ?, updated_at = NOW() WHERE id = ?',
        {
          replacements: [
            hospital.plan,
            hospital.status,
            hospital.plan_expires_at || null,
            hospital.id,
          ]
        }
      );
      console.log(`[Tenant DB Sync] Successfully synchronized subscription for shared hospital ID ${hospital.id}`);
    }
  } catch (syncErr) {
    console.error(`[Tenant DB Sync] Failed to synchronize subscription for hospital ID ${hospital.id}:`, syncErr);
  }
};

// ── POST /api/super/hospitals ──────────────────────────────────
const createHospital = async (req, res) => {
  const t = await masterDb.transaction();
  try {
    const {
      name, code, email, adminPassword, plan = 'basic',
      address, phone, city, state, country,
      maxUsers = 10, maxPatients = 500,
      // BYOD fields
      useExternalDb = false,
      dbHost, dbPort = 3306, dbName, dbUser, dbPassword, dbSsl = false,
    } = req.body;

    if (!name || !code || !email || !adminPassword) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'name, code, email, adminPassword required' });
    }

    // Validate BYOD params before touching DB
    if (useExternalDb) {
      if (!dbHost || !dbName || !dbUser || !dbPassword) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'External DB: host, database, username, password required' });
      }
      // Test connection BEFORE saving anything
      try {
        await testExternalConnection({ host: dbHost, port: dbPort, database_name: dbName, username: dbUser, password: dbPassword, ssl_enabled: dbSsl });
      } catch (err) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `External DB connection test failed: ${err.message}` });
      }
    }

    const existing = await Hospital.findOne({ where: { [Op.or]: [{ code: code.toUpperCase() }, { email }] } });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'Hospital code or email already exists' });
    }

    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    // Create hospital record in careplus_master
    const hospital = await Hospital.create({
      name, code: code.toUpperCase(), email, phone, address, city,
      state, country: country || 'India', plan,
      status: 'trial',
      plan_expires_at: planExpiresAt,
      max_users: maxUsers,
      max_patients: maxPatients,
      database_type: useExternalDb ? 'external' : 'shared',
    }, { transaction: t });

    // Save external DB connection (encrypted)
    if (useExternalDb) {
      const encryptedPassword = encrypt(dbPassword);
      await DbConnection.create({
        hospital_id: hospital.id,
        host: dbHost,
        port: parseInt(dbPort),
        database_name: dbName,
        username: dbUser,
        password_encrypted: encryptedPassword,
        ssl_enabled: !!dbSsl,
        is_active: true,
        test_status: 'success',
        last_tested_at: new Date(),
      }, { transaction: t });
    }

    // Create admin user in the correct target DB
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    if (!useExternalDb) {
      // For shared DB: create user directly in hospitals_db via raw query
      const { sharedSaasDb } = require('../services/databaseResolver');
      // 1. Insert Hospital row to satisfy foreign key constraint
      await sharedSaasDb.query(
        `INSERT INTO hospitals (id, name, code, email, phone, address, city, state, country, plan, status, plan_expires_at, max_users, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        { replacements: [
          hospital.id,
          name,
          code.toUpperCase(),
          email,
          phone || null,
          address || null,
          city || null,
          state || null,
          country || 'India',
          plan,
          'trial',
          planExpiresAt,
          maxUsers || 10
        ]}
      );
      // 2. Insert admin user row
      await sharedSaasDb.query(
        `INSERT INTO users (hospital_id, name, email, password, role, department, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'HOSPITAL_ADMIN', 'OTHERS', 'Active', NOW(), NOW())`,
        { replacements: [hospital.id, `${name} Admin`, email, hashedPassword] }
      );
    } else {
      // For external DB: initialize connection, sync models, and insert hospital + admin user
      const { Sequelize } = require('sequelize');
      const externalDb = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        port: parseInt(dbPort) || 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: false,
        dialectOptions: (dbSsl === 'true' || dbSsl === true) ? { ssl: { require: true, rejectUnauthorized: false } } : {},
      });
      try {
        await externalDb.authenticate();
        const { createModels } = require('../../../hospital-admin/admin-backend/services/modelFactory');
        const models = createModels(externalDb);
        await externalDb.sync({ force: false, alter: true });

        // Insert hospital
        await models.Hospital.create({
          id: hospital.id,
          name,
          code: code.toUpperCase(),
          email,
          phone,
          address,
          city,
          state,
          country: country || 'India',
          plan,
          status: 'trial',
          plan_expires_at: planExpiresAt,
          max_users: maxUsers
        });

        // Insert admin user
        await models.User.create({
          hospital_id: hospital.id,
          name: `${name} Admin`,
          email,
          password: hashedPassword,
          role: 'HOSPITAL_ADMIN',
          department: 'OTHERS',
          status: 'Active'
        });
      } finally {
        await externalDb.close().catch(() => {});
      }
    }

    // Subscription record
    await Subscription.create({
      hospital_id: hospital.id,
      plan, status: 'trial', amount: 0,
      starts_at: new Date(),
      expires_at: planExpiresAt,
      billing_cycle: 'monthly',
    }, { transaction: t });

    await audit(req.user?.id, 'CREATE', {
      hospital_id: hospital.id,
      module: 'Hospital',
      description: `Created hospital "${name}" (${useExternalDb ? 'external' : 'shared'} DB)`,
      new_data: { name, code, email, plan, database_type: hospital.database_type },
      ip_address: req.ip,
    }, t);

    await t.commit();

    // Send welcome email with credentials and details (non-blocking)
    const { sendWelcomeEmail } = require('../services/emailService');
    sendWelcomeEmail({
      to: email,
      hospitalName: name,
      hospitalCode: hospital.code,
      adminEmail: email,
      adminPassword,          // plain-text password sent to the administrator
      plan,
      billingCycle: 'monthly',
      amount: 0,
      transactionId: `SA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      planExpiresAt,
      loginUrl: 'http://localhost:5173/login'
    }).catch(err => console.error('⚠️ Super Admin Welcome email failed (non-critical):', err.message));

    res.status(201).json({
      success: true,
      message: `Hospital "${name}" created (${useExternalDb ? 'External DB' : 'Shared SaaS DB'})`,
      data: {
        hospital: { id: hospital.id, name, code: hospital.code, plan, database_type: hospital.database_type },
        dbType: hospital.database_type,
        note: useExternalDb
          ? 'Hospital uses its own database. Schema will be auto-synced on first staff login.'
          : 'Hospital uses shared CarePlus SaaS database.',
      },
    });
  } catch (error) {
    await t.rollback();
    console.error('createHospital error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/super/hospitals ───────────────────────────────────
const listHospitals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, dbType } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (dbType) where.database_type = dbType;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Hospital.findAndCountAll({
      where,
      include: [
        { model: Subscription, as: 'subscriptions', required: false, limit: 1, order: [['created_at','DESC']] },
        { model: DbConnection, as: 'dbConnection', required: false,
          attributes: ['id','host','database_name','test_status','last_tested_at','is_active'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error('listHospitals error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/super/hospitals/:id ───────────────────────────────
const getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id, {
      include: [
        { model: Subscription, as: 'subscriptions', order: [['created_at','DESC']], limit: 5 },
        { model: Payment,      as: 'payments',      order: [['created_at','DESC']], limit: 10 },
        { model: DbConnection, as: 'dbConnection',  attributes: { exclude: ['password_encrypted'] } },
      ],
    });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/super/hospitals/:id/suspend ─────────────────────
const suspendHospital = async (req, res) => {
  try {
    const h = await Hospital.findByPk(req.params.id);
    if (!h) return res.status(404).json({ success: false, message: 'Not found' });
    const old = h.status;
    await h.update({ status: 'suspended' });
    await syncHospitalSubscriptionToTenantDb(h);
    invalidateCache(h.id);
    await audit(req.user?.id, 'SUSPEND', { hospital_id: h.id, module: 'Hospital',
      description: `Suspended "${h.name}"`, old_data: { status: old }, new_data: { status: 'suspended' }, ip_address: req.ip });
    res.json({ success: true, message: `Hospital "${h.name}" suspended` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ── PATCH /api/super/hospitals/:id/activate ────────────────────
const activateHospital = async (req, res) => {
  try {
    const h = await Hospital.findByPk(req.params.id);
    if (!h) return res.status(404).json({ success: false, message: 'Not found' });
    const old = h.status;
    await h.update({ status: 'active' });
    await syncHospitalSubscriptionToTenantDb(h);
    invalidateCache(h.id);
    await audit(req.user?.id, 'ACTIVATE', { hospital_id: h.id, module: 'Hospital',
      description: `Activated "${h.name}"`, old_data: { status: old }, new_data: { status: 'active' }, ip_address: req.ip });
    res.json({ success: true, message: `Hospital "${h.name}" activated` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ── PUT /api/super/hospitals/:id/plan ─────────────────────────
const updatePlan = async (req, res) => {
  const t = await masterDb.transaction();
  try {
    const { plan, billingCycle = 'monthly', amount = 0 } = req.body;
    const h = await Hospital.findByPk(req.params.id);
    if (!h) { await t.rollback(); return res.status(404).json({ success: false, message: 'Not found' }); }

    const exp = new Date();
    if (billingCycle === 'monthly')   exp.setMonth(exp.getMonth() + 1);
    else if (billingCycle === 'quarterly') exp.setMonth(exp.getMonth() + 3);
    else exp.setFullYear(exp.getFullYear() + 1);

    await h.update({ plan, plan_expires_at: exp, status: 'active' }, { transaction: t });
    const sub = await Subscription.create({ hospital_id: h.id, plan, status: 'active', amount,
      billing_cycle: billingCycle, starts_at: new Date(), expires_at: exp }, { transaction: t });

    // Simulated Payment Gateway Success Integration
    await Payment.create({
      hospital_id: h.id,
      subscription_id: sub.id,
      amount,
      currency: 'INR',
      status: 'success',
      payment_method: 'Stripe Gateway',
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      notes: `Subscription upgrade to ${plan} (${billingCycle})`,
      paid_at: new Date(),
    }, { transaction: t });

    await t.commit();
    await syncHospitalSubscriptionToTenantDb(h);
    invalidateCache(h.id);
    res.json({ success: true, message: `Plan updated to ${plan} for ${h.name}` });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/super/hospitals/:id ───────────────────────────
const deleteHospital = async (req, res) => {
  try {
    const h = await Hospital.findByPk(req.params.id);
    if (!h) return res.status(404).json({ success: false, message: 'Not found' });
    await h.destroy();
    invalidateCache(h.id);
    await audit(req.user?.id, 'DELETE', { hospital_id: h.id, module: 'Hospital',
      description: `Deleted hospital "${h.name}"`, ip_address: req.ip });
    res.json({ success: true, message: `Hospital "${h.name}" deleted` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ── GET /api/super/analytics ───────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const [total, active, suspended, byPlan, byDbType, revenue, monthlyRevenue] = await Promise.all([
      Hospital.count(),
      Hospital.count({ where: { status: 'active' } }),
      Hospital.count({ where: { status: 'suspended' } }),
      Hospital.findAll({ attributes: ['plan', [masterDb.fn('COUNT', masterDb.col('id')), 'count']], group: ['plan'] }),
      Hospital.findAll({ attributes: ['database_type', [masterDb.fn('COUNT', masterDb.col('id')), 'count']], group: ['database_type'] }),
      Payment.findOne({ where: { status: 'success' },
        attributes: [[masterDb.fn('SUM', masterDb.col('amount')), 'total']] }),
      Payment.findAll({
        where: { status: 'success', created_at: { [Op.gte]: new Date(Date.now() - 6*30*24*60*60*1000) } },
        attributes: [
          [masterDb.fn('YEAR', masterDb.col('created_at')), 'year'],
          [masterDb.fn('MONTH', masterDb.col('created_at')), 'month'],
          [masterDb.fn('SUM', masterDb.col('amount')), 'total'],
        ],
        group: [masterDb.fn('YEAR', masterDb.col('created_at')), masterDb.fn('MONTH', masterDb.col('created_at'))],
        order: [[masterDb.fn('YEAR', masterDb.col('created_at')), 'ASC'],
                [masterDb.fn('MONTH', masterDb.col('created_at')), 'ASC']],
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalHospitals: total,
          activeHospitals: active,
          suspendedHospitals: suspended,
          trialHospitals: total - active - suspended,
          sharedDbHospitals: (byDbType.find(r => r.database_type === 'shared')?.dataValues?.count || 0),
          externalDbHospitals: (byDbType.find(r => r.database_type === 'external')?.dataValues?.count || 0),
          totalRevenue: parseFloat(revenue?.dataValues?.total || 0),
        },
        hospitalsByPlan: byPlan.map(r => ({ plan: r.plan, count: parseInt(r.dataValues.count) })),
        hospitalsByDbType: byDbType.map(r => ({ type: r.database_type, count: parseInt(r.dataValues.count) })),
        monthlyRevenue: monthlyRevenue.map(r => ({
          year: r.dataValues.year, month: r.dataValues.month, total: parseFloat(r.dataValues.total),
        })),
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/super/audit-logs ──────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, hospitalId, action } = req.query;
    const where = {};
    if (action) where.action = action;

    if (hospitalId) {
      const term = hospitalId.trim();
      const numericId = parseInt(term, 10);
      
      // Find matching hospitals by code or name
      const matchingHospitals = await Hospital.findAll({
        where: {
          [Op.or]: [
            { code: { [Op.like]: `%${term}%` } },
            { name: { [Op.like]: `%${term}%` } }
          ]
        },
        attributes: ['id'],
        raw: true
      });
      
      const matchedIds = matchingHospitals.map(h => h.id);
      if (!isNaN(numericId)) {
        matchedIds.push(numericId);
      }

      where.hospital_id = { [Op.in]: matchedIds };
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: SuperAdmin, as: 'admin', attributes: ['id','name','email'], required: false },
        { model: Hospital,   as: 'hospital', attributes: ['id','name','code'], required: false },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    res.json({ success: true, data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/super/system-status ──────────────────────────────
const getSystemStatus = async (req, res) => {
  try {
    const os = require('os');
    let masterDbOk = false;
    try {
      await masterDb.authenticate();
      masterDbOk = true;
    } catch (e) {}

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const activeConns = await DbConnection.count({ where: { is_active: true } });
    const failedConns = await DbConnection.count({ where: { test_status: 'failed' } });

    res.json({
      success: true,
      data: {
        cpuLoad: os.loadavg(),
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          percentage: Math.round((usedMem / totalMem) * 100),
        },
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
        databases: {
          masterDb: masterDbOk ? 'online' : 'offline',
          externalActive: activeConns,
          externalFailed: failedConns,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHospital, listHospitals, getHospital,
  suspendHospital, activateHospital, updatePlan, deleteHospital,
  getAnalytics, getAuditLogs, getSystemStatus,
};
