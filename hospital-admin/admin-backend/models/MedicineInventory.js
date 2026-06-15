const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicineInventory = sequelize.define('MedicineInventory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
    onDelete: 'CASCADE',
  },
  name: { type: DataTypes.STRING(200), allowNull: false },
  generic_name: { type: DataTypes.STRING(200) },
  category: { type: DataTypes.STRING(100) },
  manufacturer: { type: DataTypes.STRING(200) },
  batch_number: { type: DataTypes.STRING(100) },
  expiry_date: { type: DataTypes.DATEONLY },
  unit: { type: DataTypes.STRING(50) },
  quantity_in_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  reorder_level: { type: DataTypes.INTEGER, defaultValue: 10 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  location: { type: DataTypes.STRING(100) },
  status: {
    type: DataTypes.ENUM('In Stock', 'Low Stock', 'Out of Stock', 'Expired'),
    defaultValue: 'In Stock',
  },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'medicine_inventory',
  timestamps: true,
  underscored: true,
});

module.exports = MedicineInventory;
