const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Token = sequelize.define('Token', {
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
  patient_id: { type: DataTypes.INTEGER, references: { model: 'patients', key: 'id' } },
  doctor_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  token_number: { type: DataTypes.INTEGER, allowNull: false },
  token_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('Waiting', 'Called', 'In-Progress', 'Completed', 'Skipped', 'Cancelled'),
    defaultValue: 'Waiting',
  },
  called_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  estimated_wait_mins: { type: DataTypes.INTEGER, defaultValue: 15 },
}, {
  tableName: 'tokens',
  timestamps: true,
  underscored: true,
});

module.exports = Token;
