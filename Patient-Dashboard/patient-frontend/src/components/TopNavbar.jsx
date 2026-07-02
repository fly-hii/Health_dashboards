import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/api';
import './TopNavbar.css';


export default function TopNavbar({ 
  notifications, 
  onReadNotification, 
  onReadAll, 
  activeTab,
  setActiveTab,
  onToggleSidebar
}) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const unreadNotifications = notifications.filter(n => !n.read);

  const displayName = user?.fullName || 'User';
  const avatarUrl = getImageUrl(user?.profileImage) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150";

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="top-navbar flex justify-between items-center">
      <button 
        className="mobile-toggle-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search Bar */}
      <div className="search-bar">
        <svg className="w-5 h-5 search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search appointments, doctors, reports..." className="search-input" />
      </div>

      {/* Right Actions */}
      <div className="navbar-actions flex items-center gap-4">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="bell-button flex items-center justify-center cursor-pointer"
          aria-label="Toggle dark mode"
          style={{ width: '40px', height: '40px' }}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-muted-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-muted-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Notifications Bell */}
        <div className="notification-container" style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setProfileDropdownOpen(false);
            }} 
            className="bell-button"
            aria-label="Toggle notifications"
          >
            <svg className="w-6 h-6 text-muted-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotifications.length > 0 && (
              <span className="bell-badge">{unreadNotifications.length}</span>
            )}
          </button>

          {dropdownOpen && (
            <div className="notifications-dropdown card fade-in">
              <div className="dropdown-header flex justify-between items-center">
                <h3>Notifications</h3>
                {unreadNotifications.length > 0 && (
                  <button onClick={() => { onReadAll(); setDropdownOpen(false); }} className="mark-all-btn">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="dropdown-list">
                {notifications.length === 0 ? (
                  <p className="no-notifs">No notifications</p>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div key={n.id || n._id} className={`dropdown-item ${n.read ? 'read' : 'unread'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="notif-msg">{n.message}</p>
                        <button onClick={() => onReadNotification(n.id || n._id)} className="delete-notif-btn" title="Dismiss">
                          &times;
                        </button>
                      </div>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="user-profile-container" style={{ position: 'relative' }}>
          <div 
            className="user-profile flex items-center gap-2" 
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setDropdownOpen(false);
            }} 
            style={{ cursor: 'pointer' }}
          >
            <div className="profile-text text-right">
              <span className="welcome-tag">Hi, {displayName}</span>
            </div>
            <div className="profile-avatar">
              <img 
                src={avatarUrl} 
                alt="User Profile" 
                className="avatar-img"
              />
            </div>
          </div>

          {profileDropdownOpen && (
            <div className="profile-dropdown card fade-in">
              <div className="dropdown-profile-info">
                <span className="dropdown-profile-name">{displayName}</span>
                <span className="dropdown-profile-email">{user?.email}</span>
              </div>
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  setProfileDropdownOpen(false);
                }} 
                className="dropdown-link-btn"
              >
                👤 My Profile
              </button>
              <button 
                onClick={() => {
                  setActiveTab('notifications');
                  setProfileDropdownOpen(false);
                }} 
                className="dropdown-link-btn"
              >
                🔔 Notifications
              </button>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
              <button 
                onClick={() => {
                  logout();
                  setProfileDropdownOpen(false);
                }} 
                className="dropdown-link-btn text-danger-btn"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
