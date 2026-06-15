'use strict';
const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const Subscription = masterDb.define('Subscription', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: { type: DataTypes.INTEGER, allowNull: false },
  plan: {
    type: DataTypes.ENUM('basic','standard','premium','enterprise'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active','expired','cancelled','trial'),
    defaultValue: 'trial',
  },
  amount:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  currency:      { type: DataTypes.STRING(10), defaultValue: 'INR' },
  billing_cycle: { type: DataTypes.ENUM('monthly','quarterly','yearly'), defaultValue: 'monthly' },
  starts_at:     { type: DataTypes.DATE, allowNull: false },
  expires_at:    { type: DataTypes.DATE, allowNull: false },
  auto_renew:    { type: DataTypes.BOOLEAN, defaultValue: true },
  features:      { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'subscriptions', timestamps: true, underscored: true });

module.exports = Subscription;
