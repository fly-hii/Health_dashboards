const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/database');

dotenv.config();

const {
  login, getDashboardStatsV2, getDashboardSchedule, getDashboardChart, getPatients, getPatientQueue, getPatientById, getPatientHistoryV2,
  getPatientReports, getConsultationByAppointmentId, startConsultation, saveConsultationNotes,
  savePrescription, completeConsultation, getTodayAppointments, getPrescriptions,
  getNotifications, markNotificationRead, getDoctorProfile, updateDoctorProfile, changeDoctorPassword,
} = require('./controllers/doctorController');

const { getMedicalRecords, getMedicalRecordById, getPatientMedicalRecords } = require('./controllers/medicalRecordController');
const { getReportsV3, getReportDetailsV3, uploadReportV3, deleteReportV3, downloadReportV3, upload } = require('./controllers/reportController');
const { protect, authorizeDoctor, tenantMiddleware } = require('./middleware/authMiddleware');

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

// ── Auth ────────────────────────────────────────────────────
app.post('/api/auth/login', login);

// ── Doctor Dashboard ────────────────────────────────────────
app.get('/api/doctor/dashboard/stats', protect, authorizeDoctor, tenantMiddleware, getDashboardStatsV2);
app.get('/api/doctor/dashboard/schedule', protect, authorizeDoctor, tenantMiddleware, getDashboardSchedule);
app.get('/api/doctor/dashboard/chart', protect, authorizeDoctor, tenantMiddleware, getDashboardChart);
app.get('/api/doctor/patients', protect, authorizeDoctor, tenantMiddleware, getPatients);
app.get('/api/doctor/queue', protect, authorizeDoctor, tenantMiddleware, getPatientQueue);
app.get('/api/doctor/appointments/today', protect, authorizeDoctor, tenantMiddleware, getTodayAppointments);
app.get('/api/doctor/prescriptions', protect, authorizeDoctor, tenantMiddleware, getPrescriptions);
app.get('/api/doctor/notifications', protect, authorizeDoctor, tenantMiddleware, getNotifications);
app.put('/api/doctor/notifications/:id/read', protect, authorizeDoctor, tenantMiddleware, markNotificationRead);

// ── Medical Records ──────────────────────────────────────────
app.get('/api/medical-records', protect, authorizeDoctor, tenantMiddleware, getMedicalRecords);
app.get('/api/medical-records/:id', protect, authorizeDoctor, tenantMiddleware, getMedicalRecordById);
app.get('/api/medical-records/patient/:patientId', protect, authorizeDoctor, tenantMiddleware, getPatientMedicalRecords);

// ── Doctor Profile ──────────────────────────────────────────
app.get('/api/doctors/profile', protect, authorizeDoctor, getDoctorProfile);
app.put('/api/doctors/profile', protect, authorizeDoctor, updateDoctorProfile);
app.put('/api/doctors/change-password', protect, authorizeDoctor, changeDoctorPassword);

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

io.on('connection', (socket) => {
  console.log(`🔌 Doctor socket connected: ${socket.id}`);

  socket.on('join_hospital', (hospitalId) => {
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
