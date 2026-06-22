import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NurseLayout from '../layouts/NurseLayout';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import DashboardHome from '../pages/nurse/DashboardHome';
import PatientQueue from '../pages/nurse/PatientQueue';
import VitalsEntry from '../pages/nurse/VitalsEntry';
import PatientProfile from '../pages/nurse/PatientProfile';
import AppointmentDetails from '../pages/nurse/AppointmentDetails';
import EmergencyQueue from '../pages/nurse/EmergencyQueue';
import MedicalHistory from '../pages/nurse/MedicalHistory';
import NotificationsCenter from '../pages/nurse/NotificationsCenter';
import NurseProfile from '../pages/nurse/NurseProfile';
import MyTokens from '../pages/nurse/MyTokens';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading CareSync...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <NurseLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"              element={<DashboardHome />} />
          <Route path="patient-queue"          element={<PatientQueue />} />
          <Route path="vitals/:appointmentId"  element={<VitalsEntry />} />
          <Route path="vitals"                 element={<VitalsEntry />} />
          <Route path="patient/:id"            element={<PatientProfile />} />
          <Route path="appointment/:id"        element={<AppointmentDetails />} />
          <Route path="medical-history"        element={<MedicalHistory />} />
          <Route path="tokens"                 element={<MyTokens />} />
          <Route path="emergency"              element={<Navigate to="/medical-history" replace />} />
          <Route path="notifications"          element={<NotificationsCenter />} />
          <Route path="profile"                element={<NurseProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
