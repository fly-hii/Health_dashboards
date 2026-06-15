const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  consultation_id: {
    type: DataTypes.INTEGER,
    references: { model: 'consultations', key: 'id' },
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    references: { model: 'appointments', key: 'id' },
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'patients', key: 'id' },
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  diagnosis: { type: DataTypes.TEXT },
  instructions: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('Active', 'Completed', 'Cancelled'),
    defaultValue: 'Active',
  },
  valid_until: { type: DataTypes.DATEONLY },
}, {
  tableName: 'prescriptions',
  timestamps: true,
  underscored: true,
});

module.exports = Prescription;
