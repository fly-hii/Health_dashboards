import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { notificationService } from '../services/notificationService';
import config from '../config';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount]           = useState(0);
  const [notifications, setNotifications]       = useState([]);
  const [queueUpdateTime, setQueueUpdateTime]   = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    // Fetch initial notification list and unread count
    const fetchInitialNotifications = async () => {
      try {
        const res = await notificationService.getNotifications({ limit: 10 });
        setUnreadCount(res.data.unreadCount || 0);
        setNotifications(res.data.data || []);
      } catch (err) {
        console.error('Failed to load initial notifications:', err);
      }
    };
    fetchInitialNotifications();

    // config.socketUrl is null on Vercel (serverless can't handle WebSockets)
    if (!config.socketUrl) return;

    const socket = io(config.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_nurse_room', user._id || user.id);
      const hospitalId = user.hospital_id || user.hospitalId;
      if (hospitalId) {
        socket.emit('join_hospital', hospitalId);
        console.log(`🏥 Nurse joined hospital room: hospital_${hospitalId}`);
      }
    });

    socket.on('new_notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast.info(`🔔 ${notification.title}`, { autoClose: 4000 });
    });

    socket.on('queue_update', () => {
      setQueueUpdateTime(new Date());
    });

    socket.on('emergency_alert', (data) => {
      toast.error(`🚨 Emergency: ${data.message || 'Critical patient alert!'}`, { autoClose: 6000 });
    });

    socket.on('vitals_recorded', () => {
      setQueueUpdateTime(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  const incrementUnread = useCallback(() => setUnreadCount((p) => p + 1), []);
  const decrementUnread = useCallback(() => setUnreadCount((p) => Math.max(0, p - 1)), []);
  const clearUnread     = useCallback(() => setUnreadCount(0), []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, notifications, queueUpdateTime, incrementUnread, decrementUnread, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
