'use strict';
/**
 * hospitalController.js (Hospital Admin Backend)
 * Handles Hospital Profile and Hospital Settings configuration
 */

const { masterDb } = require('../services/databaseResolver');
const { uploadToS3, getSignedDownloadUrl } = require('../services/s3Service');

const signLogoUrl = async (logoUrl) => {
  if (!logoUrl) return logoUrl;
  if (logoUrl.includes('s3.ap-south-1.amazonaws.com') || logoUrl.includes('.s3.amazonaws.com')) {
    const match = logoUrl.match(/amazonaws\.com\/(.+)$/);
    if (match && match[1]) {
      try {
        const signedUrl = await getSignedDownloadUrl(match[1]);
        return signedUrl;
      } catch (err) {
        console.warn('⚠️ Warning: Failed to sign S3 URL:', err.message);
      }
    }
  }
  return logoUrl;
};

const getHospitalProfile = async (req, res) => {
  try {
    const { Hospital } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId);

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const responseData = hospital.get({ plain: true });
    responseData.logo_url = await signLogoUrl(responseData.logo_url);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ success: true, data: responseData });
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

    let finalLogoUrl = logo_url;
    if (req.body.logoImage && req.body.logoImage.startsWith('data:image/')) {
      const matches = req.body.logoImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = contentType.split('/')[1] || 'jpg';
        const s3Key = `hospitals/${req.hospitalId}/logo-${Date.now()}.${extension}`;
        
        console.log('Uploading hospital logo to AWS S3 bucket.');
        const { file_url } = await uploadToS3(buffer, s3Key, contentType);
        finalLogoUrl = file_url;
      }
    }

    // 1. Update in the Tenant DB
    hospital.name = name;
    hospital.email = email !== undefined ? email : hospital.email;
    hospital.phone = phone !== undefined ? phone : hospital.phone;
    hospital.address = address !== undefined ? address : hospital.address;
    hospital.city = city !== undefined ? city : hospital.city;
    hospital.state = state !== undefined ? state : hospital.state;
    hospital.country = country !== undefined ? country : hospital.country;
    hospital.logo_url = finalLogoUrl !== undefined ? finalLogoUrl : hospital.logo_url;

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
            finalLogoUrl || null,
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

    const responseData = hospital.get({ plain: true });
    responseData.logo_url = await signLogoUrl(responseData.logo_url);

    res.json({ success: true, data: responseData });
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

const getHospitalSubscription = async (req, res) => {
  try {
    const { Hospital, User } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId, {
      attributes: ['id', 'name', 'code', 'plan', 'status', 'plan_expires_at', 'max_users']
    });

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    const userCount = await User.count({ where: { hospital_id: req.hospitalId } });

    // Query subscription records from careplus_master
    const [subscriptions] = await masterDb.query(
      'SELECT * FROM subscriptions WHERE hospital_id = ? ORDER BY created_at DESC',
      { replacements: [req.hospitalId] }
    );

    // Query payment history from careplus_master
    const [payments] = await masterDb.query(
      'SELECT * FROM payments WHERE hospital_id = ? ORDER BY created_at DESC',
      { replacements: [req.hospitalId] }
    );

    res.json({
      success: true,
      data: {
        hospital,
        subscriptions,
        payments,
        userCount
      }
    });
  } catch (error) {
    console.error('Error fetching hospital subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const upgradeHospitalSubscription = async (req, res) => {
  const { plan, billingCycle, amount, paymentMethod } = req.body;

  if (!plan || !billingCycle || !amount || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'plan, billingCycle, amount, and paymentMethod are required' });
  }

  const validPlans = ['basic', 'standard', 'premium', 'enterprise'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ success: false, message: 'Invalid plan' });
  }

  try {
    const { Hospital, AuditLog } = req.models;
    const hospital = await Hospital.findByPk(req.hospitalId);

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital profile not found' });
    }

    // Calculate expiry date
    const planExpiresAt = new Date();
    if (billingCycle === 'monthly') {
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
    } else if (billingCycle === 'quarterly') {
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 3);
    } else if (billingCycle === 'yearly') {
      planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid billing cycle' });
    }

    // Determine max users based on plan
    let maxUsers = 10;
    if (plan === 'standard') maxUsers = 50;
    else if (plan === 'premium') maxUsers = 200;
    else if (plan === 'enterprise') maxUsers = 1000;

    // 1. Update in the Tenant DB
    hospital.plan = plan;
    hospital.status = 'active';
    hospital.plan_expires_at = planExpiresAt;
    hospital.max_users = maxUsers;
    await hospital.save();

    // 2. Synchronize to the careplus_master DB
    try {
      await masterDb.query(
        'UPDATE hospitals SET plan = ?, status = ?, plan_expires_at = ?, max_users = ? WHERE id = ?',
        {
          replacements: [plan, 'active', planExpiresAt, maxUsers, req.hospitalId]
        }
      );
    } catch (masterError) {
      console.warn('⚠️ Warning: Failed to sync hospital plan to master DB:', masterError.message);
    }

    // 3. Insert Subscription record in careplus_master
    let subscriptionId = null;
    try {
      const [subResult] = await masterDb.query(
        `INSERT INTO subscriptions (hospital_id, plan, status, amount, billing_cycle, starts_at, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
        {
          replacements: [req.hospitalId, plan, 'active', amount, billingCycle, planExpiresAt]
        }
      );
      subscriptionId = subResult;
    } catch (subError) {
      console.error('Failed to create subscription record in master DB:', subError.message);
    }

    // 4. Insert Payment record in careplus_master
    const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    try {
      await masterDb.query(
        `INSERT INTO payments (hospital_id, subscription_id, amount, currency, status, payment_method, transaction_id, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, 'INR', 'success', ?, ?, NOW(), NOW(), NOW())`,
        {
          replacements: [req.hospitalId, subscriptionId || null, amount, paymentMethod, transactionId]
        }
      );
    } catch (payError) {
      console.error('Failed to create payment record in master DB:', payError.message);
    }

    // 5. Create Audit Log
    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Subscription',
      description: `Upgraded subscription to ${plan} (${billingCycle})`,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: `Subscription successfully upgraded to ${plan}`,
      data: {
        plan,
        status: 'active',
        plan_expires_at: planExpiresAt,
        max_users: maxUsers
      }
    });
  } catch (error) {
    console.error('Error upgrading hospital subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalSettings,
  updateHospitalSettings,
  getHospitalSubscription,
  upgradeHospitalSubscription
};
