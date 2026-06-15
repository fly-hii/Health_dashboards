import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import PatientHistoryView from './PatientHistoryView';
import './PatientDirectoryView.css';

export default function PatientDirectoryView() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.getPatients();
      if (res.success) {
        setPatients(res.patients);
      }
    } catch (err) {
      console.error("Failed to load patients list:", err);
      setError("Failed to retrieve patients from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredPatients = patients.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.patientId && p.patientId.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  if (selectedPatient) {
    return (
      <div className="patient-directory-timeline-wrapper slide-up">
        <div className="directory-header-actions flex justify-between items-center">
          <button onClick={() => setSelectedPatient(null)} className="btn btn-secondary flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Patient Directory</span>
          </button>
        </div>

        <div className="directory-history-container card" style={{ marginTop: 16 }}>
          <PatientHistoryView patientId={selectedPatient._id} patientName={selectedPatient.name} />
        </div>
      </div>
    );
  }

  return (
    <div className="patient-directory-container slide-up">
      <div className="view-title">
        <h3>Medical History Directory</h3>
        <p>Lookup clinical history timelines, diagnoses, and vitals for clinic patients</p>
      </div>

      {/* Directory Search & Table card */}
      <div className="directory-card card">
        <div className="directory-toolbar flex justify-between items-center gap-4">
          <div className="search-bar" style={{ width: '100%', maxWidth: '400px' }}>
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by name, patient ID, or phone..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={fetchPatients} className="btn btn-secondary" disabled={loading}>
            Refresh List
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <div className="loading-container">
            <span className="loading-spinner"></span>
            <p style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Fetching clinical directory...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-directory flex-col flex items-center justify-center" style={{ padding: '48px 16px', textAlign: 'center' }}>
            <svg viewBox="0 0 24 24" className="w-16 h-16 text-light" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h4 style={{ marginTop: 12 }}>No Patients Found</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>No records match your active search terms.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Contact Info</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p._id}>
                    <td className="font-semibold text-primary">{p.patientId || 'N/A'}</td>
                    <td className="font-semibold">{p.name || 'Unknown'}</td>
                    <td className="text-muted">{p.phone || p.email || 'N/A'}</td>
                    <td>{p.age} yrs / <span style={{ textTransform: 'capitalize' }}>{p.gender}</span></td>
                    <td>
                      <span className="blood-group-badge">{p.bloodGroup || 'Unknown'}</span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedPatient(p)} 
                        className="btn btn-secondary btn-sm"
                      >
                        View Medical History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
