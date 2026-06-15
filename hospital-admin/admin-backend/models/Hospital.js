const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Hospital = sequelize.define('Hospital', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(200), unique: true },
  phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  state: { type: DataTypes.STRING(100) },
  country: { type: DataTypes.STRING(100), defaultValue: 'India' },
  logo_url: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'suspended', 'trial', 'expired'), defaultValue: 'trial' },
  plan: { type: DataTypes.ENUM('basic', 'standard', 'premium', 'enterprise'), defaultValue: 'basic' },
  plan_expires_at: { type: DataTypes.DATE },
  max_users: { type: DataTypes.INTEGER, defaultValue: 10 },
  settings: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'hospitals', timestamps: true, underscored: true });

module.exports = Hospital;
