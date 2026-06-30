import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import config from '../../config';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  FileText, 
  Bell, 
  User, 
  LogOut,
  Ticket
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patient-queue', icon: Users,           label: 'Patient Queue' },
  { to: '/vitals',        icon: Activity,        label: 'Vitals Entry' },
  { to: '/medical-history', icon: FileText,        label: 'Medical History' },
  // { to: '/tokens',        icon: Ticket,          label: 'Patient Tokens' },
  { to: '/notifications', icon: Bell,            label: 'Notifications' },
  { to: '/profile',       icon: User,            label: 'Profile' },
];

const LogoIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="10" fill="#0EA5A4" />
    <path d="M19 10V28M10 19H28" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="19" cy="19" r="6" stroke="white" strokeWidth="2" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

const Sidebar = ({ collapsed, mobileOpen, onMobileClose }) => {
  const { logout }          = useAuth();
  const { unreadCount }     = useNotifications();
  const navigate            = useNavigate();
  const location            = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[49] lg:hidden transition-opacity duration-300 animate-fadeIn"
        />
      )}
      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 bg-white border-r border-[#E5E7EB] flex flex-col transition-all duration-300 ${
          mobileOpen ? 'mobile-open' : ''
        }`}
        style={{
          width: collapsed ? '72px' : '280px',
        }}
      >
        {/* Hospital Logo Header */}
        <div className={`flex items-center gap-3 min-h-[70px] border-b border-[#E5E7EB] shrink-0 ${
          collapsed ? 'justify-center px-4' : 'px-6'
        }`}>
          <LogoIcon />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-slate-900 font-extrabold text-xl tracking-tight leading-none">
                {config.hospitalName}
              </span>
              <span className="text-[#0EA5A4] text-[10px] font-bold tracking-widest uppercase mt-0.5">
                {config.hospitalSubtitle}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className={`flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 ${
          collapsed ? 'px-2' : 'px-4'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            
            const isItemActive = location.pathname === item.to || 
                                 (item.to === '/vitals' && location.pathname.startsWith('/vitals')) ||
                                 (item.to === '/tokens' && location.pathname.startsWith('/tokens'));

            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={onMobileClose}
                className={() =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-[14px] font-semibold group relative ${
                    isItemActive 
                      ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-[#0EA5A4]/5 hover:text-[#0EA5A4]'
                  } ${collapsed ? 'justify-center' : 'justify-start'}`
                }
              >
                {() => (
                  <>
                    <Icon size={20} className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isItemActive ? 'text-white' : 'text-slate-500 group-hover:text-[#0EA5A4]'
                    }`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    
                    {/* Badge for Notifications */}
                    {!collapsed && item.label === 'Notifications' && unreadCount > 0 && (
                      <span className="ml-auto bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {collapsed && item.label === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#EF4444] rounded-full ring-2 ring-white" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Section at Bottom */}
        <div className={`p-4 border-t border-[#E5E7EB] shrink-0 ${collapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-semibold text-slate-600 hover:text-[#EF4444] hover:bg-red-50/50 w-full transition-all duration-200 group ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            <LogOut size={20} className="shrink-0 text-slate-500 group-hover:text-[#EF4444]" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 1024px) {
          aside { 
            left: -300px !important; 
            width: 280px !important;
          }
          aside.mobile-open { left: 0 !important; }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
