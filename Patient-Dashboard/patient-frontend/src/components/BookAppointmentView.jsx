import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from '../utils/toast';
import './BookAppointmentView.css';

export default function BookAppointmentView({ onBookingSuccess }) {
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([
    { id: 'General Medicine', name: 'General Medicine', desc: 'Consultation for general health issues', icon: '🩺', color: 'bg-teal' },
    { id: 'Cardiology', name: 'Cardiology', desc: 'Heart and blood vessel related', icon: '❤️', color: 'bg-red' },
    { id: 'Dermatology', name: 'Dermatology', desc: 'Skin, hair and nail care', icon: '🧴', color: 'bg-orange' },
    { id: 'Orthopedics', name: 'Orthopaedics', desc: 'Bone, joint and musculoskeletal', icon: '🦴', color: 'bg-blue' },
    { id: 'Pediatrics', name: 'Pediatrics', desc: 'Child healthcare and wellness', icon: '👶', color: 'bg-green' },
    { id: 'Neurology', name: 'Neurology', desc: 'Brain and nervous system', icon: '🧠', color: 'bg-indigo' },
    { id: 'Gynecology', name: 'Gynecology', desc: "Women's health and pregnancy", icon: '🤰', color: 'bg-pink' },
    { id: 'Ophthalmology', name: 'Ophthalmology', desc: 'Eye and vision care', icon: '👁️', color: 'bg-sky' }
  ]);

  const [selectedDept, setSelectedDept] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch doctors list
  useEffect(() => {
    api.getDoctors()
      .then(data => setDoctors(data))
      .catch(err => console.error("Error fetching doctors:", err));
  }, []);

  const filteredDoctors = doctors.filter(doc => doc.department === selectedDept);

  // Generate today's date object in the same format used by the date buttons
  const getTodayDate = () => {
    const today = new Date();
    return {
      raw: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      formatted: today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    };
  };

  // Generate next 7 days for the date selector (starts from tomorrow)
  const getNext7Days = () => {
    const days = [];
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        raw: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        formatted: date.toLocaleDateString('en-US', options)
      });
    }
    return days;
  };

  const timeSlots = [
    { label: 'Morning Slots', slots: ['09:30 AM', '10:30 AM', '11:30 AM'] },
    { label: 'Afternoon Slots', slots: ['02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'] }
  ];

  const handleConfirmBooking = () => {
    setLoading(true);
    const postData = {
      doctorName: selectedDoc.name,
      department: selectedDept,
      dateTime: `${selectedDate}, ${selectedTime}`
    };

    api.bookAppointment(postData)
      .then(res => {
        setBookingDetails(res.appointment);
        setBookingConfirmed(true);
        setStep(4);
        onBookingSuccess(); // refresh parent counters
      })
      .catch(err => toast.error("Error booking appointment: " + err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="book-appointment-view slide-up">
      <div className="view-header flex justify-between items-center">
        <div>
          <h1 className="title">Book Appointment</h1>
          <p className="subtitle">Schedule an appointment with your preferred doctor.</p>
        </div>
        {step > 1 && !bookingConfirmed && (
          <button onClick={() => {
            if (step === 4) {
              setStep(3);
            } else if (step === 3) {
              setStep(2);
            } else if (step === 2) {
              setStep(1);
            }
          }} className="btn btn-secondary flex items-center gap-2">
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* Stepper Status Bar */}
      <div className="stepper-bar flex justify-between items-center">
        {[
          { num: 1, label: 'Select Department' },
          { num: 2, label: 'Choose Doctor' },
          { num: 3, label: 'Select Date & Time' },
          { num: 4, label: 'Confirm' }
        ].map((s) => (
          <div key={s.num} className={`step-item flex items-center gap-2 ${step >= s.num ? 'active' : ''}`}>
            <div className="step-number">{s.num}</div>
            <span className="step-label">{s.label}</span>
            {s.num < 4 && <div className="step-connector"></div>}
          </div>
        ))}
      </div>

      {/* STEP 1: Select Department */}
      {step === 1 && (
        <div className="step-container fade-in">
          <h3 className="step-title">Select Department</h3>
          <div className="departments-grid">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => { setSelectedDept(dept.id); setStep(2); }}
                className="card dept-card text-left"
              >
                <div className={`dept-icon ${dept.color}`}>{dept.icon}</div>
                <h4 className="dept-name">{dept.name}</h4>
                <p className="dept-desc">{dept.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Choose Doctor */}
      {step === 2 && (
        <div className="step-container fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="step-title">Choose Doctor in {selectedDept}</h3>
            <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm">Back to Departments</button>
          </div>

          {filteredDoctors.length === 0 ? (
            <p className="no-docs-text">No doctors available in this department right now.</p>
          ) : (
            <div className="doctors-list-grid">
              {filteredDoctors.map((doc) => (
                <div key={doc.id} className="card doctor-card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={doc.avatar} alt={doc.name} className="doctor-avatar" />
                    <div>
                      <h4 className="doctor-name-title">{doc.name}</h4>
                      <p className="doctor-meta">{doc.experience} Experience • ⭐ {doc.rating}</p>
                      <p className="doctor-avail">📅 {doc.availability}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedDoc(doc); setStep(3); }}
                    className="btn btn-primary"
                  >
                    Select Doctor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Select Date & Time */}
      {step === 3 && (
        <div className="step-container fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="step-title">Select Date & Time for {selectedDoc.name}</h3>
            <button onClick={() => setStep(2)} className="btn btn-secondary btn-sm">Back to Doctors</button>
          </div>

          <div className="appointment-scheduler-grid">
            {/* Calendar list */}
            <div className="scheduler-section card">
              <div className="scheduler-header">
                <h4 className="scheduler-title">Available Dates</h4>
                <button
                  onClick={() => {
                    const today = getTodayDate();
                    setSelectedDate(today.raw);
                    setSelectedTime('');
                  }}
                  className={`today-quick-btn ${selectedDate === getTodayDate().raw ? 'today-active' : ''}`}
                >
                  📅 Today
                </button>
              </div>
              <div className="dates-grid">
                {/* Today as first slot */}
                {(() => {
                  const today = getTodayDate();
                  return (
                    <button
                      key={today.raw}
                      onClick={() => { setSelectedDate(today.raw); setSelectedTime(''); }}
                      className={`date-btn-select today-date-btn ${selectedDate === today.raw ? 'active' : ''}`}
                    >
                      <span className="date-today-badge">TODAY</span>
                      <span className="date-day">{today.formatted.split(',')[1] || today.formatted.split(' ').slice(-1)[0]}</span>
                    </button>
                  );
                })()}
                {getNext7Days().map((d) => (
                  <button
                    key={d.raw}
                    onClick={() => { setSelectedDate(d.raw); setSelectedTime(''); }}
                    className={`date-btn-select ${selectedDate === d.raw ? 'active' : ''}`}
                  >
                    <span className="date-weekday">{d.formatted.split(',')[0]}</span>
                    <span className="date-day">{d.formatted.split(',')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="scheduler-section card">
              <h4 className="scheduler-title">Available Time Slots</h4>
              {selectedDate ? (
                <div className="time-slots-container">
                  {timeSlots.map((group) => (
                    <div key={group.label} className="time-group">
                      <h5 className="time-group-label">{group.label}</h5>
                      <div className="slots-grid">
                        {group.slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`time-slot-btn ${selectedTime === slot ? 'active' : ''}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-selection-prompt">Please select a date first to view slots.</p>
              )}
            </div>
          </div>

          {selectedDate && selectedTime && (
            <div className="next-action-area flex justify-end gap-4 mt-6">
              <button
                onClick={() => setStep(4)}
                className="btn btn-primary"
              >
                Proceed to Confirm
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Confirm Booking / Success Banner */}
      {step === 4 && (
        <div className="step-container fade-in text-center">
          {!bookingConfirmed ? (
            <div className="confirm-card card max-w-md mx-auto">
              <h3 className="confirm-title mb-4">Confirm Appointment Details</h3>
              <div className="confirm-summary-list">
                <div className="summary-item">
                  <span className="summary-lbl">Department:</span>
                  <span className="summary-val">{selectedDept}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-lbl">Doctor:</span>
                  <span className="summary-val font-semibold">{selectedDoc?.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-lbl">Date:</span>
                  <span className="summary-val">{selectedDate}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-lbl">Time Slot:</span>
                  <span className="summary-val">{selectedTime}</span>
                </div>
              </div>

              <div className="confirm-actions flex gap-4 mt-6">
                <button onClick={() => setStep(3)} className="btn btn-secondary flex-1" disabled={loading}>
                  Back
                </button>
                <button onClick={handleConfirmBooking} className="btn btn-primary flex-1 flex gap-2" disabled={loading}>
                  {loading && <div className="loading-spinner w-4 h-4"></div>}
                  Confirm & Book
                </button>
              </div>
            </div>
          ) : (
            <div className="success-banner card max-w-md mx-auto">
              <div className="success-check-circle">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="success-header text-primary mt-4">Appointment Booked!</h2>
              <p className="success-desc mt-2">
                Your appointment request is scheduled successfully. A confirmation message has been sent to your notifications.
              </p>
              
              <div className="success-receipt-card mt-6">
                <div className="receipt-row">
                  <span>Appointment ID</span>
                  <span className="receipt-val">{bookingDetails?.id}</span>
                </div>
                <div className="receipt-row">
                  <span>Doctor</span>
                  <span className="receipt-val font-semibold">{bookingDetails?.doctor}</span>
                </div>
                <div className="receipt-row">
                  <span>Date & Time</span>
                  <span className="receipt-val">{bookingDetails?.dateTime}</span>
                </div>
              </div>

              <div className="success-actions flex flex-col gap-2 mt-6">
                <button
                  onClick={() => {
                    setStep(1);
                    setBookingConfirmed(false);
                    setSelectedDept(null);
                    setSelectedDoc(null);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                  className="btn btn-primary"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
