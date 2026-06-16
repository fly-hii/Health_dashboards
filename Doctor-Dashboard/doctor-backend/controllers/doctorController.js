const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Static imports only for the public login endpoint
const { User: StaticUser, AuditLog: StaticAuditLog } = require('../models');

const generateToken = (user) => jwt.sign(
  { id: user.id, hospitalId: user.hospital_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await StaticUser.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(user.role)) return res.status(403).json({ success: false, message: 'Not authorized for this portal' });
    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await user.update({ last_login: new Date() });

    await StaticAuditLog.create({
      hospital_id: user.hospital_id,
      user_id: user.id,
      action: 'LOGIN',
      module: 'Auth',
      description: `Doctor ${user.name} logged in`,
      ip_address: req.ip,
    });

    const token = generateToken(user);
    const { password: _, ...userData } = user.toJSON();
    res.json({ success: true, token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/stats
const getDashboardStatsV2 = async (req, res) => {
  try {
    const { Appointment } = req.models;
    const doctorId = req.user.id;
    const hospitalId = req.hospitalId;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const [todayAppointments, totalPatients, completedToday, pendingQueue, followUps] = await Promise.all([
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId }, distinct: true, col: 'patient_id' }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Completed', date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: { [Op.in]: ['Pending','Confirmed','In-Progress'] }, date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, visit_type: 'Follow-Up', date_time: { [Op.between]: [today, todayEnd] } } }),
    ]);

    res.json({
      success: true,
      patientsInQueue: pendingQueue,
      todayConsultations: todayAppointments,
      completedToday: completedToday,
      followUps: followUps,
      data: {
        patientsInQueue: pendingQueue,
        todayConsultations: todayAppointments,
        completedToday: completedToday,
        followUps: followUps,
        todayAppointments,
        totalPatients,
        pendingQueue,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/schedule
const getDashboardSchedule = async (req, res) => {
  try {
    const { Appointment, Patient } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: {
        hospital_id: req.hospitalId,
        doctor_id: req.user.id,
        date_time: { [Op.between]: [today, todayEnd] }
      },
      include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
      order: [['date_time', 'ASC']],
    });

    const mapped = appointments.map(appt => {
      const dt = new Date(appt.date_time);
      let timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let status = 'waiting';
      if (appt.status === 'In-Progress') status = 'in_progress';
      else if (appt.status === 'Completed') status = 'completed';
      else if (appt.status === 'Confirmed' || appt.status === 'Pending') status = 'waiting';
      else status = appt.status.toLowerCase();

      return {
        _id: appt.id.toString(),
        time: timeStr,
        patientName: appt.patient?.full_name || 'Unknown Patient',
        visitType: appt.visit_type === 'Follow-Up' ? 'Follow-up' : 'Consultation',
        status: status
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/chart
const getDashboardChart = async (req, res) => {
  try {
    const { Appointment } = req.models;
    const doctorId = req.user.id;
    const hospitalId = req.hospitalId;

    const [completed, pending, cancelled] = await Promise.all([
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Completed' } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Cancelled' } }),
    ]);

    const total = completed + pending + cancelled;
    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
    const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    res.json({
      total,
      data: [
        { name: 'Completed', value: completed, percentage: completedPct, color: '#0F9D8A' },
        { name: 'Pending', value: pending, percentage: pendingPct, color: '#F59E0B' },
        { name: 'Cancelled', value: cancelled, percentage: cancelledPct, color: '#EF4444' }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/patients
const getPatients = async (req, res) => {
  try {
    const { Patient } = req.models;
    const patients = await Patient.findAll({
      where: { hospital_id: req.hospitalId },
      order: [['full_name', 'ASC']],
    });

    const mapped = patients.map(p => {
      let age = null;
      if (p.dob) {
        const birthDate = new Date(p.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        _id: p.id,
        id: p.id,
        patientId: p.patient_id,
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        age: age,
        gender: p.gender?.toLowerCase(),
        bloodGroup: p.blood_group,
        status: p.status,
      };
    });

    res.json({ success: true, patients: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/queue
const getPatientQueue = async (req, res) => {
  try {
    const { Appointment, Patient, Vitals } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: {
        hospital_id: req.hospitalId,
        doctor_id: req.user.id,
        date_time: { [Op.between]: [today, todayEnd] },
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] },
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
      order: [['token_number', 'ASC']],
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const { Patient } = req.models;
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/history
const getPatientHistoryV2 = async (req, res) => {
  try {
    const { Appointment, Prescription, Vitals, Report, User, PrescriptionMedicine } = req.models;
    const where = { patient_id: req.params.id, hospital_id: req.hospitalId };

    const [appointments, prescriptions, vitals, reports] = await Promise.all([
      Appointment.findAll({ where, include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }], order: [['date_time', 'DESC']] }),
      Prescription.findAll({ where, include: [{ model: PrescriptionMedicine, as: 'medicines' }, { model: User, as: 'doctor', attributes: ['id', 'name'] }], order: [['created_at', 'DESC']] }),
      Vitals.findAll({ where, order: [['recorded_at', 'DESC']], limit: 10 }),
      Report.findAll({ where: { ...where, is_deleted: false }, order: [['created_at', 'DESC']], limit: 10 }),
    ]);

    res.json({ success: true, data: { appointments, prescriptions, vitals, reports } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/consultations/:appointmentId
const getConsultationByAppointmentId = async (req, res) => {
  try {
    const { Consultation, Appointment, Patient, Vitals, Prescription, PrescriptionMedicine } = req.models;
    let consultation = await Consultation.findOne({
      where: { appointment_id: req.params.appointmentId, hospital_id: req.hospitalId },
      include: [
        { model: Prescription, as: 'prescription', include: [{ model: PrescriptionMedicine, as: 'medicines' }], required: false },
      ],
    });

    if (!consultation) {
      const appointment = await Appointment.findOne({
        where: { id: req.params.appointmentId, hospital_id: req.hospitalId },
        include: [{ model: Patient, as: 'patient' }, { model: Vitals, as: 'vitals', required: false }],
      });
      if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

      consultation = await Consultation.create({
        hospital_id: req.hospitalId,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: req.user.id,
        status: 'Pending',
      });
      consultation.dataValues.appointment = appointment;
    }

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/start
const startConsultation = async (req, res) => {
  try {
    const { Consultation, Appointment } = req.models;
    const consultation = await Consultation.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    await consultation.update({ status: 'In-Progress', started_at: new Date() });
    await Appointment.update({ status: 'In-Progress' }, { where: { id: consultation.appointment_id } });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('consultation_started', { consultationId: consultation.id, appointmentId: consultation.appointment_id });

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/notes
const saveConsultationNotes = async (req, res) => {
  try {
    const { Consultation } = req.models;
    const { symptoms, diagnosis, notes, follow_up_date, follow_up_notes } = req.body;
    const consultation = await Consultation.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    await consultation.update({ symptoms, diagnosis, notes, follow_up_date, follow_up_notes });
    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/consultations/:id/prescription
const savePrescription = async (req, res) => {
  const t = await req.db.transaction();
  try {
    const { Consultation, Prescription, PrescriptionMedicine } = req.models;
    const consultation = await Consultation.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!consultation) { await t.rollback(); return res.status(404).json({ success: false, message: 'Consultation not found' }); }

    const { diagnosis, instructions, medicines = [], valid_until } = req.body;

    // Upsert prescription
    let prescription = await Prescription.findOne({ where: { consultation_id: consultation.id }, transaction: t });
    if (prescription) {
      await prescription.update({ diagnosis, instructions, valid_until }, { transaction: t });
      await PrescriptionMedicine.destroy({ where: { prescription_id: prescription.id }, transaction: t });
    } else {
      prescription = await Prescription.create({
        hospital_id: req.hospitalId,
        consultation_id: consultation.id,
        appointment_id: consultation.appointment_id,
        patient_id: consultation.patient_id,
        doctor_id: req.user.id,
        diagnosis, instructions, valid_until,
        status: 'Active',
      }, { transaction: t });
    }

    // Insert medicines
    if (medicines.length > 0) {
      await PrescriptionMedicine.bulkCreate(
        medicines.map(m => ({ prescription_id: prescription.id, ...m })),
        { transaction: t }
      );
    }

    await t.commit();

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('prescription_created', { prescriptionId: prescription.id, patientId: consultation.patient_id });

    const result = await Prescription.findByPk(prescription.id, { include: [{ model: PrescriptionMedicine, as: 'medicines' }] });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/complete
const completeConsultation = async (req, res) => {
  try {
    const { Consultation, Appointment, AuditLog } = req.models;
    const consultation = await Consultation.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    await consultation.update({ status: 'Completed', completed_at: new Date() });
    await Appointment.update({ status: 'Completed' }, { where: { id: consultation.appointment_id } });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Consultations',
      table_name: 'consultations',
      record_id: consultation.id,
      description: `Consultation completed by Dr. ${req.user.name}`,
      ip_address: req.ip,
    });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('consultation_completed', { consultationId: consultation.id, appointmentId: consultation.appointment_id });

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/appointments/today
const getTodayAppointments = async (req, res) => {
  try {
    const { Appointment, Patient, Vitals } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, doctor_id: req.user.id, date_time: { [Op.between]: [today, todayEnd] } },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
      order: [['token_number', 'ASC']],
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/prescriptions
const getPrescriptions = async (req, res) => {
  try {
    const { Prescription, Patient, PrescriptionMedicine } = req.models;
    const { page = 1, limit = 20, status } = req.query;
    const where = { hospital_id: req.hospitalId, doctor_id: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await Prescription.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] },
        { model: PrescriptionMedicine, as: 'medicines' },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/notifications
const getNotifications = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notifications = await Notification.findAll({
      where: { hospital_id: req.hospitalId, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctor/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const { Notification } = req.models;
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { id: req.params.id, hospital_id: req.hospitalId } }
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/reports
const getPatientReports = async (req, res) => {
  try {
    const { Report } = req.models;
    const reports = await Report.findAll({
      where: { patient_id: req.params.id, hospital_id: req.hospitalId, is_deleted: false },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/profile
const getDoctorProfile = async (req, res) => {
  try {
    const { User } = req.models;
    const doctor = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctor/profile
const updateDoctorProfile = async (req, res) => {
  try {
    const { User } = req.models;
    const { password, role, hospital_id, ...updates } = req.body;
    await User.update(updates, { where: { id: req.user.id } });
    const updated = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctors/change-password
const changeDoctorPassword = async (req, res) => {
  try {
    const { User } = req.models;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  login,
  getDashboardStatsV2,
  getDashboardSchedule,
  getDashboardChart,
  getPatients,
  getPatientQueue,
  getPatientById,
  getPatientHistoryV2,
  getPatientReports,
  getConsultationByAppointmentId,
  startConsultation,
  saveConsultationNotes,
  savePrescription,
  completeConsultation,
  getTodayAppointments,
  getPrescriptions,
  getNotifications,
  markNotificationRead,
  getDoctorProfile,
  updateDoctorProfile,
  changeDoctorPassword,
};
