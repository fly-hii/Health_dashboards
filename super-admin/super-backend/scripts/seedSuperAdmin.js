/**
 * CarePlus SaaS - Super Admin Seeder
 * Run: node scripts/seedSuperAdmin.js
 * Seeds: default super admin account
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { masterDb } = require('../config/masterDatabase');
const { SuperAdmin } = require('../models');

const seed = async () => {
  try {
    await masterDb.authenticate();
    console.log('✅ Connected to careplus_master database');

    // Sync only super_admins table (safe to run standalone)
    await SuperAdmin.sync({ alter: true });

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME;

    if (!email || !password || !name) {
      throw new Error('SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NAME environment variables are required.');
    }

    const existing = await SuperAdmin.findOne({ where: { email } });
    if (existing) {
      console.log(`ℹ️  Super admin already exists: ${email}`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    await SuperAdmin.create({ name, email, password: hashed, is_active: true });

    console.log('\n🎉 Super Admin seeded successfully!');
    console.log('================================');
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${password}`);
    console.log('================================');
    console.log('⚠️  Change the password after first login!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
