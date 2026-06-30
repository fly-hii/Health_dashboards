'use strict';
/**
 * PlanPrice.js
 * The public subscription plan catalogue shown on the marketing website.
 * Stored in careplus_master and managed by Super Admins.
 */
const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const PlanPrice = masterDb.define('PlanPrice', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_key:    { type: DataTypes.STRING(40), allowNull: false, unique: true },
  name:        { type: DataTypes.STRING(120), allowNull: false },
  price:       { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  currency:    { type: DataTypes.STRING(10), defaultValue: 'USD' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  color:       { type: DataTypes.STRING(20), defaultValue: '#0F9D8A' },
  features:    { type: DataTypes.JSON, defaultValue: [] },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName:   'plan_prices',
  timestamps:  true,
  underscored: true,
});

module.exports = PlanPrice;
