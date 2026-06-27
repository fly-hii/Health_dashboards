const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
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

// Tenant-aware socket rooms
io.on('connection', (socket) => {
  console.log(`🔌 Pharma socket connected: ${socket.id} (hospital ${socket.user?.hospitalId})`);

  socket.on('join_hospital', (hospitalId) => {
    // Only allow joining the room that matches the authenticated token
    if (parseInt(hospitalId) !== parseInt(socket.user?.hospitalId)) {
      console.warn(`⚠️  Pharma socket ${socket.id} attempted to join hospital_${hospitalId} but token has hospitalId=${socket.user?.hospitalId}`);
      return;
    }
    socket.join(`hospital_${hospitalId}`);
    console.log(`🏥 Pharma socket joined hospital_${hospitalId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Pharma socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Middleware
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Ensure uploads directory exists (silently skip if read-only FS like Vercel)
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Vercel/serverless has read-only filesystem — uploads will use S3
}
app.use('/uploads', express.static(uploadsDir));

// Attach socket.io instance to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
const { protect } = require('./middleware/authMiddleware');
const orderRoutes = require('./routes/orderRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');

app.use('/api/orders', protect, orderRoutes);
app.use('/api/inventory', protect, inventoryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

// Health check
app.get('/health', (req, res) => {
  const envCheck = {
    DB_HOST: !!process.env.DB_HOST,
    DB_USER: !!process.env.DB_USER,
    DB_NAME: !!process.env.DB_NAME,
    JWT_SECRET: !!process.env.JWT_SECRET,
    SMTP_HOST: !!process.env.SMTP_HOST,
  };
  const allEnvSet = Object.values(envCheck).every(Boolean);
  res.status(allEnvSet ? 200 : 503).json({
    status: allEnvSet ? 'healthy' : 'degraded',
    service: 'CarePlus Pharmacy API v2.0',
    database: 'MySQL (AWS RDS)',
    envCheck,
    timestamp: new Date(),
  });
});

app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('   CarePlus Pharmacy API v2.0');
    console.log('================================');
    console.log(`✅ Port: ${PORT} | DB: ${process.env.DB_NAME}`);
    console.log('================================\n');
  });
};

startServer();

module.exports = app;
