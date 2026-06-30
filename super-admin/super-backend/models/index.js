'use strict';

const SuperAdmin    = require('./SuperAdmin');
const Hospital      = require('./Hospital');
const Subscription  = require('./Subscription');
const Payment       = require('./Payment');
const AuditLog      = require('./AuditLog');
const DbConnection  = require('./DbConnection');
const PlanPrice     = require('./PlanPrice');

// Hospital ↔ Subscription
Hospital.hasMany(Subscription, { foreignKey: 'hospital_id', as: 'subscriptions' });
Subscription.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

// Hospital ↔ Payment
Hospital.hasMany(Payment, { foreignKey: 'hospital_id', as: 'payments' });
Payment.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

// Subscription ↔ Payment
Subscription.hasMany(Payment, { foreignKey: 'subscription_id', as: 'payments' });
Payment.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

// Hospital ↔ AuditLog
Hospital.hasMany(AuditLog, { foreignKey: 'hospital_id', as: 'auditLogs' });
AuditLog.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

// SuperAdmin ↔ AuditLog
SuperAdmin.hasMany(AuditLog, { foreignKey: 'admin_id', as: 'auditLogs' });
AuditLog.belongsTo(SuperAdmin, { foreignKey: 'admin_id', as: 'admin' });

// Hospital ↔ DbConnection (1-to-1)
Hospital.hasOne(DbConnection, { foreignKey: 'hospital_id', as: 'dbConnection' });
DbConnection.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

module.exports = { SuperAdmin, Hospital, Subscription, Payment, AuditLog, DbConnection, PlanPrice };
