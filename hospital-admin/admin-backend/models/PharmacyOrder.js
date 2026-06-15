const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PharmacyOrder = sequelize.define('PharmacyOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  prescription_id: {
    type: DataTypes.INTEGER,
    references: { model: 'prescriptions', key: 'id' },
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'patients', key: 'id' },
  },
  pharmacist_id: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Processing', 'Ready', 'Delivered', 'Cancelled'),
    defaultValue: 'Pending',
  },
  total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  payment_status: {
    type: DataTypes.ENUM('Unpaid', 'Paid', 'Partial'),
    defaultValue: 'Unpaid',
  },
  notes: { type: DataTypes.TEXT },
  processed_at: { type: DataTypes.DATE },
  delivered_at: { type: DataTypes.DATE },
}, {
  tableName: 'pharmacy_orders',
  timestamps: true,
  underscored: true,
});

module.exports = PharmacyOrder;
