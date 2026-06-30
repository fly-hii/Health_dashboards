let io;

// Build allowed origins from env — no hardcoded URLs
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
].filter(Boolean);


const initSocket = (server) => {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // No wildcard subdomain matching — only explicit allowlist
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

    // Legacy support: join by userId — only allowed for own userId
    socket.on('join_room', (userId) => {
      // SECURITY: Only allow joining your own userId room
      if (String(userId) !== String(socket.user?.id)) {
        console.warn(`⚠️  Socket ${socket.id} tried to join room "${userId}" but authenticated as user ${socket.user?.id}`);
        socket.emit('error', { message: 'Not authorized to join this room.' });
        return;
      }
      socket.join(String(userId));
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

// Broadcast to ALL connected clients — ONLY for super-admin system events
// WARNING: Never use this for hospital-scoped data (patients, doctors, orders, etc.)
const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const getIO = () => io;

module.exports = { initSocket, emitToHospital, broadcastEvent, getIO };
