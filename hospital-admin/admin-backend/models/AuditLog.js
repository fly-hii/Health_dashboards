const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'hospitals', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'),
    allowNull: false,
  },
  module: { type: DataTypes.STRING(100) },
  table_name: { type: DataTypes.STRING(100) },
  record_id: { type: DataTypes.INTEGER },
  old_data: { type: DataTypes.JSON },
  new_data: { type: DataTypes.JSON },
  description: { type: DataTypes.TEXT },
  ip_address: { type: DataTypes.STRING(50) },
  user_agent: { type: DataTypes.TEXT },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

module.exports = AuditLog;
