import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import './TokenDetailView.css';

const STEPS = [
  { key: 'Registration', label: 'Registration' },
  { key: 'Waiting',      label: 'Waiting'      },
  { key: 'Consultation', label: 'Consultation' },
  { key: 'Pharmacy',     label: 'Pharmacy'     },
  { key: 'Completed',    label: 'Completed'    },
];

export default function TokenDetailView({ tokenId, onBack }) {
  const { user } = useAuth();
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      const data = await api.getTokenById(tokenId);
      setTokenData(data);
    } catch (err) {
      setError(err.message || 'Could not load token details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, [tokenId]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id && !user?._id) return;
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const derivedSocketUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : 'http://localhost:5050';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || derivedSocketUrl;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.emit('join_patient', user.id || user._id);
    const hospitalId = user.hospital_id || user.hospitalId;
    if (hospitalId) {
      socket.emit('join_hospital', hospitalId);
    }
    socket.on('QUEUE_UPDATED', fetchToken);
    socket.on('TOKEN_CALLED', fetchToken);
    socket.on('CONSULTATION_STARTED', fetchToken);
    socket.on('PHARMACY_READY', fetchToken);
    socket.on('VISIT_COMPLETED', fetchToken);
    return () => socket.disconnect();
  }, [user?._id, tokenId]);

  const currentStepIndex = tokenData ? STEPS.findIndex(s => s.key === tokenData.status) : -1;

  /* ── Timestamp helper — if token has timeline, use it ── */
  const getTimestamp = (key) => {
    if (!tokenData?.timeline) return null;
    return tokenData.timeline[key] || null;
  };

  if (loading) {
    return (
      <div className="tdv-root slide-up">
        <div className="tdv-loading">
          <div className="tdv-spinner" />
          <span>Loading token details…</span>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="tdv-root slide-up">
        <button className="tdv-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Tokens
        </button>
        <div className="tdv-error-card">
          <p>{error || 'Token not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tdv-root slide-up">
      {/* ── Back button ── */}
      <button className="tdv-back-btn" onClick={onBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Tokens
      </button>

      {/* ── Page title ── */}
      <div className="tdv-header">
        <h1 className="tdv-title">Token Details</h1>
        <p className="tdv-subtitle">Full details and timeline for your queue token.</p>
      </div>

      {/* ── Details card ── */}
      <div className="tdv-details-card">
        <h3 className="tdv-card-title">Token Information</h3>
        <div className="tdv-details-grid">
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Token Number</span>
            <span className="tdv-detail-value tdv-detail-value--primary">{tokenData.number}</span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Queue Status</span>
            <span className={`tdv-status-badge ${tokenData.status === 'Completed' ? 'tdv-status--completed' : 'tdv-status--active'}`}>
              {tokenData.status}
            </span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Department</span>
            <span className="tdv-detail-value">{tokenData.department}</span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Doctor</span>
            <span className="tdv-detail-value">{tokenData.doctor}</span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Appointment Date</span>
            <span className="tdv-detail-value">
              {tokenData.appointmentTime ? tokenData.appointmentTime.split(',')[0] : '—'}
            </span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Appointment Time</span>
            <span className="tdv-detail-value">
              {tokenData.appointmentTime ? (tokenData.appointmentTime.split(',')[1] || '').trim() : '—'}
            </span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">Estimated Wait Time</span>
            <span className="tdv-detail-value">{tokenData.estimatedWaitMinutes} mins</span>
          </div>
          <div className="tdv-detail-item">
            <span className="tdv-detail-label">People Ahead</span>
            <span className="tdv-detail-value">{tokenData.peopleAhead}</span>
          </div>
        </div>
      </div>

      {/* ── Timeline card ── */}
      <div className="tdv-timeline-card">
        <h3 className="tdv-card-title">Token Timeline</h3>
        <div className="tdv-timeline">
          {STEPS.map((step, idx) => {
            const isDone   = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const ts       = getTimestamp(step.key);
            return (
              <div key={step.key} className="tdv-tl-item">
                {/* Connector line */}
                <div className="tdv-tl-track">
                  <div className={`tdv-tl-circle ${isDone ? 'tdv-tl-circle--done' : ''} ${isActive ? 'tdv-tl-circle--active' : ''}`}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l4 4 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isActive ? (
                      <div className="tdv-tl-pulse" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`tdv-tl-line ${isDone ? 'tdv-tl-line--done' : ''}`} />
                  )}
                </div>

                {/* Content */}
                <div className="tdv-tl-content">
                  <span className={`tdv-tl-step-label ${isDone || isActive ? 'tdv-tl-step-label--active' : ''}`}>
                    {step.label}
                  </span>
                  <span className="tdv-tl-timestamp">
                    {ts ? ts : (isDone ? 'Completed' : isActive ? 'In progress…' : 'Pending')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
