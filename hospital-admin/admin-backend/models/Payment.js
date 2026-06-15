const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  patient_id: {
    type: DataTypes.INTEGER,
    references: { model: 'patients', key: 'id' },
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    references: { model: 'appointments', key: 'id' },
  },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'INR' },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
    defaultValue: 'Pending',
  },
  payment_method: {
    type: DataTypes.ENUM('Cash', 'Card', 'UPI', 'Insurance', 'Online', 'Other'),
    defaultValue: 'Cash',
  },
  transaction_id: { type: DataTypes.STRING(200) },
  description: { type: DataTypes.TEXT },
  bill_type: {
    type: DataTypes.ENUM('Consultation', 'Lab', 'Pharmacy', 'Room', 'Other'),
    defaultValue: 'Consultation',
  },
  paid_at: { type: DataTypes.DATE },
  invoice_number: { type: DataTypes.STRING(100) },
}, {
  tableName: 'billing_payments',
  timestamps: true,
  underscored: true,
});

module.exports = Payment;
