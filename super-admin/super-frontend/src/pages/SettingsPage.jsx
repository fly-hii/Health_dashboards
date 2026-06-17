import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateProfile } from '../utils/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Profile form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileName || !profileEmail) {
      setProfileError('Name and email are required.');
      return;
    }

    setProfileLoading(true);
    try {
      const { data } = await updateProfile({ name: profileName, email: profileEmail });
      if (data.success) {
        setProfileSuccess('Profile updated successfully!');
        updateUser(data.user);
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
    if (themeName === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    // Notify sidebar and other active components
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPassSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Settings</h1>
          <p>Manage your profile, security credentials, and panel preferences</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28 }}>
          
          {/* Settings Sub-navigation */}
          <div className="card" style={{ padding: '16px 12px', height: 'fit-content' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', width: '100%', borderRadius: 8 }}
              >
                👤 Profile Details
              </button>
              <button 
                onClick={() => setActiveTab('password')}
                className={`btn ${activeTab === 'password' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', width: '100%', borderRadius: 8 }}
              >
                🔒 Change Password
              </button>
              <button 
                onClick={() => setActiveTab('theme')}
                className={`btn ${activeTab === 'theme' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', width: '100%', borderRadius: 8 }}
              >
                🎨 Website Theme
              </button>
            </div>
          </div>

          {/* Active Settings Panel */}
          <div className="card" style={{ padding: 28 }}>
                {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Profile Details</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                  Customize your Super Administrator account profile details.
                </p>

                {profileError && <div className="error-msg">{profileError}</div>}
                {profileSuccess && <div className="alert alert-success">{profileSuccess}</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'var(--gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 800, color: 'white',
                    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.2)'
                  }}>
                    {profileName?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600 }}>{profileName || 'Super Admin'}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Platform Administrator</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={profileEmail} 
                      onChange={(e) => setProfileEmail(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Security Role</label>
                    <div style={{ marginTop: 4 }}>
                      <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 12px' }}>SUPER_ADMIN</span>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={profileLoading}
                    style={{ width: 'fit-content' }}
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* CHANGE PASSWORD TAB */}
            {activeTab === 'password' && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Change Password</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                  Ensure your account is secure by using a strong, unique credential.
                </p>

                {passError && <div className="error-msg">{passError}</div>}
                {passSuccess && <div className="alert alert-success">{passSuccess}</div>}

                <form onSubmit={handlePasswordSubmit} style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={passLoading}
                    style={{ marginTop: 8, width: 'fit-content' }}
                  >
                    {passLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* WEBSITE THEME TAB */}
            {activeTab === 'theme' && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Website Theme</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                  Customize your workspace styling. Choose your preferred panel aesthetic.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, maxWidth: 600 }}>
                  
                  {/* Light Mode Selector */}
                  <div 
                    onClick={() => handleThemeChange('light')}
                    style={{
                      border: currentTheme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      background: currentTheme === 'light' ? 'rgba(2, 132, 199, 0.03)' : 'var(--surface)',
                      transition: 'all 0.2s ease',
                      boxShadow: currentTheme === 'light' ? '0 4px 20px rgba(2, 132, 199, 0.05)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>☀️ Light Mode</span>
                      {currentTheme === 'light' && <span style={{ color: 'var(--primary)', fontSize: 13 }}>● Selected</span>}
                    </div>
                    {/* Dummy Mockup */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, height: 80, padding: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: 6, height: '100%' }}>
                        <div style={{ width: 14, background: '#ffffff', borderRight: '1px solid #e2e8f0', height: '100%' }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ height: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2 }} />
                          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                            <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4 }} />
                            <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                      Clean slate & sky-blue details.
                    </p>
                  </div>

                  {/* Dark Mode Selector */}
                  <div 
                    onClick={() => handleThemeChange('dark')}
                    style={{
                      border: currentTheme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      background: currentTheme === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface)',
                      transition: 'all 0.2s ease',
                      boxShadow: currentTheme === 'dark' ? '0 4px 20px rgba(99, 102, 241, 0.05)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>🌙 Dark Mode</span>
                      {currentTheme === 'dark' && <span style={{ color: 'var(--primary)', fontSize: 13 }}>● Selected</span>}
                    </div>
                    {/* Dummy Mockup */}
                    <div style={{ background: '#0f0f1a', border: '1px solid #232340', borderRadius: 6, height: 80, padding: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: 6, height: '100%' }}>
                        <div style={{ width: 14, background: '#1a1a2e', borderRight: '1px solid #232340', height: '100%' }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ height: 10, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 2 }} />
                          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                            <div style={{ flex: 1, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 4 }} />
                            <div style={{ flex: 1, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                      Deep indigo & neon details.
                    </p>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
