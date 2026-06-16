import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import './App.css';
import { io } from 'socket.io-client';
import LoginPage from './pages/auth/LoginPage';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import DashboardView from './components/DashboardView';
import BookAppointmentView from './components/BookAppointmentView';
import AppointmentsView from './components/AppointmentsView';
import TokensView from './components/TokensView';
import HistoryView from './components/HistoryView';
import PrescriptionsView from './components/PrescriptionsView';
import ReportsView from './components/ReportsView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import { ToastContainer, toast } from './utils/toast';

import { api } from './utils/api';

export default function App() {
  const { token: authToken, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState({});
  const [token, setToken] = useState(null);
  const [pastTokens, setPastTokens] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deepLinkedApptId, setDeepLinkedApptId] = useState(null);
  const [deepLinkedNotifId, setDeepLinkedNotifId] = useState(null);

  // Handle SPA routing for "/patient/appointments/:id"
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/patient/appointments/')) {
        const id = path.split('/').pop();
        if (id) {
          setActiveTab('appointments');
          setDeepLinkedApptId(id);
        }
      } else if (path === '/patient/appointments') {
        setActiveTab('appointments');
        setDeepLinkedApptId(null);
      } else if (path.startsWith('/patient/notifications/')) {
        const id = path.split('/').pop();
        if (id) {
          setActiveTab('notifications');
          setDeepLinkedNotifId(id);
        }
      } else if (path === '/patient/notifications') {
        setActiveTab('notifications');
        setDeepLinkedNotifId(null);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Socket.IO Real-time Connection & Listener
  useEffect(() => {
    if (isAuthenticated && profile?._id) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5050';
      const socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      socket.emit('join', profile._id);

      socket.on('connect', () => {
        console.log('🔌 Connected to Socket.IO server');
      });

      socket.on('appointment_confirmed', (data) => {
        console.log('🔔 Appointment confirmed:', data);
        toast.success(`Appointment confirmed! Token ${data.tokenNumber || data.appointmentId} with Dr. ${data.doctorName}`);
        loadAppData();
      });

      socket.on('appointment_rescheduled', (data) => {
        console.log('🔔 Appointment rescheduled:', data);
        toast.info(`Appointment ${data.tokenNumber} rescheduled to ${data.newDate} at ${data.newTime}.`);
        loadAppData();
      });

      socket.on('appointment_cancelled', (data) => {
        console.log('🔔 Appointment cancelled:', data);
        toast.warning(`Appointment ${data.tokenNumber} has been cancelled.`);
        loadAppData();
      });

      socket.on('token_generated', (data) => {
        console.log('🔔 Token generated:', data);
        loadAppData();
      });

      socket.on('TOKEN_CREATED', () => loadAppData());
      socket.on('TOKEN_CALLED', () => loadAppData());
      socket.on('QUEUE_UPDATED', () => loadAppData());
      socket.on('DOCTOR_DELAYED', () => loadAppData());
      socket.on('CONSULTATION_STARTED', () => loadAppData());
      socket.on('VISIT_COMPLETED', () => loadAppData());
      socket.on('PHARMACY_READY', () => loadAppData());

      // Real-time vitals refresh — triggered when nurse records/updates vitals
      socket.on('VITALS_UPDATED', () => {
        api.getLatestVitals()
          .then(data => {
            setLatestVitals(data);
            if (data) toast.success('🩺 Your vitals have been updated by the nurse!');
          })
          .catch(() => {});
      });

      socket.on('NEW_NOTIFICATION', (data) => {
        console.log('🔔 New notification received:', data);
        loadAppData();
        window.dispatchEvent(new CustomEvent('new-notification', { detail: data }));
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, profile?._id]);

  // Fetch all initial data
  const loadAppData = async () => {
    try {
      const [
        profData,
        currentTokenData,
        pastTokensData,
        apptsData,
        prescData,
        reportsData,
        notifData,
        historyData,
        vitalsData,
      ] = await Promise.all([
        api.getProfile(),
        api.getCurrentToken(),
        api.getPastTokens(),
        api.getAppointments(),
        api.getPrescriptions(),
        api.getReports(),
        api.getNotifications(),
        api.getHistory(),
        api.getLatestVitals().catch(() => null),
      ]);

      setProfile(profData);
      setToken(currentTokenData);
      setPastTokens(pastTokensData);
      setAppointments(apptsData);
      setPrescriptions(prescData);
      setReports(reportsData);
      setNotifications(notifData);
      setHistory(historyData);
      setLatestVitals(vitalsData);
    } catch (err) {
      console.error("Error loading patient portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAppData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authToken]);

  // Notification action handlers
  const handleReadNotification = (id) => {
    api.deleteNotification(id) // Delete or mark read
      .then(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      })
      .catch(err => console.error("Error dismissing notification:", err));
  };

  const handleReadAllNotifications = () => {
    api.readAllNotifications()
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      })
      .catch(err => console.error("Error marking read all:", err));
  };

  // Callback to refresh when actions are taken
  const refreshTokenState = () => {
    return api.getCurrentToken().then(data => setToken(data));
  };

  const handleBookingSuccess = () => {
    loadAppData();
  };

  const handleUploadSuccess = () => {
    api.getReports().then(data => setReports(data));
    api.getNotifications().then(data => setNotifications(data));
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const handleRefreshQueue = () => {
    return api.refreshCurrentToken().then(() => {
      // Reload everything because token state changes can generate prescription/history/notifications!
      return loadAppData();
    });
  };

  // Render correct view panel
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            profile={profile}
            appointments={appointments}
            token={token}
            prescriptions={prescriptions}
            consultations={history}
            latestVitals={latestVitals}
            onViewTab={setActiveTab}
          />
        );
      case 'book':
        return <BookAppointmentView onBookingSuccess={handleBookingSuccess} />;
      case 'appointments':
        return (
          <AppointmentsView 
            initialSelectedId={deepLinkedApptId} 
            onClearDeepLink={() => setDeepLinkedApptId(null)} 
          />
        );
      case 'tokens':
        return (
          <TokensView
            token={token}
            pastTokens={pastTokens}
            onRefresh={handleRefreshQueue}
          />
        );
      case 'history':
        return <HistoryView history={history} />;
      case 'prescriptions':
        return <PrescriptionsView prescriptions={prescriptions} />;
      case 'reports':
        return (
          <ReportsView
            reports={reports}
            profile={profile}
            onUploadSuccess={handleUploadSuccess}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            initialSelectedId={deepLinkedNotifId}
            onClearDeepLink={() => setDeepLinkedNotifId(null)}
            onNotificationStatusChange={loadAppData}
            onViewTab={setActiveTab}
          />
        );
      case 'profile':
      case 'settings':
        return (
          <ProfileView
            profile={profile}
            onUpdateProfile={handleProfileUpdate}
          />
        );
      default:
        return <div>View not found</div>;
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  if (authLoading) {
    return (
      <div className="loading-app-overlay flex items-center justify-center flex-col gap-4">
        <div className="loading-spinner"></div>
        <p className="loading-text">Restoring session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (loading) {
    return (
      <div className="loading-app-overlay flex items-center justify-center flex-col gap-4">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading CarePlus Patient Portal...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadCount={unreadNotifCount} 
      />
      
      <div className="main-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNavbar 
          notifications={notifications} 
          onReadNotification={handleReadNotification}
          onReadAll={handleReadAllNotifications}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        
        <main className="content-body" style={{ flexGrow: 1 }}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
