/**
 * Hospital.js (Super Admin context)
 * Stored in careplus_master — the tenant registry.
 * Added: database_type ('shared' | 'external')
 */
'use strict';

const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const Hospital = masterDb.define('Hospital', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:     { type: DataTypes.STRING(300), allowNull: false },
  code:     { type: DataTypes.STRING(20),  allowNull: false, unique: true },
  email:    { type: DataTypes.STRING(200), allowNull: false, unique: true },
  phone:    DataTypes.STRING(20),
  address:  DataTypes.TEXT,
  city:     DataTypes.STRING(100),
  state:    DataTypes.STRING(100),
  country:  { type: DataTypes.STRING(100), defaultValue: 'India' },
  logo_url: DataTypes.TEXT,
  plan: {
    type: DataTypes.ENUM('basic','standard','premium','enterprise'),
    defaultValue: 'basic',
  },
  status: {
    type: DataTypes.ENUM('active','suspended','trial','expired'),
    defaultValue: 'trial',
  },
  plan_expires_at: DataTypes.DATE,
  max_users:    { type: DataTypes.INTEGER, defaultValue: 10 },
  max_patients: { type: DataTypes.INTEGER, defaultValue: 500 },
  /** NEW: Hybrid multi-tenant DB type */
  database_type: {
    type: DataTypes.ENUM('shared', 'external'),
    defaultValue: 'shared',
    allowNull: false,
    comment: 'shared = hospitals_db, external = hospital BYOD DB',
  },
  settings: { type: DataTypes.JSON, defaultValue: {} },
}, {
  tableName:   'hospitals',
  timestamps:  true,
  underscored: true,
});

module.exports = Hospital;
