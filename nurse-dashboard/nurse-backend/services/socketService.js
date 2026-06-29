let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_nurse_room', (nurseId) => {
      socket.join(`nurse_${nurseId}`);
      console.log(`Nurse ${nurseId} joined their room`);
    });

    socket.on('join_hospital', (hospitalId) => {
      socket.join(`hospital_${hospitalId}`);
      console.log(`🏥 Nurse socket joined hospital_${hospitalId}`);
    });

    // Relay queue_update events emitted by other services (e.g. patient backend)
    // so all connected nurse frontends get the live push
    socket.on('queue_update', (data) => {
      socket.broadcast.emit('queue_update', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

const emitQueueUpdate = (data) => {
  if (ioInstance) {
    ioInstance.emit('queue_update', data);
  }
};

const emitEmergencyAlert = (data) => {
  if (ioInstance) {
    ioInstance.emit('emergency_alert', data);
  }
};

const emitNotification = (nurseId, notification) => {
  if (ioInstance) {
    ioInstance.to(`nurse_${nurseId}`).emit('new_notification', notification);
  }
};

module.exports = { initSocket, getIO, emitQueueUpdate, emitEmergencyAlert, emitNotification };
