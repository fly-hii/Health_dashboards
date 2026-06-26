import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Activity,
  FileText,
  CreditCard,
  BarChart3,
  Bell,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  Building
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Sidebar({ isMinimized, isMobileOpen, setIsMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserPortalsOpen, setIsUserPortalsOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  const handleItemClick = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { name: 'Patients', path: '/admin/patients', icon: Users },
    { name: 'Doctors', path: '/admin/doctors', icon: UserCheck },
    { name: 'Nurses', path: '/admin/nurses', icon: Users },
    { name: 'Pharmacy', path: '/admin/pharmacy', icon: Activity },
    { name: 'Laboratory', path: '/admin/laboratory', icon: FileText },
    { name: 'Billing & Payments', path: '/admin/billing', icon: CreditCard },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
  ];

  const userPortals = [
    { name: 'Doctors Portal', role: 'DOCTOR' },
    { name: 'Nurses Portal', role: 'NURSE' },
    { name: 'Pharmacy Portal', role: 'PHARMACIST' },
    { name: 'Reception Portal', role: 'RECEPTIONIST' },
    { name: 'Lab Portal', role: 'LAB_TECHNICIAN' },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`fixed top-0 left-0 z-40 h-screen pt-4 pb-4 bg-sidebar-bg border-r border-slate-800 flex flex-col justify-between text-slate-300 transition-all duration-300 ${isMinimized ? 'w-sidebar-min' : 'w-sidebar'} ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div>
          {/* Brand Header */}
          <div className={`flex items-center pb-6 border-b border-slate-800 transition-all duration-300 ${isMinimized ? 'justify-center gap-0 px-2' : 'gap-3 px-6'}`}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isMinimized ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <h1 className="text-lg font-bold text-white tracking-wide">CAREPLUS</h1>
              <p className="text-[10px] text-primary font-semibold tracking-wider uppercase">Hospital Admin Portal</p>
            </div>
          </div>

          {/* Main Nav Items */}
          <nav className={`py-6 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-none transition-all duration-300 ${isMinimized ? 'px-2' : 'px-4'
            }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  title={isMinimized ? item.name : ""}
                  onClick={handleItemClick}
                  className={({ isActive }) =>
                    `flex items-center text-sm font-medium rounded-xl transition-all duration-200 ${isMinimized ? 'px-0 justify-center gap-0 py-3.5' : 'px-4 py-3 gap-3'
                    } ${isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/20 font-semibold scale-[1.02]'
                      : 'hover:bg-sidebar-hover hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isMinimized ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
            {/* Hospital Administration Section */}
            <div className="pt-2">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                title={isMinimized ? "Hospital Admin" : ""}
                className={`flex items-center justify-between w-full text-sm font-medium rounded-xl hover:bg-sidebar-hover hover:text-white transition-all text-left ${isMinimized ? 'px-0 justify-center gap-0 py-3.5' : 'px-4 py-3'
                  }`}
              >
                <div className={`flex items-center ${isMinimized ? 'justify-center gap-0' : 'gap-3'}`}>
                  <Building className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isMinimized ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    Hospital Admin
                  </span>
                </div>
                {!isMinimized && (isAdminOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                ))}
              </button>

              {isAdminOpen && !isMinimized && (
                <div className="pl-9 pr-2 mt-1 space-y-1">
                  {[
                    { name: 'Hospital Profile', path: '/admin/hospital-profile' },
                    { name: 'Department Management', path: '/admin/departments' },
                    { name: 'Staff Management', path: '/admin/staff' },
                    { name: 'Hospital Settings', path: '/admin/hospital-settings' },
                  ].map((subItem) => {
                    const isActive = location.pathname === subItem.path;
                    return (
                      <NavLink
                        key={subItem.name}
                        to={subItem.path}
                        onClick={handleItemClick}
                        className={`block px-4 py-2 text-xs font-medium rounded-lg transition-all ${isActive
                            ? 'bg-primary/20 text-primary border-l-2 border-primary font-semibold'
                            : 'text-slate-400 hover:bg-sidebar-hover hover:text-white'
                          }`}
                      >
                        {subItem.name}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>

          </nav>
        </div>

        {/* Logout button footer */}
        <div className={`pt-4 border-t border-slate-800 transition-all duration-300 ${isMinimized ? 'px-2' : 'px-4'}`}>
          <button
            onClick={handleLogout}
            title={isMinimized ? "Logout Session" : ""}
            className={`flex items-center w-full text-sm font-medium rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 ${isMinimized ? 'px-0 justify-center gap-0 py-3.5' : 'px-4 py-3 gap-3'
              }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isMinimized ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              Logout Session
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
