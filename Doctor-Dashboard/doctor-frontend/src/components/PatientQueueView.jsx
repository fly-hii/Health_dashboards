import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, ChevronLeft, ChevronRight, Play, Eye, Building2, Users, Clock, Activity, CheckCircle } from 'lucide-react';

export default function PatientQueueView({ onDiagnosePatient, searchQuery = '', onQueueFetched }) {
  const { user } = useAuth();
  const doctorDept = user?.department || '';
  const doctorSpec = user?.specialization || doctorDept;
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('waiting');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      const res = await api.getQueue();
      if (res.success) {
        setQueue(res.queue || []);
        if (onQueueFetched) onQueueFetched(res.queue || []);
      }
    } catch (err) {
      console.error('Queue fetch error:', err);
      setError('Failed to fetch patient queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to Socket.IO triggers on window
    const handleRefresh = () => {
      console.log('🔄 Socket event: refreshing patient queue...');
      fetchData();
    };

    window.addEventListener('dashboard_refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard_refresh', handleRefresh);
    };
  }, []);

  // Handle call next or start consultation
  const handleStartConsultation = async (appt) => {
    try {
      const apptId = appt._id || appt.id;
      setActionLoadingId(apptId);
      // Update status to in_progress in backend
      await api.callPatient(apptId);
      // Trigger diagnose callback
      onDiagnosePatient(appt);
    } catch (err) {
      console.error('Start consultation error:', err);
      // Fallback
      onDiagnosePatient(appt);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCallNextPatient = () => {
    // Find the first waiting patient
    const nextWaiting = queue.find(
      (a) => a.status === 'waiting' || a.status === 'vitals_done' || a.status === 'checked_in'
    );
    if (nextWaiting) {
      handleStartConsultation(nextWaiting);
    } else {
      console.log('No waiting patients in the queue.');
    }
  };

  // Status mapping logic for categories
  const getFilterType = (apptStatus) => {
    const status = apptStatus?.toLowerCase();
    if (status === 'completed' || status === 'consultation_done') {
      return 'completed';
    }
    if (status === 'in_progress' || status === 'with_doctor') {
      return 'in_consultation';
    }
    return 'waiting'; // checked_in, waiting_for_vitals, vitals_done, waiting
  };

  // Search filtering
  const searchedQueue = queue.filter((item) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = item.patient?.name?.toLowerCase().includes(q) || !q;
    const tokenMatch = item.tokenNumber?.toString().includes(q) || !q;
    const phoneMatch = item.patient?.phone?.includes(q) || !q;
    return nameMatch || tokenMatch || phoneMatch;
  });

  // Category filtering
  const filteredQueue = searchedQueue.filter((item) => {
    const type = getFilterType(item.status);
    if (activeFilter === 'completed') {
      return type === 'completed';
    }
    return type === 'waiting' || type === 'in_consultation';
  });

  // Tab Counts
  const allCount = searchedQueue.length;
  const waitingCount = searchedQueue.filter(a => getFilterType(a.status) === 'waiting').length;
  const consultingCount = searchedQueue.filter(a => getFilterType(a.status) === 'in_consultation').length;
  const completedCount = searchedQueue.filter(a => getFilterType(a.status) === 'completed').length;

  // Pagination slicing
  const totalItems = filteredQueue.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredQueue.slice(indexOfFirstItem, indexOfLastItem);

  // Mock Wait Times based on status/position
  const getWaitTime = (appt, index) => {
    const filterType = getFilterType(appt.status);
    if (filterType === 'completed') return 'Completed';
    if (filterType === 'in_consultation') return '0 min';
    // waiting wait times: e.g. T-101 has 15 mins, T-102 has 10 mins, T-103 has 5 mins...
    const waitingAppts = filteredQueue.filter(a => getFilterType(a.status) === 'waiting');
    const waitingIndex = waitingAppts.findIndex(a => (a._id || a.id) === (appt._id || appt.id));
    if (waitingIndex !== -1) {
      return `${(waitingAppts.length - waitingIndex - 1) * 5 + 5} mins`;
    }
    return '10 mins';
  };

  const getStatusBadge = (status) => {
    const filterType = getFilterType(status);
    if (filterType === 'completed') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5] shrink-0">
          Completed
        </span>
      );
    }
    if (filterType === 'in_consultation') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] shrink-0">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] shrink-0">
        Waiting
      </span>
    );
  };

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Patient Queue</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-sm text-[#64748B]">Today's appointments for your department.</p>
            {doctorDept && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-[#E6F5F3] text-[#0F9D8A] border border-[#0F9D8A]/20">
                <Building2 className="w-3 h-3" />
                {doctorSpec || doctorDept} Dept
              </span>
            )}
          </div>
        </div>
        {/* Call Next Patient Button */}
        <button
          onClick={handleCallNextPatient}
          className="flex items-center justify-center gap-2 bg-[#0F9D8A] hover:bg-[#0c8776] text-white rounded-xl py-3 px-5 font-semibold text-sm transition-all shadow-sm shadow-[#0F9D8A]/20"
        >
          <Stethoscope className="w-4 h-4" />
          <span>Call Next Patient</span>
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Patients */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">All Patients</span>
              <div className="text-3xl font-extrabold text-slate-900">{allCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50/50 text-[#0F9D8A] flex items-center justify-center">
              <Users size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 2: Waiting Patients */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Waiting</span>
              <div className="text-3xl font-extrabold text-[#F97316]">{waitingCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50/50 text-[#F97316] flex items-center justify-center">
              <Clock size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 3: In Consultation */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">In Consultation</span>
              <div className="text-3xl font-extrabold text-blue-600">{consultingCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50/50 text-blue-600 flex items-center justify-center">
              <Activity size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Completed</span>
              <div className="text-3xl font-extrabold text-emerald-600">{completedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50/50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs Toggle */}
      <div className="flex items-center self-start bg-slate-100 rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => { setActiveFilter('waiting'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeFilter === 'waiting'
              ? 'bg-white text-[#0F9D8A] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Waiting ({waitingCount + consultingCount})
        </button>
        <button
          onClick={() => { setActiveFilter('completed'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeFilter === 'completed'
              ? 'bg-white text-[#0F9D8A] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Table Container Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col p-6 overflow-hidden">
        {error && <p className="text-red-500 font-semibold mb-4 text-left">{error}</p>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading queue...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#64748B] text-center">
            <p className="text-lg font-bold text-[#0B1F3A]">No patients found</p>
            <p className="text-sm text-[#64748B] mt-1">There are no patients matching the current query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="pb-4">Token No.</th>
                  <th className="pb-4 pl-4">Patient Name</th>
                  <th className="pb-4 pl-4">Age / Gender</th>
                  <th className="pb-4 pl-4">Reason</th>
                  <th className="pb-4 pl-4">Wait Time</th>
                  <th className="pb-4 pl-4">Status</th>
                  <th className="pb-4 pl-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {currentItems.map((appt, idx) => {
                  const patient = appt.patient || {};
                  const filterType = getFilterType(appt.status);
                  const serialNo = (currentPage - 1) * itemsPerPage + idx + 101;
                  const tokenNo = appt.tokenNumber || `T-${serialNo}`;
                  const apptId = appt._id || appt.id;

                  return (
                    <tr key={apptId} className="hover:bg-slate-50 transition-all">
                      <td className="py-4 font-bold text-[#0B1F3A]">{tokenNo}</td>
                      <td className="py-4 pl-4 font-bold text-[#0B1F3A]">{patient.name || 'Unknown'}</td>
                      <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                        {patient.age || '—'} / {patient.gender || '—'}
                      </td>
                      <td className="py-4 pl-4 text-sm font-semibold text-[#64748B] max-w-[200px] truncate">
                        {appt.symptoms || 'General Checkup'}
                      </td>
                      <td className="py-4 pl-4 text-sm font-semibold text-[#64748B]">
                        {getWaitTime(appt, idx)}
                      </td>
                      <td className="py-4 pl-4">{getStatusBadge(appt.status)}</td>
                      <td className="py-4 pl-4">
                        {filterType === 'waiting' ? (
                          <button
                            disabled={actionLoadingId === apptId}
                            onClick={() => handleStartConsultation(appt)}
                            className="bg-[#0F9D8A] hover:bg-[#0c8776] text-white text-xs font-bold rounded-xl px-5 py-2 transition-all"
                          >
                            {actionLoadingId === apptId ? 'Starting...' : 'Start'}
                          </button>
                        ) : (
                          <button
                            onClick={() => onDiagnosePatient(appt)}
                            className="border border-[#E5E7EB] hover:bg-slate-50 text-[#0B1F3A] text-xs font-bold rounded-xl px-5 py-2 transition-all"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination */}
        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-5 mt-4 border-t border-[#F1F5F9]">
            <span className="text-xs font-semibold text-[#64748B]">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} patients
            </span>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-[#E5E7EB] hover:border-slate-300 disabled:opacity-50 flex items-center justify-center text-[#64748B] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                    currentPage === page
                      ? 'bg-[#0F9D8A] text-white shadow-sm shadow-[#0F9D8A]/10'
                      : 'border border-[#E5E7EB] text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
