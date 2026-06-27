const express = require('express');
const { fn, col, where: seqWhere } = require('sequelize');
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
const { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetForgotPassword } = require('./controllers/forgotPasswordController');


const app = express();
const PORT = process.env.PORT || 5050;

// ── HTTP Server & Socket.IO ─────────────────────────────────
const server = http.createServer(app);

// Build allowed origins from env — no hardcoded URLs
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
].filter(Boolean);


const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
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
  console.log(`🔌 Patient socket: ${socket.id} (hospital ${socket.user?.hospitalId})`);

  // Patient joins their own room — only allow the room matching their token id
  socket.on('join', (patientId) => {
    if (parseInt(patientId) !== parseInt(socket.user?.id)) {
      console.warn(`⚠️  Patient socket ${socket.id} attempted join patient_${patientId} but token id=${socket.user?.id}`);
      return;
    }
    socket.join(`patient_${patientId}`);
    console.log(`🔌 Patient socket: ${socket.id} joined patient_${patientId}`);
  });
  socket.on('join_patient', (patientId) => {
    if (parseInt(patientId) !== parseInt(socket.user?.id)) {
      console.warn(`⚠️  Patient socket ${socket.id} attempted join_patient patient_${patientId} but token id=${socket.user?.id}`);
      return;
    }
    socket.join(`patient_${patientId}`);
    console.log(`🔌 Patient socket: ${socket.id} joined patient_${patientId} via join_patient`);
  });
  socket.on('join_hospital', (hospitalId) => {
    if (parseInt(hospitalId) !== parseInt(socket.user?.hospitalId)) {
      console.warn(`⚠️  Patient socket ${socket.id} attempted join hospital_${hospitalId} but token hospitalId=${socket.user?.hospitalId}`);
      return;
    }
    socket.join(`hospital_${hospitalId}`);
    console.log(`🏥 Patient socket: ${socket.id} joined hospital_${hospitalId}`);
  });
  socket.on('disconnect', () => {
    console.log(`🔌 Patient socket disconnected: ${socket.id}`);
  });
});
app.set('io', io);

const NURSE_SOCKET_URL = process.env.NURSE_SOCKET_URL;
// Disable nurse relay only when the URL is missing or still pointing at a Vercel serverless URL
// (Vercel doesn't support persistent sockets; Render does)
const nurseSocketDisabled = !NURSE_SOCKET_URL || 
  (NURSE_SOCKET_URL.includes('vercel.app') && !NURSE_SOCKET_URL.includes('onrender.com'));
if (nurseSocketDisabled) {
  console.warn('⚠️  NURSE_SOCKET_URL not set or is a Vercel URL — real-time nurse relay disabled.');
}
let nurseSocket = null;

// Dynamically generate service token with SYSTEM role for service-to-service auth
const getServiceToken = () => {
  if (process.env.NURSE_SERVICE_TOKEN) return process.env.NURSE_SERVICE_TOKEN;
  if (process.env.JWT_SERVICE_TOKEN) return process.env.JWT_SERVICE_TOKEN;
  
  try {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 0, hospitalId: 0, role: 'SYSTEM' },
      process.env.JWT_SECRET || 'careplus_hospital_jwt_secret_2026_change_this',
      { expiresIn: '365d' }
    );
  } catch (err) {
    console.error('Failed to sign service token:', err.message);
    return '';
  }
};

const connectNurseSocket = () => {
  nurseSocket = ioClient(NURSE_SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: Infinity,
    // Service-to-service token so the nurse backend's JWT middleware accepts the relay connection
    auth: { token: getServiceToken() },
  });
  nurseSocket.on('connect', () => console.log('✅ Patient relay → Nurse socket connected'));
  nurseSocket.on('connect_error', () => { /* silent */ });

  // Forward vitals updates to patient's room
  nurseSocket.on('vitals_recorded', (data) => {
    if (data.patientId) {
      io.to(`patient_${data.patientId}`).emit('VITALS_UPDATED', data);
    }
  });
  nurseSocket.on('appointment_status_updated', (data) => {
    io.to(`hospital_${data.hospitalId}`).emit('appointment_status_updated', data);
  });
};
if (!nurseSocketDisabled) connectNurseSocket();

const notifyNurse = (data) => {
  if (nurseSocket?.connected) {
    nurseSocket.emit('queue_update', { source: 'patient_portal', ...data });
  }
};

// ── Middleware ──────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// ────────────────────────────────────────────────────────────
// AUTH ROUTES
// ────────────────────────────────────────────────────────────
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);
app.post('/api/auth/send-otp', sendOtp);
app.post('/api/auth/verify-otp', verifyOtp);
app.put('/api/auth/change-password', protect, changePassword);

// OTP-based forgot password (public endpoints)
app.post('/api/auth/forgot-password/send-otp', sendForgotPasswordOtp);
app.post('/api/auth/forgot-password/verify-otp', verifyForgotPasswordOtp);
app.post('/api/auth/forgot-password/reset', resetForgotPassword);


// ────────────────────────────────────────────────────────────
// PROFILE ROUTES
// ────────────────────────────────────────────────────────────
app.get('/api/profile', protect, getProfile);
app.put('/api/profile', protect, updateProfile);

// ────────────────────────────────────────────────────────────
// LOCATION & HOSPITAL DISCOVERY
// All endpoints below are public (no auth needed for browsing).
// Department/Doctor reads use getHospitalConnection so only that
// hospital's tenant DB is accessed — no cross-tenant data leak.
// ────────────────────────────────────────────────────────────

// GET /api/locations — distinct cities with active/trial hospitals from master registry
app.get('/api/locations', async (req, res) => {
  try {
    const { masterDb } = require('./services/databaseResolver');
    const [rows] = await masterDb.query(
      "SELECT city, state FROM hospitals WHERE status IN ('active', 'trial')"
    );

    // Aggregate hospital count per city
    const cityMap = {};
    rows.forEach(h => {
      if (!h.city) return;
      const key = h.city.trim().toLowerCase();
      if (!cityMap[key]) {
        cityMap[key] = { city: h.city.trim(), state: h.state || '', hospitalCount: 0 };
      }
      cityMap[key].hospitalCount++;
    });

    const data = Object.values(cityMap).sort((a, b) => a.city.localeCompare(b.city));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hospitals?city=Mumbai — hospitals list from master registry (with optional city filter)
app.get('/api/hospitals', async (req, res) => {
  try {
    const { city } = req.query;
    const { masterDb } = require('./services/databaseResolver');

    let queryStr = "SELECT id, name, city, state, phone, logo_url, email, address, code FROM hospitals WHERE status IN ('active', 'trial')";
    const replacements = [];
    if (city) {
      queryStr += " AND LOWER(TRIM(city)) = LOWER(TRIM(?))";
      replacements.push(city);
    }
    queryStr += " ORDER BY name ASC";

    const [hospitals] = await masterDb.query(queryStr, { replacements });
    res.json({ success: true, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hospitals/:hospitalId/departments
// Protected: auth required. Reads the TARGET hospital's tenant DB.
app.get('/api/hospitals/:hospitalId/departments', protect, async (req, res) => {
  try {
    const targetId = parseInt(req.params.hospitalId);
    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid hospital ID' });
    }

    const { getHospitalConnection } = require('./services/databaseResolver');
    const db = await getHospitalConnection(targetId);

    // Fetch all active departments created in admin dashboard
    const [dbDepts] = await db.query(
      `SELECT id, name FROM departments WHERE hospital_id = ? AND status = 'active' ORDER BY name ASC`,
      { replacements: [targetId] }
    );

    if (dbDepts.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // For each department, count active doctors whose department OR specialization matches
    const data = [];
    for (const dept of dbDepts) {
      const deptNameLower = dept.name.trim().toLowerCase();
      const [countRows] = await db.query(
        `SELECT COUNT(*) as cnt FROM users 
         WHERE hospital_id = ? 
           AND role = 'DOCTOR' 
           AND status = 'Active'
           AND (
             LOWER(TRIM(department)) = ?
             OR LOWER(TRIM(department)) LIKE ?
             OR LOWER(TRIM(specialization)) LIKE ?
           )`,
        { replacements: [targetId, deptNameLower, `%${deptNameLower}%`, `%${deptNameLower}%`] }
      );
      data.push({
        name: dept.name.trim(),
        doctorCount: parseInt(countRows[0].cnt) || 0,
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[departments route error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// GET /api/hospitals/:hospitalId/doctors?department=X
// Protected: auth required. Reads the TARGET hospital's tenant DB.
app.get('/api/hospitals/:hospitalId/doctors', protect, async (req, res) => {
  try {
    const targetId = parseInt(req.params.hospitalId);
    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid hospital ID' });
    }

    const { getHospitalConnection } = require('./services/databaseResolver');
    const { createModels } = require('./services/modelFactory');
    const db = await getHospitalConnection(targetId);
    const models = createModels(db);

    const { department } = req.query;
    const where = { hospital_id: targetId, role: 'DOCTOR', status: 'Active' };
    // Match doctors by department OR specialization (both case-insensitive, partial match).
    // This handles doctors who have no department set but have a matching specialization
    // e.g. department="cardiology" will match specialization="Cardiologist".
    if (department) {
      const deptLower = department.trim().toLowerCase();
      where[Op.and] = [
        {
          [Op.or]: [
            seqWhere(fn('LOWER', col('department')), deptLower),
            seqWhere(fn('LOWER', col('department')), { [Op.like]: `%${deptLower}%` }),
            seqWhere(fn('LOWER', col('specialization')), { [Op.like]: `%${deptLower}%` }),
          ]
        }
      ];
    }

    // Auto-update availability_status to 'Busy' if inactive for > 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await models.User.update(
      { availability_status: 'Busy' },
      {
        where: {
          hospital_id: targetId,
          role: 'DOCTOR',
          availability_status: 'Available',
          [Op.or]: [
            { last_login: { [Op.lt]: twoHoursAgo } },
            { last_login: null }
          ]
        }
      }
    ).catch(err => console.error('[Auto Availability Expiry Error in hospitals/doctors]', err));

    const rows = await models.User.findAll({
      where,
      attributes: ['id', 'name', 'department', 'specialization', 'experience', 'qualification', 'profile_image', 'availability_status', 'employee_id'],
      order: [['name', 'ASC']],
    });

    const data = rows.map(d => ({
      id: d.id,
      name: d.name,
      department: d.department,
      specialization: d.specialization || d.department,
      experience: d.experience ? `${d.experience} Years` : 'N/A',
      qualification: d.qualification || 'MBBS',
      avatar: d.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}&backgroundColor=b6e3f4`,
      availability: d.availability_status || 'Available',
    }));

    res.json({ success: true, data });
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

    // Auto-update availability_status to 'Busy' if inactive for > 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await req.models.User.update(
      { availability_status: 'Busy' },
      {
        where: {
          hospital_id: req.hospitalId,
          role: 'DOCTOR',
          availability_status: 'Available',
          [Op.or]: [
            { last_login: { [Op.lt]: twoHoursAgo } },
            { last_login: null }
          ]
        }
      }
    ).catch(err => console.error('[Auto Availability Expiry Error in doctors]', err));

    const doctors = await req.models.User.findAll({
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

// Helper to retrieve database connections and resolved patient IDs for the logged-in patient across all active/trial hospitals
async function getPatientConnectionsAcrossHospitals(email) {
  const { masterDb, getHospitalConnection } = require('./services/databaseResolver');
  const { createModels } = require('./services/modelFactory');

  const [hospitals] = await masterDb.query(
    "SELECT id, name FROM hospitals WHERE status IN ('active', 'trial')"
  );

  const results = [];
  for (const hosp of hospitals) {
    try {
      const db = await getHospitalConnection(hosp.id);
      const models = createModels(db);
      // Find patient by email in this hospital's DB
      const patient = await models.Patient.findOne({
        where: { email: email }
      });
      if (patient) {
        results.push({
          hospitalId: hosp.id,
          hospitalName: hosp.name,
          patientId: patient.id,
          db,
          models
        });
      }
    } catch (err) {
      console.error(`[Patient DB Resolver] Failed to check patient in hospital ${hosp.id}:`, err.message);
    }
  }
  return results;
}

// Helper to automatically mark past appointments (date_time < NOW) that are still Pending, Confirmed, or In-Progress as 'No-Show'
async function autoCancelPastAppointments(patientConns) {
  const now = new Date();
  for (const conn of patientConns) {
    try {
      const { Appointment, Token } = conn.models;
      const pastAppts = await Appointment.findAll({
        where: {
          hospital_id: conn.hospitalId,
          patient_id: conn.patientId,
          date_time: { [Op.lt]: now },
          status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] }
        }
      });

      if (pastAppts.length > 0) {
        const ids = pastAppts.map(a => a.id);
        await Appointment.update(
          { status: 'No-Show', notes: 'Auto-marked as No-Show: Appointment time passed.' },
          { where: { id: { [Op.in]: ids } } }
        );
        await Token.update(
          { status: 'Cancelled' },
          { where: { appointment_id: { [Op.in]: ids } } }
        );
      }
    } catch (err) {
      console.error(`[Auto-Cancel] Error in hospital ${conn.hospitalId}:`, err.message);
    }
  }
}

// ────────────────────────────────────────────────────────────
// APPOINTMENT ROUTES
// ────────────────────────────────────────────────────────────

// GET /api/appointments (patient's own)
app.get('/api/appointments', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    await autoCancelPastAppointments(patientConns);
    const allAppointments = [];

    for (const conn of patientConns) {
      const appointments = await conn.models.Appointment.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId },
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image'] }],
        order: [['date_time', 'DESC']],
      });

      const mapped = appointments.map(a => ({
        _id: a.id,
        apptId: `APT${String(a.id).padStart(4, '0')}`,
        doctor: a.doctor?.name ? `Dr. ${a.doctor.name}` : 'Doctor',
        department: a.department,
        dateTime: a.date_time ? new Date(a.date_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        tokenNumber: a.token_number,
        status: a.status === 'Completed' ? 'Completed' : (a.status === 'Cancelled' || a.status === 'No-Show') ? 'Cancelled' : 'Upcoming',
        rawStatus: a.status,
      }));

      allAppointments.push(...mapped);
    }

    // Sort all by dateTime descending
    allAppointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

    res.json(allAppointments);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/appointments (with filters + pagination)
app.get('/api/patient/appointments', protect, async (req, res) => {
  try {
    const { search, department, status, startDate, endDate, page = 1, limit = 5 } = req.query;

    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    await autoCancelPastAppointments(patientConns);
    const allRows = [];

    for (const conn of patientConns) {
      const where = { hospital_id: conn.hospitalId, patient_id: conn.patientId };

      if (department) where.department = department;
      if (status) {
        if (status.toLowerCase() === 'upcoming') where.status = { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] };
        else if (status.toLowerCase() === 'completed') where.status = 'Completed';
        else if (status.toLowerCase() === 'cancelled') where.status = { [Op.in]: ['Cancelled', 'No-Show'] };
      }
      if (startDate || endDate) {
        where.date_time = {};
        if (startDate) where.date_time[Op.gte] = new Date(startDate);
        if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.date_time[Op.lte] = e; }
      }

      const rows = await conn.models.Appointment.findAll({
        where,
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image', 'qualification'] }],
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
        status: a.status === 'Completed' ? 'Completed' : (a.status === 'Cancelled' || a.status === 'No-Show') ? 'Cancelled' : 'Upcoming',
        rawStatus: a.status,
        createdAt: a.created_at,
        hospitalId: conn.hospitalId,
        hospitalName: conn.hospitalName
      }));

      allRows.push(...mapped);
    }

    // Sort all rows by createdAt descending
    allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = allRows.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum) || 1;
    const offset = (pageNum - 1) * limitNum;
    const paginatedRows = allRows.slice(offset, offset + limitNum);

    res.json({
      success: true,
      appointments: paginatedRows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/appointments/:id
app.get('/api/patient/appointments/:id', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    await autoCancelPastAppointments(patientConns);
    let appt = null;
    let activeConn = null;

    for (const conn of patientConns) {
      appt = await conn.models.Appointment.findOne({
        where: { id: req.params.id, patient_id: conn.patientId },
        include: [
          { model: conn.models.User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'qualification', 'profile_image'] },
          { model: conn.models.Vitals, as: 'vitals', required: false },
        ],
      });
      if (appt) {
        activeConn = conn;
        break;
      }
    }

    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({
      appointment: {
        _id: appt.id,
        appointmentId: `APT${String(appt.id).padStart(4, '0')}`,
        department: appt.department,
        appointmentDate: appt.date_time ? new Date(appt.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        appointmentTime: appt.date_time ? new Date(appt.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
        tokenNumber: appt.token_number,
        status: appt.status === 'Completed' ? 'Completed' : (appt.status === 'Cancelled' || appt.status === 'No-Show') ? 'Cancelled' : 'Upcoming',
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
  const targetHospitalId = parseInt(req.body.hospitalId || req.body.hospital_id || req.hospitalId);
  const isCrossHospital = targetHospitalId !== req.hospitalId;

  // Resolve target database connection and models
  const { getHospitalConnection } = require('./services/databaseResolver');
  const { createModels } = require('./services/modelFactory');

  let dbConnection, models;
  try {
    dbConnection = await getHospitalConnection(targetHospitalId);
    models = createModels(dbConnection);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Failed to connect to target hospital: ${err.message}` });
  }

  const t = await dbConnection.transaction();
  try {
    const { doctorId, doctor_id, department, dateTime, reason, notes } = req.body;
    const resolvedDoctorId = doctorId || doctor_id;

    // 1. Resolve Patient in Target Hospital
    let targetPatientId = req.user.id;
    if (isCrossHospital) {
      let targetPatient = await models.Patient.findOne({
        where: { email: req.user.email },
        transaction: t,
      });

      if (!targetPatient) {
        // Generate patient ID for target hospital
        const today = new Date();
        const prefix = `PAT${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const last = await models.Patient.findOne({
          where: { patient_id: { [Op.like]: `${prefix}%` } },
          order: [['patient_id', 'DESC']],
          transaction: t,
        });
        const seq = last?.patient_id ? parseInt(last.patient_id.replace(prefix, '')) + 1 : 1;
        const patient_id = `${prefix}${String(seq).padStart(3, '0')}`;

        targetPatient = await models.Patient.create({
          hospital_id: targetHospitalId,
          patient_id,
          full_name: req.user.full_name,
          email: req.user.email,
          password: req.user.password, // Copied hashed password
          phone: req.user.phone,
          dob: req.user.dob,
          gender: req.user.gender,
          blood_group: req.user.blood_group,
          address: req.user.address,
          status: 'Active',
          is_portal_user: true,
        }, { transaction: t });
      }
      targetPatientId = targetPatient.id;
    }

    // 2. Resolve Doctor in Target Hospital
    const doctor = await models.User.findOne({
      where: { id: resolvedDoctorId, hospital_id: targetHospitalId, role: 'DOCTOR' },
      transaction: t,
    });
    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Doctor not found at the selected hospital' });
    }
    if (doctor.availability_status && doctor.availability_status !== 'Available') {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Dr. ${doctor.name} is currently ${doctor.availability_status.toLowerCase()} and cannot accept appointments.` });
    }

    const appointmentDateTime = new Date(dateTime);

    // Auto token number for the day
    const dayStart = new Date(appointmentDateTime); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(appointmentDateTime); dayEnd.setHours(23, 59, 59, 999);
    const tokenCount = await models.Appointment.count({
      where: { hospital_id: targetHospitalId, doctor_id: resolvedDoctorId, date_time: { [Op.between]: [dayStart, dayEnd] } },
      transaction: t,
    });
    const tokenNumber = tokenCount + 1;

    const appointment = await models.Appointment.create({
      hospital_id: targetHospitalId,
      patient_id: targetPatientId,
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

    await models.Token.create({
      hospital_id: targetHospitalId,
      appointment_id: appointment.id,
      patient_id: targetPatientId,
      doctor_id: resolvedDoctorId,
      token_number: tokenNumber,
      token_date: appointmentDateTime.toISOString().split('T')[0],
      status: 'Waiting',
    }, { transaction: t });

    // Create notification in target database
    await models.Notification.create({
      hospital_id: targetHospitalId,
      user_id: targetPatientId,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctor.name} is confirmed for Token #${tokenNumber}.`,
      type: 'appointment',
      priority: 'medium',
      metadata: { appointmentId: appointment.id, doctorId: resolvedDoctorId },
    }, { transaction: t });

    await t.commit();

    // Notify nurse dashboard
    notifyNurse({ type: 'new_appointment', appointmentId: appointment.id, department, tokenNumber });

    // Socket events (emit to target rooms)
    io.to(`patient_${req.user.id}`).emit('appointment_confirmed', { appointmentId: appointment.id, tokenNumber, doctorName: doctor.name });
    io.to(`hospital_${targetHospitalId}`).emit('new_appointment', { appointmentId: appointment.id, tokenNumber });

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
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let appt = null;
    let activeConn = null;

    for (const conn of patientConns) {
      appt = await conn.models.Appointment.findOne({
        where: { id: req.params.id, patient_id: conn.patientId, hospital_id: conn.hospitalId },
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] }],
      });
      if (appt) {
        activeConn = conn;
        break;
      }
    }
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    await appt.update({ date_time: new Date(dateTime), status: 'Confirmed' });

    await activeConn.models.Notification.create({
      hospital_id: activeConn.hospitalId,
      user_id: activeConn.patientId,
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${appt.doctor?.name} has been rescheduled.`,
      type: 'appointment',
      priority: 'medium',
    });

    io.to(`patient_${req.user.id}`).emit('appointment_rescheduled', { appointmentId: appt.id });
    io.to(`hospital_${activeConn.hospitalId}`).emit('appointment_rescheduled', { appointmentId: appt.id });

    res.json({ success: true, message: 'Appointment rescheduled successfully', appointment: appt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/appointments/:id/cancel
app.put('/api/appointments/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let appt = null;
    let activeConn = null;

    for (const conn of patientConns) {
      appt = await conn.models.Appointment.findOne({
        where: { id: req.params.id, patient_id: conn.patientId, hospital_id: conn.hospitalId },
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] }],
      });
      if (appt) {
        activeConn = conn;
        break;
      }
    }
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appt.status === 'Cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });

    await appt.update({ status: 'Cancelled', notes: `Cancelled: ${reason || 'Patient request'}` });
    await activeConn.models.Token.update({ status: 'Cancelled' }, { where: { appointment_id: appt.id } });

    await activeConn.models.Notification.create({
      hospital_id: activeConn.hospitalId,
      user_id: activeConn.patientId,
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${appt.doctor?.name} has been cancelled.`,
      type: 'appointment',
      priority: 'medium',
    });

    io.to(`patient_${req.user.id}`).emit('appointment_cancelled', { appointmentId: appt.id, reason });
    io.to(`hospital_${activeConn.hospitalId}`).emit('appointment_cancelled', { appointmentId: appt.id });

    res.json({ success: true, message: 'Appointment cancelled successfully', appointment: appt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/appointments/:id
app.delete('/api/appointments/:id', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let appt = null;
    let activeConn = null;

    for (const conn of patientConns) {
      appt = await conn.models.Appointment.findOne({ where: { id: req.params.id, patient_id: conn.patientId } });
      if (appt) {
        activeConn = conn;
        break;
      }
    }
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

    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    await autoCancelPastAppointments(patientConns);

    let activeAppt = null;
    let activeModels = null;
    let activeHospitalId = null;

    // 1. Look for today's appointment first
    for (const conn of patientConns) {
      const appt = await conn.models.Appointment.findOne({
        where: {
          hospital_id: conn.hospitalId,
          patient_id: conn.patientId,
          date_time: { [Op.between]: [today, todayEnd] },
          status: { [Op.notIn]: ['Cancelled', 'No-Show'] }
        },
        include: [
          { model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] },
          { model: conn.models.Vitals, as: 'vitals', required: false }
        ],
        order: [['updated_at', 'DESC']],
      });
      if (appt) {
        if (!activeAppt || appt.updated_at > activeAppt.updated_at) {
          activeAppt = appt;
          activeModels = conn.models;
          activeHospitalId = conn.hospitalId;
        }
      }
    }

    // 2. If no today's appointment, look for upcoming future appointments
    if (!activeAppt) {
      for (const conn of patientConns) {
        const appt = await conn.models.Appointment.findOne({
          where: {
            hospital_id: conn.hospitalId,
            patient_id: conn.patientId,
            date_time: { [Op.gt]: todayEnd },
            status: { [Op.notIn]: ['Cancelled', 'Completed', 'No-Show'] }
          },
          include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] }],
          order: [['date_time', 'ASC']],
        });
        if (appt) {
          if (!activeAppt || appt.date_time < activeAppt.date_time) {
            activeAppt = appt;
            activeModels = conn.models;
            activeHospitalId = conn.hospitalId;
          }
        }
      }
    }

    if (!activeAppt) return res.json(null);

    const statusMap = {
      'Pending': 'Registration', 'Confirmed': 'Registration',
      'In-Progress': 'Consultation', 'Completed': 'Completed',
      'Cancelled': 'Cancelled',
    };

    // Queue position
    const apptDay = new Date(activeAppt.date_time); apptDay.setHours(0, 0, 0, 0);
    const apptDayEnd = new Date(activeAppt.date_time); apptDayEnd.setHours(23, 59, 59, 999);
    const countAhead = await activeModels.Appointment.count({
      where: {
        hospital_id: activeHospitalId,
        doctor_id: activeAppt.doctor_id,
        date_time: { [Op.between]: [apptDay, apptDayEnd] },
        token_number: { [Op.lt]: activeAppt.token_number },
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] },
      },
    });

    res.json({
      _id: activeAppt.id,
      number: activeAppt.token_number,
      department: `${activeAppt.department} - OPD`,
      estimatedWaitMinutes: Math.max(5, countAhead * 15),
      peopleAhead: countAhead,
      status: statusMap[activeAppt.status] || 'Registration',
      appointmentTime: activeAppt.date_time ? new Date(activeAppt.date_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      doctor: activeAppt.doctor ? `Dr. ${activeAppt.doctor.name}` : 'Doctor',
      isCompleted: activeAppt.status === 'Completed',
      vitals: activeAppt.vitals || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/token/refresh — re-fetches current token state (called by patient frontend refresh button)
app.post('/api/token/refresh', protect, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    await autoCancelPastAppointments(patientConns);

    let activeAppt = null;
    let activeModels = null;
    let activeHospitalId = null;

    for (const conn of patientConns) {
      const appt = await conn.models.Appointment.findOne({
        where: {
          hospital_id: conn.hospitalId,
          patient_id: conn.patientId,
          date_time: { [Op.between]: [today, todayEnd] },
          status: { [Op.notIn]: ['Cancelled', 'No-Show'] }
        },
        include: [
          { model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] },
          { model: conn.models.Vitals, as: 'vitals', required: false }
        ],
        order: [['updated_at', 'DESC']],
      });
      if (appt) {
        if (!activeAppt || appt.updated_at > activeAppt.updated_at) {
          activeAppt = appt;
          activeModels = conn.models;
          activeHospitalId = conn.hospitalId;
        }
      }
    }

    if (!activeAppt) {
      for (const conn of patientConns) {
        const appt = await conn.models.Appointment.findOne({
          where: {
            hospital_id: conn.hospitalId,
            patient_id: conn.patientId,
            date_time: { [Op.gt]: todayEnd },
            status: { [Op.notIn]: ['Cancelled', 'Completed', 'No-Show'] }
          },
          include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] }],
          order: [['date_time', 'ASC']],
        });
        if (appt) {
          if (!activeAppt || appt.date_time < activeAppt.date_time) {
            activeAppt = appt;
            activeModels = conn.models;
            activeHospitalId = conn.hospitalId;
          }
        }
      }
    }

    if (!activeAppt) return res.json({ success: true, data: null });

    const statusMap = {
      'Pending': 'Registration', 'Confirmed': 'Registration',
      'In-Progress': 'Consultation', 'Completed': 'Completed', 'Cancelled': 'Cancelled',
    };

    const apptDay = new Date(activeAppt.date_time); apptDay.setHours(0, 0, 0, 0);
    const apptDayEnd = new Date(activeAppt.date_time); apptDayEnd.setHours(23, 59, 59, 999);
    const countAhead = await activeModels.Appointment.count({
      where: {
        hospital_id: activeHospitalId,
        doctor_id: activeAppt.doctor_id,
        date_time: { [Op.between]: [apptDay, apptDayEnd] },
        token_number: { [Op.lt]: activeAppt.token_number },
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] },
      },
    });

    res.json({
      success: true,
      data: {
        _id: activeAppt.id,
        number: activeAppt.token_number,
        department: `${activeAppt.department} - OPD`,
        estimatedWaitMinutes: Math.max(5, countAhead * 15),
        peopleAhead: countAhead,
        status: statusMap[activeAppt.status] || 'Registration',
        appointmentTime: activeAppt.date_time ? new Date(activeAppt.date_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        doctor: activeAppt.doctor ? `Dr. ${activeAppt.doctor.name}` : 'Doctor',
        isCompleted: activeAppt.status === 'Completed',
        vitals: activeAppt.vitals || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


app.get('/api/token/past', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allPastTokens = [];

    for (const conn of patientConns) {
      const appointments = await conn.models.Appointment.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId, status: 'Completed' },
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name'] }],
        order: [['date_time', 'DESC']],
      });
      const pastTokens = appointments.map(a => ({
        _id: a.id, number: a.token_number,
        department: `${a.department} - OPD`,
        date: a.date_time ? new Date(a.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        doctor: a.doctor ? `Dr. ${a.doctor.name}` : 'Doctor',
        status: 'Completed',
      }));
      allPastTokens.push(...pastTokens);
    }

    // Sort all past tokens by date descending
    allPastTokens.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(allPastTokens);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ────────────────────────────────────────────────────────────
app.get('/api/prescriptions', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allPrescriptions = [];

    for (const conn of patientConns) {
      const prescriptions = await conn.models.Prescription.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId },
        include: [
          { model: conn.models.User, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
          { model: conn.models.PrescriptionMedicine, as: 'medicines' },
        ],
        order: [['created_at', 'DESC']],
      });
      allPrescriptions.push(...prescriptions);
    }

    // Sort by created_at descending
    allPrescriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allPrescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// MEDICAL REPORTS
// ────────────────────────────────────────────────────────────
app.get('/api/reports', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allReports = [];

    for (const conn of patientConns) {
      const reports = await conn.models.Report.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId, is_deleted: false },
        order: [['created_at', 'DESC']],
      });
      allReports.push(...reports);
    }

    // Sort by created_at descending
    allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allReports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reports/:id/download', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let report = null;

    for (const conn of patientConns) {
      report = await conn.models.Report.findOne({
        where: { id: req.params.id, patient_id: conn.patientId, is_deleted: false },
      });
      if (report) break;
    }

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
const formatVitalsRecord = (vitalsInstance) => {
  if (!vitalsInstance) return null;
  const json = vitalsInstance.toJSON ? vitalsInstance.toJSON() : vitalsInstance;
  const bpParts = (json.blood_pressure || '').split('/');
  const systolic = bpParts[0] ? parseInt(bpParts[0], 10) : null;
  const diastolic = bpParts[1] ? parseInt(bpParts[1], 10) : null;

  return {
    ...json,
    recordedAt: json.recorded_at,
    pulseRate: json.pulse,
    bloodSugar: json.blood_sugar,
    bloodPressure: {
      systolic,
      diastolic,
    },
  };
};

app.get('/api/vitals/latest', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let latestVitals = null;

    for (const conn of patientConns) {
      const vitals = await conn.models.Vitals.findOne({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId },
        order: [['recorded_at', 'DESC']],
      });
      if (vitals) {
        if (!latestVitals || new Date(vitals.recorded_at) > new Date(latestVitals.recorded_at)) {
          latestVitals = vitals;
        }
      }
    }
    res.json({ success: true, data: formatVitalsRecord(latestVitals) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/vitals', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allVitals = [];

    for (const conn of patientConns) {
      const vitals = await conn.models.Vitals.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId },
        order: [['recorded_at', 'DESC']],
        limit: 20,
      });
      allVitals.push(...vitals);
    }

    // Sort and limit to 20 overall
    allVitals.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

    const formattedList = allVitals.slice(0, 20).map(v => formatVitalsRecord(v));

    res.json({ success: true, data: formattedList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────────────────────
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allNotifications = [];

    for (const conn of patientConns) {
      const notifications = await conn.models.Notification.findAll({
        where: { hospital_id: conn.hospitalId, user_id: conn.patientId },
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      allNotifications.push(...notifications);
    }

    // Sort by created_at descending
    allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allNotifications.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let updated = false;

    for (const conn of patientConns) {
      const [count] = await conn.models.Notification.update(
        { status: 'read', read_at: new Date() },
        { where: { id: req.params.id, user_id: conn.patientId, hospital_id: conn.hospitalId } }
      );
      if (count > 0) {
        updated = true;
        break;
      }
    }
    res.json({ success: true, message: updated ? 'Notification marked as read' : 'Notification not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);

    for (const conn of patientConns) {
      await conn.models.Notification.update(
        { status: 'read', read_at: new Date() },
        { where: { user_id: conn.patientId, status: 'unread', hospital_id: conn.hospitalId } }
      );
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/notifications/:id', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let deleted = false;
    for (const conn of patientConns) {
      const notif = await conn.models.Notification.findOne({
        where: { id: req.params.id, user_id: conn.patientId, hospital_id: conn.hospitalId },
      });
      if (notif) {
        await notif.destroy();
        deleted = true;
        break;
      }
    }
    res.json({ success: true, message: deleted ? 'Notification deleted' : 'Notification not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// PATIENT NOTIFICATIONS (paginated + filtered)
// Called by NotificationsView via api.getPatientNotifications()
// ────────────────────────────────────────────────────────────

// GET /api/patient/notifications?page=1&limit=5&search=&type=&startDate=&endDate=
app.get('/api/patient/notifications', protect, async (req, res) => {
  try {
    const { search, type, startDate, endDate, page = 1, limit = 5 } = req.query;
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allNotifications = [];

    for (const conn of patientConns) {
      const where = {
        hospital_id: conn.hospitalId,
        user_id: conn.patientId,
      };

      // Type/category filter
      if (type && type !== 'All') {
        where.type = type.toLowerCase();
      }

      // Date range filter
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) {
          const e = new Date(endDate); e.setHours(23, 59, 59, 999);
          where.created_at[Op.lte] = e;
        }
      }

      // Keyword search across title + message
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
        ];
      }

      const notifications = await conn.models.Notification.findAll({
        where,
        order: [['created_at', 'DESC']],
      });

      // Normalise fields for the frontend
      const mapped = notifications.map(n => ({
        _id: n.id,
        notifId: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'general',
        status: n.status || 'unread',
        read: n.status === 'read',
        priority: n.priority || 'medium',
        metadata: n.metadata || {},
        createdAt: n.created_at,
        hospitalId: conn.hospitalId,
        hospitalName: conn.hospitalName,
      }));

      allNotifications.push(...mapped);
    }

    // Sort all by createdAt descending
    allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate in-memory (cross-hospital data is already merged)
    const total = allNotifications.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum) || 1;
    const offset = (pageNum - 1) * limitNum;
    const paginated = allNotifications.slice(offset, offset + limitNum);

    res.json({
      success: true,
      notifications: paginated,
      pagination: { total, page: pageNum, limit: limitNum, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/notifications/unread-count
app.get('/api/patient/notifications/unread-count', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let count = 0;
    for (const conn of patientConns) {
      const c = await conn.models.Notification.count({
        where: { hospital_id: conn.hospitalId, user_id: conn.patientId, status: 'unread' },
      });
      count += c;
    }
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/patient/notifications/:id
app.get('/api/patient/notifications/:id', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let notif = null;
    let targetConn = null;

    for (const conn of patientConns) {
      notif = await conn.models.Notification.findOne({
        where: { id: req.params.id, user_id: conn.patientId, hospital_id: conn.hospitalId },
      });
      if (notif) {
        targetConn = conn;
        break;
      }
    }

    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });

    // Auto-mark as read on view
    if (notif.status !== 'read') {
      await notif.update({ status: 'read', read_at: new Date() });
    }

    // Resolve relatedData if available
    let relatedData = null;
    if (notif.related_entity_id && notif.related_entity_type && targetConn) {
      const type = notif.related_entity_type.toLowerCase();
      const conn = targetConn;
      if (type === 'appointment' || type === 'appointments') {
        const appt = await conn.models.Appointment.findOne({
          where: { id: notif.related_entity_id, hospital_id: conn.hospitalId },
          include: [{ model: conn.models.User, as: 'doctor', attributes: ['name', 'specialization'] }]
        });
        if (appt) {
          const plainAppt = appt.get({ plain: true });
          relatedData = {
            _id: plainAppt.id,
            id: plainAppt.id,
            appointmentDate: plainAppt.date_time,
            appointmentTime: plainAppt.date_time ? new Date(plainAppt.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            department: plainAppt.department,
            status: plainAppt.status,
            reason: plainAppt.reason,
            notes: plainAppt.notes,
            visitType: plainAppt.visit_type,
            tokenNumber: plainAppt.token_number,
            doctor: plainAppt.doctor ? {
              name: plainAppt.doctor.name,
              specialization: plainAppt.doctor.specialization
            } : null
          };
        }
      } else if (type === 'prescription' || type === 'prescriptions') {
        const pres = await conn.models.Prescription.findOne({
          where: { id: notif.related_entity_id, hospital_id: conn.hospitalId },
          include: [
            { model: conn.models.User, as: 'doctor', attributes: ['name', 'specialization'] },
            { model: conn.models.PrescriptionMedicine, as: 'medicines' }
          ]
        });
        if (pres) {
          const plainPres = pres.get({ plain: true });
          relatedData = {
            _id: plainPres.id,
            id: plainPres.id,
            diagnosis: plainPres.diagnosis,
            instructions: plainPres.instructions,
            status: plainPres.status,
            validUntil: plainPres.valid_until,
            doctor: plainPres.doctor ? {
              name: plainPres.doctor.name,
              specialization: plainPres.doctor.specialization
            } : null,
            medicines: plainPres.medicines || []
          };
        }
      } else if (type === 'token' || type === 'tokens' || type === 'alerts') {
        const tokenRec = await conn.models.Token.findOne({
          where: { id: notif.related_entity_id, hospital_id: conn.hospitalId }
        });
        if (tokenRec) {
          const plainToken = tokenRec.get({ plain: true });
          
          // Count people ahead
          const peopleAhead = await conn.models.Token.count({
            where: {
              hospital_id: conn.hospitalId,
              token_date: plainToken.token_date,
              status: 'Waiting',
              token_number: { [Op.lt]: plainToken.token_number }
            }
          });

          relatedData = {
            _id: plainToken.id,
            id: plainToken.id,
            tokenNumber: plainToken.token_number,
            tokenDate: plainToken.token_date,
            status: plainToken.status,
            estimatedWaitMinutes: plainToken.estimated_wait_mins,
            peopleAhead: peopleAhead
          };
        }
      }
    }

    res.json({
      success: true,
      notification: notif,
      relatedData: relatedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/patient/notifications/:id/read
app.patch('/api/patient/notifications/:id/read', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let updated = false;
    for (const conn of patientConns) {
      const [count] = await conn.models.Notification.update(
        { status: 'read', read_at: new Date() },
        { where: { id: req.params.id, user_id: conn.patientId, hospital_id: conn.hospitalId } }
      );
      if (count > 0) { updated = true; break; }
    }
    res.json({ success: true, message: updated ? 'Marked as read' : 'Notification not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/patient/notifications/:id
app.delete('/api/patient/notifications/:id', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    let deleted = false;
    for (const conn of patientConns) {
      const notif = await conn.models.Notification.findOne({
        where: { id: req.params.id, user_id: conn.patientId, hospital_id: conn.hospitalId },
      });
      if (notif) { await notif.destroy(); deleted = true; break; }
    }
    res.json({ success: true, message: deleted ? 'Notification deleted' : 'Notification not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ────────────────────────────────────────────────────────────
// MEDICAL HISTORY (past completed appointments)
// ────────────────────────────────────────────────────────────
app.get('/api/history', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allHistory = [];

    for (const conn of patientConns) {
      const appointments = await conn.models.Appointment.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId, status: 'Completed' },
        include: [{ model: conn.models.User, as: 'doctor', attributes: ['id', 'name', 'department', 'specialization', 'profile_image'] }],
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

      allHistory.push(...history);
    }

    // Sort history by date descending
    allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: allHistory.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// PHARMACY ORDERS
// ────────────────────────────────────────────────────────────
app.get('/api/pharmacy/orders', protect, async (req, res) => {
  try {
    const patientConns = await getPatientConnectionsAcrossHospitals(req.user.email);
    const allOrders = [];

    for (const conn of patientConns) {
      const orders = await conn.models.PharmacyOrder.findAll({
        where: { hospital_id: conn.hospitalId, patient_id: conn.patientId },
        include: [{ model: conn.models.Prescription, as: 'prescription', required: false }],
        order: [['created_at', 'DESC']],
      });
      allOrders.push(...orders);
    }

    // Sort orders by created_at descending
    allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────────────────────────────────────────────────
// DIAGNOSTIC ENDPOINT
// ────────────────────────────────────────────────────────────
app.get('/api/diagnose-db', async (req, res) => {
  const diagnostics = {};
  try {
    const { masterDb } = require('./services/databaseResolver');
    diagnostics.masterDbConfig = {
      host: process.env.MASTER_DB_HOST,
      name: process.env.MASTER_DB_NAME,
      user: process.env.MASTER_DB_USER,
      port: process.env.MASTER_DB_PORT,
      dbSsl: process.env.DB_SSL
    };
    await masterDb.authenticate();
    diagnostics.masterDbConnection = 'Success';
    const [results] = await masterDb.query(
      "SELECT id, name FROM hospitals WHERE status IN ('active', 'trial') LIMIT 1"
    );
    diagnostics.masterDbQuery = 'Success';
    diagnostics.masterDbQueryResult = results;
  } catch (err) {
    diagnostics.masterDbError = err.message;
    diagnostics.masterDbStack = err.stack;
  }

  try {
    const { connectDB, sequelize } = require('./config/database');
    diagnostics.saasDbConfig = {
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      dbSsl: process.env.DB_SSL
    };
    await sequelize.authenticate();
    diagnostics.saasDbConnection = 'Success';
  } catch (err) {
    diagnostics.saasDbError = err.message;
    diagnostics.saasDbStack = err.stack;
  }

  res.json(diagnostics);
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
