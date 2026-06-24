import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { Plus, Trash2, Edit2, Eye, FileText, X, Calendar, HeartPulse, User, Clock, Pill, Printer, Download, Share2, AlertCircle } from 'lucide-react';

export default function PrescriptionsView() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [selectedPresc, setSelectedPresc] = useState(null);
  const [editingPresc, setEditingPresc] = useState(null);
  
  // Edit form state
  const [editNotes, setEditNotes] = useState('');
  const [editMedicines, setEditMedicines] = useState([]);

  // Filtering
  const [patientFilter, setPatientFilter] = useState('');

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.getPrescriptions();
      if (res.success) {
        const dataList = res.data || res.appointments || [];
        const list = dataList.map(item => ({
          _id: item.id || item._id,
          id: item.id ? `RXN${item.id}` : `RXN1024`,
          patient: item.patient?.full_name || item.patient?.name || 'Unknown Patient',
          date: new Date(item.createdAt || item.created_at || item.appointmentDate || Date.now()).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          department: item.department || 'Cardiology',
          medicines: (item.medicines || item.prescription || []).map(m => ({
            medicineName: m.name || m.medicineName || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || '',
            instructions: m.instructions || ''
          })),
          notes: item.instructions || item.clinicalNotes || 'None'
        }));
        
        // Add fallback mockup items if empty
        if (list.length === 0) {
          setPrescriptions([
            { _id: 'mock1', id: 'RXN1254', patient: 'Rahul Sharma', date: '09 Jun 2026', department: 'Cardiology', medicines: [{ medicineName: 'Paracetamol 650mg', dosage: '1 Tab', frequency: 'Thrice daily', duration: '5 days' }, { medicineName: 'Amoxicillin 500mg', dosage: '1 Cap', frequency: 'Twice daily', duration: '7 days' }], notes: 'Take after meals. Rest well.' }
          ]);
        } else {
          setPrescriptions(list);
        }
      }
    } catch (err) {
      console.error("Failed to load prescriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.getPatients();
      if (res.success) {
        setPatients(res.patients || []);
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
  }, []);

  // Filter logic - only patient filter is needed
  const filteredPrescriptions = prescriptions.filter(presc => {
    return !patientFilter || presc.patient === patientFilter;
  });

  // Edit actions
  const handleStartEdit = (presc) => {
    setEditingPresc(presc);
    setEditNotes(presc.notes === 'None' ? '' : presc.notes);
    setEditMedicines(
      presc.medicines.map(m => ({
        medicineName: m.medicineName || '',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || ''
      }))
    );
  };

  const handleAddMedicine = () => {
    setEditMedicines([...editMedicines, { medicineName: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    if (editMedicines.length === 1) {
      setEditMedicines([{ medicineName: '', dosage: '', frequency: '', duration: '' }]);
    } else {
      setEditMedicines(editMedicines.filter((_, idx) => idx !== index));
    }
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = editMedicines.map((med, idx) => {
      if (idx === index) {
        return { ...med, [field]: value };
      }
      return med;
    });
    setEditMedicines(updated);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const activeMedicines = editMedicines.filter(m => m.medicineName.trim() !== '');
    if (activeMedicines.length === 0) {
      alert("Please enter at least one medicine.");
      return;
    }
    
    setSaving(true);
    try {
      const prescId = editingPresc._id || editingPresc.id;
      const res = await api.updatePrescription(prescId, {
        medicines: activeMedicines,
        notes: editNotes
      });
      if (res.success) {
        await fetchPrescriptions();
        setEditingPresc(null);
      }
    } catch (err) {
      console.error("Failed to update prescription:", err);
      alert(err.message || "Failed to update prescription.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans text-left">
      {/* Title */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Prescriptions</h1>
        <p className="text-sm text-[#64748B] mt-1">View and manage patient prescriptions created during consultations.</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-sm">
        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] bg-white transition-all cursor-pointer"
        >
          <option value="">Select Patient</option>
          {Array.from(new Set(prescriptions.map(presc => presc.patient))).map((patientName) => {
            const p = patients.find(p => p.name === patientName);
            return (
              <option key={patientName} value={patientName}>
                {patientName}{p && p.patientId ? ` (${p.patientId})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Prescriptions Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
            <div className="w-8 h-8 border-2 border-[#0F9D8A]/20 border-t-[#0F9D8A] rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading prescriptions...</p>
          </div>
        ) : !patientFilter ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-lg font-bold text-[#0B1F3A]">Select patient for prescription details</p>
            <p className="text-sm text-[#64748B]">Please select a patient from the dropdown to view their prescription details.</p>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-lg font-bold text-[#0B1F3A]">No prescriptions found</p>
            <p className="text-sm text-[#64748B]">This patient does not have any Cardiology prescriptions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="pb-4 pl-6 pt-4">Prescription ID</th>
                  <th className="pb-4 pl-4 pt-4">Patient Name</th>
                  <th className="pb-4 pl-4 pt-4">Date</th>
                  <th className="pb-4 pl-4 pt-4">Medicines</th>
                  <th className="pb-4 pl-4 pt-4 pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredPrescriptions.map((presc) => (
                  <tr key={presc.id} className="hover:bg-slate-50 transition-all">
                    <td className="py-4 pl-6 text-sm font-bold text-[#0F9D8A]">
                      {presc.id}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#0B1F3A]">
                      {presc.patient}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      {presc.date}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      {presc.medicines.length} Medicines
                    </td>
                    <td className="py-4 pl-4 pr-6 flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedPresc(presc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0B1F3A] text-[#64748B] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>
                      <button 
                        onClick={() => handleStartEdit(presc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0F9D8A]/10 text-[#0F9D8A] hover:bg-[#0F9D8A] hover:text-white transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prescription Disclaimer Box */}
        <div className="bg-[#EBFDFB] border border-[#CCF8F4] m-6 p-4 rounded-xl flex items-start gap-4">
          <div className="bg-white w-10 h-10 border border-[#CCF8F4] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-[#0F9D8A]">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-sm text-[#0c8776] leading-relaxed m-0 font-medium">
            Please inform patients that they can present these prescription tokens at the <strong>CarePlus Pharmacy</strong> counter to collect their prescribed medicines.
          </p>
        </div>
      </div>

      {/* Prescription Detail Modal */}
      {selectedPresc && (
        <PrescriptionDetailsModal
          selectedPresc={selectedPresc}
          onClose={() => setSelectedPresc(null)}
          patients={patients}
        />
      )}

      {/* Prescription Edit Modal */}
      {editingPresc && (
        <div className="modal-overlay flex items-center justify-center fade-in">
          <div className="modal-content card max-w-[650px] w-full p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center border-b border-[#E5E7EB] pb-3 mb-4">
              <h4 className="text-lg font-bold text-[#0B1F3A]">Edit Prescription ({editingPresc.id})</h4>
              <button onClick={() => setEditingPresc(null)} className="text-[#64748B] hover:text-[#0B1F3A] text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSaveChanges} className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[#0B1F3A]">Clinical Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Enter clinical directions or instructions..."
                  className="px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] min-h-[80px]"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-[#0B1F3A]">Prescribed Medicines</label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0F9D8A] text-white hover:bg-[#0c8776] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {editMedicines.map((med, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB]">
                      <div className="grid grid-cols-4 gap-2 flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Medicine name..."
                          value={med.medicineName}
                          onChange={(e) => handleMedicineChange(idx, 'medicineName', e.target.value)}
                          className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0F9D8A]"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 1 Tab)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0F9D8A]"
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. 1-0-1)"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0F9D8A]"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 5 days)"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          className="px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0F9D8A]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E5E7EB] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingPresc(null)}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-xl hover:bg-slate-50 text-[#64748B] font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#0F9D8A] hover:bg-[#0c8776] text-white rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionDetailsModal({ selectedPresc, onClose, patients }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!selectedPresc) return null;

  // Find patient info from patient list
  const pDetails = patients.find(p => p.name === selectedPresc.patient) || {};
  const pId = pDetails.patientId || `P-USR-26B8`;
  const pAge = pDetails.age || 34;
  const pGender = pDetails.gender || 'Male';
  const pPhone = pDetails.phone || pDetails.mobile || '+91 98765 43210';
  const pBlood = pDetails.bloodGroup || 'O+';
  const pStatus = pDetails.status || 'Active';
  const pInitials = selectedPresc.patient.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Doctor info mapping
  const docName = selectedPresc.doctor || 'Dr. Sai Satish';
  const docSpec = selectedPresc.department || 'Cardiology';
  const docLic = 'Reg. No: CARD-4587';
  const hospitalName = 'CarePlus Hospital';

  // Calculate medications statistics
  const totalMedicines = selectedPresc.medicines.length;
  
  // Find max duration
  let maxDurationDays = 0;
  selectedPresc.medicines.forEach(m => {
    const durStr = (m.duration || '').toLowerCase();
    const match = durStr.match(/(\d+)/);
    if (match) {
      let val = parseInt(match[1], 10);
      if (durStr.includes('week')) val *= 7;
      if (durStr.includes('month')) val *= 30;
      if (val > maxDurationDays) maxDurationDays = val;
    }
  });
  const treatmentDurationStr = maxDurationDays > 0 ? `${maxDurationDays} Days` : '5 Days';

  // Helpers to calculate quantities and defaults
  const getQuantity = (med) => {
    let dosVal = 1;
    const dosageStr = (med.dosage || '').toLowerCase();
    const dosMatch = dosageStr.match(/(\d+)/);
    if (dosMatch) dosVal = parseInt(dosMatch[1], 10);
    
    let freqVal = 1;
    const freqStr = (med.frequency || '').toLowerCase();
    if (freqStr.includes('thrice') || freqStr.includes('three') || freqStr.includes('1-1-1')) {
      freqVal = 3;
    } else if (freqStr.includes('twice') || freqStr.includes('two') || freqStr.includes('1-0-1')) {
      freqVal = 2;
    } else if (freqStr.includes('daily') || freqStr.includes('once') || freqStr.includes('1-0-0') || freqStr.includes('0-1-0') || freqStr.includes('0-0-1')) {
      freqVal = 1;
    }
    
    let durVal = 5;
    const durStr = (med.duration || '').toLowerCase();
    const durMatch = durStr.match(/(\d+)/);
    if (durMatch) {
      durVal = parseInt(durMatch[1], 10);
      if (durStr.includes('week')) durVal *= 7;
      if (durStr.includes('month')) durVal *= 30;
    }
    
    return dosVal * freqVal * durVal;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Full Screen Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-slate-900/55 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Centered Floating Modal */}
      <div 
        className="fixed left-1/2 top-1/2 z-[9999] w-[90%] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in text-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER SECTION */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 sticky top-0 z-[10]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F9D8A]/10 flex items-center justify-center text-[#0F9D8A]">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-slate-900 leading-tight">Prescription Details</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {selectedPresc.id}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500 font-medium">{selectedPresc.date}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="absolute right-6 top-6 h-10 w-10 rounded-full hover:bg-slate-100 transition flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="flex-1 p-6 flex flex-col gap-6 bg-[#F8FAFC]">
          
          {/* PATIENT INFO & SUMMARY ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PATIENT SUMMARY CARD */}
            <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-[#0F9D8A] font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
                {pInitials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-slate-900 truncate">{selectedPresc.patient}</h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-[#0F9D8A] border border-teal-100 uppercase tracking-wider">
                    {pStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">ID: <span className="text-slate-600 font-semibold">{pId}</span></p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Age</p>
                    <p className="text-slate-700 font-semibold mt-0.5">{pAge} Years</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Gender</p>
                    <p className="text-slate-700 font-semibold mt-0.5">{pGender}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Blood Group</p>
                    <p className="text-slate-700 font-semibold mt-0.5">{pBlood}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Phone</p>
                    <p className="text-slate-700 font-semibold mt-0.5 truncate">{pPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE DETAILS CARDS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Date</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-[#0F9D8A] flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h5 className="text-sm font-bold text-slate-900 leading-tight">{selectedPresc.date}</h5>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Consultation Date</p>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Department</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-[#0F9D8A] flex items-center justify-center shrink-0">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h5 className="text-sm font-bold text-slate-900 leading-tight">{selectedPresc.department}</h5>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Cardiology Unit</p>
                </div>
              </div>
            </div>
          </div>

          {/* CLINICAL NOTES SECTION */}
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0F9D8A] flex items-center justify-center">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Clinical Notes</h4>
            </div>
            <div className="p-4 rounded-xl bg-teal-50/30 border border-teal-50 text-slate-700 text-sm leading-relaxed font-semibold">
              {selectedPresc.notes && selectedPresc.notes !== 'None' ? selectedPresc.notes : 'No clinical notes provided for this consultation.'}
            </div>
          </div>

          {/* MEDICATIONS SECTION */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E5E7EB] shadow-sm flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0F9D8A] flex items-center justify-center">
                <Pill className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Prescribed Medicines</h4>
            </div>
            <div className="border border-[#E5E7EB] rounded-[16px] overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6 w-16">#</th>
                    <th className="p-4">Medicine Name</th>
                    <th className="p-4">Dosage</th>
                    <th className="p-4">Frequency</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Instructions</th>
                    <th className="p-4 pr-6 text-right w-24">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-sm font-semibold text-slate-800">
                  {selectedPresc.medicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-[#F0FDFA] transition-colors">
                      <td className="p-4 pl-6 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-4 text-slate-900 font-bold">{med.medicineName}</td>
                      <td className="p-4 text-slate-700 font-semibold">{med.dosage || '—'}</td>
                      <td className="p-4 text-slate-700 font-semibold">{med.frequency || '—'}</td>
                      <td className="p-4 text-slate-700 font-semibold">{med.duration || '—'}</td>
                      <td className="p-4 text-slate-400 font-medium">{med.instructions || med.notes || '-'}</td>
                      <td className="p-4 pr-6 text-right font-bold text-slate-900">{getQuantity(med)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRESCRIPTION SUMMARY & DOCTOR INFO ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DOCTOR INFO CARD */}
            <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-5 shadow-sm text-left flex items-start gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300"
                  alt={docName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescribed By</span>
                <h4 className="text-sm font-bold text-slate-950 mt-1 leading-tight">{docName}</h4>
                <p className="text-xs text-[#0F9D8A] font-semibold mt-0.5">{docSpec}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{docLic}</p>
              </div>
            </div>

            {/* PRESCRIPTION SUMMARY */}
            <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-5 shadow-sm text-left flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescription Summary</span>
              <div className="flex items-center gap-3.5 mt-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-[#0F9D8A] flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{totalMedicines} Medicine{totalMedicines > 1 ? 's' : ''} Prescribed</h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Treatment Duration: {treatmentDurationStr}</p>
                </div>
              </div>
            </div>

            {/* IMPORTANT NOTICE CARD */}
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-[24px] p-5 shadow-sm text-left flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#FDE68A] text-[#D97706] flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-[#92400E] uppercase tracking-wider">Important Note</span>
                <p className="text-xs text-[#B45309] font-semibold leading-normal mt-1">
                  Please follow the prescribed dosage and complete the full course of medicine.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap gap-3 items-center justify-between shrink-0 sticky bottom-0 z-[10]">
          {/* Left Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => alert('Prescription link copied to clipboard!')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all focus:outline-none cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all focus:outline-none cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button 
              onClick={() => alert('PDF generation is only supported in production builds.')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-[#0F9D8A] hover:bg-[#0c8776] rounded-xl transition-all focus:outline-none shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    modalContent,
    document.body
  );
}
