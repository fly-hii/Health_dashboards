const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/database');
const path = require('path');
const fs = require('fs');

dotenv.config();

const {
  login, getDashboardStatsV2, getDashboardSchedule, getDashboardChart, getPatients, getPatientQueue, getPatientById, getPatientHistoryV2,
  getPatientReports, getConsultationByAppointmentId, startConsultation, saveConsultationNotes,
  savePrescription, completeConsultation, bookFollowUpAppointment, getTodayAppointments, getPrescriptions,
  getNotifications, markNotificationRead, getDoctorProfile, updateDoctorProfile, changeDoctorPassword,
  callPatient, uploadDoctorAvatar,
} = require('./controllers/doctorController');

const { getMedicalRecords, getMedicalRecordById, getPatientMedicalRecords } = require('./controllers/medicalRecordController');
const { getReportsV3, getReportDetailsV3, uploadReportV3, deleteReportV3, downloadReportV3, upload } = require('./controllers/reportController');
const { protect, authorizeDoctor, tenantMiddleware } = require('./middleware/authMiddleware');
const { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword, loginOtpStore } = require('./controllers/forgotPasswordController');
const { sendOtpEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5051;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5180',
  'https://health-dashboards-doctor-backend.vercel.app',
  'https://health-dashboards-doctor-frontend.vercel.app',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ── Auth ────────────────────────────────────────────────────
app.post('/api/auth/login', login);

// ── Login OTP (real email) ───────────────────────────────────
app.post('/api/auth/login-otp/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const { sharedSaasDb } = require('./services/databaseResolver');
    const { createModels } = require('./services/modelFactory');
    const { User } = createModels(sharedSaasDb);
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email address.' });

    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    loginOtpStore.set(email.toLowerCase(), { otp, expiresAt });

    try {
      await sendOtpEmail(user.email, user.name || 'Doctor', otp, 'Doctor Portal', 'login');
    } catch (emailErr) {
      console.error('Doctor login OTP email error:', emailErr.message);
    }

    res.json({ success: true, message: 'OTP sent to your registered email' });
  } catch (err) {
    console.error('Doctor login OTP send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// ── Forgot Password (OTP flow) ───────────────────────────────
app.post('/api/auth/forgot-password/send-otp',   sendForgotPasswordOtp);
app.post('/api/auth/forgot-password/verify-otp', verifyForgotPasswordOtp);
app.post('/api/auth/forgot-password/reset',      resetForgotPassword);

// ── Doctor Dashboard ────────────────────────────────────────
app.get('/api/doctor/dashboard/stats', protect, authorizeDoctor, tenantMiddleware, getDashboardStatsV2);
app.get('/api/doctor/dashboard/schedule', protect, authorizeDoctor, tenantMiddleware, getDashboardSchedule);
app.get('/api/doctor/dashboard/chart', protect, authorizeDoctor, tenantMiddleware, getDashboardChart);
app.get('/api/doctor/patients', protect, authorizeDoctor, tenantMiddleware, getPatients);
app.get('/api/doctor/queue', protect, authorizeDoctor, tenantMiddleware, getPatientQueue);
app.get('/api/doctor/appointments/today', protect, authorizeDoctor, tenantMiddleware, getTodayAppointments);
app.post('/api/doctor/appointments', protect, authorizeDoctor, tenantMiddleware, bookFollowUpAppointment);
app.get('/api/doctor/prescriptions', protect, authorizeDoctor, tenantMiddleware, getPrescriptions);
app.get('/api/doctor/notifications', protect, authorizeDoctor, tenantMiddleware, getNotifications);
app.put('/api/doctor/notifications/:id/read', protect, authorizeDoctor, tenantMiddleware, markNotificationRead);
app.put('/api/doctor/appointment/:id/call', protect, authorizeDoctor, tenantMiddleware, callPatient);

// ── Medical Records ──────────────────────────────────────────
app.get('/api/medical-records', protect, authorizeDoctor, tenantMiddleware, getMedicalRecords);
app.get('/api/medical-records/:id', protect, authorizeDoctor, tenantMiddleware, getMedicalRecordById);
app.get('/api/medical-records/patient/:patientId', protect, authorizeDoctor, tenantMiddleware, getPatientMedicalRecords);

// ── Doctor Profile ──────────────────────────────────────────
app.get('/api/doctors/profile', protect, authorizeDoctor, getDoctorProfile);
app.put('/api/doctors/profile', protect, authorizeDoctor, updateDoctorProfile);
app.put('/api/doctors/change-password', protect, authorizeDoctor, changeDoctorPassword);
app.post('/api/doctors/upload-avatar', protect, authorizeDoctor, upload.single('avatar'), uploadDoctorAvatar);

// ── Patient Data ────────────────────────────────────────────
app.get('/api/patients/:id', protect, authorizeDoctor, tenantMiddleware, getPatientById);
app.get('/api/patients/:id/history', protect, authorizeDoctor, tenantMiddleware, getPatientHistoryV2);
app.get('/api/patients/:id/reports', protect, authorizeDoctor, tenantMiddleware, getPatientReports);

// ── Consultations ───────────────────────────────────────────
app.get('/api/consultations/:appointmentId', protect, authorizeDoctor, tenantMiddleware, getConsultationByAppointmentId);
app.patch('/api/consultations/:id/start', protect, authorizeDoctor, tenantMiddleware, startConsultation);
app.patch('/api/consultations/:id/notes', protect, authorizeDoctor, tenantMiddleware, saveConsultationNotes);
app.post('/api/consultations/:id/prescription', protect, authorizeDoctor, tenantMiddleware, savePrescription);
app.patch('/api/consultations/:id/complete', protect, authorizeDoctor, tenantMiddleware, completeConsultation);

// ── Reports (S3) ────────────────────────────────────────────
app.get('/api/reports', protect, authorizeDoctor, tenantMiddleware, getReportsV3);
app.get('/api/reports/:id', protect, authorizeDoctor, tenantMiddleware, getReportDetailsV3);
app.post('/api/reports/upload', protect, authorizeDoctor, tenantMiddleware, upload.single('file'), uploadReportV3);
app.delete('/api/reports/:id', protect, authorizeDoctor, tenantMiddleware, deleteReportV3);
app.get('/api/reports/download/:id', protect, authorizeDoctor, tenantMiddleware, downloadReportV3);

// ── Health ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'CarePlus Doctor API v2.0', database: 'MySQL (AWS RDS)', timestamp: new Date() });
});

// ── 404 / Error ─────────────────────────────────────────────
app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

// ── Socket.IO with tenant rooms ─────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
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

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: no token provided'));
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, hospitalId, role }
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Doctor socket connected: ${socket.id} (hospital ${socket.user?.hospitalId})`);

  socket.on('join_hospital', (hospitalId) => {
    // Only allow joining the room that matches the authenticated token
    if (parseInt(hospitalId) !== parseInt(socket.user?.hospitalId)) {
      console.warn(`⚠️  Doctor socket ${socket.id} attempted to join hospital_${hospitalId} but token has hospitalId=${socket.user?.hospitalId}`);
      return;
    }
    socket.join(`hospital_${hospitalId}`);
    console.log(`🏥 Doctor socket joined hospital_${hospitalId}`);
  });

  socket.on('join_room', (doctorId) => {
    socket.join(doctorId);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Doctor socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   CarePlus Doctor API v2.0');
    console.log('================================');
    console.log(`✅ Port       : ${PORT}`);
    console.log(`✅ DB         : ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log('================================\n');
  });
};

startServer();

module.exports = app;
