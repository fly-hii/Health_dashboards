'use strict';
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initConnections } = require('./services/databaseResolver');
const { initSocket } = require('./sockets/socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

if (!process.env.CLIENT_URL) {
  console.warn('⚠️ Warning: CLIENT_URL environment variable is not set. Defaulting to local and Render/Vercel domains.');
}

// Build allowed origins from env — no hardcoded URLs
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
].filter(Boolean);


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
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Routes
const tenantMiddleware = require('./middleware/tenantMiddleware');

app.use('/api/auth', require('./routes/authRoutes'));

// All non-auth routes run tenantMiddleware (after protect() sets req.hospitalId via JWT)
app.use('/api/users',         tenantMiddleware, require('./routes/userRoutes'));
app.use('/api/doctors',       tenantMiddleware, require('./routes/doctorRoutes'));
app.use('/api/patients',      tenantMiddleware, require('./routes/patientRoutes'));
app.use('/api/appointments',  tenantMiddleware, require('./routes/appointmentRoutes'));
app.use('/api/pharmacy',      tenantMiddleware, require('./routes/pharmacyRoutes'));
app.use('/api/laboratory',    tenantMiddleware, require('./routes/labRoutes'));
app.use('/api/billing',       tenantMiddleware, require('./routes/billingRoutes'));
app.use('/api/reports',       tenantMiddleware, require('./routes/reportRoutes'));
app.use('/api/audit-logs',    tenantMiddleware, require('./routes/auditRoutes'));
app.use('/api/dashboard',     tenantMiddleware, require('./routes/dashboardRoutes'));
app.use('/api/notifications', tenantMiddleware, require('./routes/notificationRoutes'));
app.use('/api/departments',   tenantMiddleware, require('./routes/departmentRoutes'));
app.use('/api/hospitals',     tenantMiddleware, require('./routes/hospitalRoutes'));

app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'CarePlus Hospital Admin API v3.0',
  architecture: 'Hybrid Multi-Tenant', timestamp: new Date(),
}));

app.use('*', (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    await initConnections();   // authenticate both masterDb + sharedSaasDb, sync schema
    server.listen(PORT, () => {
      console.log('\n🚀 ==========================================');
      console.log('   CarePlus Hospital Admin API v3.0');
      console.log('   Architecture: Hybrid Multi-Tenant DB');
      console.log('==========================================');
      console.log(`✅ Port       : ${PORT}`);
      console.log(`✅ Master DB  : ${process.env.MASTER_DB_NAME}`);
      console.log(`✅ Shared DB  : ${process.env.DB_NAME}`);
      console.log(`✅ Env        : ${process.env.NODE_ENV}`);
      console.log('==========================================\n');
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
  }
})();

module.exports = app;
