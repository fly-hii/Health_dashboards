import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateProfile } from '../utils/api';
import { 
  User, 
  Lock, 
  Palette, 
  Camera, 
  Eye, 
  EyeOff, 
  Check, 
  Sun, 
  Moon, 
  Save, 
  RefreshCw,
  X
} from 'lucide-react';

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

  // Password show/hide state
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileImage(user.profile_image || '');
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

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
      const { data } = await updateProfile({ 
        name: profileName, 
        email: profileEmail,
        profileImage
      });
      if (data.success) {
        setProfileSuccess('Profile updated successfully!');
        updateUser(data.user);
        setIsEditMode(false);
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
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Topbar / Page Header */}
      <div className="topbar" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '0 28px' }}>
        <div className="topbar-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your profile, security credentials, and panel preferences</p>
        </div>
      </div>

      <div className="page-body" style={{ padding: '28px' }}>
        
        {/* Horizontal Navigation Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('profile')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'profile' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: activeTab === 'profile' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'profile' ? 'white' : 'var(--text-muted)',
              boxShadow: activeTab === 'profile' ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={15} />
            Profile Details
          </button>
          <button 
            onClick={() => setActiveTab('password')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'password' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: activeTab === 'password' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'password' ? 'white' : 'var(--text-muted)',
              boxShadow: activeTab === 'password' ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Lock size={15} />
            Change Password
          </button>
          <button 
            onClick={() => setActiveTab('theme')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'theme' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: activeTab === 'theme' ? 'var(--primary)' : 'var(--surface)',
              color: activeTab === 'theme' ? 'white' : 'var(--text-muted)',
              boxShadow: activeTab === 'theme' ? '0 4px 12px rgba(2, 132, 199, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Palette size={15} />
            Website Theme
          </button>
        </div>

        {/* Tab Content Card Container */}
        <div className="card" style={{ 
          padding: '36px', 
          border: '1px solid var(--border)', 
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Profile Details</h3>
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: 'var(--primary)'
                    }}
                  >
                    <User size={14} /> Edit Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      if (user) {
                        setProfileName(user.name || '');
                        setProfileEmail(user.email || '');
                        setProfileImage(user.profile_image || '');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {profileError && <div className="error-msg" style={{ marginBottom: 24 }}>{profileError}</div>}
              {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 24 }}>{profileSuccess}</div>}

              <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                
                {/* Left Side: Circular Avatar & Upload Controls */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  width: 180, 
                  flexShrink: 0 
                }}>
                  <div 
                    onClick={() => isEditMode && document.getElementById('avatar-upload').click()}
                    style={{ 
                      width: 130, 
                      height: 130, 
                      borderRadius: '50%', 
                      border: '3px solid var(--border)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      background: 'var(--surface2)',
                      marginBottom: 16,
                      cursor: isEditMode ? 'pointer' : 'default',
                      position: 'relative'
                    }}
                  >
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'var(--gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 48, fontWeight: 800, color: 'white'
                      }}>
                        {profileName?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                  </div>

                  {isEditMode && (
                    <label 
                      htmlFor="avatar-upload" 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--surface)', 
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        borderRadius: 10,
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.05)',
                        transition: 'all 0.2s ease',
                        marginBottom: 10
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--primary)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                    >
                      <Camera size={14} />
                      Change Photo
                    </label>
                  )}
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    style={{ display: 'none' }} 
                    disabled={!isEditMode}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    JPG, PNG supported.<br />S3 Upload Integration.
                  </span>
                </div>

                {/* Right Side: Two-Column Form Field Grid */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '20px 24px', 
                    marginBottom: 32 
                  }}>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Full Name
                      </label>
                      {isEditMode ? (
                        <input 
                          type="text" 
                          value={profileName} 
                          onChange={(e) => setProfileName(e.target.value)} 
                          style={{ borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 500, padding: '10px 0', color: 'var(--text)' }}>{profileName}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Email Address
                      </label>
                      {isEditMode ? (
                        <input 
                          type="email" 
                          value={profileEmail} 
                          onChange={(e) => setProfileEmail(e.target.value)} 
                          style={{ borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 500, padding: '10px 0', color: 'var(--text)' }}>{profileEmail}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Role
                      </label>
                      <input 
                        type="text" 
                        disabled 
                        value="Super Administrator"
                        style={{ borderRadius: 10, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 13, border: '1px solid var(--border)' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Access Level
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 40 }}>
                        <span className="badge badge-success" style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          SUPER_ADMIN
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Save Button Align Right */}
                  {isEditMode && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={profileLoading}
                        style={{ 
                          borderRadius: 10, 
                          padding: '12px 28px', 
                          fontSize: 13,
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8
                        }}
                      >
                        <Save size={15} />
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}

                </div>

              </div>
            </form>
          )}

          {/* CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              {passError && <div className="error-msg" style={{ marginBottom: 24 }}>{passError}</div>}
              {passSuccess && <div className="alert alert-success" style={{ marginBottom: 24 }}>{passSuccess}</div>}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '20px 24px', 
                marginBottom: 32,
                maxWidth: 800
              }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Current Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showCurrentPass ? "text" : "password"} 
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{ paddingRight: 40, borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showNewPass ? "text" : "password"} 
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingRight: 40, borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showConfirmPass ? "text" : "password"} 
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingRight: 40, borderRadius: 10, background: 'var(--surface)', fontSize: 13 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Save Button Align Right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 800 }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={passLoading}
                  style={{ 
                    borderRadius: 10, 
                    padding: '12px 28px', 
                    fontSize: 13,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8
                  }}
                >
                  <RefreshCw size={15} className={passLoading ? "animate-spin" : ""} />
                  {passLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* WEBSITE THEME TAB */}
          {activeTab === 'theme' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, maxWidth: 640 }}>
                
                {/* Light Mode Selector */}
                <div 
                  onClick={() => handleThemeChange('light')}
                  style={{
                    border: currentTheme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    background: currentTheme === 'light' ? 'rgba(2, 132, 199, 0.03)' : 'var(--surface)',
                    transition: 'all 0.2s ease',
                    boxShadow: currentTheme === 'light' ? '0 10px 25px -5px rgba(2, 132, 199, 0.15)' : 'none',
                    transform: currentTheme === 'light' ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                      <Sun size={16} style={{ color: '#f59e0b' }} /> 
                      Light Mode
                    </span>
                    {currentTheme === 'light' ? (
                      <span style={{ 
                        background: 'var(--primary)', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: 20, height: 20, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 10
                      }}>
                        <Check size={12} />
                      </span>
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)' }} />
                    )}
                  </div>
                  {/* Dummy Mockup */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, height: 90, padding: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, height: '100%' }}>
                      <div style={{ width: 18, background: '#ffffff', borderRight: '1px solid #e2e8f0', height: '100%', borderRadius: 2 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 12, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3 }} />
                        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                          <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4 }} />
                          <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center', fontWeight: 500 }}>
                    Clean slate & sky-blue details.
                  </p>
                </div>

                {/* Dark Mode Selector */}
                <div 
                  onClick={() => handleThemeChange('dark')}
                  style={{
                    border: currentTheme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    background: currentTheme === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface)',
                    transition: 'all 0.2s ease',
                    boxShadow: currentTheme === 'dark' ? '0 10px 25px -5px rgba(2, 132, 199, 0.15)' : 'none',
                    transform: currentTheme === 'dark' ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                      <Moon size={16} style={{ color: '#818cf8' }} /> 
                      Dark Mode
                    </span>
                    {currentTheme === 'dark' ? (
                      <span style={{ 
                        background: 'var(--primary)', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: 20, height: 20, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: 10
                      }}>
                        <Check size={12} />
                      </span>
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)' }} />
                    )}
                  </div>
                  {/* Dummy Mockup */}
                  <div style={{ background: '#0f0f1a', border: '1px solid #232340', borderRadius: 8, height: 90, padding: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, height: '100%' }}>
                      <div style={{ width: 18, background: '#1a1a2e', borderRight: '1px solid #232340', height: '100%', borderRadius: 2 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 12, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 3 }} />
                        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                          <div style={{ flex: 1, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 4 }} />
                          <div style={{ flex: 1, background: '#1a1a2e', border: '1px solid #232340', borderRadius: 4 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center', fontWeight: 500 }}>
                    Deep indigo & neon details.
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
