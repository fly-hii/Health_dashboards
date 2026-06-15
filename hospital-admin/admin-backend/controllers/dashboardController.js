const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  Patient, Appointment, User, PharmacyOrder, Payment,
  LabTest, Consultation, AuditLog, Token,
} = require('../models');

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

    // Revenue today
    const revenueResult = await Payment.findOne({
      where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [todayStart, todayEnd] } },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
    });
    const todayRevenue = parseFloat(revenueResult?.dataValues?.total || 0);

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
    const [opdCount, labCount, pharmacyTotal, consultCount] = await Promise.all([
      Appointment.count({ where: { hospital_id: hospitalId, department: 'OPD' } }),
      LabTest.count({ where: { hospital_id: hospitalId } }),
      PharmacyOrder.count({ where: { hospital_id: hospitalId } }),
      Consultation.count({ where: { hospital_id: hospitalId } }),
    ]);

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
    const revMonthly = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d = new Date(); const m = d.getMonth() - (5 - i);
        const start = new Date(d.getFullYear(), m, 1);
        const end = new Date(d.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        const r = await Payment.findOne({
          where: { hospital_id: hospitalId, status: 'Paid', paid_at: { [Op.between]: [start, end] } },
          attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
        });
        return { label: monthLabels[i], revenue: parseFloat(r?.dataValues?.total || 0) };
      })
    );

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

    const [pendingPharmacy, pendingLab] = await Promise.all([
      PharmacyOrder.count({ where: { hospital_id: hospitalId, status: 'Pending' } }),
      LabTest.count({ where: { hospital_id: hospitalId, status: 'Ordered' } }),
    ]);

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
    const [labTestsToday, dischargedToday, pharmacySalesCount] = await Promise.all([
      LabTest.count({ where: { hospital_id: hospitalId, created_at: { [Op.between]: [todayStart, todayEnd] } } }),
      Patient.count({ where: { hospital_id: hospitalId, status: 'Discharged', updated_at: { [Op.between]: [todayStart, todayEnd] } } }),
      PharmacyOrder.count({ where: { hospital_id: hospitalId, status: 'Delivered', delivered_at: { [Op.between]: [todayStart, todayEnd] } } }),
    ]);

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
        revenueTrends: { monthly: revMonthly },
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
