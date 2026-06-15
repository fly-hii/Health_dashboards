let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join tenant room: hospital_${hospitalId}
    socket.on('join_hospital', (hospitalId) => {
      if (hospitalId) {
        socket.join(`hospital_${hospitalId}`);
        console.log(`🏥 Socket ${socket.id} joined hospital_${hospitalId}`);
      }
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
