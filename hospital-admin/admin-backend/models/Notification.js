const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'hospitals', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // null = broadcast to all in hospital
    references: { model: 'users', key: 'id' },
  },
  title: { type: DataTypes.STRING(300), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('patient', 'appointment', 'doctor', 'nurse', 'pharmacy', 'laboratory', 'billing', 'system'),
    defaultValue: 'system',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('unread', 'read', 'resolved'),
    defaultValue: 'unread',
  },
  is_important: { type: DataTypes.BOOLEAN, defaultValue: false },
  related_entity_id: { type: DataTypes.INTEGER },
  related_entity_type: { type: DataTypes.STRING(100) },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
  read_at: { type: DataTypes.DATE },
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
});

module.exports = Notification;
