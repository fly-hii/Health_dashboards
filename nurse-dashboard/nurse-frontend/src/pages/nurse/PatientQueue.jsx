import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { nurseService } from '../../services/nurseService';
import { useNotifications } from '../../context/NotificationContext';
import { CardSkeleton } from '../../components/nurse/LoadingSkeleton';
import { toast } from 'react-toastify';
import { 
  Eye, 
  Pencil, 
  Activity, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  X,
  Volume2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const DEPARTMENTS = ['All Departments', 'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'];
const STATUSES    = ['All Status', 'Waiting', 'In-Progress', 'Completed'];

// Format a JS Date as "09 Jun 2026"
const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const PatientQueue = () => {
  const [searchParams, setSearchParams]   = useSearchParams();
  const { queueUpdateTime }               = useNotifications();
  const navigate                          = useNavigate();
  
  // Data States
  const [queue, setQueue]                 = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState({
    totalPatientsToday: 0,
    waitingForVitals: 0,
    inProgress: 0,
    completedConsultations: 0,
    missedAppointments: 0
  });

  // Filter States
  const [search, setSearch]               = useState(searchParams.get('search') || '');
  const [department, setDepartment]       = useState('All Departments');
  const [status, setStatus]               = useState('All Status');
  const [page, setPage]                   = useState(1);
  const [view, setView]                   = useState('waiting'); // 'waiting' | 'completed'

  // Walk-in Modal State
  const [modalOpen, setModalOpen]         = useState(false);
  const [newPatient, setNewPatient]       = useState({
    name: '',
    age: '',
    gender: 'Male',
    department: 'General Medicine',
    symptoms: '',
  });

  // API Status Mapper — maps UI filter chip to backend status param
  const getApiStatus = (uiStatus) => {
    if (uiStatus === 'Waiting')     return 'waiting_for_vitals';
    if (uiStatus === 'In-Progress') return 'in_progress';
    if (uiStatus === 'Completed')   return 'consultation_done';
    return 'all';
  };

  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await nurseService.getDashboard();
      const s = res.data.data.stats;
      setStats({
        totalPatientsToday: s.totalPatientsToday ?? 0,
        waitingForVitals: s.waitingForVitals ?? 0,
        inProgress: (s.activeAppointments != null && s.completedConsultations != null)
          ? Math.max(0, s.activeAppointments - s.completedConsultations)
          : 0,
        completedConsultations: (s.completedConsultations ?? 0) + (s.vitalsCompleted ?? 0),
        missedAppointments: s.missedAppointments ?? 0
      });
    } catch {
      // Keep defaults (all zeros)
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const apiDept = department === 'All Departments' ? 'all' : department;

      let apiStatus;
      let apiView;

      if (view === 'completed') {
        apiStatus = 'consultation_done';
        apiView   = 'today';
      } else if (view === 'missed') {
        apiStatus = 'No-Show';
        apiView   = 'today';
      } else if (view === 'upcoming') {
        // Tomorrow only — build tomorrow's date string (YYYY-MM-DD)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        const res = await nurseService.getPatientQueue({
          search,
          department: apiDept,
          date: tomorrowStr,   // backend filters by exact date when 'date' param is present
          page,
          limit: 10,
        });
        setQueue(res.data.data);
        setPagination(res.data.pagination);
        setLoading(false);
        return;
      } else {
        // waiting tab — only show waiting_for_vitals
        apiStatus = 'waiting_for_vitals';
        apiView = 'today';
      }

      const res = await nurseService.getPatientQueue({
        search,
        department: apiDept,
        status: apiStatus,
        view: apiView,
        page,
        limit: 10,
      });

      setQueue(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load patient queue');
    } finally {
      setLoading(false);
    }
  }, [search, department, status, view, page]);

  useEffect(() => { 
    fetchQueue(); 
    fetchDashboardStats();
  }, [fetchQueue, fetchDashboardStats, queueUpdateTime]);

  useEffect(() => { setPage(1); }, [search, department, status, view]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await nurseService.updateAppointmentStatus(appointmentId, newStatus);
      toast.success('Status updated successfully');
      fetchQueue();
      fetchDashboardStats();
    } catch { 
      toast.error('Failed to update status'); 
    }
  };

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.age) {
      toast.error('Please enter patient name and age');
      return;
    }
    
    try {
      const res = await nurseService.addWalkInPatient({
        name: newPatient.name,
        age: parseInt(newPatient.age, 10),
        gender: newPatient.gender,
        department: newPatient.department,
        symptoms: newPatient.symptoms,
      });

      toast.success(res.data.message || `Walk-in patient ${newPatient.name} registered successfully!`);
      setModalOpen(false);
      setNewPatient({
        name: '',
        age: '',
        gender: 'Male',
        department: 'General Medicine',
        symptoms: '',
      });

      // Refresh queue and stats from server so everything is in sync
      fetchQueue();
      fetchDashboardStats();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to register walk-in patient';
      toast.error(msg);
    }
  };

  const handleCallNextPatient = async () => {
    const nextPatient = currentQueue.find(p =>
      p.status === 'checked_in' || p.status === 'waiting_for_vitals' || p.status === 'waiting'
    );
    if (nextPatient) {
      const name = nextPatient.patient?.name || 'Patient';
      toast.success(`Calling Token ${nextPatient.tokenNumber}: ${name} to Vitals/Consultation`);
      try {
        const utterance = new SpeechSynthesisUtterance(
          `Calling token ${nextPatient.tokenNumber}, ${name}`
        );
        window.speechSynthesis.speak(utterance);
      } catch (e) { /* Speech synthesis not supported */ }

      try {
        await nurseService.callPatient(nextPatient._id || nextPatient.id);
      } catch (err) {
        console.error('Failed to notify called patient:', err);
        toast.error('Failed to send call notification/email to patient');
      }
    } else {
      toast.info('No patients waiting in the queue');
    }
  };

  const currentQueue = queue;

  const getStatusDisplay = (statusVal) => {
    if (statusVal === 'checked_in' || statusVal === 'waiting_for_vitals' || statusVal === 'waiting') {
      return { label: 'Waiting', bg: 'bg-amber-50 text-amber-700 border border-amber-200' };
    }
    if (statusVal === 'vitals_done' || statusVal === 'with_doctor' || statusVal === 'in_progress') {
      return { label: 'Sent to Doctor', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    }
    if (statusVal === 'consultation_done' || statusVal === 'completed') {
      return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    }
    if (statusVal === 'No-Show' || statusVal === 'no_show') {
      return { label: 'Missed', bg: 'bg-rose-50 text-rose-700 border border-rose-200' };
    }
    if (statusVal === 'Cancelled' || statusVal === 'cancelled') {
      return { label: 'Cancelled', bg: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
    return { label: 'Waiting', bg: 'bg-amber-50 text-amber-700 border border-amber-200' };
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Patient Queue
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            Manage and monitor patient waiting list efficiently.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <Button 
            onClick={handleCallNextPatient}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
          >
            <Volume2 size={14} />
            Call Next Patient
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#0EA5A4] hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Patients */}
        <Card className="p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Patients</span>
              <div className="text-3xl font-extrabold text-slate-900">{stats.totalPatientsToday}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50/50 text-[#0EA5A4] flex items-center justify-center">
              <Users size={18} strokeWidth={2.5} />
            </div>
          </div>
        </Card>

        {/* Card 2: Waiting Patients */}
        <Card className="p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Waiting Patients</span>
              <div className="text-3xl font-extrabold text-[#F97316]">{stats.waitingForVitals}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50/50 text-[#F97316] flex items-center justify-center">
              <Clock size={18} strokeWidth={2.5} />
            </div>
          </div>
        </Card>

        {/* Card 3: Completed */}
        <Card className="p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Completed</span>
              <div className="text-3xl font-extrabold text-emerald-600">{stats.completedConsultations}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50/50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
          </div>
        </Card>

        {/* Card 4: Missed */}
        <Card className="p-6 flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Missed</span>
              <div className="text-3xl font-extrabold text-rose-600">{stats.missedAppointments}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50/50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={18} strokeWidth={2.5} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Body: Table */}
      <div className="w-full space-y-6">
        <Card className="p-0 border border-[#E5E7EB]">
              {/* Top Action Bar inside Card */}
              <div className="p-6 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                <div className="flex flex-wrap items-center gap-3 flex-1 max-w-[720px]">

                  {/* Waiting / Completed / Upcoming / Missed toggle */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {[
                      { id: 'waiting',   label: 'Waiting'   },
                      { id: 'completed', label: 'Completed' },
                      { id: 'upcoming',  label: 'Upcoming'  },
                      { id: 'missed',    label: 'Missed'    },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => { setView(id); setStatus('All Status'); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          view === id
                            ? 'bg-white text-[#0EA5A4] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search patient..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10"
                    />
                  </div>

                  {/* Department Dropdown */}
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4]"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>


                </div>

                {/* Add Walk-in Button */}
                <Button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white text-xs font-bold rounded-lg shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Add Walk-in Patient
                </Button>
              </div>

            {/* Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-slate-50/50">
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Token No</th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Patient Name</th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Age / Gender</th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Department</th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">
                      {view === 'upcoming' ? 'Appt Date & Time' : 'Arrival Time'}
                    </th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Status</th>
                    <th className="sticky top-0 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6">
                        <div className="space-y-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4 items-center">
                              <div className="skeleton w-12 h-6" />
                              <div className="skeleton w-32 h-6" />
                              <div className="skeleton w-24 h-6" />
                              <div className="skeleton w-24 h-6" />
                              <div className="skeleton w-20 h-6" />
                              <div className="skeleton w-20 h-6" />
                              <div className="skeleton w-24 h-6 ml-auto" />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : currentQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold text-sm">
                        {view === 'completed'
                          ? 'No completed consultations today.'
                          : view === 'upcoming'
                          ? "No appointments scheduled for tomorrow."
                          : view === 'missed'
                          ? "No missed appointments today."
                          : 'No patients currently waiting in the queue.'}
                      </td>
                    </tr>
                  ) : (
                    currentQueue.map((appt) => {
                      const statusInfo = getStatusDisplay(appt.status);
                      const apptDateStr = appt.appointmentDate
                        ? fmtDate(new Date(appt.appointmentDate))
                        : '—';
                      const isFuture = appt.appointmentDate
                        ? new Date(appt.appointmentDate) > new Date()
                        : false;
                      return (
                        <tr key={appt._id || appt.id} className="hover:bg-slate-50/50 transition-colors group">
                          {/* Token Number */}
                          <td className="py-4 px-6 text-sm font-bold text-[#0EA5A4] font-mono">
                            {appt.tokenNumber || '—'}
                          </td>
                          {/* Patient Name */}
                          <td className="py-4 px-6">
                            <div className="text-sm font-bold text-slate-800">{appt.patient?.name || '—'}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{appt.patient?.patientId || 'Online Booking'}</div>
                          </td>
                          {/* Age / Gender */}
                          <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                            {appt.patient?.age ? `${appt.patient.age} / ${appt.patient.gender || '—'}` : '—'}
                          </td>
                          {/* Department */}
                          <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                            {appt.department || '—'}
                          </td>
                          {/* Date & Time */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {view === 'upcoming' ? (
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{apptDateStr}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{appt.appointmentTime || '—'}</div>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-slate-500">
                                {appt.appointmentTime || '—'}
                              </span>
                            )}
                          </td>
                          {/* Status Badge */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          {/* Action Buttons */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {/* View */}
                              <button
                                onClick={() => navigate(`/appointment/${appt._id || appt.id}`)}
                                className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors outline-none cursor-pointer"
                                title="View Patient"
                              >
                                <Eye size={15} />
                              </button>
                              
                              {/* Edit */}
                              <button
                                onClick={() => navigate(`/patient/${appt.patient?._id || appt.patient?.id || ''}`)}
                                className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors outline-none cursor-pointer"
                                title="Edit Patient"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Vitals */}
                              {(appt.status === 'checked_in' || appt.status === 'waiting_for_vitals' || appt.status === 'waiting') && (
                                <button
                                  onClick={() => navigate(`/vitals/${appt._id || appt.id}`)}
                                  className="w-8 h-8 rounded-lg border border-teal-200 bg-teal-50/50 flex items-center justify-center text-[#0EA5A4] hover:text-white hover:bg-[#0EA5A4] transition-colors outline-none cursor-pointer"
                                  title="Send to Vitals"
                                >
                                  <Activity size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
              <div className="p-5 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/20">
                <span className="text-xs text-slate-400 font-semibold">
                  Showing {(pagination.page - 1) * 10 + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total} patients
                </span>
                
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="w-8 h-8 rounded-lg p-0 flex items-center justify-center text-slate-500 border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <div key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-slate-400 px-1 text-xs select-none">…</span>
                        )}
                        <Button
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold p-0 ${
                            p === page 
                              ? 'bg-[#0EA5A4] hover:bg-[#0F766E] text-white' 
                              : 'text-slate-600 border-[#E5E7EB] hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </Button>
                      </div>
                    ))}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="w-8 h-8 rounded-lg p-0 flex items-center justify-center text-slate-500 border-[#E5E7EB] hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
      </div>

      {/* Add Walk-in Patient Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div onClick={() => setModalOpen(false)} className="fixed inset-0 bg-black/40" />
          
          {/* Content Card */}
          <Card className="relative w-full max-w-lg bg-white shadow-2xl border border-[#E5E7EB] rounded-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-slate-50/50">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-[#0EA5A4]" />
                <h3 className="text-[16px] font-extrabold text-slate-900">Register Walk-in Patient</h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWalkIn} className="p-6 space-y-4">
              {/* Patient Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
                <input
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0EA5A4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Age</label>
                  <input
                    type="number"
                    required
                    value={newPatient.age}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="e.g. 35"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0EA5A4]"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                  <div className="relative">
                    <select
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none cursor-pointer focus:border-[#0EA5A4]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                <div className="relative">
                  <select
                    value={newPatient.department}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full appearance-none px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none cursor-pointer focus:border-[#0EA5A4]"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Symptoms */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Symptoms / Reason</label>
                <textarea
                  value={newPatient.symptoms}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="Describe patient symptoms..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none min-h-[80px] resize-none focus:border-[#0EA5A4]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Register Patient
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PatientQueue;
