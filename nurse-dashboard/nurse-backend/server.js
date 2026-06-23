const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
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

io.on('connection', (socket) => {
  console.log(`🔌 Nurse socket connected: ${socket.id}`);

  socket.on('join_hospital', (hospitalId) => {
    socket.join(`hospital_${hospitalId}`);
    console.log(`🏥 Nurse socket joined hospital_${hospitalId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Nurse socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
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
