import React, { useState } from 'react';
import './Header.css';

export default function Header({ 
  profile, 
  notifications, 
  onReadNotification, 
  onReadAll, 
  onProfileClick,
  activeTab,
  setActiveTab
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const unreadNotifications = notifications.filter(n => !n.read);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'book', label: 'Book Appointment' },
    { id: 'appointments', label: 'My Appointments' },
    { id: 'tokens', label: 'My Tokens' },
    { id: 'history', label: 'Medical History' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'reports', label: 'Reports' },
    { id: 'notifications', label: 'Notifications', badge: true }
  ];

  return (
    <header className="unified-header flex flex-col">
      {/* Top Bar: Logo, Search, User Info, Logout */}
      <div className="header-top flex justify-between items-center">
        {/* Logo */}
        <div className="logo-area" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="logo-text">{import.meta.env.VITE_HOSPITAL_NAME || 'CarePlus'}<span className="logo-subtext"> {import.meta.env.VITE_HOSPITAL_SUBTITLE || 'HOSPITAL'}</span></span>
        </div>

        {/* Search Input */}
        <div className="search-bar">
          <svg className="w-5 h-5 search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search appointments, doctors, reports..." className="search-input" />
        </div>

        {/* Actions */}
        <div className="header-actions flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="notification-container">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
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
                      <div key={n.id} className={`dropdown-item ${n.read ? 'read' : 'unread'}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className="notif-msg">{n.message}</p>
                          <button onClick={() => onReadNotification(n.id)} className="delete-notif-btn" title="Dismiss">
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

          {/* User Profile */}
          <div className="user-profile flex items-center gap-2" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
            <div className="profile-text text-right">
              <span className="welcome-tag">Hi, {profile.fullName || 'User'}</span>
            </div>
            <div className="profile-avatar">
              <img 
                src={(profile.profileImage && !profile.profileImage.includes('localhost') ? profile.profileImage : null) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                alt="User Profile" 
                className="avatar-img"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Horizontal Navigation Menu */}
      <div className="header-nav-container">
        <nav className="header-nav flex items-center">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
                {item.badge && unreadNotifications.length > 0 && (
                  <span className="nav-badge-dot"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
