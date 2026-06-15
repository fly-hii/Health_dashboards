const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
    onDelete: 'CASCADE',
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
  department: {
    type: DataTypes.ENUM('OPD', 'IPD', 'PHARMACY', 'LABORATORY', 'RECEPTION', 'OTHERS'),
    allowNull: false,
    defaultValue: 'OPD',
  },
  date_time: { type: DataTypes.DATE, allowNull: false },
  token_number: { type: DataTypes.INTEGER },
  status: {
    type: DataTypes.ENUM('Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'),
    defaultValue: 'Pending',
  },
  reason: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  visit_type: {
    type: DataTypes.ENUM('New', 'Follow-Up', 'Emergency'),
    defaultValue: 'New',
  },
  booked_by: { type: DataTypes.STRING(100) }, // 'receptionist', 'patient', 'doctor'
}, {
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
});

module.exports = Appointment;
