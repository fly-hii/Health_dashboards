import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function MedicalRecordsList({ onViewPatient, onViewRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  
  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getMedicalRecords({
        page: currentPage,
        limit: 10,
        search: patientFilter,
        status: statusFilter,
        department: deptFilter
      });
      if (res.success) {
        setRecords(res.records);
        setTotalPages(res.pagination.pages);
      }
    } catch (err) {
      console.error('Fetch medical records error:', err);
      setError('Failed to fetch medical records.');
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
      console.error('Fetch patients error:', err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, statusFilter, deptFilter, patientFilter]);

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
          Completed
        </span>
      );
    }
    if (status === 'pending_reports') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">
          Pending Reports
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
        Follow-Up
      </span>
    );
  };

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans">
      {/* Header */}
      <div className="flex flex-col text-left">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Medical Records</h1>
        <p className="text-sm text-[#64748B] mt-1">View and manage patient medical records.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-sm">
        <select
          value={patientFilter}
          onChange={(e) => { setPatientFilter(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[200px] px-4 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] transition-all"
        >
          <option value="">All Patients</option>
          {patients.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}{p.patientId ? ` (${p.patientId})` : ''}
            </option>
          ))}
        </select>
        
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B]"
        >
          <option value="">All Departments</option>
          <option value="Cardiology">Cardiology</option>
          <option value="General Medicine">General Medicine</option>
          <option value="Neurology">Neurology</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B]"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending_reports">Pending Reports</option>
          <option value="follow_up">Follow-Up</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col overflow-hidden">
        {error && <p className="text-red-500 font-semibold p-6 text-left">{error}</p>}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
            <div className="w-8 h-8 border-2 border-[#0F9D8A]/20 border-t-[#0F9D8A] rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-lg font-bold text-[#0B1F3A]">No records found</p>
            <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="pb-4 pl-6 pt-4">Visit Date</th>
                  <th className="pb-4 pl-4 pt-4">Patient Name</th>
                  <th className="pb-4 pl-4 pt-4">Doctor</th>
                  <th className="pb-4 pl-4 pt-4">Department</th>
                  <th className="pb-4 pl-4 pt-4">Diagnosis</th>
                  <th className="pb-4 pl-4 pt-4">Prescription</th>
                  <th className="pb-4 pl-4 pt-4">Reports</th>
                  <th className="pb-4 pl-4 pt-4">Status</th>
                  <th className="pb-4 pl-4 pt-4 pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {records.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50 transition-all">
                    <td className="py-4 pl-6 text-sm font-semibold text-[#0B1F3A]">
                      {format(new Date(record.visitDate), 'dd MMM yyyy')}
                    </td>
                    <td className="py-4 pl-4">
                      <button 
                        onClick={() => onViewPatient(record.patientId._id)}
                        className="font-bold text-[#0B1F3A] hover:text-[#0F9D8A] transition-colors"
                      >
                        {record.patientId?.name || 'Unknown'}
                      </button>
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      Dr. {record.doctorId?.name || 'Unknown'}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      {record.department}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B] max-w-[150px] truncate">
                      {record.diagnosis || '—'}
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      {record.prescriptions?.length || 0} Medicines
                    </td>
                    <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                      {record.reports?.length || 0} Reports
                    </td>
                    <td className="py-4 pl-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="py-4 pl-4 pr-6">
                      <button
                        onClick={() => onViewRecord(record._id)}
                        className="font-semibold text-[#0F9D8A] hover:text-[#0c8776] text-sm"
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
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#F1F5F9]">
            <span className="text-xs font-semibold text-[#64748B]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-[#E5E7EB] hover:border-slate-300 disabled:opacity-50 flex items-center justify-center text-[#64748B] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                    currentPage === page
                      ? 'bg-[#0F9D8A] text-white shadow-sm'
                      : 'border border-[#E5E7EB] text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-[#E5E7EB] hover:border-slate-300 disabled:opacity-50 flex items-center justify-center text-[#64748B] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
