import { io } from 'socket.io-client';

const getSocketURL = () => {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket && envSocket.startsWith('http')) {
    return envSocket;
  }
  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && envApi.startsWith('http')) {
    return envApi.replace(/\/api$/, '');
  }
  return window.location.origin;
};

const URL = getSocketURL();

const isVercel = typeof window !== 'undefined' && window.location.origin.includes('vercel.app');
const isLocalhost = URL.includes('localhost');
const shouldDisableSocket = isVercel && !import.meta.env.VITE_SOCKET_URL && !isLocalhost;

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnectionAttempts: 3,
  timeout: 5000,
});

// Decode hospitalId from stored JWT (without a library — just parse the payload)
const getHospitalIdFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.hospitalId || null;
  } catch {
    return null;
  }
};

// Automatically join the correct hospital room once connected
socket.on('connect', () => {
  const hospitalId = getHospitalIdFromToken();
  if (hospitalId) {
    socket.emit('join_hospital', hospitalId);
  }
});

if (shouldDisableSocket) {
  socket.connect = () => {
    console.warn('Socket connection disabled in Vercel serverless environment (real-time updates disabled)');
    return socket;
  };
}
