/**
 * adminDb.js
 *
 * All dashboards now share the same MongoDB database (patient_dashboard).
 * This module simply returns the main mongoose connection for compatibility.
 */
const mongoose = require('mongoose');

const getAdminConnection = async () => mongoose.connection;

// Staff User schema — mirrors the shared User collection
const adminUserSchema = new mongoose.Schema({
  name:               String,
  email:              { type: String, lowercase: true },
  password:           String,
  role:               String,
  department:         String,
  status:             String,
  phone:              String,
  profileImage:       String,
  employeeId:         String,
  shift:              String,
  availabilityStatus: String,
}, { timestamps: true });

const getAdminUserModel = async () => {
  if (mongoose.models && mongoose.models.User) {
    return mongoose.models.User;
  }
  return mongoose.model('User', adminUserSchema);
};

module.exports = { getAdminConnection, getAdminUserModel };
