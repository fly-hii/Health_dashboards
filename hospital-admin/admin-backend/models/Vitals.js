const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vitals = sequelize.define('Vitals', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'patients', key: 'id' },
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    references: { model: 'appointments', key: 'id' },
  },
  recorded_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  blood_pressure: { type: DataTypes.STRING(20) },  // e.g. "120/80"
  pulse: { type: DataTypes.INTEGER },              // bpm
  temperature: { type: DataTypes.DECIMAL(5, 2) }, // °F
  spo2: { type: DataTypes.INTEGER },               // %
  weight: { type: DataTypes.DECIMAL(5, 2) },       // kg
  height: { type: DataTypes.DECIMAL(5, 2) },       // cm
  bmi: { type: DataTypes.DECIMAL(5, 2) },
  respiratory_rate: { type: DataTypes.INTEGER },    // breaths/min
  blood_sugar: { type: DataTypes.DECIMAL(6, 2) },  // mg/dL
  notes: { type: DataTypes.TEXT },
  recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'vitals',
  timestamps: true,
  underscored: true,
});

module.exports = Vitals;
