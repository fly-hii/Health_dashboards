import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from '../utils/toast';
import AppointmentDetailsView from './AppointmentDetailsView';
import './AppointmentsView.css';

export default function AppointmentsView({ initialSelectedId, onClearDeepLink }) {
  const [activeSubTab, setActiveSubTab] = useState('Upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const [appointments, setAppointments] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown options
  const [doctorsList, setDoctorsList] = useState([]);
  const [departmentsList] = useState([
    'General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics',
    'Pediatrics', 'Neurology', 'Gynecology', 'Ophthalmology'
  ]);

  // Selected Appointment for Detail View
  const [selectedApptId, setSelectedApptId] = useState(initialSelectedId || null);

  // Reschedule modal
  const [rescheduleApptId, setRescheduleApptId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Cancel modal
  const [cancelApptId, setCancelApptId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Personal');
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (initialSelectedId) setSelectedApptId(initialSelectedId);
  }, [initialSelectedId]);

  useEffect(() => {
    if (selectedApptId) {
      window.history.pushState(null, '', `/patient/appointments/${selectedApptId}`);
    } else {
      window.history.pushState(null, '', '/patient/appointments');
    }
  }, [selectedApptId]);

  // Fetch doctors for filter dropdown
  useEffect(() => {
    api.getDoctors()
      .then(data => setDoctorsList(data))
      .catch(err => console.error('Error fetching doctors:', err));
  }, []);

  const loadAppointments = () => {
    setLoading(true);
    const filters = {
      search: searchQuery,
      doctor: selectedDoctor,
      department: selectedDept,
      status: activeSubTab,
      startDate,
      endDate,
      page: currentPage,
      limit: 5
    };

    api.getPatientAppointments(filters)
      .then(res => {
        if (res.success) {
          setAppointments(res.appointments);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(err => console.error('Error loading appointments:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppointments();
  }, [activeSubTab, currentPage, selectedDoctor, selectedDept, startDate, endDate]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage(1);
      loadAppointments();
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDoctor('');
    setSelectedDept('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        raw: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' })
      });
    }
    return days;
  };

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '03:00 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ];

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      toast.warning('Please select a date and time slot.');
      return;
    }
    setRescheduleLoading(true);
    try {
      await api.rescheduleAppointment(rescheduleApptId, {
        appointmentDate: rescheduleDate,
        appointmentTime: rescheduleTime
      });
      setRescheduleApptId(null);
      setRescheduleDate('');
      setRescheduleTime('');
      loadAppointments();
      if (selectedApptId) {
        setSelectedApptId(null);
        setTimeout(() => setSelectedApptId(selectedApptId), 10);
      }
    } catch (err) {
      toast.error('Reschedule failed: ' + err.message);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    const finalReason = cancelReason === 'Other' ? cancelCustomNotes : cancelReason;
    if (!finalReason.trim()) {
      toast.warning('Please specify a reason for cancellation.');
      return;
    }
    setCancelLoading(true);
    try {
      await api.cancelAppointment(cancelApptId, { reason: finalReason });
      setCancelApptId(null);
      setCancelReason('Personal');
      setCancelCustomNotes('');
      setSelectedApptId(null);
      loadAppointments();
    } catch (err) {
      toast.error('Cancellation failed: ' + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Upcoming') return 'badge-appt-upcoming';
    if (status === 'Completed') return 'badge-appt-completed';
    return 'badge-appt-cancelled';
  };

  const hasActiveFilters = searchQuery || selectedDoctor || selectedDept || startDate || endDate;

  // Doctor avatar with initials fallback
  const DoctorAvatar = ({ avatar, name, size = 38 }) => {
    const initials = (name || 'Dr')
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className="appt-doctor-avatar" style={{ width: size, height: size }}>
        {avatar ? (
          <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <span className="appt-doctor-initials">{initials}</span>
        )}
      </div>
    );
  };

  return (
    <div className="appt-page slide-up">
      {selectedApptId ? (
        <AppointmentDetailsView
          appointmentId={selectedApptId}
          onBack={() => {
            setSelectedApptId(null);
            if (onClearDeepLink) onClearDeepLink();
          }}
          onRescheduleClick={(id) => setRescheduleApptId(id)}
          onCancelClick={(id) => setCancelApptId(id)}
        />
      ) : (
        <>
      {/* Page Header */}
      <div className="appt-page-header">
        <div>
          <h1 className="appt-page-title">My Appointments</h1>
          <p className="appt-page-subtitle">View and manage all your appointments.</p>
        </div>
        <button
          className="appt-filter-toggle-btn"
          onClick={() => setShowFilters(f => !f)}
          title="Toggle Filters"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters
          {hasActiveFilters && <span className="filter-active-dot" />}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="appt-tab-bar">
        {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveSubTab(tab); setCurrentPage(1); }}
            className={`appt-tab-btn ${activeSubTab === tab ? 'appt-tab-btn--active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="appt-filters-panel slide-up">
          <div className="appt-filters-grid">
            {/* Search */}
            <div className="appt-filter-item">
              <label className="appt-filter-label">Search Appointment</label>
              <div className="appt-search-wrapper">
                <svg className="appt-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="ID, Doctor, Department..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="appt-search-input"
                />
              </div>
            </div>

            {/* Doctor */}
            <div className="appt-filter-item">
              <label className="appt-filter-label">Filter by Doctor</label>
              <select
                value={selectedDoctor}
                onChange={e => { setSelectedDoctor(e.target.value); setCurrentPage(1); }}
                className="appt-filter-select"
              >
                <option value="">All Doctors</option>
                {doctorsList.map(doc => (
                  <option key={doc._id} value={doc._id}>{doc.name}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="appt-filter-item">
              <label className="appt-filter-label">Filter by Department</label>
              <select
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="appt-filter-select"
              >
                <option value="">All Departments</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="appt-filter-item">
              <label className="appt-filter-label">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="appt-filter-select"
              />
            </div>
            <div className="appt-filter-item">
              <label className="appt-filter-label">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="appt-filter-select"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="appt-filters-footer">
              <button onClick={handleResetFilters} className="appt-clear-btn">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Appointments Table Card */}
      <div className="appt-table-card">
        {loading ? (
          <div className="appt-loading-state">
            <div className="appt-spinner" />
            <p className="appt-loading-text">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="appt-empty-state">
            <div className="appt-empty-icon">
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="appt-empty-title">No {activeSubTab} Appointments</h3>
            <p className="appt-empty-desc">
              {hasActiveFilters
                ? 'No appointments match your current filters. Try clearing the filters.'
                : `You have no ${activeSubTab.toLowerCase()} appointments at the moment.`}
            </p>
          </div>
        ) : (
          <div className="appt-table-wrapper">
            <table className="appt-table">
              <thead>
                <tr className="appt-table-head-row">
                  <th className="appt-th">Appointment ID</th>
                  <th className="appt-th">Doctor</th>
                  <th className="appt-th">Department</th>
                  <th className="appt-th">Date &amp; Time</th>
                  <th className="appt-th">Status</th>
                  <th className="appt-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt._id} className="appt-table-row">
                    <td className="appt-td appt-id-cell">{appt.appointmentId}</td>
                    <td className="appt-td">
                      <div className="appt-doctor-cell">
                        <DoctorAvatar avatar={appt.doctorAvatar} name={appt.doctorName} />
                        <span className="appt-doctor-name">{appt.doctorName}</span>
                      </div>
                    </td>
                    <td className="appt-td appt-dept-cell">{appt.department}</td>
                    <td className="appt-td">
                      <div className="appt-datetime-cell">
                        <div className="appt-date-row">
                          <svg className="appt-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="appt-date-text">{appt.appointmentDate}</span>
                        </div>
                        <div className="appt-time-row">
                          <svg className="appt-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="appt-time-text">{appt.appointmentTime}</span>
                        </div>
                      </div>
                    </td>
                    <td className="appt-td">
                      <span className={`appt-status-badge ${getStatusClass(appt.status)}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="appt-td">
                      <button
                        onClick={() => setSelectedApptId(appt._id)}
                        className="appt-view-btn"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages >= 1 && appointments.length > 0 && (
          <div className="appt-pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="appt-page-btn appt-page-nav"
              disabled={currentPage === 1}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`appt-page-btn ${currentPage === page ? 'appt-page-btn--active' : ''}`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="appt-page-btn appt-page-nav"
              disabled={currentPage === totalPages}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── RESCHEDULE MODAL ── */}
      {rescheduleApptId && (
        <div className="appt-modal-overlay" onClick={() => setRescheduleApptId(null)}>
          <div className="appt-modal-box" onClick={e => e.stopPropagation()}>
            <div className="appt-modal-header">
              <div>
                <h3 className="appt-modal-title">Reschedule Appointment</h3>
                <p className="appt-modal-subtitle">Pick a new date and available time slot</p>
              </div>
              <button className="appt-modal-close" onClick={() => setRescheduleApptId(null)}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleReschedule} className="appt-modal-body">
              <div>
                <label className="appt-modal-section-label">Select New Date</label>
                <div className="appt-dates-grid">
                  {getNext7Days().map(d => (
                    <button
                      type="button"
                      key={d.raw}
                      onClick={() => setRescheduleDate(d.raw)}
                      className={`appt-date-chip ${rescheduleDate === d.raw ? 'appt-date-chip--active' : ''}`}
                    >
                      <span className="appt-chip-weekday">{d.weekday}</span>
                      <span className="appt-chip-day">{d.day}</span>
                      <span className="appt-chip-month">{d.month}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="appt-modal-section-label">Available Time Slots</label>
                <div className="appt-slots-grid">
                  {timeSlots.map(slot => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setRescheduleTime(slot)}
                      className={`appt-slot-chip ${rescheduleTime === slot ? 'appt-slot-chip--active' : ''}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="appt-modal-footer">
                <button type="button" onClick={() => setRescheduleApptId(null)} className="appt-btn-outline">
                  Cancel
                </button>
                <button type="submit" className="appt-btn-primary" disabled={rescheduleLoading}>
                  {rescheduleLoading ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {cancelApptId && (
        <div className="appt-modal-overlay" onClick={() => setCancelApptId(null)}>
          <div className="appt-modal-box appt-modal-box--sm" onClick={e => e.stopPropagation()}>
            <div className="appt-modal-header">
              <div>
                <h3 className="appt-modal-title appt-modal-title--danger">Cancel Appointment</h3>
                <p className="appt-modal-subtitle">This action cannot be undone</p>
              </div>
              <button className="appt-modal-close" onClick={() => setCancelApptId(null)}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCancel} className="appt-modal-body">
              <p className="appt-cancel-desc">
                Are you sure you want to cancel this appointment? Please select a reason:
              </p>

              <div className="appt-reasons-list">
                {['Personal', 'Emergency', 'Doctor Unavailable', 'Other'].map(reason => (
                  <label key={reason} className={`appt-reason-option ${cancelReason === reason ? 'appt-reason-option--active' : ''}`}>
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={e => setCancelReason(e.target.value)}
                    />
                    <span className="appt-reason-checkmark">
                      {cancelReason === reason && (
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.285 6.709l-11.285 11.291-5.285-5.291 1.414-1.414 3.871 3.877 9.871-9.877z"/>
                        </svg>
                      )}
                    </span>
                    {reason}
                  </label>
                ))}
              </div>

              {cancelReason === 'Other' && (
                <div className="fade-in">
                  <label className="appt-modal-section-label">Please specify your reason</label>
                  <textarea
                    rows="3"
                    value={cancelCustomNotes}
                    onChange={e => setCancelCustomNotes(e.target.value)}
                    placeholder="Enter details here..."
                    className="appt-cancel-textarea"
                  />
                </div>
              )}

              <div className="appt-modal-footer">
                <button type="button" onClick={() => setCancelApptId(null)} className="appt-btn-outline">
                  Keep Appointment
                </button>
                <button type="submit" className="appt-btn-danger" disabled={cancelLoading}>
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
