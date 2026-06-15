'use strict';
const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const Payment = masterDb.define('Payment', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id:     { type: DataTypes.INTEGER, allowNull: false },
  subscription_id: DataTypes.INTEGER,
  amount:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency:        { type: DataTypes.STRING(10), defaultValue: 'INR' },
  status: {
    type: DataTypes.ENUM('pending','success','failed','refunded'),
    defaultValue: 'pending',
  },
  payment_method: DataTypes.STRING(50),
  transaction_id: DataTypes.STRING(200),
  notes:          DataTypes.TEXT,
  paid_at:        DataTypes.DATE,
}, { tableName: 'payments', timestamps: true, underscored: true });

module.exports = Payment;
