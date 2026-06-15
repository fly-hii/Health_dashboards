/**
 * DbConnection.js
 * Stores encrypted external DB credentials for BYOD (enterprise) hospitals.
 * Lives in careplus_master.
 */
'use strict';

const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const DbConnection = masterDb.define('DbConnection', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  host:        { type: DataTypes.STRING(255), allowNull: false },
  port:        { type: DataTypes.INTEGER,     defaultValue: 3306 },
  database_name: { type: DataTypes.STRING(255), allowNull: false },
  username:    { type: DataTypes.STRING(255), allowNull: false },
  password_encrypted: { type: DataTypes.TEXT, allowNull: false }, // AES-256 JSON blob
  ssl_enabled: { type: DataTypes.BOOLEAN,     defaultValue: false },
  is_active:   { type: DataTypes.BOOLEAN,     defaultValue: true },
  last_tested_at: DataTypes.DATE,
  test_status: {
    type: DataTypes.ENUM('untested', 'success', 'failed'),
    defaultValue: 'untested',
  },
  notes: DataTypes.TEXT,
}, {
  tableName:  'db_connections',
  timestamps: true,
  underscored: true,
});

module.exports = DbConnection;
