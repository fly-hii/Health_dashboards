import React from 'react';
import './DashboardView.css';

/* ── normal-range helpers ── */
const vitalStatus = {
  pulse:    (v) => v >= 60 && v <= 100 ? 'Normal'  : v < 60 ? 'Low'      : 'High',
  systolic: (v) => v < 120             ? 'Optimal' : v < 130 ? 'Normal'  : v < 140 ? 'Elevated' : 'High',
  sugar:    (v) => v < 100             ? 'Normal'  : v < 126 ? 'Pre-Diabetic' : 'High',
  spo2:     (v) => v >= 95             ? 'Normal'  : v >= 90  ? 'Low'     : 'Critical',
};
const statusBadge = (label) => {
  if (label === 'Normal' || label === 'Optimal') return 'badge-completed';
  if (label === 'High' || label === 'Critical')  return 'badge-danger';
  return 'badge-yellow'; // Elevated / Low / Pre-Diabetic
};

export default function DashboardView({ profile, appointments, token, prescriptions, consultations, latestVitals, onViewTab }) {
  // Find the first upcoming appointment
  const upcomingAppt = appointments.find(appt => appt.status === 'Upcoming') || null;
  const activePrescriptionsCount = prescriptions.length;

  const calculateAge = (dobString) => {
    if (!dobString) return "32 Years";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Years`;
  };

  return (
    <div className="dashboard-view slide-up">
      <div className="dashboard-header">
        <h1 className="title">Dashboard</h1>
        <p className="subtitle">Welcome back! Here's your health overview.</p>
      </div>

      {/* Top Cards Grid */}
      <div className="overview-grid">
        {/* 1. Upcoming Appointment */}
        <div className="card status-card">
          <div className="card-tag">Upcoming Appointment</div>
          {upcomingAppt ? (
            <div className="card-content">
              <div className="flex items-center gap-2 mb-2">
                <div className="icon-badge info">
                  <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="card-highlight">{upcomingAppt.dateTime}</h4>
                  <p className="card-label-sub">{upcomingAppt.doctor}</p>
                </div>
              </div>
              <button onClick={() => onViewTab('appointments')} className="card-link text-info">View Details</button>
            </div>
          ) : (
            <div className="card-content empty-card">
              <p className="no-data-text">No upcoming appointments</p>
              <button onClick={() => onViewTab('book')} className="card-link text-info">Book Now</button>
            </div>
          )}
        </div>

        {/* 2. Current Token */}
        <div className="card status-card">
          <div className="card-tag">Current Token</div>
          {token && token.status !== 'Completed' ? (
            <div className="card-content">
              <div className="token-number-badge">{token.number}</div>
              <div className="token-stats-row">
                <span className="card-highlight">{token.estimatedWaitMinutes} mins</span>
                <span className="card-label-sub">{token.peopleAhead} ahead</span>
              </div>
              <button onClick={() => onViewTab('tokens')} className="card-link text-primary">View Token</button>
            </div>
          ) : (
            <div className="card-content empty-card">
              <p className="no-data-text">No active token</p>
              <button onClick={() => onViewTab('tokens')} className="card-link text-primary">Check History</button>
            </div>
          )}
        </div>

        {/* 3. Health Summary */}
        <div className="card status-card">
          <div className="card-tag">Health Summary</div>
          <div className="card-content">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="sum-title">Blood Group</p>
                <h4 className="sum-value">{profile.bloodGroup || 'O+'}</h4>
              </div>
              <div className="divider-line"></div>
              <div>
                <p className="sum-title">Age</p>
                <h4 className="sum-value">{calculateAge(profile.dob)}</h4>
              </div>
            </div>
            <button onClick={() => onViewTab('profile')} className="card-link text-primary">View Profile</button>
          </div>
        </div>

        {/* 4. Active Prescriptions */}
        <div className="card status-card">
          <div className="card-tag">Active Prescriptions</div>
          <div className="card-content">
            <div className="flex items-center gap-4 mb-2">
              <div className="presc-number-badge">{activePrescriptionsCount}</div>
              <div>
                <h4 className="card-highlight">Prescriptions</h4>
                <p className="card-label-sub">Available at pharmacy</p>
              </div>
            </div>
            <button onClick={() => onViewTab('prescriptions')} className="card-link text-primary">View Prescriptions</button>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <h3 className="section-title">Quick Actions</h3>
      <div className="quick-actions-grid">
        <button onClick={() => onViewTab('book')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-teal">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="action-details">
            <h4>Book Appointment</h4>
            <p>Schedule with your doctor</p>
          </div>
        </button>

        <button onClick={() => onViewTab('reports')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-blue">
            <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="action-details">
            <h4>Upload Reports</h4>
            <p>Share your medical reports</p>
          </div>
        </button>

        <button onClick={() => onViewTab('history')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-orange">
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="action-details">
            <h4>Health Records</h4>
            <p>View your health history</p>
          </div>
        </button>

        <button onClick={() => onViewTab('book')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-purple">
            <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="action-details">
            <h4>Find Doctors</h4>
            <p>Search by specialization</p>
          </div>
        </button>

        <button onClick={() => onViewTab('prescriptions')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-green">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="action-details">
            <h4>Prescriptions</h4>
            <p>View prescribed medicines</p>
          </div>
        </button>

        <button onClick={() => onViewTab('tokens')} className="card action-card flex items-center gap-4">
          <div className="action-icon bg-sky">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 8v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-8V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <div className="action-details">
            <h4>My Tokens</h4>
            <p>Live queue ticket tracker</p>
          </div>
        </button>
      </div>

      {/* Vitals Section */}
      <h3 className="section-title">Vitals & Health Metrics</h3>
      {latestVitals ? (
        <>
          <p className="subtitle" style={{ marginTop: '-12px', marginBottom: '12px', fontSize: '12px' }}>
            Last recorded: {new Date(latestVitals.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            &nbsp;&mdash;&nbsp;
            {new Date(latestVitals.recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="vitals-grid">
            {/* Heart Rate / Pulse */}
            <div className="card vital-card">
              <div className="vital-header flex justify-between items-center mb-2">
                <span className="vital-name">Heart Rate</span>
                <span className="vital-icon">❤️</span>
              </div>
              <div className="vital-body flex items-baseline gap-1">
                <h3 className="vital-value">{latestVitals.pulseRate ?? '—'}</h3>
                {latestVitals.pulseRate && <span className="vital-unit">bpm</span>}
              </div>
              {latestVitals.pulseRate && (
                <span className={`badge ${statusBadge(vitalStatus.pulse(latestVitals.pulseRate))} mt-2`} style={{ width: 'fit-content' }}>
                  {vitalStatus.pulse(latestVitals.pulseRate)}
                </span>
              )}
            </div>

            {/* Blood Pressure */}
            <div className="card vital-card">
              <div className="vital-header flex justify-between items-center mb-2">
                <span className="vital-name">Blood Pressure</span>
                <span className="vital-icon">🩺</span>
              </div>
              <div className="vital-body flex items-baseline gap-1">
                <h3 className="vital-value">
                  {latestVitals.bloodPressure?.systolic && latestVitals.bloodPressure?.diastolic
                    ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}`
                    : '—'}
                </h3>
                {latestVitals.bloodPressure?.systolic && <span className="vital-unit">mmHg</span>}
              </div>
              {latestVitals.bloodPressure?.systolic && (
                <span className={`badge ${statusBadge(vitalStatus.systolic(latestVitals.bloodPressure.systolic))} mt-2`} style={{ width: 'fit-content' }}>
                  {vitalStatus.systolic(latestVitals.bloodPressure.systolic)}
                </span>
              )}
            </div>

            {/* Blood Sugar */}
            <div className="card vital-card">
              <div className="vital-header flex justify-between items-center mb-2">
                <span className="vital-name">Blood Sugar</span>
                <span className="vital-icon">🩸</span>
              </div>
              <div className="vital-body flex items-baseline gap-1">
                <h3 className="vital-value">{latestVitals.bloodSugar ?? '—'}</h3>
                {latestVitals.bloodSugar && <span className="vital-unit">mg/dL</span>}
              </div>
              {latestVitals.bloodSugar && (
                <span className={`badge ${statusBadge(vitalStatus.sugar(latestVitals.bloodSugar))} mt-2`} style={{ width: 'fit-content' }}>
                  {vitalStatus.sugar(latestVitals.bloodSugar)}
                </span>
              )}
            </div>

            {/* SpO2 */}
            <div className="card vital-card">
              <div className="vital-header flex justify-between items-center mb-2">
                <span className="vital-name">SpO2</span>
                <span className="vital-icon">💨</span>
              </div>
              <div className="vital-body flex items-baseline gap-1">
                <h3 className="vital-value">{latestVitals.spo2 ?? '—'}</h3>
                {latestVitals.spo2 && <span className="vital-unit">%</span>}
              </div>
              {latestVitals.spo2 && (
                <span className={`badge ${statusBadge(vitalStatus.spo2(latestVitals.spo2))} mt-2`} style={{ width: 'fit-content' }}>
                  {vitalStatus.spo2(latestVitals.spo2)}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🩺</p>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>No vitals recorded yet</p>
          <p style={{ fontSize: '13px' }}>Your vitals will appear here once a nurse or admin records them.</p>
        </div>
      )}

      {/* Recent Consultations Table */}
      <div className="recent-consultations-section flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="section-title">Recent Consultations</h3>
          <button onClick={() => onViewTab('history')} className="view-all-link">View All</button>
        </div>
        
        <div className="card table-card">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Diagnosis</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {consultations.slice(0, 3).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.date}</td>
                    <td className="font-semibold">{item.doctorName || item.doctor}</td>
                    <td>{item.department}</td>
                    <td>{item.diagnosis}</td>
                    <td>
                      <button onClick={() => onViewTab('history')} className="view-link">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
