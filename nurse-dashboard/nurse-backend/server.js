const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./config/database');
const path = require('path');
const fs = require('fs');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const nurseRoutes = require('./routes/nurse/nurseRoutes');
const vitalsRoutes = require('./routes/nurse/vitalsRoutes');
const notificationRoutes = require('./routes/nurse/notificationRoutes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5180',
  'https://health-dashboards-nurse-backend.vercel.app',
  'https://health-dashboards-nurse-frontend.vercel.app',
].filter(Boolean);

// Socket.IO with tenant-aware rooms
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

// Socket.IO JWT middleware — validate token before any event is processed
io.use((socket, next) => {
  const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['NURSE', 'HOSPITAL_ADMIN', 'SYSTEM'].includes(decoded.role)) {
      return next(new Error('Not authorized for this portal'));
    }
    socket.role        = decoded.role;
    socket.hospitalId  = parseInt(decoded.hospitalId);
    socket.userId      = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Nurse socket connected: ${socket.id} (role: ${socket.role})`);

  if (socket.role === 'SYSTEM') {
    socket.join('system_relay');
    console.log(`🔌 System relay socket joined system_relay room: ${socket.id}`);
  }

  socket.on('join_hospital', (hospitalId) => {
    // Only allow joining the hospital that matches the authenticated token
    if (parseInt(hospitalId) === socket.hospitalId || socket.role === 'SYSTEM') {
      socket.join(`hospital_${hospitalId}`);
      console.log(`🏥 Nurse socket joined hospital_${hospitalId}`);
    } else {
      console.warn(`⚠️  Socket ${socket.id} tried to join hospital_${hospitalId} but token is for hospital_${socket.hospitalId}`);
      socket.emit('error', { message: 'Not authorized to join this hospital room' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Nurse socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'CarePlus Nurse API v2.0', database: 'MySQL (AWS RDS)', timestamp: new Date() });
});

app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   CarePlus Nurse API v2.0');
    console.log('================================');
    console.log(`✅ Port: ${PORT} | DB: ${process.env.DB_NAME}`);
    console.log('================================\n');
  });
};

startServer();

module.exports = app;
