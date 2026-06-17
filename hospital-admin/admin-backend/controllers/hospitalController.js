'use strict';
/**
 * hospitalController.js (Hospital Admin Backend)
 * Handles Hospital Profile and Hospital Settings configuration
 */

const { masterDb } = require('../services/databaseResolver');

const getHospitalProfile = async (req, res) => {
  try {
    const { Hospital } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId);

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    console.error('Error fetching hospital profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateHospitalProfile = async (req, res) => {
  const { name, email, phone, address, city, state, country, logo_url } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Hospital name is required' });
  }

  try {
    const { Hospital, AuditLog } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId);

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    // 1. Update in the Tenant DB
    hospital.name = name;
    hospital.email = email !== undefined ? email : hospital.email;
    hospital.phone = phone !== undefined ? phone : hospital.phone;
    hospital.address = address !== undefined ? address : hospital.address;
    hospital.city = city !== undefined ? city : hospital.city;
    hospital.state = state !== undefined ? state : hospital.state;
    hospital.country = country !== undefined ? country : hospital.country;
    hospital.logo_url = logo_url !== undefined ? logo_url : hospital.logo_url;

    await hospital.save();

    // 2. Synchronize to the careplus_master DB
    try {
      await masterDb.query(
        'UPDATE hospitals SET name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, country = ?, logo_url = ? WHERE id = ?',
        {
          replacements: [
            name,
            email || null,
            phone || null,
            address || null,
            city || null,
            state || null,
            country || 'India',
            logo_url || null,
            req.hospitalId
          ]
        }
      );
    } catch (masterError) {
      console.warn('⚠️ Warning: Failed to sync hospital changes to master registry:', masterError.message);
      // We don't fail the whole request because the tenant DB has succeeded.
    }

    // 3. Create Audit Log
    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Hospital Profile',
      description: `Updated hospital profile for ${name}`,
      ip_address: req.ip
    });

    res.json({ success: true, data: hospital });
  } catch (error) {
    console.error('Error updating hospital profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHospitalSettings = async (req, res) => {
  try {
    const { Hospital } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId, {
      attributes: ['id', 'settings']
    });

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    res.json({ success: true, data: hospital.settings || {} });
  } catch (error) {
    console.error('Error fetching hospital settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateHospitalSettings = async (req, res) => {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid settings object' });
  }

  try {
    const { Hospital, AuditLog } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId);

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    // Merge settings
    const currentSettings = hospital.settings || {};
    const newSettings = { ...currentSettings, ...settings };

    hospital.settings = newSettings;
    await hospital.save();

    // Audit Log
    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Hospital Settings',
      description: 'Updated hospital configuration settings',
      ip_address: req.ip
    });

    res.json({ success: true, data: hospital.settings });
  } catch (error) {
    console.error('Error updating hospital settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalSettings,
  updateHospitalSettings
};
