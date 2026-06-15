const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Consultation = sequelize.define('Consultation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  symptoms: { type: DataTypes.TEXT },
  diagnosis: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  follow_up_date: { type: DataTypes.DATE },
  follow_up_notes: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('Pending', 'In-Progress', 'Completed'),
    defaultValue: 'Pending',
  },
  started_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  lab_tests: { type: DataTypes.JSON, defaultValue: [] },
}, {
  tableName: 'consultations',
  timestamps: true,
  underscored: true,
});

module.exports = Consultation;
