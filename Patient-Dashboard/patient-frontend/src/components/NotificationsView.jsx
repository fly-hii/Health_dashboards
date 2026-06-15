import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import NotificationDetailsView from './NotificationDetailsView';
import './NotificationsView.css';

export default function NotificationsView({
  initialSelectedId,
  onClearDeepLink,
  onNotificationStatusChange,
  onViewTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Selection state for deep link / details
  const [selectedNotifId, setSelectedNotifId] = useState(initialSelectedId || null);

  useEffect(() => {
    if (initialSelectedId) setSelectedNotifId(initialSelectedId);
  }, [initialSelectedId]);

  useEffect(() => {
    if (selectedNotifId) {
      window.history.pushState(null, '', `/patient/notifications/${selectedNotifId}`);
    } else {
      window.history.pushState(null, '', '/patient/notifications');
    }
  }, [selectedNotifId]);

  // Main data fetcher
  const loadNotifications = (page, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    const filters = {
      search: searchQuery,
      type: activeSubTab === 'All' ? '' : activeSubTab,
      startDate,
      endDate,
      page,
      limit: 5
    };

    api.getPatientNotifications(filters)
      .then(res => {
        if (res.success) {
          if (append) {
            setNotifications(prev => {
              // Deduplicate by _id
              const existingIds = new Set(prev.map(item => item._id));
              const filteredNew = res.notifications.filter(item => !existingIds.has(item._id));
              return [...prev, ...filteredNew];
            });
          } else {
            setNotifications(res.notifications);
          }
          setTotalPages(res.pagination.totalPages);
          setCurrentPage(res.pagination.page);
        }
      })
      .catch(err => console.error('Error loading notifications:', err))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  // Reload when tab, date range changes
  useEffect(() => {
    setCurrentPage(1);
    loadNotifications(1, false);
  }, [activeSubTab, startDate, endDate]);

  // Debounce search query changes
  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage(1);
      loadNotifications(1, false);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Socket listener for real-time alerts
  useEffect(() => {
    const handleSocketNotif = () => {
      loadNotifications(1, false);
    };
    window.addEventListener('new-notification', handleSocketNotif);
    return () => window.removeEventListener('new-notification', handleSocketNotif);
  }, [searchQuery, activeSubTab, startDate, endDate]);

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      loadNotifications(currentPage + 1, true);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setActiveSubTab('All');
  };

  // Maps notifications type to visual icons and colors matching screenshots exactly
  const getNotificationIcon = (type) => {
    const t = (type || '').toLowerCase();
    
    if (t === 'appointments' || t === 'appointment') {
      return (
        <div className="notif-circle-icon notif-circle-icon--appointments">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    if (t === 'tokens' || t === 'token') {
      return (
        <div className="notif-circle-icon notif-circle-icon--tokens">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
    }
    if (t === 'prescriptions' || t === 'prescription') {
      return (
        <div className="notif-circle-icon notif-circle-icon--prescriptions">
          {/* Rx Document style representation */}
          <span className="notif-rx-text">Rx</span>
        </div>
      );
    }
    if (t === 'reminders' || t === 'reminder') {
      return (
        <div className="notif-circle-icon notif-circle-icon--reminders">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    // Default / Health Article
    return (
      <div className="notif-circle-icon notif-circle-icon--articles">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  };

  const hasActiveFilters = searchQuery || startDate || endDate;

  // Detail view route match
  if (selectedNotifId) {
    return (
      <NotificationDetailsView
        notificationId={selectedNotifId}
        onBack={() => {
          setSelectedNotifId(null);
          if (onClearDeepLink) onClearDeepLink();
        }}
        onNotificationStatusChange={onNotificationStatusChange}
        onViewTab={onViewTab}
      />
    );
  }

  return (
    <div className="notif-page slide-up">
      {/* Header */}
      <div className="notif-page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="notif-page-title">Notifications</h1>
            <p className="notif-page-subtitle">Stay updated with your appointments and health.</p>
          </div>
          
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`notif-filter-toggle-btn ${hasActiveFilters ? 'active' : ''}`}
            title="Toggle Filters"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {hasActiveFilters && <span className="notif-active-dot" />}
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="notif-tab-bar">
        {['All', 'Appointments', 'Reminders', 'Alerts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`notif-tab-btn ${activeSubTab === tab ? 'notif-tab-btn--active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Optional Filters Panel */}
      {showFilters && (
        <div className="notif-filters-panel card slide-up">
          <div className="notif-filters-grid">
            <div className="notif-filter-item">
              <label className="notif-filter-label">Search Keywords</label>
              <input
                type="text"
                placeholder="Search title, message..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="notif-filter-input"
              />
            </div>
            <div className="notif-filter-item">
              <label className="notif-filter-label">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="notif-filter-input"
              />
            </div>
            <div className="notif-filter-item">
              <label className="notif-filter-label">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="notif-filter-input"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="notif-filters-footer">
              <button onClick={handleResetFilters} className="notif-clear-btn">
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Notifications Card List Container */}
      <div className="notif-list-card">
        {loading ? (
          <div className="notif-loading-state">
            <div className="notif-spinner" />
            <p className="notif-loading-text">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">🔔</div>
            <h3 className="notif-empty-title">No Notifications Found</h3>
            <p className="notif-empty-desc">
              {hasActiveFilters 
                ? 'Try modifying your search or filters to locate your notification.' 
                : 'You have no alerts or reminders at the moment.'}
            </p>
          </div>
        ) : (
          <div className="notif-items-list">
            {notifications.map((n) => {
              const isUnread = n.status === 'unread' || !n.read;
              const formattedDate = n.createdAt
                ? new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
              const formattedTime = n.createdAt
                ? new Date(n.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : n.time || '';

              return (
                <div
                  key={n._id}
                  onClick={() => setSelectedNotifId(n.notifId || n._id)}
                  className={`notif-item-row flex justify-between items-center ${isUnread ? 'notif-item-row--unread' : 'notif-item-row--read'}`}
                >
                  <div className="flex items-center gap-4 text-left">
                    {getNotificationIcon(n.type)}
                    <div>
                      <h4 className="notif-item-title">{n.message}</h4>
                      {/* Sub message optionally displaying the title or extra details */}
                      <span className="notif-item-subtitle">
                        {formattedDate ? `${formattedDate}, ${formattedTime}` : formattedTime}
                      </span>
                    </div>
                  </div>

                  <div className="notif-item-right flex items-center gap-4">
                    <span className="notif-date-badge">
                      {formattedDate ? `${formattedDate}, ${formattedTime}` : formattedTime}
                    </span>
                    <svg className="notif-chevron-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}

            {/* Load More Button inside the Card Container */}
            {currentPage < totalPages && (
              <div className="notif-load-more-box">
                <button
                  onClick={handleLoadMore}
                  className="notif-load-more-btn"
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <div className="notif-small-spinner" />
                  ) : (
                    <>
                      Load More 
                      <span className="chevron-down">∨</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
