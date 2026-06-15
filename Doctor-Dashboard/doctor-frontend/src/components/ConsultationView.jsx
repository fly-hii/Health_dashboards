import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Stethoscope, 
  ChevronRight, 
  Download, 
  Eye, 
  Plus, 
  Trash2, 
  FileText, 
  PlusCircle, 
  Check,
  Calendar,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  Wind
} from 'lucide-react';
import { format } from 'date-fns';

export default function ConsultationView({ appointment, onBackToQueue }) {
  const patient = appointment.patient || {};
  const initialVitals = appointment.vitals || {};

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live Consultation State
  const [status, setStatus] = useState(appointment.status || 'waiting');
  const [symptoms, setSymptoms] = useState(appointment.symptoms || '');
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || '');
  const [icdCode, setIcdCode] = useState('');
  const [doctorNotes, setDoctorNotes] = useState(appointment.clinicalNotes || '');
  const [medicines, setMedicines] = useState([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [labTests, setLabTests] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');

  // History & Reports State
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);

  // Fetch consultation if it already exists in database
  const fetchConsultation = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('doctor_token')}` };
      const res = await axios.get(`/api/consultations/${appointment._id}`, { headers });
      if (res.data && res.data._id) {
        const data = res.data;
        setStatus(data.status);
        setSymptoms(data.symptoms || '');
        setDiagnosis(data.diagnosis || '');
        setDoctorNotes(data.doctorNotes || '');
        setLabTests(data.labTests || []);
        if (data.medicines && data.medicines.length > 0) {
          setMedicines(data.medicines);
        }
        if (data.followUpDate) {
          setFollowUpDate(format(new Date(data.followUpDate), 'yyyy-MM-dd'));
        }
      }
    } catch (err) {
      console.error('Error fetching consultation:', err);
    }
  };

  const fetchHistoryAndReports = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('doctor_token')}` };
      const [historyRes, reportsRes] = await Promise.all([
        axios.get(`/api/patients/${patient._id}/history`, { headers }),
        axios.get(`/api/patients/${patient._id}/reports`, { headers })
      ]);
      setHistory(historyRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error('Error fetching history/reports:', err);
    }
  };

  useEffect(() => {
    fetchConsultation();
    fetchHistoryAndReports();
  }, [appointment._id]);

  // Start Consultation
  const handleStartConsultation = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('doctor_token')}` };
      const res = await axios.patch(`/api/consultations/${appointment._id}/start`, {}, { headers });
      if (res.data && res.data.success) {
        setStatus('in_consultation');
        // Dispatch event for socket update
        window.dispatchEvent(new CustomEvent('dashboard_refresh'));
      }
    } catch (err) {
      console.error('Error starting consultation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add / Remove Medicines
  const handleAddMedicine = () => {
    setMedicines([...medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) {
      setMedicines([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    } else {
      setMedicines(medicines.filter((_, idx) => idx !== index));
    }
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = medicines.map((med, idx) => {
      if (idx === index) {
        return { ...med, [field]: value };
      }
      return med;
    });
    setMedicines(updated);
  };

  // Lab Checkboxes
  const handleLabCheckboxChange = (testName) => {
    if (labTests.includes(testName)) {
      setLabTests(labTests.filter(t => t !== testName));
    } else {
      setLabTests([...labTests, testName]);
    }
  };

  // Complete Consultation
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('doctor_token')}` };
      const activeMedicines = medicines.filter(m => m.medicineName.trim() !== '');

      const payload = {
        diagnosis,
        doctorNotes,
        medicines: activeMedicines,
        labTests,
        followUpDate: followUpDate || null
      };

      const res = await axios.patch(`/api/consultations/${appointment._id}/complete`, payload, { headers });
      if (res.data) {
        window.dispatchEvent(new CustomEvent('dashboard_refresh'));
        onBackToQueue();
      }
    } catch (err) {
      console.error('Error completing consultation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Notes (Tab 2)
  const handleSaveNotes = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('doctor_token')}` };
      const res = await axios.patch(`/api/consultations/${appointment._id}/notes`, {
        symptoms,
        diagnosis,
        doctorNotes
      }, { headers });
      if (res.data) {
        console.log('Notes updated successfully!');
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Consultation</h1>
        <button 
          onClick={onBackToQueue}
          className="text-[#0F9D8A] hover:text-[#0c8776] text-sm font-bold flex items-center gap-1.5 focus:outline-none"
        >
          <span>&larr;</span> Back to Queue
        </button>
      </div>

      {/* Patient Demographic Summary Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Circular Initials Avatar */}
          <div className="w-16 h-16 bg-[#005AE2]/10 rounded-full flex items-center justify-center text-[#005AE2] font-bold text-xl shrink-0">
            {patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'P'}
          </div>
          <div className="flex flex-col text-left">
            <h2 className="text-xl font-bold text-[#0B1F3A]">{patient.name || 'Unknown'}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm font-medium text-[#64748B]">
              <span>{patient.age || '—'} Years / {patient.gender || '—'}</span>
              <span className="text-slate-300">|</span>
              <span>ID: {patient.patientId || 'P12546'}</span>
              <span className="text-slate-300">|</span>
              <span>{patient.phone || '9876543210'}</span>
            </div>
          </div>
        </div>

        {/* Token Details Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-left border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div>
            <span className="text-[#64748B] font-medium">Token No.</span>
          </div>
          <div>
            <span className="font-bold text-[#0B1F3A]">{appointment.tokenNumber || 'T-101'}</span>
          </div>
          <div>
            <span className="text-[#64748B] font-medium">Appointment</span>
          </div>
          <div>
            <span className="font-bold text-[#0B1F3A]">
              {appointment.appointmentTime ? `15 May 2025, ${appointment.appointmentTime}` : '15 May 2025, 09:30 AM'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] gap-2 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-t border-x transition-all shrink-0 ${
            activeTab === 'details'
              ? 'bg-white border-[#E5E7EB] border-b-transparent text-[#0F9D8A] focus:outline-none'
              : 'bg-transparent border-transparent text-[#64748B] hover:text-[#0B1F3A]'
          }`}
        >
          Patient Details
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-t border-x transition-all shrink-0 ${
            activeTab === 'notes'
              ? 'bg-white border-[#E5E7EB] border-b-transparent text-[#0F9D8A] focus:outline-none'
              : 'bg-transparent border-transparent text-[#64748B] hover:text-[#0B1F3A]'
          }`}
        >
          Vitals & Notes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-t border-x transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-white border-[#E5E7EB] border-b-transparent text-[#0F9D8A] focus:outline-none'
              : 'bg-transparent border-transparent text-[#64748B] hover:text-[#0B1F3A]'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 text-sm font-semibold rounded-t-xl border-t border-x transition-all shrink-0 ${
            activeTab === 'reports'
              ? 'bg-white border-[#E5E7EB] border-b-transparent text-[#0F9D8A] focus:outline-none'
              : 'bg-transparent border-transparent text-[#64748B] hover:text-[#0B1F3A]'
          }`}
        >
          Reports
        </button>
      </div>

      {/* TAB CONTENT AREAS */}
      <div className="flex-1">
        {/* TAB 1: Patient Details */}
        {activeTab === 'details' && (
          <div className="flex flex-col gap-6">
            {/* If Not Started Consultation (Waiting/Checked-In) */}
            {status !== 'in_consultation' && status !== 'completed' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {/* Card 1: Patient Information */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                      <h3 className="font-bold text-[#0B1F3A] text-base">Patient Information</h3>
                    </div>
                    <div className="flex flex-col gap-3.5 text-sm">
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Blood Group</span>
                        <span className="font-bold text-[#0B1F3A]">{patient.bloodGroup || 'B+'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Allergies</span>
                        <span className="font-bold text-[#EF4444]">{patient.allergies?.join(', ') || 'Penicillin'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Height</span>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.height || '170 cm'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Weight</span>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.weight || '72 kg'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Occupation</span>
                        <span className="font-bold text-[#0B1F3A]">Business</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#64748B] font-medium">Address</span>
                        <span className="font-bold text-[#0B1F3A]">Jaipur, Rajasthan</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Current Visit */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col">
                    <div className="mb-4 pb-2 border-b border-slate-50">
                      <h3 className="font-bold text-[#0B1F3A] text-base">Current Visit</h3>
                    </div>
                    <div className="flex flex-col gap-3.5 text-sm">
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Chief Complaint</span>
                        <span className="font-bold text-[#0B1F3A] text-right max-w-[170px] truncate">{symptoms || 'Chest pain since 2 days'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Onset</span>
                        <span className="font-bold text-[#0B1F3A]">Gradual</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Pain Severity</span>
                        <span className="font-bold text-[#0B1F3A]">Moderate</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100/50">
                        <span className="text-[#64748B] font-medium">Associated Symptoms</span>
                        <span className="font-bold text-[#0B1F3A] text-right max-w-[170px] truncate">Shortness of breath</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#64748B] font-medium">Duration</span>
                        <span className="font-bold text-[#0B1F3A]">2 days</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Vitals */}
                  <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
                    <div className="mb-4 pb-2 border-b border-slate-50">
                      <h3 className="font-bold text-[#0B1F3A] text-base">Vitals (Today 09:20 AM)</h3>
                    </div>
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Activity className="w-4 h-4" />
                          </div>
                          <span className="text-[#64748B] font-medium">BP</span>
                        </div>
                        <span className="font-bold text-[#0B1F3A]">
                          {initialVitals.bloodPressure ? `${initialVitals.bloodPressure.systolic}/${initialVitals.bloodPressure.diastolic} mmHg` : '130/85 mmHg'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-rose-50 flex items-center justify-center text-rose-600">
                            <Heart className="w-4 h-4" />
                          </div>
                          <span className="text-[#64748B] font-medium">Pulse</span>
                        </div>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.pulseRate ? `${initialVitals.pulseRate} bpm` : '82 bpm'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                            <Thermometer className="w-4 h-4" />
                          </div>
                          <span className="text-[#64748B] font-medium">Temperature</span>
                        </div>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.temperature ? `${initialVitals.temperature}°F` : '98.6°F'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-teal-50 flex items-center justify-center text-teal-600">
                            <Droplet className="w-4 h-4" />
                          </div>
                          <span className="text-[#64748B] font-medium">SpO2</span>
                        </div>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.spo2 ? `${initialVitals.spo2}%` : '98%'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-cyan-50 flex items-center justify-center text-cyan-600">
                            <Wind className="w-4 h-4" />
                          </div>
                          <span className="text-[#64748B] font-medium">Respiratory Rate</span>
                        </div>
                        <span className="font-bold text-[#0B1F3A]">{initialVitals.respiratoryRate ? `${initialVitals.respiratoryRate}/min` : '18/min'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="border border-[#E5E7EB] hover:bg-slate-50 text-[#0F9D8A] font-semibold text-sm rounded-xl py-3 px-6 transition-all"
                  >
                    Add Notes
                  </button>
                  <button
                    onClick={handleStartConsultation}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-[#0F9D8A] hover:bg-[#0c8776] text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all shadow-sm"
                  >
                    <Stethoscope className="w-4.5 h-4.5" />
                    <span>{loading ? 'Starting...' : 'Start Consultation'}</span>
                  </button>
                </div>
              </>
            ) : (
              /* Consultation Workspace Form */
              <form onSubmit={handleCompleteConsultation} className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col gap-6 text-left">
                <h3 className="font-bold text-lg text-[#0B1F3A] border-b border-slate-100 pb-3">Consultation Workspace</h3>
                
                {/* Inputs Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#0B1F3A]">Chief Complaint</label>
                    <input
                      type="text"
                      className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all"
                      placeholder="e.g. Chest pain since 2 days"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#0B1F3A]">Diagnosis</label>
                    <input
                      type="text"
                      className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all"
                      placeholder="e.g. Acute Angina"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#0B1F3A]">ICD Code</label>
                    <input
                      type="text"
                      className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all"
                      placeholder="e.g. I20.9"
                      value={icdCode}
                      onChange={(e) => setIcdCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Treatment Notes textarea */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#0B1F3A]">Treatment Plan / Doctor Notes</label>
                  <textarea
                    rows={4}
                    className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all resize-none"
                    placeholder="Enter clinical notes, recommendations, or findings..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                  />
                </div>

                {/* Lab recommendations check boxes */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-[#0B1F3A]">Lab Recommendations</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['Blood Test', 'CBC', 'LFT', 'KFT', 'ECG', 'MRI', 'X-Ray', 'CT Scan'].map((test) => (
                      <label key={test} className="flex items-center gap-2.5 text-sm font-medium text-[#64748B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={labTests.includes(test)}
                          onChange={() => handleLabCheckboxChange(test)}
                          className="w-4 h-4 rounded text-[#0F9D8A] focus:ring-[#0F9D8A] border-[#E5E7EB] cursor-pointer"
                        />
                        <span>{test}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Prescription medicine section */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#0B1F3A]">Prescription Section</label>
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#0F9D8A] hover:text-[#0c8776]"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                          <th className="pb-2">Medicine Name</th>
                          <th className="pb-2 pl-3">Dosage</th>
                          <th className="pb-2 pl-3">Frequency</th>
                          <th className="pb-2 pl-3">Duration</th>
                          <th className="pb-2 pl-3">Instructions</th>
                          <th className="pb-2 text-center" style={{ width: 60 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {medicines.map((med, index) => (
                          <tr key={index}>
                            <td className="py-2.5 pr-3">
                              <input
                                type="text"
                                placeholder="e.g. Aspirin 75mg"
                                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0F9D8A]"
                                value={med.medicineName}
                                onChange={(e) => handleMedicineChange(index, 'medicineName', e.target.value)}
                                required={index === 0}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 1 Tablet"
                                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0F9D8A]"
                                value={med.dosage}
                                onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. Once daily"
                                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0F9D8A]"
                                value={med.frequency}
                                onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 5 days"
                                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0F9D8A]"
                                value={med.duration}
                                onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. After meals"
                                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0F9D8A]"
                                value={med.instructions}
                                onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                              />
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveMedicine(index)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Follow-up Date picker */}
                <div className="flex flex-col gap-2 max-w-[240px]">
                  <label className="text-sm font-semibold text-[#0B1F3A]">Follow-up Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-[#94a3b8] absolute left-3.5 pointer-events-none" />
                    <input
                      type="date"
                      className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] transition-all w-full"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Form submit footer */}
                <div className="flex justify-end gap-4 pt-4 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={onBackToQueue}
                    className="border border-[#E5E7EB] hover:bg-slate-50 text-[#64748B] font-semibold text-sm rounded-xl py-3 px-6 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#0F9D8A] hover:bg-[#0c8776] text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all shadow-sm"
                  >
                    {submitting ? 'Completing...' : 'Complete Consultation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Vitals & Notes */}
        {activeTab === 'notes' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col gap-6 text-left">
            <h3 className="font-bold text-lg text-[#0B1F3A] border-b border-slate-100 pb-3">Recorded Vitals & Doctor Notes</h3>
            
            {/* Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-[#64748B]">Blood Pressure</span>
                <span className="text-lg font-bold text-[#0B1F3A] mt-1.5">
                  {initialVitals.bloodPressure ? `${initialVitals.bloodPressure.systolic}/${initialVitals.bloodPressure.diastolic}` : '130/85'}
                  <span className="text-xs font-medium text-[#64748B] ml-1">mmHg</span>
                </span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-[#64748B]">Pulse Rate</span>
                <span className="text-lg font-bold text-[#0B1F3A] mt-1.5">
                  {initialVitals.pulseRate || '82'}
                  <span className="text-xs font-medium text-[#64748B] ml-1">bpm</span>
                </span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-[#64748B]">Temperature</span>
                <span className="text-lg font-bold text-[#0B1F3A] mt-1.5">
                  {initialVitals.temperature || '98.6'}
                  <span className="text-xs font-medium text-[#64748B] ml-1">°F</span>
                </span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-[#64748B]">SpO2</span>
                <span className="text-lg font-bold text-[#0B1F3A] mt-1.5">
                  {initialVitals.spo2 || '98'}
                  <span className="text-xs font-medium text-[#64748B] ml-1">%</span>
                </span>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 flex flex-col">
                <span className="text-xs font-semibold text-[#64748B]">Resp. Rate</span>
                <span className="text-lg font-bold text-[#0B1F3A] mt-1.5">
                  {initialVitals.respiratoryRate || '18'}
                  <span className="text-xs font-medium text-[#64748B] ml-1">/min</span>
                </span>
              </div>
            </div>

            {/* Editable Doctor Notes Textarea blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#0B1F3A]">Chief Symptoms</label>
                <textarea
                  rows={4}
                  className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all resize-none"
                  placeholder="Enter chief symptoms..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#0B1F3A]">Diagnosis Notes</label>
                <textarea
                  rows={4}
                  className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all resize-none"
                  placeholder="Enter diagnosis findings..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#0B1F3A]">Observations / Findings</label>
                <textarea
                  rows={4}
                  className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all resize-none"
                  placeholder="Enter observations..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#0B1F3A]">Doctor Recommendations</label>
                <textarea
                  rows={4}
                  className="border border-[#E5E7EB] hover:border-slate-300 focus:border-[#0F9D8A] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#0F172A] transition-all resize-none"
                  placeholder="Enter prescriptions advice, food plan etc..."
                  value={doctorNotes}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#F1F5F9] mt-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={loading}
                className="bg-[#0F9D8A] hover:bg-[#0c8776] text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all shadow-sm"
              >
                {loading ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: History */}
        {activeTab === 'history' && (
          <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col gap-6 text-left">
            <h3 className="font-bold text-lg text-[#0B1F3A] border-b border-slate-100 pb-3">Previous Visits</h3>
            
            {history.length === 0 ? (
              <p className="text-sm text-[#64748B]">No previous visits found for this patient.</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-4 pl-6 flex flex-col gap-8">
                {history.map((visit, index) => (
                  <div key={index} className="relative">
                    {/* Circle timeline indicator */}
                    <div className="absolute -left-[31px] top-1.5 w-[10px] h-[10px] bg-[#0F9D8A] rounded-full border-2 border-white ring-4 ring-[#e6f5f3]" />
                    <div className="flex flex-col text-left bg-[#F8FAFC] border border-slate-100 rounded-2xl p-5 shadow-sm max-w-[640px]">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-xs font-bold text-[#0F9D8A]">
                          {format(new Date(visit.appointmentDate), 'dd MMM yyyy')}
                        </span>
                        <span className="text-xs text-[#64748B] font-semibold">
                          Doctor: Dr. {visit.doctor?.name || 'Arjun Mehta'} ({visit.doctor?.department || 'Cardiology'})
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#0B1F3A] mt-3">
                        Diagnosis: <span className="font-semibold text-[#64748B]">{visit.diagnosis || 'Cardiovascular general checkup'}</span>
                      </p>
                      
                      {/* Prescriptions */}
                      {visit.prescription && visit.prescription.length > 0 && (
                        <div className="mt-4">
                          <span className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">Prescription</span>
                          <div className="flex flex-col gap-1.5 mt-2 bg-white rounded-xl p-3 border border-slate-100/50">
                            {visit.prescription.map((m, mIdx) => (
                              <div key={mIdx} className="text-xs text-[#64748B] flex justify-between">
                                <span className="font-semibold text-[#0B1F3A]">{m.medicineName}</span>
                                <span>{m.dosage} · {m.frequency} · {m.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Reports */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {reports.map((report) => (
              <div key={report._id} className="bg-white border border-[#E5E7EB] rounded-[20px] p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[150px]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center text-[#2563EB] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0B1F3A] text-sm truncate max-w-[150px]">{report.name}</span>
                    <span className="text-xs text-[#64748B] font-medium mt-1">{report.date || '12 May 2025'}</span>
                    <span className="text-[10px] text-[#94a3b8] mt-0.5">{report.size || '1.2 MB'}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                  <button className="flex-1 flex items-center justify-center gap-1.5 border border-[#E5E7EB] hover:bg-slate-50 text-[#0B1F3A] rounded-lg py-1.5 text-xs font-bold transition-all">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 border border-[#E5E7EB] hover:bg-slate-50 text-[#0B1F3A] rounded-lg py-1.5 text-xs font-bold transition-all">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
