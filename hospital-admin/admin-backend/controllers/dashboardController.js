'use strict';
const { Op } = require('sequelize');

const getTodayRange = () => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  return { todayStart, todayEnd };
};

const getLastNDayLabels = (n) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    return days[d.getDay()];
  });
};

const getLastNMonthLabels = (n) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i));
    return months[d.getMonth()];
  });
};

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    // Use tenant-scoped models and DB connection
    const {
      Patient, Appointment, User, PharmacyOrder, Payment,
      LabTest, Consultation, AuditLog, Token,
    } = req.models;
    // Use req.db for Sequelize functions (fn, col) — ensures correct dialect/connection
    const db = req.db;

    const { todayStart, todayEnd } = getTodayRange();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── Core Counts ──────────────────────────────────────────────
    const [
      totalPatients, todayAppointments, activeDoctors, admittedPatients,
      pharmacyOrdersToday, newPatientsToday, pendingQueue,
    ] = await Promise.all([
      Patient.count({ where: { hospital_id: hospitalId } }),
      Appointment.count({ where: { hospital_id: hospitalId, date_time: { [Op.between]: [todayStart, todayEnd] } } }),
      User.count({ where: { hospital_id: hospitalId, role: 'DOCTOR', status: 'Active' } }),
      Patient.count({ where: { hospital_id: hospitalId, status: 'Admitted' } }),
      PharmacyOrder.count({ where: { hospital_id: hospitalId, created_at: { [Op.between]: [todayStart, todayEnd] } } }),
      Patient.count({ where: { hospital_id: hospitalId, created_at: { [Op.gte]: todayStart } } }),
      Appointment.count({ where: { hospital_id: hospitalId, date_time: { [Op.between]: [todayStart, todayEnd] }, status: { [Op.in]: ['Pending', 'Confirmed'] } } }),
    ]);

    // Revenue today — use req.db.fn and req.db.col for tenant-scoped Sequelize helpers
    let todayRevenue = 0;
    try {
      const revenueResult = await Payment.findOne({
        where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [todayStart, todayEnd] } },
        attributes: [[db.fn('SUM', db.col('amount')), 'total']],
      });
      todayRevenue = parseFloat(revenueResult?.dataValues?.total || 0);
    } catch (_) { /* Payment table may not exist in all hospitals */ }

    // ── 7-day sparklines ─────────────────────────────────────────
    const dailyLabels = getLastNDayLabels(7);
    const dailyTrends = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const start = new Date(); start.setDate(start.getDate() - (6 - i)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setHours(23,59,59,999);
        return Appointment.count({ where: { hospital_id: hospitalId, date_time: { [Op.between]: [start, end] } } });
      })
    );

    // ── Department Overview ───────────────────────────────────────
    let opdCount = 0, labCount = 0, pharmacyTotal = 0, consultCount = 0;
    try {
      [opdCount, labCount, pharmacyTotal, consultCount] = await Promise.all([
        Appointment.count({ where: { hospital_id: hospitalId, department: 'OPD' } }),
        LabTest.count({ where: { hospital_id: hospitalId } }),
        PharmacyOrder.count({ where: { hospital_id: hospitalId } }),
        Consultation ? Consultation.count({ where: { hospital_id: hospitalId } }) : Promise.resolve(0),
      ]);
    } catch (_) { /* optional models may not exist */ }

    const departmentWise = [
      { name: 'OPD', value: opdCount, color: '#0F9D8A' },
      { name: 'IPD', value: admittedPatients, color: '#3B82F6' },
      { name: 'Pharmacy', value: pharmacyTotal, color: '#F59E0B' },
      { name: 'Laboratory', value: labCount, color: '#10B981' },
      { name: 'Consultations', value: consultCount, color: '#6B7280' },
    ];

    // ── Appointment Trends ────────────────────────────────────────
    const apptDaily = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const start = new Date(); start.setDate(start.getDate() - (6 - i)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setHours(23,59,59,999);
        return { label: dailyLabels[i], count: await Appointment.count({ where: { hospital_id: hospitalId, date_time: { [Op.between]: [start, end] } } }) };
      })
    );

    const monthLabels = getLastNMonthLabels(6);
    const apptMonthly = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d = new Date(); const m = d.getMonth() - (5 - i);
        const start = new Date(d.getFullYear(), m, 1);
        const end = new Date(d.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        return { label: monthLabels[i], count: await Appointment.count({ where: { hospital_id: hospitalId, date_time: { [Op.between]: [start, end] } } }) };
      })
    );

    // ── Revenue Trends ────────────────────────────────────────────
    let revDaily = dailyLabels.map(label => ({ label, revenue: 0 }));
    let revMonthly = monthLabels.map(label => ({ label, revenue: 0 }));
    const currentYear = new Date().getFullYear();
    const yearlyLabels = [currentYear - 2, currentYear - 1, currentYear];
    let revYearly = yearlyLabels.map(year => ({ label: String(year), revenue: 0 }));

    try {
      // Daily (7 days)
      revDaily = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const start = new Date(); start.setDate(start.getDate() - (6 - i)); start.setHours(0,0,0,0);
          const end = new Date(start); end.setHours(23,59,59,999);
          const r = await Payment.findOne({
            where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [start, end] } },
            attributes: [[db.fn('SUM', db.col('amount')), 'total']],
          });
          return { label: dailyLabels[i], revenue: parseFloat(r?.dataValues?.total || 0) };
        })
      );

      // Monthly (6 months)
      revMonthly = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const d = new Date(); const m = d.getMonth() - (5 - i);
          const start = new Date(d.getFullYear(), m, 1);
          const end = new Date(d.getFullYear(), m + 1, 0, 23, 59, 59, 999);
          const r = await Payment.findOne({
            where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [start, end] } },
            attributes: [[db.fn('SUM', db.col('amount')), 'total']],
          });
          return { label: monthLabels[i], revenue: parseFloat(r?.dataValues?.total || 0) };
        })
      );

      // Yearly (3 years)
      revYearly = await Promise.all(
        yearlyLabels.map(async (year) => {
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59, 999);
          const r = await Payment.findOne({
            where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [start, end] } },
            attributes: [[db.fn('SUM', db.col('amount')), 'total']],
          });
          return { label: String(year), revenue: parseFloat(r?.dataValues?.total || 0) };
        })
      );
    } catch (_) { /* Payment table may not exist */ }

    // ── Recent Appointments ───────────────────────────────────────
    const recentAppointments = await Appointment.findAll({
      where: { hospital_id: hospitalId },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    // ── Portal Data ───────────────────────────────────────────────
    const [nurseCount, pharmacistCount, labTechCount, receptionistCount] = await Promise.all([
      User.count({ where: { hospital_id: hospitalId, role: 'NURSE', status: 'Active' } }),
      User.count({ where: { hospital_id: hospitalId, role: 'PHARMACIST', status: 'Active' } }),
      User.count({ where: { hospital_id: hospitalId, role: 'LAB_TECHNICIAN', status: 'Active' } }),
      User.count({ where: { hospital_id: hospitalId, role: 'RECEPTIONIST', status: 'Active' } }),
    ]);

    let pendingPharmacy = 0, pendingLab = 0;
    try {
      [pendingPharmacy, pendingLab] = await Promise.all([
        PharmacyOrder.count({ where: { hospital_id: hospitalId, status: 'Pending' } }),
        LabTest.count({ where: { hospital_id: hospitalId, status: 'Ordered' } }),
      ]);
    } catch (_) {}

    const portalData = [
      { name: 'Doctor Portal', activeUsers: activeDoctors, pendingTasks: pendingQueue, color: 'from-teal-500 to-emerald-600' },
      { name: 'Nurse Portal', activeUsers: nurseCount, pendingTasks: admittedPatients, color: 'from-blue-500 to-indigo-600' },
      { name: 'Pharmacy Portal', activeUsers: pharmacistCount, pendingTasks: pendingPharmacy, color: 'from-amber-500 to-orange-600' },
      { name: 'Lab Portal', activeUsers: labTechCount, pendingTasks: pendingLab, color: 'from-purple-500 to-pink-600' },
      { name: 'Reception Portal', activeUsers: receptionistCount, pendingTasks: pendingQueue, color: 'from-slate-500 to-zinc-600' },
    ];

    // ── Recent Activity ───────────────────────────────────────────
    const recentActivities = await AuditLog.findAll({
      where: { hospital_id: hospitalId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    // ── Today Overview ────────────────────────────────────────────
    let labTestsToday = 0, dischargedToday = 0, pharmacySalesCount = 0;
    try {
      [labTestsToday, dischargedToday, pharmacySalesCount] = await Promise.all([
        LabTest.count({ where: { hospital_id: hospitalId, created_at: { [Op.between]: [todayStart, todayEnd] } } }),
        Patient.count({ where: { hospital_id: hospitalId, status: 'Discharged', updated_at: { [Op.between]: [todayStart, todayEnd] } } }),
        PharmacyOrder.count({ where: { hospital_id: hospitalId, status: 'Delivered', delivered_at: { [Op.between]: [todayStart, todayEnd] } } }),
      ]);
    } catch (_) {}

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients: { count: totalPatients, trend: dailyTrends },
          todayAppointments: { count: todayAppointments, trend: dailyTrends },
          activeDoctors: { count: activeDoctors, trend: Array(7).fill(activeDoctors) },
          patientQueue: { count: pendingQueue, trend: dailyTrends },
          admittedPatients: { count: admittedPatients },
          pharmacyOrders: { count: pharmacyOrdersToday },
          todayRevenue: { count: todayRevenue },
        },
        departmentWise,
        appointmentTrends: { daily: apptDaily, monthly: apptMonthly },
        revenueTrends: { daily: revDaily, monthly: revMonthly, yearly: revYearly },
        portalData,
        recentAppointments,
        recentActivities,
        todayOverview: {
          newPatients: newPatientsToday,
          labTests: labTestsToday,
          dischargedPatients: dischargedToday,
          pharmacySales: pharmacySalesCount,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
