import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './NotificationsView.css';

export default function NotificationsView({ onDiagnosePatient }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all', 'queue', 'vitals', 'system'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        const rawNotifications = res.data || res.notifications || [];
        const normalized = rawNotifications.map(n => ({
          ...n,
          _id: n.id || n._id,
          isRead: n.status === 'read' || n.isRead || false
        }));
        setNotifications(normalized);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.markNotificationRead(id);
      if (res.success) {
        setNotifications(prev => 
          prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true, status: 'read' } : n)
        );
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeSubTab === 'all') return true;
    if (activeSubTab === 'queue') return notif.type === 'check_in' || notif.type === 'call_patient';
    if (activeSubTab === 'vitals') return notif.type === 'vitals_done' || notif.type === 'doctor_request';
    if (activeSubTab === 'system') return notif.priority === 'high' || notif.priority === 'critical';
    return true;
  });

  const getIcon = (notif) => {
    if (notif.isRead) {
      return (
        <div className="notif-badge-icon read">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (notif.priority === 'high' || notif.priority === 'critical') {
      return (
        <div className="notif-badge-icon critical">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    }

    if (notif.type === 'vitals_done') {
      return (
        <div className="notif-badge-icon vitals">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }

    // Default icon (check-in / other events)
    return (
      <div className="notif-badge-icon info">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    );
  };

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto notifications-view-container slide-up text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Notifications</h1>
          <p className="text-sm text-[#64748B] mt-1">Stay updated with your appointments, patient queue activities, and alerts.</p>
        </div>
      </div>

      <div className="notifications-card card">
        {/* Navigation filter tabs */}
        <div className="notifications-tabs-bar flex gap-2">
          <button 
            className={`tab-filter-btn ${activeSubTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('all')}
          >
            All
          </button>
          <button 
            className={`tab-filter-btn ${activeSubTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('queue')}
          >
            Appointments
          </button>
          <button 
            className={`tab-filter-btn ${activeSubTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('vitals')}
          >
            Reminders
          </button>
          <button 
            className={`tab-filter-btn ${activeSubTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('system')}
          >
            Alerts
          </button>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="loading-container">
            <span className="loading-spinner"></span>
            <p style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Retrieving notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-notifications flex flex-col items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-16 h-16 text-light" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h4>No Notifications</h4>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>You have no notifications matching this category.</p>
          </div>
        ) : (
          <div className="notifications-feed-list">
            {filteredNotifications.map((notif) => {
              const formattedDate = new Date(notif.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={notif._id} 
                  className={`notif-feed-item flex justify-between items-center ${notif.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notif-feed-left flex items-center gap-4">
                    {getIcon(notif)}
                    <div className="notif-feed-content">
                      <p className="notif-feed-title">{notif.title}</p>
                      <p className="notif-feed-message">{notif.message}</p>
                      <span className="notif-feed-time">{formattedDate}</span>
                    </div>
                  </div>

                  <div className="notif-feed-actions flex items-center gap-3">
                    {!notif.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
