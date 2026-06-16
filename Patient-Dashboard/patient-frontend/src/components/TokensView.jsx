import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import TokenDetailView from './TokenDetailView';
import './TokensView.css';

const STEPS = [
  { key: 'Registration', label: 'Registration', num: 1 },
  { key: 'Waiting',       label: 'Vitals',         num: 2 },
  { key: 'Consultation',  label: 'Consultation',  num: 3 },
  { key: 'Pharmacy',      label: 'Pharmacy',      num: 4 },
  { key: 'Completed',     label: 'Completed',     num: 5 },
];

const STATUS_OPTIONS = [
  { value: 'all',          label: 'All Statuses'  },
  { value: 'Completed',    label: 'Completed'     },
  { value: 'Cancelled',    label: 'Cancelled'     },
  { value: 'Waiting',      label: 'Waiting'       },
  { value: 'Consultation', label: 'Consultation'  },
  { value: 'Pharmacy',     label: 'Pharmacy'      },
];

const STATUS_META = {
  Completed:    { cls: 'tv-badge--completed',    label: 'Completed'    },
  Cancelled:    { cls: 'tv-badge--cancelled',    label: 'Cancelled'    },
  Waiting:      { cls: 'tv-badge--waiting',      label: 'Waiting'      },
  Consultation: { cls: 'tv-badge--consultation', label: 'Consultation' },
  Pharmacy:     { cls: 'tv-badge--pharmacy',     label: 'Pharmacy'     },
};

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META['Completed'];
}

function Toast({ toasts }) {
  return (
    <div className="tv-toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`tv-toast tv-toast--${t.type}`}>
          <span className="tv-toast__icon">
            {t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span className="tv-toast__msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function TokensView({ token: initialToken, pastTokens: initialPastTokens, onRefresh }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab]             = useState('current');
  const [token, setToken]                     = useState(initialToken);
  const [pastTokens, setPastTokens]           = useState(initialPastTokens || []);
  const [refreshing, setRefreshing]           = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [toasts, setToasts]                   = useState([]);

  // ── Filter / dropdown state ──────────────────────────────
  const [statusFilter, setStatusFilter]       = useState('all');
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const dropdownRef                           = useRef(null);

  const socketRef  = useRef(null);
  const toastIdRef = useRef(0);

  // Sync props → state
  useEffect(() => { setToken(initialToken); }, [initialToken]);
  useEffect(() => { setPastTokens(initialPastTokens || []); }, [initialPastTokens]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Toast helper
  const showToast = (message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Socket.IO real-time events
  useEffect(() => {
    if (!user?._id) return;
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const derivedSocketUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : 'http://localhost:5050';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || derivedSocketUrl;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.emit('join', user._id);

    socket.on('TOKEN_CREATED',      (data) => { showToast(`Token ${data.tokenNumber} generated for ${data.department}!`, 'success'); refreshTokenData(); });
    socket.on('token_generated',    ()     => refreshTokenData());
    socket.on('TOKEN_CALLED',       (data) => { showToast(`Your token ${data.tokenNumber} is being called!`, 'warning'); refreshTokenData(); });
    socket.on('QUEUE_UPDATED',      ()     => refreshTokenData());
    socket.on('DOCTOR_DELAYED',     (data) => { showToast(data.message || 'Doctor is slightly delayed. Wait time updated.', 'info'); refreshTokenData(); });
    socket.on('CONSULTATION_STARTED', ()   => { showToast('Your consultation has started!', 'success'); refreshTokenData(); });
    socket.on('PHARMACY_READY',     ()     => { showToast('Your prescription is ready at the pharmacy!', 'success'); refreshTokenData(); });
    socket.on('VISIT_COMPLETED',    ()     => { showToast('Your visit is complete. Thank you!', 'success'); refreshTokenData(); });
    socket.on('appointment_confirmed', ()  => refreshTokenData());
    socket.on('NEW_NOTIFICATION',   ()     => refreshTokenData());

    return () => socket.disconnect();
  }, [user?._id]);

  const refreshTokenData = async () => {
    try {
      const [cur, past] = await Promise.all([api.getCurrentToken(), api.getPastTokens()]);
      setToken(cur);
      setPastTokens(past || []);
    } catch { /* silent */ }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh()
      .then(() => refreshTokenData())
      .catch(() => {})
      .finally(() => setTimeout(() => setRefreshing(false), 600));
  };

  // Filtered past tokens
  const filteredPastTokens = pastTokens.filter(t =>
    statusFilter === 'all' || (t.status || 'Completed') === statusFilter
  );

  const selectedStatusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'All Statuses';
  const currentStepIndex = token
    ? (token.status === 'Completed' ? 5 : STEPS.findIndex(s => s.key === token.status))
    : -1;

  if (selectedTokenId) {
    return <TokenDetailView tokenId={selectedTokenId} onBack={() => setSelectedTokenId(null)} />;
  }

  return (
    <div className="tv-root slide-up">
      <Toast toasts={toasts} />

      {/* Page Header */}
      <div className="tv-page-header">
        <h1 className="tv-page-title">My Tokens</h1>
        <p className="tv-page-subtitle">View your current and past tokens.</p>
      </div>

      {/* Tab Bar */}
      <div className="tv-tab-bar">
        {[
          { id: 'current', label: 'Current Token' },
          { id: 'past',    label: 'Past Tokens'   },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tv-tab-btn ${activeTab === tab.id ? 'tv-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── CURRENT TOKEN ─── */}
      {activeTab === 'current' && (
        <div className="tv-section fade-in">
          {token ? (
            <div className="tv-main-card">

              {/* ── Top: Token number + queue stats ── */}
              <div className="tv-card-top">
                {/* Token identity */}
                <div className="tv-token-identity">
                  <span className="tv-token-label">Your Current Token</span>
                  <span className="tv-token-number">{token.number}</span>
                  <span className="tv-token-dept">{token.department}</span>
                </div>

                {/* Divider */}
                <div className="tv-vdivider" />

                {/* Wait time */}
                <div className="tv-stat-block">
                  <span className="tv-stat-label">Estimated Wait Time</span>
                  <span className="tv-stat-value">{token.estimatedWaitMinutes} mins</span>
                </div>

                {/* Divider */}
                <div className="tv-vdivider" />

                {/* People ahead */}
                <div className="tv-stat-block">
                  <span className="tv-stat-label">People Ahead</span>
                  <span className="tv-stat-value">{token.peopleAhead}</span>
                </div>

                {/* Queue illustration */}
                <div className="tv-queue-illustration">
                  <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="tv-queue-svg">
                    {/* Person 1 */}
                    <circle cx="20" cy="18" r="7" stroke="#CBD5E1" strokeWidth="2"/>
                    <path d="M8 42c0-6.627 5.373-12 12-12h0c6.627 0 12 5.373 12 12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
                    {/* Person 2 */}
                    <circle cx="40" cy="14" r="7" stroke="#CBD5E1" strokeWidth="2"/>
                    <path d="M28 38c0-6.627 5.373-12 12-12h0c6.627 0 12 5.373 12 12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
                    {/* Person 3 */}
                    <circle cx="60" cy="18" r="7" stroke="#CBD5E1" strokeWidth="2"/>
                    <path d="M48 42c0-6.627 5.373-12 12-12h0c6.627 0 12 5.373 12 12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* ── Progress stepper ── */}
              <div className="tv-stepper">
                {STEPS.map((step, idx) => {
                  const isDone    = idx < currentStepIndex;
                  const isActive  = idx === currentStepIndex;
                  const isUpcoming = idx > currentStepIndex;
                  return (
                    <React.Fragment key={step.key}>
                      <div className={`tv-step ${isDone ? 'tv-step--done' : ''} ${isActive ? 'tv-step--active' : ''} ${isUpcoming ? 'tv-step--upcoming' : ''}`}>
                        <div className={`tv-step-circle ${isActive ? 'tv-step-circle--pulse' : ''}`}>
                          {isDone ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7l4 4 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span>{step.num}</span>
                          )}
                        </div>
                        <span className={`tv-step-label ${isActive ? 'tv-step-label--active' : ''}`}>{step.label}</span>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className={`tv-step-connector ${isDone ? 'tv-step-connector--done' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* ── Appointment & Doctor info cards ── */}
              <div className="tv-info-grid">
                <div className="tv-info-card">
                  <div className="tv-info-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F9D8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8"  y1="2" x2="8"  y2="6"/>
                      <line x1="3"  y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <span className="tv-info-label">Appointment Time</span>
                    <span className="tv-info-value">{token.appointmentTime}</span>
                  </div>
                </div>

                <div className="tv-info-card">
                  <div className="tv-info-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F9D8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div>
                    <span className="tv-info-label">Doctor</span>
                    <span className="tv-info-value">{token.doctor}</span>
                  </div>
                </div>
              </div>

              {/* ── Footer: note + refresh button ── */}
              <div className="tv-card-footer">
                <span className="tv-footer-note">
                  {token.status === 'Completed'
                    ? '✅ Appointment completed. Thank you!'
                    : token.status === 'Pharmacy'
                    ? '✅ Consultation complete. Please proceed to the pharmacy to pick up your prescription.'
                    : (token.status === 'Consultation' || (token.status === 'Waiting' && token.isCompleted))
                    ? '✅ Nurse check complete. Please proceed to the consultation room.'
                    : 'You will be notified when your token is about to be called.'}
                </span>
                <button
                  className="tv-refresh-btn"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <svg className="tv-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  )}
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

            </div>
          ) : (
            /* ── Empty state ── */
            <div className="tv-empty-card">
              <div className="tv-empty-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                </svg>
              </div>
              <h3 className="tv-empty-title">No Active Token</h3>
              <p className="tv-empty-desc">
                You do not have any active OPD token queue tickets. Book an appointment to generate a token.
              </p>
              <button className="tv-check-btn" onClick={handleRefresh} disabled={refreshing}>
                {refreshing && (
                  <svg className="tv-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                )}
                Check Queue Status
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── PAST TOKENS ─── */}
      {activeTab === 'past' && (
        <div className="tv-section fade-in">

          {/* ── Toolbar: summary + status dropdown ── */}
          <div className="tv-toolbar">
            <div className="tv-toolbar-left">
              <span className="tv-toolbar-count">
                {filteredPastTokens.length} token{filteredPastTokens.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && <span className="tv-toolbar-filtered"> · filtered</span>}
              </span>
            </div>

            <div className="tv-toolbar-right">
              {/* Status filter dropdown */}
              <div className="tv-dropdown" ref={dropdownRef}>
                <button
                  className={`tv-dropdown-trigger ${dropdownOpen ? 'tv-dropdown-trigger--open' : ''}`}
                  onClick={() => setDropdownOpen(o => !o)}
                  type="button"
                >
                  {/* Filter icon */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  <span>{selectedStatusLabel}</span>
                  {/* Chevron */}
                  <svg
                    className={`tv-dropdown-chevron ${dropdownOpen ? 'tv-dropdown-chevron--open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="tv-dropdown-menu">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`tv-dropdown-item ${statusFilter === opt.value ? 'tv-dropdown-item--active' : ''}`}
                        onClick={() => { setStatusFilter(opt.value); setDropdownOpen(false); }}
                        type="button"
                      >
                        {opt.value !== 'all' && (
                          <span className={`tv-dd-dot tv-dd-dot--${opt.value.toLowerCase()}`} />
                        )}
                        {opt.label}
                        {statusFilter === opt.value && (
                          <svg className="tv-dd-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear filter pill */}
              {statusFilter !== 'all' && (
                <button
                  className="tv-clear-filter"
                  onClick={() => setStatusFilter('all')}
                  type="button"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Table or empty state ── */}
          {filteredPastTokens.length === 0 ? (
            <div className="tv-empty-card">
              <div className="tv-empty-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="tv-empty-title">
                {statusFilter === 'all' ? 'No Past Tokens' : `No "${selectedStatusLabel}" Tokens`}
              </h3>
              <p className="tv-empty-desc">
                {statusFilter === 'all'
                  ? 'Your token history will appear here after completed visits.'
                  : `No tokens match the "${selectedStatusLabel}" filter. Try a different status.`}
              </p>
              {statusFilter !== 'all' && (
                <button className="tv-check-btn" onClick={() => setStatusFilter('all')}>
                  Show All Tokens
                </button>
              )}
            </div>
          ) : (
            <div className="tv-table-card">
              <div className="tv-table-wrap">
                <table className="tv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Token Number</th>
                      <th>Department</th>
                      <th>Doctor</th>
                      <th>Visit Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPastTokens.map((t, idx) => {
                      const meta = getStatusMeta(t.status || 'Completed');
                      return (
                        <tr key={t._id || idx}>
                          <td className="tv-td-serial">{idx + 1}</td>
                          <td>
                            <span className="tv-token-num-cell">{t.number}</span>
                          </td>
                          <td>{t.department}</td>
                          <td>{t.doctor}</td>
                          <td>{t.date}</td>
                          <td>
                            <span className={`tv-badge ${meta.cls}`}>{meta.label}</span>
                          </td>
                          <td>
                            <button
                              className="tv-view-btn"
                              onClick={() => setSelectedTokenId(t._id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer summary */}
              <div className="tv-table-footer">
                Showing {filteredPastTokens.length} of {pastTokens.length} tokens
                {statusFilter !== 'all' && ` · Status: ${selectedStatusLabel}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
