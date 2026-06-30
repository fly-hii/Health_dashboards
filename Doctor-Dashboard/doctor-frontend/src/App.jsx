import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import DashboardView from './components/DashboardView';
import OverviewView from './components/OverviewView';
import BookAppointmentView from './components/BookAppointmentView';
import ConsultationView from './components/ConsultationView';
import ConsultationsListView from './components/ConsultationsListView';
import PatientHistoryView from './components/PatientHistoryView';
import { api } from './utils/api';
import PatientDirectoryView from './components/PatientDirectoryView';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import TokensView from './components/TokensView';
import PrescriptionsView from './components/PrescriptionsView';
import ReportsView from './components/ReportsView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import './App.css';

export default function App() {
  const { isAuthenticated, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [queue, setQueue] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const derivedSocketUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : '';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || derivedSocketUrl;

    // Vercel serverless does not support WebSockets / Socket.IO persistent connections.
    // Skip socket setup entirely when no dedicated socket server is configured.
    const isVercel = !socketUrl || socketUrl.includes('vercel.app') || socketUrl.includes('vercel.com');
    if (isVercel) return;

    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 5000,
      auth: { token: localStorage.getItem('doctor_token') }
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO backend');
      socket.emit('join_room', user._id || user.id);
      const hospitalId = user.hospital_id || user.hospitalId;
      if (hospitalId) {
        socket.emit('join_hospital', hospitalId);
        console.log(`🏥 Doctor joined hospital room: hospital_${hospitalId}`);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection unavailable (real-time updates disabled):', err.message);
    });

    // Handle real-time socket events
    socket.on('STATS_UPDATED', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('QUEUE_COUNT_UPDATED', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('CONSULTATION_STARTED', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('CONSULTATION_COMPLETED', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('NEW_APPOINTMENT', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('NEW_FOLLOWUP', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('PATIENT_CHECKED_IN', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('PATIENT_SENT_TO_DOCTOR', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    // lowercase variants — match actual backend emit names
    socket.on('consultation_started', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('consultation_completed', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('appointment_status_updated', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });
    socket.on('new_appointment', () => { window.dispatchEvent(new CustomEvent('dashboard_refresh')); });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, user]);

  const fetchCentralQueue = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await api.getQueue();
      if (res && res.success) {
        setQueue(res.queue || []);
      }
    } catch (err) {
      console.error('Error fetching central queue:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    fetchCentralQueue();

    window.addEventListener('dashboard_refresh', fetchCentralQueue);
    const interval = setInterval(fetchCentralQueue, 15000);

    return () => {
      window.removeEventListener('dashboard_refresh', fetchCentralQueue);
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  const handleDiagnosePatient = (appointment) => {
    setActiveAppointment(appointment);
    setActiveTab('consultation');
  };

  const handleBackToQueue = () => {
    setActiveAppointment(null);
    setActiveTab('consultations');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onDiagnosePatient={handleDiagnosePatient}
            onQueueFetched={setQueue}
            setActiveTab={setActiveTab}
          />
        );
      case 'book':
        return <BookAppointmentView />;
      case 'appointments':
      case 'queue':
      case 'consultations':
        return (
          <ConsultationsListView
            onDiagnosePatient={handleDiagnosePatient}
          />
        );
      case 'consultation':
        return activeAppointment ? (
          <ConsultationView
            appointment={activeAppointment}
            onBackToQueue={handleBackToQueue}
          />
        ) : (
          <ConsultationsListView
            onDiagnosePatient={handleDiagnosePatient}
          />
        );
      case 'tokens':
        return <TokensView />;
      case 'history':
        return <PatientDirectoryView />;
      case 'records':
        return <MedicalRecordsPage />;
      case 'prescriptions':
        return <PrescriptionsView />;
      case 'reports':
        return <ReportsView />;
      case 'notifications':
        return <NotificationsView onDiagnosePatient={handleDiagnosePatient} />;
      case 'profile':
      case 'settings':
        return <ProfileView activeTab={activeTab} setActiveTab={setActiveTab} />;
      default:
        return (
          <DashboardView
            onDiagnosePatient={handleDiagnosePatient}
            onQueueFetched={setQueue}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="loading-app-overlay">
        <div className="loading-spinner large" />
        <p className="loading-text">Verifying secure doctor credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
      />
      <div className={`main-content-layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <TopNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          queue={queue}
          onDiagnosePatient={handleDiagnosePatient}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setIsSidebarOpen(prev => !prev);
            } else {
              setIsSidebarCollapsed(prev => !prev);
            }
          }}
        />
        <main className="content-body">
          {renderActiveView()}
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </div>
  );
}
