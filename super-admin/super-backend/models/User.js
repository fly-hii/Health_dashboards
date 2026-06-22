const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // null for SUPER_ADMIN
    references: { model: 'hospitals', key: 'id' },
    onDelete: 'CASCADE',
  },
  name: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(200), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM(
      'SUPER_ADMIN',
      'HOSPITAL_ADMIN',
      'DOCTOR',
      'NURSE',
      'RECEPTIONIST',
      'PHARMACIST',
      'LAB_TECHNICIAN',
      'PATIENT'
    ),
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING(100),
    defaultValue: 'OTHERS',
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
  },
  phone: { type: DataTypes.STRING(20) },
  profile_image: { type: DataTypes.TEXT },
  employee_id: { type: DataTypes.STRING(50) },
  // Doctor/Nurse specific
  specialization: { type: DataTypes.STRING(200) },
  experience: { type: DataTypes.INTEGER },
  qualification: { type: DataTypes.STRING(200) },
  shift: {
    type: DataTypes.ENUM('Morning', 'Evening', 'Night'),
    defaultValue: 'Morning',
  },
  schedule_days: { type: DataTypes.JSON }, // ['Monday','Tuesday',...]
  schedule_start: { type: DataTypes.STRING(20), defaultValue: '09:00 AM' },
  schedule_end: { type: DataTypes.STRING(20), defaultValue: '05:00 PM' },
  availability_status: {
    type: DataTypes.ENUM('Available', 'On Leave', 'Busy'),
    defaultValue: 'Available',
  },
  last_login: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

module.exports = User;
