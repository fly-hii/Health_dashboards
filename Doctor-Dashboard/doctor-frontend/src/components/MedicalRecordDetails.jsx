import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ChevronLeft, FileText, Download, Activity, Heart, Thermometer, Droplet, Wind, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function MedicalRecordDetails({ recordId, onBack }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await api.getMedicalRecordById(recordId);
        if (res.success) {
          setRecord(res.record);
        } else {
          setError(res.message || 'Failed to fetch medical record');
        }
      } catch (err) {
        console.error('Fetch record error:', err);
        setError('Error loading record details');
      } finally {
        setLoading(false);
      }
    };
    if (recordId) fetchRecord();
  }, [recordId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center text-[#64748B]">
          <div className="w-8 h-8 border-2 border-[#0F9D8A]/20 border-t-[#0F9D8A] rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">Loading record details...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <p className="text-red-500 font-semibold mb-4">{error || 'Record not found'}</p>
        <button onClick={onBack} className="text-[#0F9D8A] font-bold">Go Back</button>
      </div>
    );
  }

  const patient = record.patientId || {};
  const doctor = record.doctorId || {};
  const vitals = record.vitals || {};
  const appointment = record.appointmentId || {};

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Record Details</h1>
          <p className="text-sm text-[#64748B] mt-1">Detailed view of the patient's medical consultation.</p>
        </div>
        <button 
          onClick={onBack}
          className="text-[#0F9D8A] hover:text-[#0c8776] text-sm font-bold flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Patient Information */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
            <User className="w-5 h-5 text-[#0F9D8A]" />
            <h3 className="font-bold text-[#0B1F3A] text-base">Patient Information</h3>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Patient Name</span>
              <span className="font-bold text-[#0B1F3A]">{patient.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Patient ID</span>
              <span className="font-bold text-[#0B1F3A]">{patient.patientId || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Age / Gender</span>
              <span className="font-bold text-[#0B1F3A]">{patient.age || '—'} / {patient.gender || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Blood Group</span>
              <span className="font-bold text-[#0B1F3A]">{patient.bloodGroup || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Phone</span>
              <span className="font-bold text-[#0B1F3A]">{patient.phone || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B] font-medium">Address</span>
              <span className="font-bold text-[#0B1F3A]">{patient.address || '—'}</span>
            </div>
          </div>
        </div>

        {/* Visit Details */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
            <Calendar className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="font-bold text-[#0B1F3A] text-base">Visit Details</h3>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Visit Date</span>
              <span className="font-bold text-[#0B1F3A]">{format(new Date(record.visitDate), 'dd MMM yyyy, hh:mm a')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Department</span>
              <span className="font-bold text-[#0B1F3A]">{record.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Doctor</span>
              <span className="font-bold text-[#0B1F3A]">Dr. {doctor.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-[#64748B] font-medium">Appointment Type</span>
              <span className="font-bold text-[#0B1F3A] capitalize">{appointment.type || 'Consultation'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B] font-medium">Token Number</span>
              <span className="font-bold text-[#0B1F3A]">{appointment.tokenNumber || '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Vitals */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
        <h3 className="font-bold text-[#0B1F3A] text-base mb-4 pb-2 border-b border-slate-50">Vitals at Time of Visit</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5"><Activity className="w-3 h-3 text-emerald-500"/> BP</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.bloodPressure ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '—'} <span className="text-[10px] font-medium text-[#64748B]">mmHg</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5"><Heart className="w-3 h-3 text-rose-500"/> Pulse</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.pulseRate || '—'} <span className="text-[10px] font-medium text-[#64748B]">bpm</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5"><Thermometer className="w-3 h-3 text-blue-500"/> Temp</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.temperature || '—'} <span className="text-[10px] font-medium text-[#64748B]">°F</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5"><Droplet className="w-3 h-3 text-teal-500"/> SpO2</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.spo2 || '—'} <span className="text-[10px] font-medium text-[#64748B]">%</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5"><Wind className="w-3 h-3 text-cyan-500"/> Resp Rate</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.respiratoryRate || '—'} <span className="text-[10px] font-medium text-[#64748B]">/min</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B]">Height</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.height || '—'} <span className="text-[10px] font-medium text-[#64748B]">cm</span></span>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 flex flex-col">
            <span className="text-xs font-semibold text-[#64748B]">Weight</span>
            <span className="text-sm font-bold text-[#0B1F3A] mt-1">{vitals.weight || '—'} <span className="text-[10px] font-medium text-[#64748B]">kg</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Diagnosis */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
          <h3 className="font-bold text-[#0B1F3A] text-base mb-4 pb-2 border-b border-slate-50">Diagnosis</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[#64748B] font-semibold text-xs">Primary Diagnosis</span>
              <span className="font-bold text-[#0B1F3A]">{record.diagnosis || '—'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#64748B] font-semibold text-xs">Symptoms</span>
              <span className="font-bold text-[#0B1F3A]">{appointment.symptoms || '—'}</span>
            </div>
          </div>
        </div>

        {/* Doctor Notes */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
          <h3 className="font-bold text-[#0B1F3A] text-base mb-4 pb-2 border-b border-slate-50">Doctor Notes & Recommendations</h3>
          <p className="text-sm text-[#0B1F3A] leading-relaxed whitespace-pre-wrap">
            {record.doctorNotes || 'No additional notes provided.'}
          </p>
        </div>

      </div>

      {/* Prescriptions */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
        <h3 className="font-bold text-[#0B1F3A] text-base mb-4 pb-2 border-b border-slate-50">Prescription</h3>
        {record.prescriptions && record.prescriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-xs font-bold text-[#64748B]">
                  <th className="py-2.5 px-4 rounded-tl-lg">Medicine Name</th>
                  <th className="py-2.5 px-4">Dosage</th>
                  <th className="py-2.5 px-4">Frequency</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4 rounded-tr-lg">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {record.prescriptions.map((med, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4 font-bold text-[#0B1F3A] text-sm">{med.medicineName}</td>
                    <td className="py-3 px-4 text-sm text-[#64748B] font-medium">{med.dosage || '—'}</td>
                    <td className="py-3 px-4 text-sm text-[#64748B] font-medium">{med.frequency || '—'}</td>
                    <td className="py-3 px-4 text-sm text-[#64748B] font-medium">{med.duration || '—'}</td>
                    <td className="py-3 px-4 text-sm text-[#64748B] font-medium">{med.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#64748B]">No prescriptions added for this visit.</p>
        )}
      </div>

      {/* Lab Reports */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col text-left">
        <h3 className="font-bold text-[#0B1F3A] text-base mb-4 pb-2 border-b border-slate-50">Lab Reports</h3>
        {record.reports && record.reports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {record.reports.map((report, idx) => (
              <div key={idx} className="border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all h-[120px]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-[#3B82F6] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[#0B1F3A] text-sm truncate">{report.reportName || report.category || 'Lab Report'}</span>
                    <span className="text-xs text-[#64748B] font-medium mt-0.5">{report.category || 'General'}</span>
                  </div>
                </div>
                <button className="flex items-center justify-center gap-1.5 w-full mt-3 py-1.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F9D8A] rounded-lg text-xs font-bold border border-slate-200 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#64748B]">No lab reports associated with this visit.</p>
        )}
      </div>

    </div>
  );
}
