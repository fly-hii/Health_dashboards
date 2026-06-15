'use strict';
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const morgan   = require('morgan');
require('dotenv').config();

const { initConnections } = require('./services/databaseResolver');
const { initSocket }      = require('./sockets/socket');

const app    = express();
const server = http.createServer(app);
const io     = initSocket(server);
app.set('io', io);

if (!process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL environment variable is required');
}
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/doctors',       require('./routes/doctorRoutes'));
app.use('/api/patients',      require('./routes/patientRoutes'));
app.use('/api/appointments',  require('./routes/appointmentRoutes'));
app.use('/api/pharmacy',      require('./routes/pharmacyRoutes'));
app.use('/api/laboratory',    require('./routes/labRoutes'));
app.use('/api/billing',       require('./routes/billingRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/audit-logs',    require('./routes/auditRoutes'));
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

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

const PORT = process.env.PORT;
if (!PORT) {
  throw new Error('PORT environment variable is required');
}

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
    process.exit(1);
  }
})();
