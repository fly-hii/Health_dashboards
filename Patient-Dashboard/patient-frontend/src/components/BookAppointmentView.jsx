import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getImageUrl } from '../utils/api';

import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './BookAppointmentView.css';

// ── Predefined coordinates for cities ───────────────────────────
const CITY_COORDS = {
  'jaipur':   { lat: 26.9124, lon: 75.7873 },
  'mumbai':   { lat: 19.0760, lon: 72.8777 },
  'kakinada': { lat: 16.9891, lon: 82.2475 }
};

// ── Predefined coordinates for hospitals ────────────────────────
const HOSPITAL_COORDS = {
  5:  { lat: 26.9150, lon: 75.7900, name: 'Sai Hospital' },
  10: { lat: 19.0820, lon: 72.8820, name: 'sam' },
  12: { lat: 19.0700, lon: 72.8700, name: 'TESTPRO' },
  13: { lat: 19.0900, lon: 72.8900, name: 'saii@gmail.com' },
  14: { lat: 16.9920, lon: 82.2500, name: 'appolo' },
  15: { lat: 16.9820, lon: 82.2400, name: 'satish' },
};

const normalizeCity = (c) => (c || '').trim().toLowerCase();

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ── Department icons & colors ──────────────────────────────────
const DEPT_META = {
  'General Medicine':  { icon: '🩺', bg: '#E8F9F7', accent: '#0F9D8A' },
  'Cardiology':        { icon: '❤️',  bg: '#FEF2F2', accent: '#EF4444' },
  'Dermatology':       { icon: '🧴', bg: '#FFF7ED', accent: '#F97316' },
  'Orthopedics':       { icon: '🦴', bg: '#EFF6FF', accent: '#3B82F6' },
  'Orthopaedics':      { icon: '🦴', bg: '#EFF6FF', accent: '#3B82F6' },
  'Pediatrics':        { icon: '👶', bg: '#F0FDF4', accent: '#22C55E' },
  'Neurology':         { icon: '🧠', bg: '#F5F3FF', accent: '#8B5CF6' },
  'Gynecology':        { icon: '🤰', bg: '#FDF2F8', accent: '#EC4899' },
  'Ophthalmology':     { icon: '👁️', bg: '#ECFEFF', accent: '#06B6D4' },
  'Psychiatry':        { icon: '🧘', bg: '#FAF5FF', accent: '#A855F7' },
  'ENT':               { icon: '👂', bg: '#FFF7ED', accent: '#F59E0B' },
  'Dental':            { icon: '🦷', bg: '#F8FAFC', accent: '#64748B' },
  'Oncology':          { icon: '⚕️', bg: '#FEF2F2', accent: '#DC2626' },
  'Radiology':         { icon: '🔬', bg: '#F0F9FF', accent: '#0EA5E9' },
  'Surgery':           { icon: '🔧', bg: '#F0FDF4', accent: '#16A34A' },
};
const getDeptMeta = (name) => DEPT_META[name] || { icon: '🏥', bg: '#F1F5F9', accent: '#6366F1' };

const STEPS = [
  { id: 1, label: 'Location'   },
  { id: 2, label: 'Hospital'   },
  { id: 3, label: 'Department' },
  { id: 4, label: 'Doctor'     },
  { id: 5, label: 'Schedule'   },
  { id: 6, label: 'Confirm'    },
];

const TIME_GROUPS = [
  { label: '🌅 Morning',   slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
  { label: '☀️ Afternoon', slots: ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'] },
  { label: '🌆 Evening',   slots: ['05:00 PM', '05:30 PM', '06:00 PM'] },
];

// Generate 14 future dates starting today
const getAvailableDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const fmtDate = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateMini = (d) => ({
  weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  day:     d.getDate(),
  month:   d.toLocaleDateString('en-US', { month: 'short' }),
  isToday: d.toDateString() === new Date().toDateString(),
});

// Check if a date string ("22 Jun 2026") is today's date
const isDateToday = (dateStr) => {
  return dateStr === fmtDate(new Date());
};

// Check if a time slot string ("09:00 AM") has already passed today
const isTimeSlotPassedToday = (slotStr) => {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const [timePart, ampm] = slotStr.trim().split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  if (hours < currentHours) return true;
  if (hours === currentHours && minutes <= currentMinutes) return true;
  return false;
};

// ── ISO datetime builder ──────────────────────────────────────
const buildISO = (rawDate, timeLabel) => {
  const dateObj = new Date(rawDate); // "22 Jun 2026"
  const [timePart, ampm] = timeLabel.trim().split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj.toISOString();
};

// ── Skeleton loader card ──────────────────────────────────────
const Skeleton = ({ count = 4, type = 'card' }) => (
  <div className={`skeleton-wrap ${type}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`skeleton-item ${type}`} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function BookAppointmentView() {
  const { user } = useAuth();

  // ── step & selection state ──
  const [step, setStep]                   = useState(1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDept, setSelectedDept]   = useState(null);
  const [selectedDoc, setSelectedDoc]     = useState(null);
  const [selectedDate, setSelectedDate]   = useState('');
  const [selectedTime, setSelectedTime]   = useState('');

  // ── data state ──
  const [locations, setLocations]     = useState([]);
  const [hospitals, setHospitals]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors]         = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);

  // ── UI state ──
  const [loading, setLoading]               = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult]   = useState(null);

  // ── Is selected hospital the patient's own hospital? ──
  const isOwnHospital = selectedHospital && user?.hospital_id
    ? parseInt(selectedHospital.id) === parseInt(user.hospital_id)
    : false;
  // Note: cross-hospital booking is fully allowed — no registration restriction.

  // ── Load locations and all hospitals on mount ──
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getLocations(),
      api.getHospitals()
    ])
      .then(([locRes, hospRes]) => {
        setLocations(locRes.data || []);
        setAllHospitals(hospRes.data || []);
      })
      .catch(() => toast.error('Failed to load initial data'))
      .finally(() => setLoading(false));
  }, []);

  // ── Load hospitals when city selected ──
  useEffect(() => {
    if (!selectedLocation) return;
    setLoading(true);
    api.getHospitalsByCity(selectedLocation.city)
      .then(res => setHospitals(res.data || []))
      .catch(() => toast.error('Failed to load hospitals'))
      .finally(() => setLoading(false));
  }, [selectedLocation]);

  // ── Load departments when hospital selected ──
  useEffect(() => {
    if (!selectedHospital) return;
    setLoading(true);
    api.getHospitalDepartments(selectedHospital.id)
      .then(res => setDepartments(res.data || []))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoading(false));
  }, [selectedHospital]);

  // ── Load doctors when department selected ──
  useEffect(() => {
    if (!selectedHospital || !selectedDept) return;
    setLoading(true);
    api.getHospitalDoctors(selectedHospital.id, selectedDept.name)
      .then(res => setDoctors(res.data || []))
      .catch(() => toast.error('Failed to load doctors'))
      .finally(() => setLoading(false));
  }, [selectedHospital, selectedDept]);

  // ── Navigation helpers ──
  const goBack = () => {
    if (step > 1 && !bookingSuccess) setStep(s => s - 1);
  };

  const pickLocation = (loc) => {
    setSelectedLocation(loc);
    setSelectedHospital(null);
    setSelectedDept(null);
    setSelectedDoc(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(2);
  };
  const pickHospitalDirectly = (hosp) => {
    const cityMatched = locations.find(loc => loc.city.toLowerCase().trim() === hosp.city.toLowerCase().trim());
    if (cityMatched) {
      setSelectedLocation(cityMatched);
    } else {
      setSelectedLocation({ city: hosp.city, state: hosp.state || '', hospitalCount: 1 });
    }
    setSelectedHospital(hosp);
    setSelectedDept(null);
    setSelectedDoc(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(3);
    toast.success(`Selected ${hosp.name}`);
  };
  const pickHospital = (h) => {
    setSelectedHospital(h);
    setSelectedDept(null);
    setSelectedDoc(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(3);
  };
  const pickDept = (d) => {
    setSelectedDept(d);
    setSelectedDoc(null);
    setSelectedDate('');
    setSelectedTime('');
    setStep(4);
  };
  const pickDoc = (doc) => {
    setSelectedDoc(doc);
    setSelectedDate('');
    setSelectedTime('');
    setStep(5);
  };

  const reset = () => {
    setStep(1);
    setSelectedLocation(null); setSelectedHospital(null);
    setSelectedDept(null);     setSelectedDoc(null);
    setSelectedDate('');       setSelectedTime('');
    setBookingSuccess(false);  setBookingResult(null);
  };

  // ── Refresh data helper for dynamic selection steps ──
  const refreshCurrentStep = useCallback(() => {
    if (step === 1) {
      setLoading(true);
      api.getLocations()
        .then(res => setLocations(res.data || []))
        .catch(() => toast.error('Failed to load locations'))
        .finally(() => setLoading(false));
    } else if (step === 2 && selectedLocation) {
      setLoading(true);
      api.getHospitalsByCity(selectedLocation.city)
        .then(res => setHospitals(res.data || []))
        .catch(() => toast.error('Failed to load hospitals'))
        .finally(() => setLoading(false));
    } else if (step === 3 && selectedHospital) {
      setLoading(true);
      api.getHospitalDepartments(selectedHospital.id)
        .then(res => setDepartments(res.data || []))
        .catch(() => toast.error('Failed to load departments'))
        .finally(() => setLoading(false));
    } else if (step === 4 && selectedHospital && selectedDept) {
      setLoading(true);
      api.getHospitalDoctors(selectedHospital.id, selectedDept.name)
        .then(res => setDoctors(res.data || []))
        .catch(() => toast.error('Failed to load doctors'))
        .finally(() => setLoading(false));
    }
  }, [step, selectedLocation, selectedHospital, selectedDept]);

  // ── Confirm booking ──
  const handleBook = async () => {
    setLoading(true);
    try {
      const res = await api.bookAppointment({
        hospitalId: selectedHospital.id,
        doctorId:  selectedDoc.id,
        department: selectedDept.name,
        dateTime:  buildISO(selectedDate, selectedTime),
        reason:    'Online Booking',
      });
      setBookingResult(res);
      setBookingSuccess(true);
      setStep(7);
    } catch (err) {
      toast.error(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Breadcrumb trail ──
  const breadcrumbs = [
    selectedLocation && selectedLocation.city,
    selectedHospital && selectedHospital.name,
    selectedDept     && selectedDept.name,
    selectedDoc      && `Dr. ${selectedDoc.name}`,
  ].filter(Boolean);

  return (
    <div className="bav-root">
      {/* ── Header ─────────────────────────────────── */}
      <div className="bav-header">
        <div className="bav-header-text">
          <h1 className="bav-title">Book Appointment</h1>
          <p className="bav-subtitle">
            {breadcrumbs.length
              ? breadcrumbs.join(' › ')
              : 'Find the right doctor, near you'}
          </p>
        </div>
        <div className="bav-header-actions">
          {step <= 4 && !bookingSuccess && (
            <button 
              className="bav-refresh-btn" 
              onClick={refreshCurrentStep} 
              disabled={loading}
              title="Refresh current list"
            >
              <svg 
                className={loading ? 'bav-spinning' : ''} 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          )}
          {step > 1 && !bookingSuccess && (
            <button className="bav-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────── */}
      {step <= 6 && (
        <div className="bav-progress">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                className={`bav-step-node ${step > s.id ? 'done' : step === s.id ? 'active' : ''} ${s.id <= step ? 'clickable' : ''}`}
                onClick={() => s.id <= step && setStep(s.id)}
                disabled={s.id > step}
              >
                <div className="bav-step-circle">
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className="bav-step-lbl">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`bav-step-line ${step > s.id ? 'done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 1 — SELECT LOCATION                    */}
      {/* ════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">📍</span>
            <div>
              <h2 className="bav-section-title">Select Your Location</h2>
              <p className="bav-section-sub">Pick a location on the map or choose a city below to discover nearby hospitals</p>
            </div>
          </div>

          <MapPicker
            locations={locations}
            allHospitals={allHospitals}
            onSelectCity={pickLocation}
            onSelectHospitalDirectly={pickHospitalDirectly}
          />

          <div className="bav-or-divider">
            <span>Or select from popular cities</span>
          </div>

          {loading ? (
            <Skeleton count={6} type="grid" />
          ) : locations.length === 0 ? (
            <div className="bav-empty">No locations found. Please try again later.</div>
          ) : (
            <div className="bav-locations-grid">
              {locations.map(loc => (
                <button
                  key={loc.city}
                  className="bav-loc-card"
                  onClick={() => pickLocation(loc)}
                >
                  <span className="bav-loc-icon">🏙️</span>
                  <span className="bav-loc-city">{loc.city}</span>
                  <span className="bav-loc-state">{loc.state}</span>
                  <span className="bav-loc-count">
                    {loc.hospitalCount} hospital{loc.hospitalCount !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 2 — SELECT HOSPITAL                    */}
      {/* ════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">🏥</span>
            <div>
              <h2 className="bav-section-title">Hospitals in {selectedLocation?.city}</h2>
              <p className="bav-section-sub">Your previously visited hospital is highlighted</p>
            </div>
          </div>

          {loading ? (
            <Skeleton count={3} type="list" />
          ) : hospitals.length === 0 ? (
            <div className="bav-empty">No hospitals found in {selectedLocation?.city}.</div>
          ) : (
            <div className="bav-hospital-list">
              {/* Show previously visited hospital first */}
              {[...hospitals].sort((a, b) => {
                const aOwn = parseInt(a.id) === parseInt(user?.hospital_id) ? -1 : 1;
                const bOwn = parseInt(b.id) === parseInt(user?.hospital_id) ? -1 : 1;
                return aOwn - bOwn;
              }).map(hosp => {
                const isOwn = parseInt(hosp.id) === parseInt(user?.hospital_id);
                return (
                  <button
                    key={hosp.id}
                    className={`bav-hospital-card ${isOwn ? 'own' : ''}`}
                    onClick={() => pickHospital(hosp)}
                  >
                    <div className="bav-hosp-logo-wrap">
                      {hosp.logo_url
                        ? <img src={hosp.logo_url} alt={hosp.name} className="bav-hosp-logo" onError={e => { e.currentTarget.style.display='none'; }} />
                        : <span className="bav-hosp-logo-fallback">🏥</span>
                      }
                    </div>
                    <div className="bav-hosp-info">
                      <div className="bav-hosp-name-row">
                        <h3 className="bav-hosp-name">{hosp.name}</h3>
                        {isOwn && <span className="bav-own-badge">🕐 Previously Visited</span>}
                      </div>
                      <p className="bav-hosp-city">📍 {hosp.city}{hosp.state ? `, ${hosp.state}` : ''}</p>
                      {hosp.phone && <p className="bav-hosp-phone">📞 {hosp.phone}</p>}
                    </div>
                    <span className="bav-hosp-arrow">›</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 3 — SELECT DEPARTMENT                  */}
      {/* ════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">🏛️</span>
            <div>
              <h2 className="bav-section-title">Select Department</h2>
              <p className="bav-section-sub">{selectedHospital?.name}</p>
            </div>
          </div>



          {loading ? (
            <Skeleton count={8} type="grid" />
          ) : departments.length === 0 ? (
            <div className="bav-empty">No departments found at this hospital.</div>
          ) : (
            <div className="bav-dept-grid">
              {departments.map(dept => {
                const meta = getDeptMeta(dept.name);
                return (
                  <button
                    key={dept.name}
                    className="bav-dept-card"
                    onClick={() => pickDept(dept)}
                    style={{ '--dept-bg': meta.bg, '--dept-accent': meta.accent }}
                  >
                    <div className="bav-dept-icon">{meta.icon}</div>
                    <div className="bav-dept-name">{dept.name}</div>
                    <div className="bav-dept-count">
                      {dept.doctorCount} doctor{dept.doctorCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 4 — CHOOSE DOCTOR                      */}
      {/* ════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">👨‍⚕️</span>
            <div>
              <h2 className="bav-section-title">{selectedDept?.name} Specialists</h2>
              <p className="bav-section-sub">{selectedHospital?.name}</p>
            </div>
          </div>

          {loading ? (
            <Skeleton count={3} type="list" />
          ) : doctors.length === 0 ? (
            <div className="bav-empty">No doctors available in this department right now.</div>
          ) : (
            <div className="bav-doctor-list">
              {doctors.map(doc => (
                <div key={doc.id} className="bav-doctor-card">
                  <img
                    src={getImageUrl(doc.avatar)}

                    alt={doc.name}
                    className="bav-doctor-avatar"
                    onError={e => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`; }}
                  />
                  <div className="bav-doctor-info">
                    <h3 className="bav-doctor-name">Dr. {doc.name}</h3>
                    <p className="bav-doctor-spec">{doc.specialization}</p>
                    <div className="bav-doctor-tags">
                      <span className="bav-tag exp">⏱ {doc.experience}</span>
                      <span className="bav-tag qual">{doc.qualification}</span>
                    </div>
                  </div>
                  <div className="bav-doctor-right">
                    <span className={`bav-avail-dot ${doc.availability === 'Available' ? 'avail' : 'busy'}`}>
                      ● {doc.availability}
                    </span>
                    <button
                      className="bav-select-doc-btn"
                      onClick={() => pickDoc(doc)}
                      disabled={doc.availability !== 'Available'}
                    >
                      {doc.availability === 'Available' ? 'Book →' : 'Unavailable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 5 — DATE & TIME                        */}
      {/* ════════════════════════════════════════════ */}
      {step === 5 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">📅</span>
            <div>
              <h2 className="bav-section-title">Choose Date &amp; Time</h2>
              <p className="bav-section-sub">Dr. {selectedDoc?.name} · {selectedDept?.name}</p>
            </div>
          </div>

          {/* Date row */}
          <div className="bav-schedule-block">
            <h4 className="bav-block-title">Select Date</h4>
            <div className="bav-dates-scroll">
              {getAvailableDates().map(d => {
                const raw = fmtDate(d);
                const { weekday, day, month, isToday } = fmtDateMini(d);
                return (
                  <div
                    key={raw}
                    className={`bav-date-chip ${selectedDate === raw ? 'active' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => { setSelectedDate(raw); setSelectedTime(''); }}
                    role="button"
                    tabIndex={0}
                  >
                    {isToday && <span className="bav-today-tag">Today</span>}
                    <span className="bav-dc-weekday">{weekday}</span>
                    <span className="bav-dc-day">{day}</span>
                    <span className="bav-dc-month">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="bav-schedule-block">
            <h4 className="bav-block-title">Select Time</h4>
            {!selectedDate ? (
              <p className="bav-hint">← Pick a date first</p>
            ) : TIME_GROUPS.map(grp => (
              <div key={grp.label} className="bav-time-group">
                <p className="bav-time-grp-lbl">{grp.label}</p>
                <div className="bav-time-chips">
                  {grp.slots.map(slot => {
                    const isPassed = isDateToday(selectedDate) && isTimeSlotPassedToday(slot);
                    return (
                      <button
                        key={slot}
                        className={`bav-time-chip ${selectedTime === slot ? 'active' : ''}`}
                        onClick={() => setSelectedTime(slot)}
                        disabled={isPassed}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedDate && selectedTime && (
            <div className="bav-proceed-area">
              <p className="bav-selected-slot">
                🗓 {selectedDate} at {selectedTime} — with Dr. {selectedDoc?.name}
              </p>
              <button className="bav-proceed-btn" onClick={() => setStep(6)}>
                Proceed to Confirm →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 6 — CONFIRM                            */}
      {/* ════════════════════════════════════════════ */}
      {step === 6 && (
        <div className="bav-body fade-in">
          <div className="bav-section-hdr">
            <span className="bav-section-emoji">✅</span>
            <div>
              <h2 className="bav-section-title">Confirm Appointment</h2>
              <p className="bav-section-sub">Review your details before booking</p>
            </div>
          </div>

          <div className="bav-confirm-layout">
            {/* Doctor summary */}
            <div className="bav-confirm-doctor">
              <img
                src={getImageUrl(selectedDoc?.avatar)}

                alt={selectedDoc?.name}
                className="bav-confirm-doc-avatar"
                onError={e => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedDoc?.name || '')}`; }}
              />
              <div>
                <p className="bav-confirm-doc-name">Dr. {selectedDoc?.name}</p>
                <p className="bav-confirm-doc-spec">{selectedDoc?.specialization} · {selectedDoc?.qualification}</p>
                <p className="bav-confirm-doc-exp">⏱ {selectedDoc?.experience}</p>
              </div>
            </div>

            {/* Booking detail rows */}
            <div className="bav-confirm-table">
              {[
                { lbl: 'Hospital',    val: selectedHospital?.name },
                { lbl: 'Department',  val: selectedDept?.name },
                { lbl: 'Date',        val: selectedDate,  highlight: true },
                { lbl: 'Time',        val: selectedTime,  highlight: true },
                { lbl: 'Visit Type',  val: 'Consultation' },
              ].map(row => (
                <div key={row.lbl} className={`bav-confirm-row ${row.highlight ? 'highlight' : ''}`}>
                  <span className="bav-cr-lbl">{row.lbl}</span>
                  <span className="bav-cr-val">{row.val}</span>
                </div>
              ))}
            </div>

            <button
              className="bav-book-btn"
              onClick={handleBook}
              disabled={loading}
            >
              {loading && <span className="bav-spin" />}
              {loading ? 'Booking…' : '🎯 Confirm & Book Appointment'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STEP 7 — SUCCESS                            */}
      {/* ════════════════════════════════════════════ */}
      {step === 7 && bookingSuccess && (
        <div className="bav-success fade-in">
          <div className="bav-success-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="bav-success-title">Appointment Confirmed! 🎉</h2>
          <p className="bav-success-sub">Your slot is reserved. See you at {selectedHospital?.name}!</p>

          <div className="bav-receipt">
            {[
              { lbl: 'Appointment ID', val: bookingResult?.appointment?.id || bookingResult?.appointment?._id || bookingResult?.id },
              { lbl: 'Hospital',   val: selectedHospital?.name },
              { lbl: 'Doctor',     val: `Dr. ${selectedDoc?.name}` },
              { lbl: 'Department', val: selectedDept?.name },
              { lbl: 'Date',       val: selectedDate },
              { lbl: 'Time',       val: selectedTime },
              (bookingResult?.token?.number || bookingResult?.appointment?.token_number || bookingResult?.token_number) && {
                lbl: 'Token #',
                val: bookingResult?.token?.number || bookingResult?.appointment?.token_number || bookingResult?.token_number
              },
            ].filter(Boolean).map(row => (
              <div key={row.lbl} className="bav-receipt-row">
                <span>{row.lbl}</span>
                <strong>{row.val}</strong>
              </div>
            ))}
          </div>

          <button className="bav-book-another" onClick={reset}>
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAP PICKER COMPONENT
// ─────────────────────────────────────────────────────────────
function MapPicker({ locations, allHospitals, onSelectCity, onSelectHospitalDirectly }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const hospitalMarkersGroupRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [pickedAddress, setPickedAddress] = useState(null);
  const [closestCity, setClosestCity] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Centered in India initially
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;
    hospitalMarkersGroupRef.current = L.layerGroup().addTo(map);

    // Click handler on map
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      handleMapClick(lat, lng);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update Hospital Markers when allHospitals change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = hospitalMarkersGroupRef.current;
    if (!map || !group || !allHospitals.length) return;

    group.clearLayers();

    // Custom Green Pin for hospitals
    const hospitalIcon = L.divIcon({
      className: 'custom-hosp-marker',
      html: `<div class="hosp-pin">🏥</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    });

    allHospitals.forEach(hosp => {
      const coords = HOSPITAL_COORDS[hosp.id] || CITY_COORDS[normalizeCity(hosp.city)];
      if (coords) {
        const marker = L.marker([coords.lat, coords.lon], { icon: hospitalIcon });
        
        // Popup with detail and selection button
        const popupContent = document.createElement('div');
        popupContent.className = 'map-popup-content';
        popupContent.innerHTML = `
          <h4 style="margin: 0 0 4px 0; font-weight:800; font-size:14px; color:#0f172a;">${hosp.name}</h4>
          <p style="margin: 0 0 8px 0; font-size:12px; color:#64748b;">📍 ${hosp.city}${hosp.state ? `, ${hosp.state}` : ''}</p>
          <button class="bav-map-select-btn" style="padding: 5px 12px; background:#0F9D8A; color:white; border:none; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Select Hospital</button>
        `;
        
        popupContent.querySelector('button').onclick = () => {
          onSelectHospitalDirectly(hosp);
        };

        marker.bindPopup(popupContent);
        marker.addTo(group);
      }
    });
  }, [allHospitals, locations]);

  const handleMapClick = async (lat, lng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Pulse Red Pin for picked location
    const pickedIcon = L.divIcon({
      className: 'custom-picked-marker',
      html: `<div class="picked-pin">📍<span class="pulse"></span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pickedIcon }).addTo(map);
    }

    map.panTo([lat, lng]);

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      
      const addr = data.display_name;
      const cityCandidate = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state_district;
      setPickedAddress(addr);

      // Find nearest registered city
      calculateNearestCity(lat, lng);
    } catch (err) {
      console.error('Reverse geocode failed:', err);
      calculateNearestCity(lat, lng);
    } finally {
      setSearching(false);
    }
  };

  const calculateNearestCity = (lat, lng) => {
    if (!locations.length) return;

    let closest = null;
    let minDistance = Infinity;

    locations.forEach(loc => {
      const cityConfig = CITY_COORDS[normalizeCity(loc.city)];
      if (cityConfig) {
        const dist = getDistanceKm(lat, lng, cityConfig.lat, cityConfig.lon);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...loc, distance: dist };
        }
      }
    });

    setClosestCity(closest);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lon);

        handleMapClick(parsedLat, parsedLng);
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([parsedLat, parsedLng], 12);
        }
      } else {
        toast.error('Location not found. Please try another search.');
      }
    } catch (err) {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bav-map-wrapper">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="bav-map-search">
        <input
          type="text"
          placeholder="Search for your area/address..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          disabled={searching}
        />
        <button type="submit" disabled={searching}>
          {searching ? 'Searching...' : '🔍 Search'}
        </button>
      </form>

      {/* Map Container */}
      <div className="bav-map-container" ref={mapRef} />

      {/* Location Details panel */}
      {(pickedAddress || closestCity) && (
        <div className="bav-map-details-panel">
          {searching ? (
            <div className="bav-map-panel-loading">Geocoding picked spot...</div>
          ) : (
            <>
              {pickedAddress && (
                <div className="bav-address-row">
                  <strong>📍 Picked Location:</strong>
                  <p>{pickedAddress}</p>
                </div>
              )}
              {closestCity && (
                <div className="bav-nearest-city-row">
                  {closestCity.distance < 40 ? (
                    <div className="bav-city-detected">
                      <span>🎯 Near: <strong>{closestCity.city}</strong></span>
                      <button className="bav-confirm-loc-btn" onClick={() => onSelectCity(closestCity)}>
                        Discover {closestCity.hospitalCount} Hospital{closestCity.hospitalCount !== 1 ? 's' : ''} →
                      </button>
                    </div>
                  ) : (
                    <div className="bav-city-nearby-suggest">
                      <p>⚠️ No hospitals registered at this exact spot. The nearest supported city is <strong>{closestCity.city}</strong> (~{Math.round(closestCity.distance)} km away).</p>
                      <button className="bav-confirm-loc-btn suggest" onClick={() => onSelectCity(closestCity)}>
                        Select {closestCity.city} instead →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
