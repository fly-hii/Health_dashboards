import { io } from 'socket.io-client';

// Vercel serverless cannot support Socket.IO (no persistent connection).
// Only connect when a dedicated socket server URL is provided.
const socketUrl = import.meta.env.VITE_SOCKET_URL;
const isVercel = !socketUrl || socketUrl.includes('vercel.app') || socketUrl.includes('vercel.com');

const noop = () => {};
const nullSocket = {
  on: noop, off: noop, emit: noop, connect: noop,
  disconnect: noop, id: null, connected: false,
};

const socket = isVercel
  ? nullSocket
  : io(socketUrl, {
      autoConnect: false,
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['websocket'],
      auth: {
        // Pass JWT so the backend JWT middleware can authenticate the socket connection
        get token() {
          return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
        },
      },
    });

export default socket;

