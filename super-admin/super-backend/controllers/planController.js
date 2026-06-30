'use strict';

const { PlanPrice, AuditLog } = require('../models');

// Default catalogue — mirrors the marketing site. Seeded once if the table is empty.
const DEFAULT_PLANS = [
  {
    plan_key: 'basic',
    name: 'Starter Plan',
    price: 299,
    currency: 'USD',
    description: 'Perfect for small clinics and private practices.',
    color: '#06B6D4',
    features: ['Up to 5 doctors', 'Up to 500 patients', 'Patient Management', 'Appointment System', 'Basic Billing', 'Email Support'],
    sort_order: 1,
  },
  {
    plan_key: 'standard',
    name: 'Professional Plan',
    price: 499,
    currency: 'USD',
    description: 'Ideal for mid-size hospitals and multiple clinics.',
    color: '#0F9D8A',
    features: ['Up to 50 doctors', 'Up to 5,000 patients', 'Pharmacy Module', 'Laboratory Module', 'Analytics Dashboard', 'SMS Notifications', 'Priority Support'],
    sort_order: 2,
  },
  {
    plan_key: 'premium',
    name: 'Premium Suite',
    price: 699,
    currency: 'USD',
    description: 'For large hospital networks and medical groups.',
    color: '#6366F1',
    features: ['Unlimited doctors & staff', 'Unlimited patients', 'Custom roles & permissions', 'Dedicated Server Config', 'SLA Uptime Guarantee', '24/7 Phone Support'],
    sort_order: 3,
  },
];

// Ensure the catalogue is populated. Safe to call repeatedly.
const ensureSeeded = async () => {
  const count = await PlanPrice.count();
  if (count === 0) {
    await PlanPrice.bulkCreate(DEFAULT_PLANS);
  }
};

const serialize = (plan) => ({
  id: plan.id,
  plan_key: plan.plan_key,
  name: plan.name,
  price: Number(plan.price),
  currency: plan.currency,
  description: plan.description,
  color: plan.color,
  features: Array.isArray(plan.features) ? plan.features : [],
  sort_order: plan.sort_order,
  is_active: plan.is_active,
});

// ── GET /api/super/plans (Super Admin) ─────────────────────────
const listPlans = async (req, res) => {
  try {
    await ensureSeeded();
    const plans = await PlanPrice.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: plans.map(serialize) });
  } catch (err) {
    console.error('listPlans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/super/plans/:id (Super Admin) ─────────────────────
const updatePlan = async (req, res) => {
  try {
    const plan = await PlanPrice.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { name, price, currency, description, color, features, sort_order, is_active } = req.body;

    if (name !== undefined) plan.name = name;
    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number' });
      }
      plan.price = numericPrice;
    }
    if (currency !== undefined) plan.currency = currency;
    if (description !== undefined) plan.description = description;
    if (color !== undefined) plan.color = color;
    if (features !== undefined) {
      plan.features = Array.isArray(features)
        ? features
        : String(features).split('\n').map(f => f.trim()).filter(Boolean);
    }
    if (sort_order !== undefined) plan.sort_order = sort_order;
    if (is_active !== undefined) plan.is_active = !!is_active;

    await plan.save();

    AuditLog.create({
      admin_id: req.user?.id,
      action: 'UPDATE',
      module: 'PLAN_PRICE',
      description: `Updated plan "${plan.plan_key}" — price ${plan.currency} ${Number(plan.price)}`,
      new_data: serialize(plan),
    }).catch(() => {});

    res.json({ success: true, data: serialize(plan) });
  } catch (err) {
    console.error('updatePlan error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/public/plans (no auth — consumed by marketing site) ──
const getPublicPlans = async (req, res) => {
  try {
    await ensureSeeded();
    const plans = await PlanPrice.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    res.json({ success: true, data: plans.map(serialize) });
  } catch (err) {
    console.error('getPublicPlans error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listPlans, updatePlan, getPublicPlans, ensureSeeded };
