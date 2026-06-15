const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
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
  uploaded_by: {
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' },
  },
  title: { type: DataTypes.STRING(300), allowNull: false },
  report_type: {
    type: DataTypes.ENUM('Lab', 'Radiology', 'Pathology', 'Prescription', 'Discharge', 'Other'),
    defaultValue: 'Other',
  },
  file_url: { type: DataTypes.TEXT },         // S3 public URL or signed URL
  s3_key: { type: DataTypes.TEXT },           // S3 object key for management
  file_name: { type: DataTypes.STRING(500) },
  file_size: { type: DataTypes.INTEGER },     // bytes
  file_type: { type: DataTypes.STRING(50) },  // mime type
  description: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('Pending', 'Ready', 'Reviewed'),
    defaultValue: 'Ready',
  },
  is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true,
});

module.exports = Report;
