import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'react-toastify';
import './BookAppointmentView.css';

/**
 * BookAppointmentView (Doctor Portal)
 * Allows a doctor to book a follow-up appointment for one of their existing patients.
 * Fixes:
 *   - Was using hardcoded mock doctor names as IDs (now doctor = logged-in user)
 *   - Was sending appointmentDate + appointmentTime separately (now sends ISO date_time)
 *   - Was calling a non-existent endpoint — now calls POST /api/doctor/appointments
 */
export default function BookAppointmentView() {
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [booked, setBooked] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const departments = [
    { id: 'General Medicine', name: 'General Medicine', desc: 'Consultation for general health issues' },
    { id: 'Cardiology', name: 'Cardiology', desc: 'Heart and blood vessel related issues' },
    { id: 'Dermatology', name: 'Dermatology', desc: 'Skin, hair and nail care' },
    { id: 'Orthopedics', name: 'Orthopedics', desc: 'Bone, joint and musculoskeletal' },
    { id: 'Pediatrics', name: 'Pediatrics', desc: 'Child healthcare and wellness' },
    { id: 'Neurology', name: 'Neurology', desc: 'Brain and nervous system' },
    { id: 'Gynecology', name: 'Gynecology', desc: "Women's health and pregnancy" },
    { id: 'Ophthalmology', name: 'Ophthalmology', desc: 'Eye and vision care' },
  ];

  useEffect(() => {
    const fetchPatientsList = async () => {
      try {
        setLoadingPatients(true);
        const res = await api.getPatients();
        if (res.success && Array.isArray(res.patients)) {
          setPatients(res.patients);
          if (res.patients.length > 0) {
            setSelectedPatientId(String(res.patients[0]._id || res.patients[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load patient registry:', err);
        toast.error('Failed to load patients');
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatientsList();
  }, []);

  const handleSelectDept = (deptId) => {
    setSelectedDept(deptId);
    setStep(2);
  };

  // Build ISO datetime from a date input (YYYY-MM-DD) and a time slot string ("09:00 AM")
  const buildISODateTime = (dateStr, timeLabel) => {
    const [timePart, ampm] = timeLabel.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const handleConfirmBooking = async () => {
    if (!selectedPatientId || !date || !timeSlot) {
      toast.warning('Please fill all fields before confirming');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.bookAppointment({
        patientId: parseInt(selectedPatientId, 10), // numeric ID
        department: selectedDept,
        date_time: buildISODateTime(date, timeSlot),  // proper ISO string
        reason: 'Follow-up Consultation',
      });
      if (res.success) {
        setBookingResult(res.data);
        setBooked(true);
        setStep(3);
      }
    } catch (err) {
      console.error('Failed to schedule follow-up appointment:', err);
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDept('');
    setDate('');
    setTimeSlot('');
    setBooked(false);
    setBookingResult(null);
    if (patients.length > 0) {
      setSelectedPatientId(String(patients[0]._id || patients[0].id));
    }
  };

  const getSelectedPatientName = () => {
    const pat = patients.find(p => String(p._id || p.id) === String(selectedPatientId));
    return pat ? (pat.full_name || pat.name) : 'Unknown';
  };

  // Minimum date = today
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="book-appointment-container slide-up">
      <div className="view-title">
        <h3>Book Follow-Up Appointment</h3>
        <p>Schedule a follow-up or referral appointment for an existing patient.</p>
      </div>

      <div className="booking-card card">
        {/* Step Progress Indicator */}
        <div className="step-indicator-row flex justify-between items-center">
          {[
            { num: 1, label: 'Select Department' },
            { num: 2, label: 'Patient & Slot' },
            { num: 3, label: 'Confirmed' },
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
              <div className={`step-circle ${step >= s.num ? 'active' : ''}`}>
                <span>{s.num}</span>
                <label>{s.label}</label>
              </div>
              {idx < arr.length - 1 && <div className="step-line" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Department */}
        {step === 1 && (
          <div className="step-content fade-in">
            <h4>Select Department:</h4>
            <div className="departments-grid">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="dept-item-card flex-col flex"
                  onClick={() => handleSelectDept(dept.id)}
                >
                  <strong>{dept.name}</strong>
                  <span>{dept.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Patient + Date/Time */}
        {step === 2 && (
          <div className="step-content fade-in">
            <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm mb-4">← Back</button>
            <h4>Select Patient, Date &amp; Time — <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedDept}</span></h4>

            <form
              onSubmit={(e) => { e.preventDefault(); handleConfirmBooking(); }}
              className="booking-form"
              style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Patient selector */}
              <div className="form-group">
                <label className="form-label">Select Patient *</label>
                {loadingPatients ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>Loading patient registry…</p>
                ) : patients.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No patients found in your hospital.</p>
                ) : (
                  <select
                    className="form-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                  >
                    {patients.map(p => (
                      <option key={p._id || p.id} value={String(p._id || p.id)}>
                        {p.full_name || p.name} ({p.patient_id || p.patientId || p.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Appointment Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Time slot */}
              <div className="form-group">
                <label className="form-label">Time Slot *</label>
                <select
                  className="form-select"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  required
                >
                  <option value="">-- Choose Slot --</option>
                  <optgroup label="Morning">
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                  </optgroup>
                  <optgroup label="Afternoon">
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </optgroup>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={submitting || loadingPatients}
              >
                {submitting ? 'Booking…' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && booked && (
          <div className="step-content text-center fade-in" style={{ padding: '32px 16px' }}>
            <div className="success-icon-circle">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 style={{ marginTop: 20 }}>Appointment Booked Successfully!</h4>
            <div className="booking-summary-box card" style={{ maxWidth: '480px', margin: '24px auto', padding: '20px', textAlign: 'left' }}>
              <p><strong>Patient:</strong> {bookingResult?.patientName || getSelectedPatientName()}</p>
              <p><strong>Department:</strong> {selectedDept}</p>
              <p><strong>Date &amp; Time:</strong> {date} · {timeSlot}</p>
              {bookingResult?.tokenNumber && (
                <p><strong>Token #:</strong> {bookingResult.tokenNumber}</p>
              )}
            </div>
            <button onClick={resetForm} className="btn btn-primary">
              Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
