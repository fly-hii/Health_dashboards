'use strict';

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const morgan  = require('morgan');
require('dotenv').config();

const { connectMasterDB } = require('./config/masterDatabase');

const app    = express();
const server = http.createServer(app);

if (!process.env.CLIENT_URL) {
  console.warn('⚠️ Warning: CLIENT_URL environment variable is not set. Defaulting to local and Vercel domains.');
}

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5180',
  'https://health-dashboards-super-admin-backe.vercel.app',
  'https://health-dashboards-super-admin-front.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Routes
app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/super', require('./routes/superAdminRoutes'));

app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'CarePlus Super Admin API v3.0',
  masterDb: process.env.MASTER_DB_NAME,
  saasDb: process.env.SAAS_DB_NAME,
  timestamp: new Date(),
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
    await connectMasterDB();        // careplus_master (syncs all super-admin tables)
    console.log('✅ careplus_master ready');

    server.listen(PORT, () => {
      console.log('\n🚀 ==========================================');
      console.log('   CarePlus Super Admin API v3.0 (Hybrid)');
      console.log('==========================================');
      console.log(`✅ Port        : ${PORT}`);
      console.log(`✅ Master DB   : ${process.env.MASTER_DB_NAME}`);
      console.log(`✅ Shared DB   : ${process.env.SAAS_DB_NAME}`);
      console.log(`✅ Environment : ${process.env.NODE_ENV}`);
      console.log('==========================================\n');
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
