import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './BookAppointmentView.css';

export default function BookAppointmentView() {
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [booked, setBooked] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const departments = [
    { id: 'General Medicine', name: 'General Medicine', desc: 'Consultation for general health issues' },
    { id: 'Cardiology', name: 'Cardiology', desc: 'Heart and blood vessel related issues' },
    { id: 'Dermatology', name: 'Dermatology', desc: 'Skin, hair and nail care' },
    { id: 'Orthopedics', name: 'Orthopedics', desc: 'Bone, joint and musculoskeletal' },
    { id: 'Pediatrics', name: 'Pediatrics', desc: 'Child healthcare and wellness' },
    { id: 'Neurology', name: 'Neurology', desc: 'Brain and nervous system' },
    { id: 'Gynecology', name: 'Gynecology', desc: 'Women health and pregnancy' },
    { id: 'Ophthalmology', name: 'Ophthalmology', desc: 'Eye and vision care' }
  ];

  const doctors = [
    { id: 'Dr. Rohit Mehta', name: 'Dr. Rohit Mehta (Self)', dept: 'General Medicine' },
    { id: 'Dr. Anjali Verma', name: 'Dr. Anjali Verma', dept: 'Cardiology' },
    { id: 'Dr. Neha Kapoor', name: 'Dr. Neha Kapoor', dept: 'Dermatology' },
    { id: 'Dr. Vivek Singh', name: 'Dr. Vivek Singh', dept: 'Orthopedics' }
  ];

  useEffect(() => {
    const fetchPatientsList = async () => {
      try {
        setLoadingPatients(true);
        const res = await api.getPatients();
        if (res.success) {
          setPatients(res.patients);
          if (res.patients.length > 0) {
            setSelectedPatientId(res.patients[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load patient registry:", err);
      } finally {
        setLoadingPatients(false);
      }
    };
    const timer = setTimeout(() => {
      fetchPatientsList();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectDept = (deptId) => {
    setSelectedDept(deptId);
    setStep(2);
  };

  const handleSelectDoc = (docId) => {
    setSelectedDoc(docId);
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    try {
      const res = await api.bookAppointment({
        patientId: selectedPatientId,
        department: selectedDept,
        appointmentDate: date,
        appointmentTime: timeSlot,
        notes: `Follow-up appointment booked with ${selectedDoc}`
      });
      if (res.success) {
        setBooked(true);
        setStep(4);
      }
    } catch (err) {
      console.error("Failed to schedule follow-up appointment:", err);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDept('');
    setSelectedDoc('');
    setDate('');
    setTimeSlot('');
    setBooked(false);
    if (patients.length > 0) {
      setSelectedPatientId(patients[0]._id);
    }
  };

  const getSelectedPatientName = () => {
    const pat = patients.find(p => p._id === selectedPatientId);
    return pat ? pat.name : 'Unknown';
  };

  return (
    <div className="book-appointment-container slide-up">
      <div className="view-title">
        <h3>Book Appointment</h3>
        <p>Schedule a follow-up or referral appointment for a patient.</p>
      </div>

      <div className="booking-card card">
        {/* Step Progress Indicator */}
        <div className="step-indicator-row flex justify-between items-center">
          <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <label>Select Department</label>
          </div>
          <div className="step-line"></div>
          <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <label>Choose Doctor</label>
          </div>
          <div className="step-line"></div>
          <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <label>Select Date & Time</label>
          </div>
          <div className="step-line"></div>
          <div className={`step-circle ${step >= 4 ? 'active' : ''}`}>
            <span>4</span>
            <label>Confirm</label>
          </div>
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

        {/* Step 2: Choose Doctor */}
        {step === 2 && (
          <div className="step-content fade-in">
            <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm mb-4">Back</button>
            <h4>Select Doctor:</h4>
            <div className="doctors-list flex flex-col gap-3" style={{ marginTop: 16 }}>
              {doctors.filter(d => d.dept === selectedDept || selectedDept === 'General Medicine').map((doc) => (
                <div 
                  key={doc.id}
                  className="doctor-selection-row flex justify-between items-center card"
                  onClick={() => handleSelectDoc(doc.name)}
                  style={{ cursor: 'pointer', padding: '16px' }}
                >
                  <div>
                    <strong>{doc.name}</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{doc.dept}</p>
                  </div>
                  <span className="text-theme font-semibold">Choose &rarr;</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div className="step-content fade-in">
            <button onClick={() => setStep(2)} className="btn btn-secondary btn-sm mb-4">Back</button>
            <h4>Select Date, Time & Patient:</h4>
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmBooking(); }} className="booking-form" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Select Patient</label>
                {loadingPatients ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>Loading patient registry...</p>
                ) : (
                  <select 
                    className="form-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                  >
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.patientId || p.phone})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time Slot</label>
                <select 
                  className="form-select"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  required
                >
                  <option value="">-- Choose Slot --</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                Confirm Appointment Slot
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Confirm Booking */}
        {step === 4 && booked && (
          <div className="step-content text-center fade-in" style={{ padding: '32px 16px' }}>
            <div className="success-icon-circle">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 style={{ marginTop: 20 }}>Appointment Booked Successfully!</h4>
            <div className="booking-summary-box card" style={{ maxWidth: '480px', margin: '24px auto', padding: '20px', textAlign: 'left' }}>
              <p><strong>Patient Name:</strong> {getSelectedPatientName()}</p>
              <p><strong>Department:</strong> {selectedDept}</p>
              <p><strong>Doctor:</strong> {selectedDoc}</p>
              <p><strong>Date & Time:</strong> {date} &bull; {timeSlot}</p>
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
