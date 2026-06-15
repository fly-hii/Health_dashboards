const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrescriptionMedicine = sequelize.define('PrescriptionMedicine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prescription_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'prescriptions', key: 'id' },
    onDelete: 'CASCADE',
  },
  name: { type: DataTypes.STRING(200), allowNull: false },
  generic_name: { type: DataTypes.STRING(200) },
  dosage: { type: DataTypes.STRING(100) },        // e.g. "500mg"
  frequency: { type: DataTypes.STRING(100) },     // e.g. "3 times a day"
  duration: { type: DataTypes.STRING(100) },      // e.g. "5 days"
  route: { type: DataTypes.STRING(50) },          // oral, injection, etc.
  instructions: { type: DataTypes.TEXT },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
  tableName: 'prescription_medicines',
  timestamps: true,
  underscored: true,
});

module.exports = PrescriptionMedicine;
