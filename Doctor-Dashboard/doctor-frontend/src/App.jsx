import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/auth/LoginPage';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import DashboardView from './components/DashboardView';
import OverviewView from './components/OverviewView';
import BookAppointmentView from './components/BookAppointmentView';
import PatientQueueView from './components/PatientQueueView';
import ConsultationView from './components/ConsultationView';
import ConsultationsListView from './components/ConsultationsListView';
import PatientHistoryView from './components/PatientHistoryView';
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

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Connect to backend Socket.IO server
    const socket = io('http://localhost:5051', {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('doctor_token')
      }
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO backend');
      socket.emit('join_room', user._id || user.id);
    });

    // Handle real-time socket events
    socket.on('STATS_UPDATED', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('QUEUE_COUNT_UPDATED', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('CONSULTATION_STARTED', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('CONSULTATION_COMPLETED', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('NEW_APPOINTMENT', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('NEW_FOLLOWUP', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('PATIENT_CHECKED_IN', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    socket.on('PATIENT_SENT_TO_DOCTOR', () => {
      window.dispatchEvent(new CustomEvent('dashboard_refresh'));
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user]);



  const handleDiagnosePatient = (appointment) => {
    setActiveAppointment(appointment);
    setActiveTab('consultation');
  };

  const handleBackToQueue = () => {
    setActiveAppointment(null);
    setActiveTab('queue');
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
        return (
          <PatientQueueView
            onDiagnosePatient={handleDiagnosePatient}
            searchQuery={searchQuery}
            onQueueFetched={setQueue}
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
      case 'consultations':
        return (
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
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content-layout">
        <TopNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          queue={queue}
          onDiagnosePatient={handleDiagnosePatient}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <main className="content-body">
          {renderActiveView()}
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </div>
  );
}
