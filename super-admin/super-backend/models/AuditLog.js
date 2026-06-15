'use strict';
const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const AuditLog = masterDb.define('AuditLog', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  admin_id:    { type: DataTypes.INTEGER, allowNull: true },
  hospital_id: { type: DataTypes.INTEGER, allowNull: true },
  action: {
    type: DataTypes.ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','SUSPEND','ACTIVATE','TEST_DB','EXPORT'),
    allowNull: false,
  },
  module:      DataTypes.STRING(100),
  description: DataTypes.TEXT,
  old_data:    DataTypes.JSON,
  new_data:    DataTypes.JSON,
  ip_address:  DataTypes.STRING(50),
}, { tableName: 'audit_logs', timestamps: true, underscored: true, updatedAt: false });

module.exports = AuditLog;
