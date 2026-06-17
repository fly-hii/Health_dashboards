const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const { Op } = require('sequelize');
const { connectDB, sequelize } = require('./config/database');

dotenv.config();

const {
  Patient, User, Hospital, Appointment, Token, Vitals,
  Prescription, PrescriptionMedicine, Report, Notification, PharmacyOrder,
} = require('./models');

const { protect } = require('./middleware/authMiddleware');
const { register, login, getProfile, updateProfile, changePassword, sendOtp, verifyOtp } = require('./controllers/authController');

const app = express();
const PORT = process.env.PORT || 5050;

// ── HTTP Server & Socket.IO ─────────────────────────────────
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5180'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Patient socket: ${socket.id}`);

  // Patient joins their own room + hospital room
  socket.on('join_patient', (patientId) => {
    socket.join(`patient_${patientId}`);
  });
  socket.on('join_hospital', (hospitalId) => {
    socket.join(`hospital_${hospitalId}`);
  });
  socket.on('disconnect', () => {
    console.log(`🔌 Patient socket disconnected: ${socket.id}`);
  });
});
app.set('io', io);

// ── Nurse Socket Relay ──────────────────────────────────────
const NURSE_SOCKET_URL = process.env.NURSE_SOCKET_URL || 'http://localhost:5002';
let nurseSocket = null;
const connectNurseSocket = () => {
  nurseSocket = ioClient(NURSE_SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: Infinity,
  });
  nurseSocket.on('connect', () => console.log('✅ Patient relay → Nurse socket connected'));
  nurseSocket.on('connect_error', () => { /* silent */ });

  // Forward vitals updates to patient's room
  nurseSocket.on('vitals_recorded', (data) => {
    if (data.patientId) {
      io.to(`patient_${data.patientId}`).emit('vitals_updated', data);
    }
  });
  nurseSocket.on('appointment_status_updated', (data) => {
    io.to(`hospital_${data.hospitalId}`).emit('appointment_status_updated', data);
  });
};
connectNurseSocket();

const notifyNurse = (data) => {
  if (nurseSocket?.connected) {
    nurseSocket.emit('queue_update', { source: 'patient_portal', ...data });
  }
};

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ────────────────────────────────────────────────────────────
// AUTH ROUTES
// ────────────────────────────────────────────────────────────
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);
app.post('/api/auth/send-otp', sendOtp);
app.post('/api/auth/verify-otp', verifyOtp);
app.put('/api/auth/change-password', protect, changePassword);

// ────────────────────────────────────────────────────────────
// PROFILE ROUTES
// ────────────────────────────────────────────────────────────
app.get('/api/profile', protect, getProfile);
app.put('/api/profile', protect, updateProfile);

// ────────────────────────────────────────────────────────────
// HOSPITAL DISCOVERY (for registration)
// ────────────────────────────────────────────────────────────
app.get('/api/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'city', 'state', 'phone', 'logo_url'],
    });
    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// DOCTOR ROUTES (for booking)
// ────────────────────────────────────────────────────────────
app.get('/api/doctors', protect, async (req, res) => {
  try {
    const { department } = req.query;
    const where = { hospital_id: req.hospitalId, role: 'DOCTOR', status: 'Active' };
    if (department) where.department = department;

    const doctors = await User.findAll({
      where,
      attributes: ['id', 'name', 'department', 'specialization', 'experience', 'qualification', 'profile_image', 'availability_status', 'employee_id'],
      order: [['name', 'ASC']],
    });

    const mapped = doctors.map(d => ({
      id: d.id,
      _id: d.id,
      docId: d.employee_id,
      name: d.name,
      department: d.department,
      specialization: d.specialization,
      experience: d.experience ? `${d.experience} Years` : 'N/A',
      qualification: d.qualification,
      avatar: d.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${d.name}`,
      availability: d.availability_status || 'Available',
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// APPOINTMENT ROUTES
// ────────────────────────────────────────────────────────────

// GET /api/appointments (patient's own)
app.get('/api/appointments', protect, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image'] }],
      order: [['date_time', 'DESC']],
    });

    const mapped = appointments.map(a => ({
      _id: a.id,
      apptId: `APT${String(a.id).padStart(4, '0')}`,
      doctor: a.doctor?.name ? `Dr. ${a.doctor.name}` : 'Doctor',
      department: a.department,
      dateTime: a.date_time ? new Date(a.date_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      tokenNumber: a.token_number,
      status: a.status === 'Completed' ? 'Completed' : a.status === 'Cancelled' ? 'Cancelled' : 'Upcoming',
      rawStatus: a.status,
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/appointments (with filters + pagination)
app.get('/api/patient/appointments', protect, async (req, res) => {
  try {
    const { search, department, status, startDate, endDate, page = 1, limit = 5 } = req.query;
    const where = { hospital_id: req.hospitalId, patient_id: req.user.id };

    if (department) where.department = department;
    if (status) {
      if (status.toLowerCase() === 'upcoming') where.status = { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] };
      else if (status.toLowerCase() === 'completed') where.status = 'Completed';
      else if (status.toLowerCase() === 'cancelled') where.status = 'Cancelled';
    }
    if (startDate || endDate) {
      where.date_time = {};
      if (startDate) where.date_time[Op.gte] = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.date_time[Op.lte] = e; }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image', 'qualification'] }],
      order: [['date_time', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    const mapped = rows.map(a => ({
      _id: a.id,
      appointmentId: `APT${String(a.id).padStart(4, '0')}`,
      doctorName: a.doctor ? `Dr. ${a.doctor.name}` : 'Doctor',
      doctorAvatar: a.doctor?.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${a.doctor?.name}`,
      department: a.department,
      appointmentDate: a.date_time ? new Date(a.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      appointmentTime: a.date_time ? new Date(a.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      tokenNumber: a.token_number,
      reason: a.reason || 'Routine checkup',
      status: a.status === 'Completed' ? 'Completed' : a.status === 'Cancelled' ? 'Cancelled' : 'Upcoming',
      rawStatus: a.status,
      createdAt: a.created_at,
    }));

    res.json({
      success: true,
      appointments: mapped,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) || 1 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/appointments/:id
app.get('/api/patient/appointments/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId, patient_id: req.user.id },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'qualification', 'profile_image'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({
      appointment: {
        _id: appt.id,
        appointmentId: `APT${String(appt.id).padStart(4, '0')}`,
        department: appt.department,
        appointmentDate: appt.date_time ? new Date(appt.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        appointmentTime: appt.date_time ? new Date(appt.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
        tokenNumber: appt.token_number,
        status: appt.status === 'Completed' ? 'Completed' : appt.status === 'Cancelled' ? 'Cancelled' : 'Upcoming',
        rawStatus: appt.status,
        createdAt: appt.created_at,
      },
      doctor: {
        _id: appt.doctor?.id,
        name: appt.doctor ? `Dr. ${appt.doctor.name}` : 'Doctor',
        avatar: appt.doctor?.profile_image,
        qualification: appt.doctor?.qualification || 'MD',
        specialization: appt.doctor?.specialization || appt.department,
        department: appt.department,
      },
      patient: { name: req.user.full_name, phone: req.user.phone, gender: req.user.gender },
      visit: {
        reasonForVisit: appt.reason || 'Routine Consultation',
        vitals: appt.vitals ? {
          bp: appt.vitals.blood_pressure,
          pulse: appt.vitals.pulse,
          temp: appt.vitals.temperature,
          weight: appt.vitals.weight,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/appointments (book)
app.post('/api/appointments', protect, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { doctorId, doctor_id, department, dateTime, reason, notes } = req.body;
    const resolvedDoctorId = doctorId || doctor_id;

    const doctor = await User.findOne({
      where: { id: resolvedDoctorId, hospital_id: req.hospitalId, role: 'DOCTOR' },
    });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const appointmentDateTime = new Date(dateTime);

    // Auto token number for the day
    const dayStart = new Date(appointmentDateTime); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(appointmentDateTime); dayEnd.setHours(23, 59, 59, 999);
    const tokenCount = await Appointment.count({
      where: { hospital_id: req.hospitalId, doctor_id: resolvedDoctorId, date_time: { [Op.between]: [dayStart, dayEnd] } },
      transaction: t,
    });
    const tokenNumber = tokenCount + 1;

    const appointment = await Appointment.create({
      hospital_id: req.hospitalId,
      patient_id: req.user.id,
      doctor_id: resolvedDoctorId,
      department: department || doctor.department,
      date_time: appointmentDateTime,
      token_number: tokenNumber,
      reason: reason || 'Online Booking',
      notes: notes || '',
      visit_type: 'New',
      booked_by: 'PATIENT',
      status: 'Confirmed',
    }, { transaction: t });

    await Token.create({
      hospital_id: req.hospitalId,
      appointment_id: appointment.id,
      patient_id: req.user.id,
      doctor_id: resolvedDoctorId,
      token_number: tokenNumber,
      token_date: appointmentDateTime.toISOString().split('T')[0],
      status: 'Waiting',
    }, { transaction: t });

    // Create notification
    await Notification.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctor.name} is confirmed for Token #${tokenNumber}.`,
      type: 'appointment',
      priority: 'medium',
      metadata: { appointmentId: appointment.id, doctorId: resolvedDoctorId },
    }, { transaction: t });

    await t.commit();

    // Notify nurse dashboard
    notifyNurse({ type: 'new_appointment', appointmentId: appointment.id, department, tokenNumber });

    // Socket events
    io.to(`patient_${req.user.id}`).emit('appointment_confirmed', { appointmentId: appointment.id, tokenNumber, doctorName: doctor.name });
    io.to(`hospital_${req.hospitalId}`).emit('new_appointment', { appointmentId: appointment.id, tokenNumber });

    res.status(201).json({
      success: true,
      appointment: { _id: appointment.id, id: `APT${String(appointment.id).padStart(4, '0')}`, doctor: `Dr. ${doctor.name}`, dateTime },
      token: { _id: appointment.id, number: tokenNumber, department: `${department} - OPD`, status: 'Registration', doctor: `Dr. ${doctor.name}` },
    });
  } catch (error) {
    await t.rollback();
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/appointments/:id/reschedule
app.put('/api/appointments/:id/reschedule', protect, async (req, res) => {
  try {
    const { dateTime } = req.body;
    const appt = await Appointment.findOne({
      where: { id: req.params.id, patient_id: req.user.id, hospital_id: req.hospitalId },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    await appt.update({ date_time: new Date(dateTime), status: 'Confirmed' });

    await Notification.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${appt.doctor?.name} has been rescheduled.`,
      type: 'appointment',
      priority: 'medium',
    });

    io.to(`patient_${req.user.id}`).emit('appointment_rescheduled', { appointmentId: appt.id });
    io.to(`hospital_${req.hospitalId}`).emit('appointment_rescheduled', { appointmentId: appt.id });

    res.json({ success: true, message: 'Appointment rescheduled successfully', appointment: appt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/appointments/:id/cancel
app.put('/api/appointments/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const appt = await Appointment.findOne({
      where: { id: req.params.id, patient_id: req.user.id, hospital_id: req.hospitalId },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
    });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appt.status === 'Cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });

    await appt.update({ status: 'Cancelled', notes: `Cancelled: ${reason || 'Patient request'}` });
    await Token.update({ status: 'Cancelled' }, { where: { appointment_id: appt.id } });

    await Notification.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${appt.doctor?.name} has been cancelled.`,
      type: 'appointment',
      priority: 'medium',
    });

    io.to(`patient_${req.user.id}`).emit('appointment_cancelled', { appointmentId: appt.id, reason });
    io.to(`hospital_${req.hospitalId}`).emit('appointment_cancelled', { appointmentId: appt.id });

    res.json({ success: true, message: 'Appointment cancelled successfully', appointment: appt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/appointments/:id
app.delete('/api/appointments/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findOne({ where: { id: req.params.id, patient_id: req.user.id } });
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    await appt.destroy();
    io.to(`patient_${req.user.id}`).emit('appointment_deleted', { appointmentId: req.params.id });
    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// TOKEN ROUTES
// ────────────────────────────────────────────────────────────
app.get('/api/token/current', protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    let appt = await Appointment.findOne({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id, date_time: { [Op.between]: [today, todayEnd] }, status: { [Op.ne]: 'Cancelled' } },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }, { model: Vitals, as: 'vitals', required: false }],
      order: [['updated_at', 'DESC']],
    });

    if (!appt) {
      appt = await Appointment.findOne({
        where: { hospital_id: req.hospitalId, patient_id: req.user.id, date_time: { [Op.gt]: todayEnd }, status: { [Op.notIn]: ['Cancelled', 'Completed'] } },
        include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
        order: [['date_time', 'ASC']],
      });
    }

    if (!appt) return res.json(null);

    const statusMap = {
      'Pending': 'Registration', 'Confirmed': 'Registration',
      'In-Progress': 'Consultation', 'Completed': 'Completed',
      'Cancelled': 'Cancelled',
    };

    // Queue position
    const apptDay = new Date(appt.date_time); apptDay.setHours(0, 0, 0, 0);
    const apptDayEnd = new Date(appt.date_time); apptDayEnd.setHours(23, 59, 59, 999);
    const countAhead = await Appointment.count({
      where: {
        hospital_id: req.hospitalId,
        doctor_id: appt.doctor_id,
        date_time: { [Op.between]: [apptDay, apptDayEnd] },
        token_number: { [Op.lt]: appt.token_number },
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] },
      },
    });

    res.json({
      _id: appt.id,
      number: appt.token_number,
      department: `${appt.department} - OPD`,
      estimatedWaitMinutes: Math.max(5, countAhead * 15),
      peopleAhead: countAhead,
      status: statusMap[appt.status] || 'Registration',
      appointmentTime: appt.date_time ? new Date(appt.date_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      doctor: appt.doctor ? `Dr. ${appt.doctor.name}` : 'Doctor',
      isCompleted: appt.status === 'Completed',
      vitals: appt.vitals || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/token/past', protect, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id, status: 'Completed' },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }],
      order: [['date_time', 'DESC']],
    });
    const pastTokens = appointments.map(a => ({
      _id: a.id, number: a.token_number,
      department: `${a.department} - OPD`,
      date: a.date_time ? new Date(a.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      doctor: a.doctor ? `Dr. ${a.doctor.name}` : 'Doctor',
      status: 'Completed',
    }));
    res.json(pastTokens);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ────────────────────────────────────────────────────────────
app.get('/api/prescriptions', protect, async (req, res) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
        { model: PrescriptionMedicine, as: 'medicines' },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// MEDICAL REPORTS
// ────────────────────────────────────────────────────────────
app.get('/api/reports', protect, async (req, res) => {
  try {
    const reports = await Report.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id, is_deleted: false },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reports/:id/download', protect, async (req, res) => {
  try {
    const report = await Report.findOne({
      where: { id: req.params.id, patient_id: req.user.id, is_deleted: false },
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (report.s3_key) {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: report.s3_key }), { expiresIn: 3600 });
      return res.json({ success: true, download_url: url, expires_in: 3600 });
    }

    if (report.file_url) {
      return res.json({ success: true, download_url: report.file_url });
    }

    res.status(404).json({ success: false, message: 'File not available' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// VITALS HISTORY
// ────────────────────────────────────────────────────────────
// GET /api/vitals/latest — most recent vitals record
app.get('/api/vitals/latest', protect, async (req, res) => {
  try {
    const vitals = await Vitals.findOne({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id },
      order: [['recorded_at', 'DESC']],
    });
    res.json({ success: true, data: vitals || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/vitals', protect, async (req, res) => {
  try {
    const vitals = await Vitals.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id },
      order: [['recorded_at', 'DESC']],
      limit: 20,
    });
    res.json({ success: true, data: vitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────────────────────
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { hospital_id: req.hospitalId, user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { id: req.params.id, user_id: req.user.id } }
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { user_id: req.user.id, status: 'unread' } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// MEDICAL HISTORY (past completed appointments)
// ────────────────────────────────────────────────────────────
app.get('/api/history', protect, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id, status: 'Completed' },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image'] }],
      order: [['date_time', 'DESC']],
      limit: 50,
    });

    const history = appointments.map(a => ({
      _id: a.id,
      visitId: `VIS${String(a.id).padStart(4, '0')}`,
      doctorName: a.doctor ? `Dr. ${a.doctor.name}` : 'Doctor',
      doctorAvatar: a.doctor?.profile_image || null,
      department: a.department,
      specialization: a.doctor?.specialization || a.department,
      date: a.date_time ? new Date(a.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      time: a.date_time ? new Date(a.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      diagnosis: a.reason || 'Routine Consultation',
      status: 'Completed',
      tokenNumber: a.token_number,
    }));

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// PHARMACY ORDERS
// ────────────────────────────────────────────────────────────
app.get('/api/pharmacy/orders', protect, async (req, res) => {
  try {
    const orders = await PharmacyOrder.findAll({
      where: { hospital_id: req.hospitalId, patient_id: req.user.id },
      include: [{ model: Prescription, as: 'prescription', required: false }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CarePlus Patient API v2.0',
    database: 'MySQL (AWS RDS)',
    timestamp: new Date(),
  });
});

// ── 404 / Error ─────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

// ── Start ────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   CarePlus Patient API v2.0');
    console.log('================================');
    console.log(`✅ Port       : ${PORT}`);
    console.log(`✅ DB         : ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log(`✅ Client URL : ${process.env.CLIENT_URL}`);
    console.log('================================\n');
  });
};

startServer();

module.exports = app;
