import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/',          icon: '📊', label: 'Dashboard' },
  { to: '/hospitals', icon: '🏥', label: 'Hospitals' },
  { to: '/analytics', icon: '📈', label: 'Analytics' },
  { to: '/audit',     icon: '🔍', label: 'Audit Logs' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-badge">
          <div className="logo-icon">⚕️</div>
          <div className="logo-text">
            <h2>CarePlus</h2>
            <span>Super Admin Panel</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="nav-section-title" style={{ marginTop: 16 }}>System</div>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="icon">⚙️</span> Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: 'white', fontSize: 14,
          }}>
            {user?.name?.[0] || 'S'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.name || 'Super Admin'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Super Administrator</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
