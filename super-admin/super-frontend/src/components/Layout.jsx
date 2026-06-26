import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open sidebar menu"
      >
        ☰
      </button>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
