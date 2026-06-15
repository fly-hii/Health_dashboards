const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
    onDelete: 'CASCADE',
  },
  patient_id: { type: DataTypes.STRING(50), allowNull: false },
  full_name: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(200) },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  dob: { type: DataTypes.DATEONLY, allowNull: false },
  gender: { type: DataTypes.ENUM('Male', 'Female', 'Other'), allowNull: false },
  blood_group: { type: DataTypes.STRING(10) },
  address: { type: DataTypes.TEXT },
  emergency_contact_name: { type: DataTypes.STRING(200) },
  emergency_contact_phone: { type: DataTypes.STRING(20) },
  emergency_contact_relation: { type: DataTypes.STRING(100) },
  insurance_number: { type: DataTypes.STRING(100) },
  medical_notes: { type: DataTypes.TEXT },
  medical_history: { type: DataTypes.JSON, defaultValue: [] },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked', 'discharged', 'Outpatient', 'Admitted', 'Discharged'),
    defaultValue: 'active',
  },
  admit_date: { type: DataTypes.DATE },
  discharge_date: { type: DataTypes.DATE },
  room_number: { type: DataTypes.STRING(20) },
  profile_image: { type: DataTypes.TEXT },
}, {
  tableName: 'patients',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['hospital_id', 'patient_id'] }],
});

module.exports = Patient;
