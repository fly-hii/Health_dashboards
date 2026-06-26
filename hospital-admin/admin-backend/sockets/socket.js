let io;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5180',
  'https://health-dashboards-hospital-admin-fr.vercel.app',
  'https://health-dashboardsptal-admin-backend.vercel.app'
].filter(Boolean);

const initSocket = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');

  io = new Server(server, {
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

  // JWT auth middleware — validates token on every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, hospitalId, role }
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} (hospital ${socket.user?.hospitalId})`);

    // Join tenant room: hospital_${hospitalId}
    socket.on('join_hospital', (hospitalId) => {
      // Only allow joining the room that matches the authenticated token
      if (parseInt(hospitalId) !== parseInt(socket.user?.hospitalId)) {
        console.warn(`⚠️  Admin socket ${socket.id} attempted to join hospital_${hospitalId} but token has hospitalId=${socket.user?.hospitalId}`);
        return;
      }
      socket.join(`hospital_${hospitalId}`);
      console.log(`🏥 Socket ${socket.id} joined hospital_${hospitalId}`);
    });

    // Legacy support: join by userId
    socket.on('join_room', (userId) => {
      socket.join(userId);
      console.log(`👤 Socket ${socket.id} joined room: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Emit to a specific hospital room
const emitToHospital = (hospitalId, event, data) => {
  if (io) {
    io.to(`hospital_${hospitalId}`).emit(event, data);
  }
};

// Broadcast to all connected clients (super admin use)
const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const getIO = () => io;

module.exports = { initSocket, emitToHospital, broadcastEvent, getIO };
