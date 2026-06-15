import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  Search
} from 'lucide-react';

export default function ConsultationsListView({ onDiagnosePatient }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('waiting');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await api.getQueue();
      if (res.success) {
        // Show all appointments that are in_progress, with_doctor, completed or consultation_done
        const all = res.queue || [];
        setConsultations(all);
      }
    } catch (err) {
      console.error('Consultations fetch error:', err);
      setError('Failed to fetch consultations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
    const handleRefresh = () => fetchConsultations();
    window.addEventListener('dashboard_refresh', handleRefresh);
    return () => window.removeEventListener('dashboard_refresh', handleRefresh);
  }, []);

  const getCategory = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'consultation_done') return 'completed';
    if (s === 'in_progress' || s === 'with_doctor' || s === 'in_consultation') return 'in_consultation';
    return 'waiting';
  };

  // Filter by category
  const categoryFiltered = consultations.filter((item) => {
    if (activeFilter === 'all') return true;
    return getCategory(item.status) === activeFilter;
  });

  // Filter by search
  const filtered = categoryFiltered.filter((item) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.patient?.name?.toLowerCase().includes(q) ||
      item.tokenNumber?.toString().includes(q) ||
      item.patient?.phone?.includes(q)
    );
  });

  // Counts
  const allCount = consultations.length;
  const inConsultCount = consultations.filter(a => getCategory(a.status) === 'in_consultation').length;
  const completedCount = consultations.filter(a => getCategory(a.status) === 'completed').length;
  const waitingCount = consultations.filter(a => getCategory(a.status) === 'waiting').length;

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIdx, startIdx + itemsPerPage);

  const getStatusBadge = (status) => {
    const cat = getCategory(status);
    if (cat === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    if (cat === 'in_consultation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100">
          <Activity className="w-3 h-3" /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-100">
        <Clock className="w-3 h-3" /> Waiting
      </span>
    );
  };

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';

  const avatarColors = [
    'bg-violet-100 text-violet-600',
    'bg-teal-100 text-teal-600',
    'bg-blue-100 text-blue-600',
    'bg-rose-100 text-rose-600',
    'bg-amber-100 text-amber-600',
  ];

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Consultations</h1>
          <p className="text-sm text-[#64748B] mt-1">View and manage today's patient consultations.</p>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or token..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 pr-4 py-2.5 text-sm border border-[#E5E7EB] rounded-xl bg-white focus:outline-none focus:border-[#0F9D8A] transition-all w-[240px]"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: allCount, icon: FileText, color: 'bg-slate-100 text-slate-600' },
          { label: 'Waiting', value: waitingCount, icon: Clock, color: 'bg-amber-50 text-amber-500' },
          { label: 'In Progress', value: inConsultCount, icon: Activity, color: 'bg-blue-50 text-blue-500' },
          { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-[16px] p-4 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-[#0B1F3A]">{value}</span>
              <span className="text-xs font-semibold text-[#64748B]">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { key: 'waiting', label: `Waiting (${waitingCount})` },
          { key: 'in_consultation', label: `In Progress (${inConsultCount})` },
          { key: 'completed', label: `Completed (${completedCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveFilter(key); setCurrentPage(1); }}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border ${
              activeFilter === key
                ? 'bg-[#0F9D8A] text-white border-transparent shadow-sm shadow-[#0F9D8A]/20'
                : 'bg-white text-[#64748B] border-[#E5E7EB] hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col overflow-hidden">
        {error && <p className="text-red-500 font-semibold p-6 text-left">{error}</p>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
            <div className="w-8 h-8 border-2 border-[#0F9D8A]/20 border-t-[#0F9D8A] rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading consultations...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-[#0B1F3A]">No consultations found</p>
            <p className="text-sm text-[#64748B] max-w-xs">
              {activeFilter === 'all'
                ? "There are no consultations scheduled for today."
                : `No consultations with status "${activeFilter.replace('_', ' ')}".`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {currentItems.map((appt, idx) => {
              const patient = appt.patient || {};
              const cat = getCategory(appt.status);
              const colorClass = avatarColors[(startIdx + idx) % avatarColors.length];
              const tokenNo = appt.tokenNumber || `T-${101 + startIdx + idx}`;

              return (
                <div
                  key={appt._id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-all"
                >
                  {/* Left: Avatar + Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colorClass}`}>
                      {getInitials(patient.name)}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-bold text-[#0B1F3A] text-sm truncate">{patient.name || 'Unknown Patient'}</span>
                      <span className="text-xs text-[#64748B] font-medium mt-0.5">
                        {patient.age ? `${patient.age} yrs` : '—'} · {patient.gender || '—'} · {patient.phone || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Token + Reason */}
                  <div className="hidden md:flex flex-col text-left min-w-[120px]">
                    <span className="text-xs font-bold text-[#0B1F3A]">Token: {tokenNo}</span>
                    <span className="text-xs text-[#64748B] font-medium mt-0.5 truncate max-w-[180px]">
                      {appt.symptoms || 'General Checkup'}
                    </span>
                  </div>

                  {/* Right: Status + Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(appt.status)}
                    <button
                      onClick={() => onDiagnosePatient(appt)}
                      className={`text-xs font-bold rounded-xl px-4 py-2 transition-all ${
                        cat === 'waiting'
                          ? 'bg-[#0F9D8A] hover:bg-[#0c8776] text-white shadow-sm'
                          : 'border border-[#E5E7EB] hover:bg-slate-100 text-[#0B1F3A]'
                      }`}
                    >
                      {cat === 'waiting' ? 'Start' : 'View'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalItems > itemsPerPage && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t border-[#F1F5F9]">
            <span className="text-xs font-semibold text-[#64748B]">
              Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, totalItems)} of {totalItems} consultations
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
