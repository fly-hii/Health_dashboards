import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

import Dashboard from '../pages/Dashboard';
import PrescriptionQueue from '../pages/PrescriptionQueue';
import PrescriptionDetails from '../pages/PrescriptionQueue/Details';
import ProcessingOrders from '../pages/ProcessingOrders';
import ProcessingOrderDetails from '../pages/ProcessingOrders/Details';
import ReadyOrders from '../pages/ReadyOrders';
import ReadyOrderDetails from '../pages/ReadyOrders/Details';
import OrderHistory from '../pages/OrderHistory';
import DeliveredOrderDetails from '../pages/OrderHistory/Details';
import Inventory from '../pages/Inventory';
import CreateOrder from '../pages/PrescriptionQueue/CreateOrder';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import PharmacyLogin from '../pages/PharmacyLogin';
import PharmacyForgotPassword from '../pages/PharmacyForgotPassword';

// Placeholder for Reports & Analytics
const ReportsAnalytics = () => (
  <div className="p-8 text-center bg-white rounded-xl border border-gray-100 shadow-sm max-w-lg mx-auto mt-12 space-y-3">
    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
    <p className="text-gray-500 text-sm">Custom intelligence reports and analytics dashboard is coming in next release.</p>
  </div>
);

// Protect dashboard routes
function ProtectedRoute() {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/pharmacy/login" replace />;
}

// Redirect logged-in users away from login page
function PublicRoute() {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/pharmacy/dashboard" replace /> : <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="pharmacy/login" element={<PharmacyLogin />} />
        <Route path="pharmacy/forgot-password" element={<PharmacyForgotPassword />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pharmacy/dashboard" element={<Dashboard />} />
          <Route path="queue" element={<PrescriptionQueue />} />
          <Route path="queue/:id" element={<PrescriptionDetails />} />
          <Route path="pharmacy/prescription-queue" element={<PrescriptionQueue />} />
          <Route path="pharmacy/prescriptions/:id" element={<PrescriptionDetails />} />
          <Route path="processing" element={<ProcessingOrders />} />
          <Route path="processing/:id" element={<ProcessingOrderDetails />} />
          <Route path="pharmacy/orders/processing" element={<ProcessingOrders />} />
          <Route path="pharmacy/orders/processing/:id" element={<ProcessingOrderDetails />} />
          
          <Route path="ready" element={<ReadyOrders />} />
          <Route path="ready/:id" element={<ReadyOrderDetails />} />
          <Route path="pharmacy/orders/ready" element={<ReadyOrders />} />
          <Route path="pharmacy/orders/ready/:id" element={<ReadyOrderDetails />} />
          
          <Route path="history" element={<OrderHistory />} />
          <Route path="history/:id" element={<DeliveredOrderDetails />} />
          <Route path="pharmacy/orders/history" element={<OrderHistory />} />
          <Route path="pharmacy/orders/history/:id" element={<DeliveredOrderDetails />} />
          <Route path="pharmacy/orders/delivered/:id" element={<DeliveredOrderDetails />} />
          <Route path="pharmacy/orders/create" element={<CreateOrder />} />
          
          <Route path="reports" element={<ReportsAnalytics />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="profile" element={<Profile />} />
          
          <Route path="pharmacy/notifications" element={<Notifications />} />
          <Route path="pharmacy/inventory" element={<Inventory />} />
          <Route path="pharmacy/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
