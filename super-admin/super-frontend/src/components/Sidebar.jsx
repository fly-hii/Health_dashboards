import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  ScrollText, 
  Settings, 
  LogOut,
  Menu
} from 'lucide-react';

const navItems = [
  { to: '/',              icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/hospitals',     icon: <Building2 size={18} />,       label: 'Hospitals' },
  { to: '/subscriptions', icon: <CreditCard size={18} />,      label: 'Subscription Prices' },
  { to: '/analytics',     icon: <TrendingUp size={18} />,      label: 'Analytics' },
  { to: '/audit',         icon: <ScrollText size={18} />,      label: 'Audit Logs' },
];

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClose = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={handleClose} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-badge">
            <div className="logo-icon">
              <Activity size={20} color="white" />
            </div>
            <div className="logo-text">
              <h2>CarePlus</h2>
              <span>Super Admin Panel</span>
            </div>
          </div>
          {onToggleCollapse && (
            <button 
              className="sidebar-toggle-btn text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifycontent: 'center', padding: '6px', borderRadius: '6px'
              }}
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleClose}
            >
              <span className="icon">{item.icon}</span>
              <span className="nav-item-text">{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section-title" style={{ marginTop: 16 }}>System</div>
          <NavLink
            to="/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={handleClose}
          >
            <span className="icon"><Settings size={18} /></span>
            <span className="nav-item-text">Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gradient)',
              display: 'flex', alignItems: 'center', justify-content: 'center',
              fontWeight: 700, color: 'white', fontSize: 14,
              flexShrink: 0
            }}>
              {user?.name?.[0] || 'S'}
            </div>
            <div className="user-details">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.name || 'Super Admin'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Super Administrator</div>
            </div>
          </div>
          <button 
            className="btn btn-ghost" 
            title={isCollapsed ? "Logout" : undefined}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }} 
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
