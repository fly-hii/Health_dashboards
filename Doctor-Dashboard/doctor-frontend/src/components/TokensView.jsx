import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './TokensView.css';

export default function TokensView() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getQueue();
      if (res.success && res.queue.length > 0) {
        setQueue(res.queue);
        setSelectedApt(res.queue[0]); // default to first
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueue();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const getStepClass = (apt, stepIndex) => {
    // 1: Registration (checked_in)
    // 2: Waiting (waiting_for_vitals)
    // 3: Consultation (with_doctor)
    // 4: Pharmacy (consultation_done)
    // 5: Completed
    const statusMap = {
      'checked_in': 1,
      'waiting_for_vitals': 2,
      'vitals_done': 2,
      'with_doctor': 3,
      'consultation_done': 4,
    };

    const currentStep = statusMap[apt.status] || 1;
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return '';
  };

  const getEstTime = (apt) => {
    if (apt.status === 'checked_in') return '35 mins';
    if (apt.status === 'vitals_done') return '10 mins';
    if (apt.status === 'with_doctor') return 'Active Now';
    return '--';
  };

  return (
    <div className="tokens-view-container slide-up">
      <div className="view-title">
        <h3>Patient Tokens</h3>
        <p>Monitor token tracking and consultation progress for active clinic cases.</p>
      </div>

      <div className="tokens-layout-grid">
        {/* Left Side: Tokens list */}
        <div className="tokens-sidebar card">
          <h4>Active Tokens Queue</h4>
          <div className="tokens-list flex flex-col gap-2" style={{ marginTop: 14 }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
            ) : queue.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active tokens.</p>
            ) : (
              queue.map((apt, idx) => {
                const aptId = apt._id || apt.id || idx;
                const isSelected = (selectedApt?._id || selectedApt?.id) === (apt._id || apt.id);
                return (
                  <div 
                    key={aptId}
                    className={`token-item flex justify-between items-center card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedApt(apt)}
                    style={{ cursor: 'pointer', padding: '12px' }}
                  >
                    <div>
                      <strong>#{apt.tokenNumber}</strong>
                      <span className="token-patient-name" style={{ display: 'block', fontSize: 13 }}>
                        {apt.patient?.name}
                      </span>
                    </div>
                    <span className={`badge badge-${apt.status}`}>
                      {apt.status === 'vitals_done' ? 'Ready' : (apt.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Token Details (Matching mockup page!) */}
        <div className="token-details-container">
          {selectedApt ? (
            <div className="token-card-wrapper card">
              {/* Inner Mockup Card */}
              <div className="token-display-card">
                <span className="token-subtitle">Your Current Token</span>
                <h2 className="token-number-value">A-{selectedApt.tokenNumber}</h2>
                <span className="token-department">{selectedApt.doctor?.department || 'General Medicine'} - OPD</span>

                {/* Progress Steps (1 to 5) */}
                <div className="token-progress-tracker flex justify-between items-center">
                  <div className={`progress-step ${getStepClass(selectedApt, 1)}`}>
                    <span>1</span>
                    <label>Registration</label>
                  </div>
                  <div className="progress-line"></div>
                  <div className={`progress-step ${getStepClass(selectedApt, 2)}`}>
                    <span>2</span>
                    <label>Waiting</label>
                  </div>
                  <div className="progress-line"></div>
                  <div className={`progress-step ${getStepClass(selectedApt, 3)}`}>
                    <span>3</span>
                    <label>Consultation</label>
                  </div>
                  <div className="progress-line"></div>
                  <div className={`progress-step ${getStepClass(selectedApt, 4)}`}>
                    <span>4</span>
                    <label>Pharmacy</label>
                  </div>
                  <div className="progress-line"></div>
                  <div className={`progress-step ${getStepClass(selectedApt, 5)}`}>
                    <span>5</span>
                    <label>Completed</label>
                  </div>
                </div>

                {/* Estimated Time Info grid */}
                <div className="token-info-grid flex gap-4">
                  <div className="token-info-box card flex-1">
                    <span className="info-label">Estimated Wait Time</span>
                    <strong>{getEstTime(selectedApt)}</strong>
                  </div>
                  <div className="token-info-box card flex-1">
                    <span className="info-label">People Ahead</span>
                    <strong>
                      {queue.findIndex(q => (q._id || q.id) === (selectedApt._id || selectedApt.id)) !== -1
                        ? queue.findIndex(q => (q._id || q.id) === (selectedApt._id || selectedApt.id))
                        : '0'}
                    </strong>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="token-details-footer flex justify-between items-center" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="footer-label" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>Appointment Time</span>
                    <strong style={{ fontSize: 13 }}>{selectedApt.appointmentTime || 'N/A'}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="footer-label" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>Doctor</span>
                    <strong style={{ fontSize: 13 }}>{selectedApt.doctor?.name || 'Dr. Rohit Mehta'}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center" style={{ padding: '48px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Select an active token from the queue list to monitor status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
