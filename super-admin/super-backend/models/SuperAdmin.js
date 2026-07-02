/**
 * Super Admin User model (super_admin_users table in careplus_master)
 */
'use strict';

const { DataTypes } = require('sequelize');
const { masterDb }  = require('../config/masterDatabase');

const SuperAdmin = masterDb.define('SuperAdmin', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:       { type: DataTypes.STRING(200), allowNull: false },
  email:      { type: DataTypes.STRING(200), allowNull: false, unique: true },
  password:   { type: DataTypes.STRING(255), allowNull: false },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: DataTypes.DATE,
  profile_image: { type: DataTypes.TEXT },
}, {
  tableName:   'super_admin_users',
  timestamps:  true,
  underscored: true,
});

module.exports = SuperAdmin;
