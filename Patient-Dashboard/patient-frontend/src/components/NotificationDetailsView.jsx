import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from '../utils/toast';
import './NotificationDetailsView.css';

export default function NotificationDetailsView({
  notificationId,
  onBack,
  onNotificationStatusChange,
  onViewTab
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!notificationId) return;
    setLoading(true);
    setError(null);
    api.getNotificationById(notificationId)
      .then(res => {
        if (res.success) {
          setData(res);
        } else {
          setError(res.message || 'Failed to load notification details.');
        }
      })
      .catch(err => {
        console.error('Error fetching notification details:', err);
        setError(err.message || 'Failed to load notification details.');
      })
      .finally(() => setLoading(false));
  }, [notificationId]);

  const handleMarkAsRead = async () => {
    if (!data || actionLoading) return;
    setActionLoading(true);
    try {
      await api.markNotificationAsRead(notificationId);
      setData(prev => ({
        ...prev,
        notification: { ...prev.notification, status: 'read', read: true }
      }));
      if (onNotificationStatusChange) onNotificationStatusChange();
    } catch (err) {
      toast.error('Error updating status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (actionLoading) return;
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    setActionLoading(true);
    try {
      await api.deletePatientNotification(notificationId);
      if (onNotificationStatusChange) onNotificationStatusChange();
      onBack();
    } catch (err) {
      toast.error('Error deleting notification: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewRelatedRecord = () => {
    if (!data || !data.notification) return;
    const typeLower = (data.notification.type || '').toLowerCase();
    
    if (typeLower === 'appointments' || typeLower === 'appointment') {
      if (onViewTab) {
        onViewTab('appointments');
        if (data.relatedData && data.relatedData._id) {
          window.history.pushState(null, '', `/patient/appointments/${data.relatedData._id}`);
          // Force a popstate event to let App.jsx catch the deep link ID change
          window.dispatchEvent(new Event('popstate'));
        }
      }
    } else if (typeLower === 'prescriptions' || typeLower === 'prescription') {
      if (onViewTab) onViewTab('prescriptions');
    } else if (typeLower === 'tokens' || typeLower === 'token' || typeLower === 'alerts') {
      if (onViewTab) onViewTab('tokens');
    }
  };

  if (loading) {
    return (
      <div className="ndv-loading-state">
        <div className="ndv-spinner" />
        <p className="ndv-loading-text">Fetching notification details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ndv-error-state">
        <div className="ndv-error-icon">⚠️</div>
        <p className="ndv-error-msg">{error || 'Notification details not found.'}</p>
        <button onClick={onBack} className="ndv-btn ndv-btn--outline">
          ← Back to Notifications
        </button>
      </div>
    );
  }

  const { notification, relatedData } = data;
  const isUnread = notification.status === 'unread' || !notification.read;

  const getPriorityClass = (priority) => {
    const p = (priority || 'normal').toLowerCase();
    if (p === 'high') return 'ndv-priority-badge ndv-priority-badge--high';
    if (p === 'low') return 'ndv-priority-badge ndv-priority-badge--low';
    return 'ndv-priority-badge ndv-priority-badge--normal';
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'appointments' || t === 'appointment') {
      return (
        <span className="ndv-type-icon ndv-type-icon--appointments">📅</span>
      );
    }
    if (t === 'tokens' || t === 'token') {
      return (
        <span className="ndv-type-icon ndv-type-icon--tokens">🔔</span>
      );
    }
    if (t === 'prescriptions' || t === 'prescription') {
      return (
        <span className="ndv-type-icon ndv-type-icon--prescriptions">💊</span>
      );
    }
    if (t === 'reminders' || t === 'reminder') {
      return (
        <span className="ndv-type-icon ndv-type-icon--reminders">⏰</span>
      );
    }
    return (
      <span className="ndv-type-icon ndv-type-icon--articles">📄</span>
    );
  };

  return (
    <div className="ndv-page slide-up">
      {/* Breadcrumb Header */}
      <div className="ndv-page-header">
        <div className="ndv-breadcrumb">
          <button onClick={onBack} className="ndv-back-btn">
            ← Back to Notifications
          </button>
        </div>
        <div className="ndv-header-row flex justify-between items-center">
          <div>
            <h1 className="ndv-page-title">Notification Details</h1>
            <p className="ndv-page-subtitle">View metadata and related details of your alert</p>
          </div>
          <div className="ndv-header-actions flex gap-2">
            {isUnread && (
              <button 
                onClick={handleMarkAsRead} 
                className="ndv-btn ndv-btn--primary"
                disabled={actionLoading}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Mark as Read
              </button>
            )}
            <button 
              onClick={handleDelete} 
              className="ndv-btn ndv-btn--danger"
              disabled={actionLoading}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="ndv-body-grid">
        
        {/* Left Column: Notification Meta */}
        <div className="ndv-col-left card">
          <div className="ndv-card-header flex items-center gap-3">
            {getTypeIcon(notification.type)}
            <div>
              <h3 className="ndv-card-title">{notification.title || 'System Notification'}</h3>
              <span className="ndv-card-time-text">
                {notification.createdAt 
                  ? new Date(notification.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                  : notification.time || 'Date Unavailable'}
              </span>
            </div>
          </div>
          
          <div className="ndv-card-body">
            <p className="ndv-message-body">{notification.message}</p>
            
            <div className="ndv-metadata-list">
              <div className="ndv-meta-row">
                <span className="ndv-meta-label">Notification Type</span>
                <span className="ndv-meta-value capitalize">{notification.type || 'Alert'}</span>
              </div>
              <div className="ndv-meta-row">
                <span className="ndv-meta-label">Priority</span>
                <span className={getPriorityClass(notification.priority)}>
                  {notification.priority || 'normal'}
                </span>
              </div>
              <div className="ndv-meta-row">
                <span className="ndv-meta-label">Status</span>
                <span className={`ndv-status-value ${isUnread ? 'ndv-status-value--unread' : 'ndv-status-value--read'}`}>
                  {isUnread ? 'Unread' : 'Read'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Related Entity details */}
        {relatedData && (
          <div className="ndv-col-right flex flex-col gap-4">
            
            <div className="ndv-card card">
              <div className="ndv-card-header ndv-card-header--secondary">
                <h4>Related Reference</h4>
              </div>
              
              <div className="ndv-card-body">
                {/* Appointment Block */}
                {((notification.type || '').toLowerCase().includes('appointment')) && (
                  <div className="ndv-related-content flex flex-col gap-3">
                    <div className="ndv-related-doctor-info flex items-center gap-3">
                      <div className="ndv-doctor-avatar-circle">
                        {relatedData.doctor?.name ? relatedData.doctor.name[0] : 'Dr'}
                      </div>
                      <div>
                        <h5>{relatedData.doctor?.name || 'Dr. Anjali Verma'}</h5>
                        <p>{relatedData.doctor?.specialization || relatedData.department || 'General Medicine'}</p>
                      </div>
                    </div>
                    <div className="ndv-data-rows mt-2">
                      <div className="ndv-data-row">
                        <span className="ndv-data-label">OPD Department</span>
                        <span className="ndv-data-val">{relatedData.department}</span>
                      </div>
                      <div className="ndv-data-row">
                        <span className="ndv-data-label">Appointment Time</span>
                        <span className="ndv-data-val">
                          {relatedData.appointmentDate ? new Date(relatedData.appointmentDate).toLocaleDateString('en-GB') : ''} @ {relatedData.appointmentTime}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription Block */}
                {((notification.type || '').toLowerCase().includes('prescription')) && (
                  <div className="ndv-related-content flex flex-col gap-3">
                    <div className="ndv-presc-header">
                      <h5>Prescription {relatedData.id || 'RXM2216'}</h5>
                      <p className="sub">Prescribed by {relatedData.doctor?.name || relatedData.doctor || 'Dr. Rohit Mehta'}</p>
                    </div>
                    
                    <div className="ndv-medicine-list-box mt-2">
                      <span className="ndv-data-label">Prescribed Medicines ({relatedData.medicines ? relatedData.medicines.length : 0})</span>
                      <ul className="ndv-meds-ul">
                        {relatedData.medicines ? relatedData.medicines.map((med, idx) => (
                          <li key={idx} className="ndv-med-li">💊 {med}</li>
                        )) : <li>No medicines details found.</li>}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Token Block */}
                {((notification.type || '').toLowerCase().includes('token') || (notification.type || '').toLowerCase().includes('alert') && relatedData.tokenNumber) && (
                  <div className="ndv-related-content flex flex-col gap-3">
                    <div className="ndv-token-hero flex justify-between items-center p-3 bg-teal-light rounded-xl">
                      <div>
                        <span className="tag">Token Number</span>
                        <h3>{relatedData.tokenNumber || relatedData.number}</h3>
                      </div>
                      <div className="text-right">
                        <span className="tag">Queue Status</span>
                        <h4 className="capitalize">{relatedData.status || 'Active'}</h4>
                      </div>
                    </div>
                    
                    <div className="ndv-data-rows mt-2">
                      <div className="ndv-data-row">
                        <span className="ndv-data-label">Queue Position</span>
                        <span className="ndv-data-val">{relatedData.peopleAhead !== undefined ? `${relatedData.peopleAhead} people ahead` : '1st'}</span>
                      </div>
                      <div className="ndv-data-row">
                        <span className="ndv-data-label">Estimated Wait Time</span>
                        <span className="ndv-data-val text-primary font-bold">
                          {relatedData.estimatedWaitMinutes || 15} mins
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* View Details routing button */}
                <button 
                  onClick={handleViewRelatedRecord} 
                  className="ndv-btn ndv-btn--primary ndv-btn--block mt-4 flex justify-center items-center gap-2"
                >
                  Go to Record Details
                  <span>→</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
