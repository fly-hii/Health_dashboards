import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './AppointmentDetailsView.css';

export default function AppointmentDetailsView({
  appointmentId,
  onBack,
  onRescheduleClick,
  onCancelClick
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    api.getAppointmentById(appointmentId)
      .then(res => setDetails(res))
      .catch(err => {
        console.error('Error fetching appointment details:', err);
        setError(err.message || 'Failed to load appointment details.');
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleDownloadSlip = () => {
    if (!details) return;
    setDownloading(true);
    const { appointment, doctor, patient, visit } = details;
    const line = '═'.repeat(52);
    const dash = '─'.repeat(52);
    const slipText = `
${line}
          CAREPLUS HOSPITAL — APPOINTMENT SLIP
${line}

  Appointment ID   : ${appointment.appointmentId}
  Token Number     : ${appointment.tokenNumber}
  Status           : ${appointment.status}
  Date             : ${appointment.appointmentDate}
  Time             : ${appointment.appointmentTime}
  Department       : ${appointment.department}

${dash}
  DOCTOR INFORMATION
${dash}
  Doctor Name      : ${doctor.name}
  Specialization   : ${doctor.specialization}
  Qualification    : ${doctor.qualification}
  Experience       : ${doctor.experience}
  Hospital         : ${doctor.hospital}

${dash}
  PATIENT INFORMATION
${dash}
  Patient Name     : ${patient.name}
  Age / Gender     : ${patient.age} Years / ${patient.gender}
  Phone            : ${patient.phone}

${dash}
  VISIT INFORMATION
${dash}
  Reason for Visit : ${visit.reasonForVisit}
  Symptoms         : ${visit.symptoms}
${visit.vitals
  ? `  Vitals (BP/Pulse): ${visit.vitals.bp} / ${visit.vitals.pulse} bpm
  Vitals (Temp/Wt) : ${visit.vitals.temp} / ${visit.vitals.weight} kg`
  : '  Vitals           : Pending checkup'}
  Clinical Notes   : ${visit.notes || 'No notes available.'}

${line}
    Thank you for choosing CarePlus Hospital!
    Please carry this slip on your appointment day.
${line}
    Generated: ${new Date().toLocaleString('en-IN')}
${line}
`;
    const blob = new Blob([slipText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CarePlus_Slip_${appointment.appointmentId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 800);
  };

  // Doctor Avatar helper
  const DoctorAvatar = ({ avatar, name, size = 72 }) => {
    const initials = (name || 'Dr')
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="dv-doctor-avatar" style={{ width: size, height: size }}>
        {avatar ? (
          <img src={avatar} alt={name} className="dv-doctor-avatar-img" />
        ) : (
          <span className="dv-doctor-avatar-initials" style={{ fontSize: size * 0.3 }}>
            {initials}
          </span>
        )}
      </div>
    );
  };

  const StatusBadge = ({ status, rawStatus }) => {
    if (rawStatus === 'No-Show') {
      return <span className="dv-badge dv-badge--cancelled">Missed</span>;
    }
    const cls = status === 'Upcoming'
      ? 'dv-badge--upcoming'
      : status === 'Completed'
        ? 'dv-badge--completed'
        : 'dv-badge--cancelled';
    return <span className={`dv-badge ${cls}`}>{status}</span>;
  };

  const InfoRow = ({ label, value, highlight }) => (
    <div className="dv-info-row">
      <span className="dv-info-label">{label}</span>
      <span className={`dv-info-value${highlight ? ' dv-info-value--highlight' : ''}`}>{value}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="dv-loading-state">
        <div className="dv-spinner" />
        <p className="dv-loading-text">Fetching appointment details...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="dv-error-state">
        <div className="dv-error-icon">
          <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="dv-error-msg">{error || 'Appointment not found.'}</p>
        <button onClick={onBack} className="dv-btn dv-btn--outline">
          ← Back to Appointments
        </button>
      </div>
    );
  }

  const { appointment, doctor, patient, visit } = details;

  return (
    <div className="dv-page slide-up">
      {/* ── HEADER ── */}
      <div className="dv-page-header">
        <div className="dv-breadcrumb-row">
          <button onClick={onBack} className="dv-back-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Appointments
          </button>
        </div>
        <div className="dv-header-row">
          <div>
            <h1 className="dv-page-title">Appointment Details</h1>
            <p className="dv-page-subtitle">
              Full overview of your appointment&nbsp;
              <span className="dv-appt-id-chip">{appointment.appointmentId}</span>
            </p>
          </div>
          <div className="dv-header-actions">
            {appointment.status === 'Upcoming' && (
              <>
                <button
                  onClick={() => onRescheduleClick(appointment._id)}
                  className="dv-btn dv-btn--outline"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Reschedule
                </button>
                <button
                  onClick={() => onCancelClick(appointment._id)}
                  className="dv-btn dv-btn--danger"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={handleDownloadSlip}
              className="dv-btn dv-btn--primary"
              disabled={downloading}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? 'Downloading...' : 'Download Slip'}
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY GRID ── */}
      <div className="dv-body-grid">

        {/* LEFT COLUMN */}
        <div className="dv-col-left">

          {/* Appointment Information Card */}
          <div className="dv-card">
            <div className="dv-card-header">
              <div className="dv-card-icon dv-card-icon--blue">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="dv-card-title">Appointment Information</h3>
            </div>
            <div className="dv-card-body">
              <div className="dv-info-grid">
                <div className="dv-info-item">
                  <span className="dv-info-label">Appointment ID</span>
                  <span className="dv-info-value dv-info-value--bold">{appointment.appointmentId}</span>
                </div>
                <div className="dv-info-item">
                  <span className="dv-info-label">Token Number</span>
                  <span className="dv-info-value dv-info-value--highlight dv-info-value--bold">
                    {appointment.tokenNumber || 'Pending'}
                  </span>
                </div>
                <div className="dv-info-item">
                  <span className="dv-info-label">Department</span>
                  <span className="dv-info-value">{appointment.department}</span>
                </div>
                <div className="dv-info-item">
                  <span className="dv-info-label">Appointment Date</span>
                  <span className="dv-info-value">{appointment.appointmentDate}</span>
                </div>
                <div className="dv-info-item">
                  <span className="dv-info-label">Appointment Time</span>
                  <span className="dv-info-value">{appointment.appointmentTime}</span>
                </div>
                <div className="dv-info-item">
                  <span className="dv-info-label">Status</span>
                  <StatusBadge status={appointment.status} rawStatus={appointment.rawStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Visit Information Card */}
          <div className="dv-card">
            <div className="dv-card-header">
              <div className="dv-card-icon dv-card-icon--green">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="dv-card-title">Visit Information</h3>
            </div>
            <div className="dv-card-body dv-card-body--gap">
              <div>
                <span className="dv-field-label">Reason For Visit</span>
                <div className="dv-field-value-box">{visit.reasonForVisit || 'Routine Consultation'}</div>
              </div>
              <div>
                <span className="dv-field-label">Symptoms</span>
                <div className="dv-field-value-box">{visit.symptoms || 'None reported'}</div>
              </div>
              {visit.vitals && (
                <div>
                  <span className="dv-field-label">Vitals Checkup</span>
                  <div className="dv-vitals-row">
                    <div className="dv-vital-card">
                      <span className="dv-vital-label">Blood Pressure</span>
                      <span className="dv-vital-value">{visit.vitals.bp}</span>
                    </div>
                    <div className="dv-vital-card">
                      <span className="dv-vital-label">Pulse</span>
                      <span className="dv-vital-value">{visit.vitals.pulse} <span className="dv-vital-unit">bpm</span></span>
                    </div>
                    <div className="dv-vital-card">
                      <span className="dv-vital-label">Temperature</span>
                      <span className="dv-vital-value">{visit.vitals.temp}</span>
                    </div>
                    <div className="dv-vital-card">
                      <span className="dv-vital-label">Weight</span>
                      <span className="dv-vital-value">{visit.vitals.weight} <span className="dv-vital-unit">kg</span></span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <span className="dv-field-label">Notes</span>
                <div className="dv-field-value-box dv-field-value-box--notes">
                  {visit.notes || 'No notes available.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dv-col-right">

          {/* Doctor Information Card */}
          <div className="dv-card">
            <div className="dv-card-header">
              <div className="dv-card-icon dv-card-icon--teal">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="dv-card-title">Doctor Information</h3>
            </div>
            <div className="dv-card-body">
              {/* Doctor profile header */}
              <div className="dv-doctor-profile">
                <DoctorAvatar avatar={doctor.avatar} name={doctor.name} size={68} />
                <div className="dv-doctor-info">
                  <h4 className="dv-doctor-name">{doctor.name}</h4>
                  <p className="dv-doctor-spec">{doctor.specialization || doctor.department}</p>
                  <span className="dv-doctor-dept-badge">{doctor.department}</span>
                </div>
              </div>
              <div className="dv-divider" />
              <div className="dv-info-rows">
                <InfoRow label="Qualification" value={doctor.qualification || 'MD - Medicine'} />
                <InfoRow label="Experience" value={doctor.experience || '5+ Years'} />
                <InfoRow label="Hospital" value={doctor.hospital || 'CarePlus Hospital'} />
              </div>
            </div>
          </div>

          {/* Patient Information Card */}
          <div className="dv-card">
            <div className="dv-card-header">
              <div className="dv-card-icon dv-card-icon--purple">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="dv-card-title">Patient Information</h3>
            </div>
            <div className="dv-card-body">
              <div className="dv-info-rows">
                <InfoRow label="Patient Name" value={patient.name} />
                <InfoRow label="Age" value={`${patient.age} Years`} />
                <InfoRow label="Gender" value={patient.gender} />
                <InfoRow label="Phone" value={patient.phone || 'N/A'} />
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          {appointment.status === 'Upcoming' && (
            <div className="dv-card dv-card--actions">
              <div className="dv-card-header">
                <div className="dv-card-icon dv-card-icon--orange">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="dv-card-title">Quick Actions</h3>
              </div>
              <div className="dv-card-body dv-actions-list">
                <button
                  onClick={() => onRescheduleClick(appointment._id)}
                  className="dv-action-item dv-action-item--reschedule"
                >
                  <div className="dv-action-icon">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="dv-action-text">
                    <span className="dv-action-title">Reschedule Appointment</span>
                    <span className="dv-action-desc">Pick a new date and time</span>
                  </div>
                  <svg className="dv-action-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => onCancelClick(appointment._id)}
                  className="dv-action-item dv-action-item--cancel"
                >
                  <div className="dv-action-icon dv-action-icon--red">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="dv-action-text">
                    <span className="dv-action-title dv-action-title--red">Cancel Appointment</span>
                    <span className="dv-action-desc">Select a reason for cancellation</span>
                  </div>
                  <svg className="dv-action-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={handleDownloadSlip}
                  className="dv-action-item dv-action-item--download"
                >
                  <div className="dv-action-icon dv-action-icon--teal">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="dv-action-text">
                    <span className="dv-action-title">Download Appointment Slip</span>
                    <span className="dv-action-desc">Save as text file for your records</span>
                  </div>
                  <svg className="dv-action-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
