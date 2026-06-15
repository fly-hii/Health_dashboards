import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ChevronRight, FileText, User } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientMedicalHistory({ patientId, onBack, onViewRecord }) {
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visit_history');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientRes, recordsRes] = await Promise.all([
          fetch(`/api/patients/${patientId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('doctor_token')}` }
          }).then(r => r.json()),
          api.getPatientMedicalRecords(patientId)
        ]);
        
        // Wait, patient api might not return { success: true } if it's returning raw object, let's check
        // In doctorController.js, getPatientById does res.json(patient) directly.
        setPatient(patientRes);
        if (recordsRes.success) {
          setRecords(recordsRes.records);
        }
      } catch (err) {
        console.error('Fetch patient history error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (patientId) fetchData();
  }, [patientId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center text-[#64748B]">
          <div className="w-8 h-8 border-2 border-[#0F9D8A]/20 border-t-[#0F9D8A] rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Loading patient history...</p>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const initials = patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans">
      
      {/* Header */}
      <div className="flex flex-col text-left mb-2">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Medical Records</h1>
        <p className="text-sm text-[#64748B] mt-1">View patient's past medical history and visits.</p>
      </div>

      {/* Patient Summary Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#1D4ED8] rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
            {initials}
          </div>
          <div className="flex flex-col text-left">
            <h2 className="text-xl font-bold text-[#0B1F3A]">{patient.name || 'Unknown Patient'}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm font-medium text-[#64748B]">
              <span>{patient.age || '—'} Years / {patient.gender || '—'}</span>
              <span className="text-slate-300">|</span>
              <span>ID: {patient.patientId || '—'}</span>
              <span className="text-slate-300">|</span>
              <span>{patient.phone || '—'}</span>
            </div>
          </div>
        </div>
        
        <button className="flex items-center gap-2 bg-[#0F9D8A] hover:bg-[#0c8776] text-white rounded-lg py-2.5 px-5 font-semibold text-sm transition-all">
          <User className="w-4 h-4" />
          <span>View Profile</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
        {[
          { id: 'visit_history', label: 'Visit History' },
          { id: 'diagnoses', label: 'Diagnoses' },
          { id: 'prescriptions', label: 'Prescriptions' },
          { id: 'lab_reports', label: 'Lab Reports' },
          { id: 'documents', label: 'Documents' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-bold rounded-lg border transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white border-[#0F9D8A] text-[#0F9D8A] shadow-sm'
                : 'bg-white border-[#E5E7EB] text-[#64748B] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Visit History Table */}
      {activeTab === 'visit_history' && (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col p-6 overflow-hidden">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <p className="text-base font-bold text-[#0B1F3A]">No visit history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#F1F5F9] text-xs font-bold text-[#0B1F3A] capitalize">
                    <th className="pb-4">Visit Date</th>
                    <th className="pb-4 pl-4">Doctor</th>
                    <th className="pb-4 pl-4">Department</th>
                    <th className="pb-4 pl-4">Diagnosis</th>
                    <th className="pb-4 pl-4 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50 transition-all">
                      <td className="py-5 text-sm font-bold text-[#0B1F3A]">
                        {format(new Date(record.visitDate), 'dd MMM yyyy')}
                      </td>
                      <td className="py-5 pl-4 font-bold text-[#0B1F3A] text-sm">
                        Dr. {record.doctorId?.name || 'Unknown'}
                      </td>
                      <td className="py-5 pl-4 text-sm font-bold text-[#0B1F3A]">
                        {record.department}
                      </td>
                      <td className="py-5 pl-4 text-sm font-bold text-[#0B1F3A] max-w-[200px] truncate">
                        {record.diagnosis || '—'}
                      </td>
                      <td className="py-5 pl-4 text-right pr-4">
                        <button
                          onClick={() => onViewRecord(record._id)}
                          className="font-bold text-[#0F9D8A] hover:text-[#0c8776] text-sm"
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

          <div className="mt-6">
            <button className="flex items-center gap-1.5 font-bold text-[#0F9D8A] hover:text-[#0c8776] text-sm transition-all">
              <span>View Full History</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* For other tabs, just show empty states to match UI context */}
      {activeTab !== 'visit_history' && (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col p-6 items-center justify-center py-20">
          <p className="text-[#64748B] font-medium">Content for {activeTab.replace('_', ' ')} will appear here.</p>
        </div>
      )}
      
      <div className="mt-4 flex justify-start">
        <button 
          onClick={onBack}
          className="text-[#64748B] hover:text-[#0B1F3A] font-bold text-sm transition-colors"
        >
          &larr; Back to Medical Records
        </button>
      </div>
    </div>
  );
}
