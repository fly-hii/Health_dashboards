const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
    onDelete: 'CASCADE',
  },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20) },
  head_doctor_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  floor: { type: DataTypes.STRING(20) },
  phone_ext: { type: DataTypes.STRING(20) },
}, {
  tableName: 'departments',
  timestamps: true,
  underscored: true,
});

module.exports = Department;
