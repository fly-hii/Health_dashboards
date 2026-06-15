import { useAuth } from '../../context/AuthContext';

const DarkModeToggle = () => {
  const { theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        width: 38, height: 38,
        borderRadius: 10,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        fontSize: '1.125rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--primary-500)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};

export default DarkModeToggle;
