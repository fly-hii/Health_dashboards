const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabTest = sequelize.define('LabTest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  consultation_id: { type: DataTypes.INTEGER, references: { model: 'consultations', key: 'id' } },
  patient_id: { type: DataTypes.INTEGER, references: { model: 'patients', key: 'id' } },
  doctor_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  test_name: { type: DataTypes.STRING(200), allowNull: false },
  test_code: { type: DataTypes.STRING(50) },
  category: { type: DataTypes.STRING(100) },
  doctor_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },      // ordering doctor
  technician_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } }, // assigned lab tech
  status: {
    type: DataTypes.ENUM('Ordered', 'Sample-Collected', 'Processing', 'Completed', 'Cancelled'),
    defaultValue: 'Ordered',
  },
  result: { type: DataTypes.TEXT },
  result_url: { type: DataTypes.TEXT }, // S3 URL
  s3_key: { type: DataTypes.TEXT },
  normal_range: { type: DataTypes.STRING(200) },
  unit: { type: DataTypes.STRING(50) },
  priority: { type: DataTypes.ENUM('Routine', 'Urgent', 'STAT'), defaultValue: 'Routine' },
  notes: { type: DataTypes.TEXT },
  completed_at: { type: DataTypes.DATE },
}, {
  tableName: 'lab_tests',
  timestamps: true,
  underscored: true,
});

module.exports = LabTest;
