import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './OverviewView.css';

export default function OverviewView({ setActiveTab, user, onDiagnosePatient }) {
  const [stats, setStats] = useState({
    total: 0,
    waitingForVitals: 0,
    vitalsDone: 0,
    consulting: 0,
    completed: 0
  });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, queueRes] = await Promise.all([
        api.getStats(),
        api.getQueue()
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (queueRes.success) setQueue(queueRes.queue);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const nextPatient = queue.find(p => p.status === 'vitals_done') || queue.find(p => p.status === 'checked_in') || null;

  return (
    <div className="overview-container slide-up">
      {/* Page Header Title */}
      <div className="overview-view-header">
        <h2>Dashboard</h2>
        <p className="overview-view-subtitle">Welcome back! Here's your clinic overview.</p>
      </div>

      {/* 4 Cards Grid Row */}
      <section className="overview-cards-row">
        {/* Card 1: Next Patient */}
        <div className="overview-layout-card teal-card card">
          <div className="card-top flex items-center gap-3">
            <div className="card-icon-box green">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="card-heading-block">
              <span className="card-heading-label">Next Patient in Queue</span>
              <p className="card-heading-value">
                {nextPatient ? nextPatient.patient?.name : 'No patient waiting'}
              </p>
              {nextPatient && (
                <span className="card-heading-sub">Token: #{nextPatient.tokenNumber}</span>
              )}
            </div>
          </div>
          <button onClick={() => setActiveTab('appointments')} className="card-footer-link">
            View Queue
          </button>
        </div>

        {/* Card 2: Waiting for Vitals */}
        <div className="overview-layout-card card">
          <div className="card-top">
            <span className="card-heading-label">Waiting for Vitals</span>
            <p className="card-large-number">{loading ? '...' : stats.waitingForVitals}</p>
            <span className="card-meta-detail">Awaiting nurse entry</span>
          </div>
          <button onClick={() => setActiveTab('appointments')} className="card-footer-link">
            View Details
          </button>
        </div>

        {/* Card 3: Vitals Done */}
        <div className="overview-layout-card card">
          <div className="card-top">
            <span className="card-heading-label">Vitals Done (Ready)</span>
            <p className="card-large-number">{loading ? '...' : stats.vitalsDone}</p>
            <span className="card-meta-detail">Ready for consultation</span>
          </div>
          <button onClick={() => setActiveTab('appointments')} className="card-footer-link">
            View Queue
          </button>
        </div>

        {/* Card 4: Completed Consults */}
        <div className="overview-layout-card card">
          <div className="card-top">
            <span className="card-heading-label">Completed Consults</span>
            <p className="card-large-number">{loading ? '...' : stats.completed}</p>
            <span className="card-meta-detail">Finished today</span>
          </div>
          <button onClick={() => setActiveTab('appointments')} className="card-footer-link">
            View Prescriptions
          </button>
        </div>
      </section>

      {/* Quick Actions Row */}
      <section className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid-row">
          <button className="quick-action-box card flex items-center gap-3" onClick={() => setActiveTab('appointments')}>
            <div className="action-circle blue">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="action-content text-left">
              <strong>Patient Queue</strong>
              <span>Check clinic appointments</span>
            </div>
          </button>

          <button className="quick-action-box card flex items-center gap-3" onClick={() => setActiveTab('history')}>
            <div className="action-circle green">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="action-content text-left">
              <strong>Medical History</strong>
              <span>View clinical reports</span>
            </div>
          </button>

          <button className="quick-action-box card flex items-center gap-3" onClick={() => setActiveTab('notifications')}>
            <div className="action-circle yellow">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="action-content text-left">
              <strong>Notifications</strong>
              <span>Clinical alert logs</span>
            </div>
          </button>

          <button className="quick-action-box card flex items-center gap-3" onClick={() => setActiveTab('profile')}>
            <div className="action-circle purple">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="action-content text-left">
              <strong>Update Profile</strong>
              <span>Change details & email</span>
            </div>
          </button>
        </div>
      </section>

      {/* Recent consultations list table */}
      <section className="recent-consultations-section card">
        <div className="recent-header flex justify-between items-center">
          <h3>Recent Consultations</h3>
          <button onClick={() => setActiveTab('appointments')} className="text-theme font-semibold">
            View All
          </button>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <span className="loading-spinner"></span>
          </div>
        ) : queue.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>No consultations recorded yet today.</p>
        ) : (
          <div className="table-container" style={{ marginTop: 16 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Name</th>
                  <th>ID / Phone</th>
                  <th>Age/Gender</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 3).map((apt) => {
                  const patient = apt.patient || {};
                  return (
                    <tr key={apt._id}>
                      <td className="font-semibold text-primary">#{apt.tokenNumber}</td>
                      <td className="font-semibold">{patient.name || 'Unknown'}</td>
                      <td className="text-muted">{patient.patientId || patient.phone || 'N/A'}</td>
                      <td>{patient.age || 'N/A'} yrs / <span style={{ textTransform: 'capitalize' }}>{patient.gender}</span></td>
                      <td>
                        <span className={`badge badge-${apt.status}`}>
                          {apt.status === 'vitals_done' ? 'Ready for Doctor' : (apt.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {apt.status === 'vitals_done' || apt.status === 'with_doctor' ? (
                          <button 
                            onClick={() => onDiagnosePatient(apt)} 
                            className="btn btn-primary btn-sm"
                          >
                            Diagnose
                          </button>
                        ) : (
                          <button 
                            onClick={() => setActiveTab('appointments')} 
                            className="btn btn-secondary btn-sm"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
