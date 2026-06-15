const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5175',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Tenant-aware socket rooms
io.on('connection', (socket) => {
  console.log(`🔌 Pharma socket connected: ${socket.id}`);

  socket.on('join_hospital', (hospitalId) => {
    socket.join(`hospital_${hospitalId}`);
    console.log(`🏥 Pharma socket joined hospital_${hospitalId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Pharma socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5175', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

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
  res.json({ status: 'healthy', service: 'CarePlus Pharmacy API v2.0', database: 'MySQL (AWS RDS)', timestamp: new Date() });
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
