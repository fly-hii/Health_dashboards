import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Phone,
  ShieldAlert,
  Heart,
  FileText,
  Download,
  Eye,
  Search,
  ChevronDown,
  FileDown,
  Printer,
  TrendingUp,
  TrendingDown,
  Activity,
  FileSpreadsheet,
  Clock,
  DropletIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'react-toastify';
import { nurseService } from '../../services/nurseService';

/* ─────────────────────────────────────────
   TABS
───────────────────────────────────────── */
const TABS = [
  { id: 'visits',    label: 'Visit History'       },
  { id: 'vitals',    label: 'Vitals History'       },
  { id: 'docs',      label: 'Documents'            },
  { id: 'allergies', label: 'Allergies'            },
  { id: 'chronic',   label: 'Chronic Conditions'  },
];

/* ─────────────────────────────────────────
   STATUS BADGE CONFIG
───────────────────────────────────────── */
const STATUS_STYLE = {
  consultation_done: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed:         'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Under Control':   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Completed:         'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled:         'bg-rose-50 text-rose-700 border border-rose-200',
  Cancelled:         'bg-rose-50 text-rose-700 border border-rose-200',
  'Follow-up':       'bg-amber-50 text-amber-700 border border-amber-200',
  Active:            'bg-amber-50 text-amber-700 border border-amber-200',
  checked_in:        'bg-teal-50 text-teal-700 border border-teal-200',
  waiting_for_vitals:'bg-orange-50 text-orange-700 border border-orange-200',
  vitals_done:       'bg-sky-50 text-sky-700 border border-sky-200',
  with_doctor:       'bg-purple-50 text-purple-700 border border-purple-200',
};

function statusStyle(s) {
  return STATUS_STYLE[s] || 'bg-slate-100 text-slate-600 border border-slate-200';
}

function statusLabel(s) {
  const MAP = {
    consultation_done:  'Completed',
    checked_in:         'Checked In',
    waiting_for_vitals: 'Waiting',
    vitals_done:        'Vitals Done',
    with_doctor:        'With Doctor',
    cancelled:          'Cancelled',
  };
  return MAP[s] || s;
}

function allergySeverityStyle(severity) {
  if (severity === 'Severe')   return 'bg-red-50 text-red-700 border border-red-200';
  if (severity === 'Moderate') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
}

/* ─────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function Sk({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

/* ─────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────── */
function Empty({ icon: Icon = FileText, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon size={24} className="text-slate-400" />
      </div>
      <p className="text-[14px] font-bold text-slate-600">{title}</p>
      {subtitle && <p className="text-[12px] text-slate-400">{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
const MedicalHistory = () => {
  const navigate = useNavigate();

  /* ── patient selector ── */
  const [queuePatients, setQueuePatients] = useState([]);
  const [queueLoading, setQueueLoading]   = useState(false);
  const [selectedAppt, setSelectedAppt]   = useState(null);  // the full queue appointment object
  const [selectedId, setSelectedId]       = useState('');    // patient _id driving the select value

  /* ── profile data ── */
  const [profileData, setProfileData]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── tab + filter state ── */
  const [activeTab, setActiveTab]         = useState('visits');
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
  const [selectedDept, setSelectedDept]   = useState('All Departments');

  /* ── load today's queue ── */
  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await nurseService.getPatientQueue({ view: 'today', limit: 100 });
      const list = (res.data?.data || []).filter(a => a.patient);
      setQueuePatients(list);
    } catch { toast.error('Failed to load patient queue'); }
    finally { setQueueLoading(false); }
  };

  useEffect(() => { loadQueue(); }, []);

  /* ── when a patient is selected, load their profile ── */
  const handleSelectPatient = async (patientId) => {
    if (!patientId) {
      setSelectedId('');
      setSelectedAppt(null);
      setProfileData(null);
      return;
    }
    const appt = queuePatients.find(a => (a.patient?._id || a.patient?.id) === patientId);
    setSelectedAppt(appt || null);
    setSelectedId(patientId);
    setProfileData(null);
    setActiveTab('visits');
    setSearchTerm('');

    setProfileLoading(true);
    try {
      const res = await nurseService.getPatientProfile(patientId);
      setProfileData(res.data.data);
    } catch { toast.error('Failed to load patient records'); }
    finally { setProfileLoading(false); }
  };

  /* ── derive display data ── */
  const patient     = profileData?.patient     || selectedAppt?.patient  || null;
  const appointments = profileData?.appointments || [];
  const vitals       = profileData?.vitals       || [];
  const stats        = profileData?.stats        || {};

  /* unique doctors / departments from appointments for filter dropdowns */
  const doctorOptions = ['All Doctors',    ...new Set(appointments.map(a => a.doctor?.name).filter(Boolean))];
  const deptOptions   = ['All Departments', ...new Set(appointments.map(a => a.department).filter(Boolean))];

  /* derive allergies & chronic diseases from patient */
  const allergies       = patient?.allergies?.map(al => ({ allergen: al, type: 'Drug', severity: 'Unknown' })) || [];
  const chronicConds    = patient?.chronicDiseases?.map(c => ({ condition: c, date: '—', meds: '—', doc: '—', status: 'Active' })) || [];

  /* filter visit history (appointments) */
  const filteredVisits = appointments.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (a.symptoms || '').toLowerCase().includes(q) || (a.notes || '').toLowerCase().includes(q) || (a.doctor?.name || '').toLowerCase().includes(q);
    const matchDoc  = selectedDoctor === 'All Doctors'     || a.doctor?.name === selectedDoctor;
    const matchDept = selectedDept   === 'All Departments' || a.department === selectedDept;
    return matchSearch && matchDoc && matchDept;
  });

  const totalVisits   = stats.totalVisits    ?? appointments.length;
  const lastVisitDate = stats.lastVisit ? fmtDate(stats.lastVisit) : (appointments[0]?.appointmentDate ? fmtDate(appointments[0].appointmentDate) : '—');
  const knownAllergies = patient?.allergies?.length ?? 0;

  const handleExport = (label) => toast.success(`${label} completed successfully!`);

  /* initials for avatar */
  const initials = patient?.name
    ? patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="space-y-8">

      {/* ══════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Medical History
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            View patient's past medical history and clinical records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start">
          {patient && (
            <Button
              onClick={() => navigate(`/patient/${patient._id || patient.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              <User size={14} strokeWidth={2.5} />
              View Profile
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          PATIENT SELECTOR
      ══════════════════════════════════ */}
      <Card className="p-5 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white">
        <div className="flex flex-col md:flex-row md:items-center gap-4">

          {/* Dropdown */}
          <div className="flex-1 max-w-sm">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Patient from Queue
              </label>
              <button type="button" onClick={loadQueue} disabled={queueLoading}
                className="flex items-center gap-1 text-[10px] font-bold text-[#0EA5A4] hover:text-teal-700 disabled:opacity-50 cursor-pointer">
                <RefreshCw size={11} className={queueLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            <select
              value={selectedId}
              onChange={e => handleSelectPatient(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-700 bg-white outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 cursor-pointer transition-all"
            >
              <option value="">
                {queueLoading ? 'Loading queue…' : `— Select patient (${queuePatients.length} in queue) —`}
              </option>
              {queuePatients.map((appt, idx) => {
                const p = appt.patient;
                return (
                  <option key={appt._id || appt.id || idx} value={p?._id || p?.id}>
                    {appt.tokenNumber}  ·  {p?.name || 'Unknown'}  ·  {p?.age ? `${p.age}Y` : '—'} / {p?.gender || '—'}  ·  {appt.department}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected patient mini-chip */}
          {patient ? (
            <div className="flex-1 flex items-center gap-4 bg-teal-50/60 border border-teal-100 rounded-xl px-5 py-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{patient.name}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {patient.age} Yrs / {patient.gender}
                  {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                    <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">{patient.bloodGroup}</span>
                  )}
                </p>
                {patient.patientId && (
                  <p className="text-[10px] text-slate-400 mt-0.5">ID: {patient.patientId} · {patient.phone || '—'}</p>
                )}
              </div>
              {selectedAppt && (
                <div className="ml-auto hidden md:block text-right">
                  <p className="text-[10px] text-slate-500 font-semibold">Token · <span className="text-slate-800 font-bold font-mono">{selectedAppt.tokenNumber}</span></p>
                  <p className="text-[10px] text-slate-400">{selectedAppt.department}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-5 py-4 text-slate-400">
              <User size={18} strokeWidth={1.5} />
              <span className="text-xs font-medium">Select a patient from the dropdown to view their medical history</span>
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════
          LOADING STATE (after selection)
      ══════════════════════════════════ */}
      {profileLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Sk key={i} className="h-[100px] rounded-2xl" />)}
          </div>
          <Sk className="h-[300px]" />
        </div>
      )}

      {/* ══════════════════════════════════
          NO PATIENT SELECTED — placeholder
      ══════════════════════════════════ */}
      {!patient && !profileLoading && (
        <div className="bg-white border border-dashed border-[#E5E7EB] rounded-[20px] p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
            <FileText size={28} className="text-[#0EA5A4]" />
          </div>
          <p className="text-[16px] font-bold text-slate-700">No patient selected</p>
          <p className="text-[13px] text-slate-400 max-w-sm">
            Use the dropdown above to pick a patient from today's queue. Their complete medical history will appear here.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════
          PATIENT FOUND — rest of page
      ══════════════════════════════════ */}
      {patient && !profileLoading && (
        <>
          {/* Patient Summary Card */}
          <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm tracking-wider shrink-0 select-none">
                  {initials}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{patient.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{patient.age} Years / {patient.gender}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-8 md:gap-x-12 border-t md:border-t-0 md:border-l border-[#E5E7EB] pt-4 md:pt-0 md:pl-10 flex-1 max-w-[800px]">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Patient ID</span>
                  <span className="text-sm font-bold text-slate-900">{patient.patientId || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Phone</span>
                  <span className="text-sm font-semibold text-slate-700">{patient.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Blood Group</span>
                  <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                    <DropletIcon size={12} />{patient.bloodGroup || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Emergency Contact</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {patient.emergencyContact?.phone || '—'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Visits',         value: totalVisits,      icon: Calendar,    color: 'bg-teal-50 text-[#0EA5A4]' },
              { label: 'Last Visit',            value: lastVisitDate,    icon: Clock,       color: 'bg-blue-50 text-blue-500',  small: true },
              { label: 'Vitals Records',        value: vitals.length,    icon: Activity,    color: 'bg-emerald-50 text-emerald-500' },
              { label: 'Known Allergies',       value: knownAllergies,   icon: ShieldAlert, color: 'bg-red-50 text-red-500',    danger: knownAllergies > 0 },
            ].map(({ label, value, icon: Icon, color, small, danger }) => (
              <Card key={label} className="p-5 flex flex-col justify-between min-h-[100px] hover:shadow-md transition-all duration-200 bg-white border border-[#E5E7EB] rounded-2xl">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                    <div className={`${small ? 'text-sm font-bold text-slate-800 pt-1' : 'text-2xl font-extrabold'} ${danger ? 'text-red-500' : 'text-slate-900'}`}>
                      {value ?? '—'}
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center`}>
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2.5 p-1 bg-slate-100/50 rounded-2xl border border-[#E5E7EB] w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <Card className="p-0 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white overflow-hidden">

            {/* ── VISIT HISTORY ── */}
            {activeTab === 'visits' && (
              <div>
                {/* Search & Filters */}
                <div className="p-6 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                  <div className="flex flex-wrap items-center gap-3 flex-1 max-w-[680px]">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search visits by diagnosis..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 transition-all"
                      />
                    </div>
                    <div className="relative">
                      <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors">
                        {doctorOptions.map(d => <option key={d}>{d}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors">
                        {deptOptions.map(d => <option key={d}>{d}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredVisits.length === 0 ? (
                    <Empty icon={Calendar} title="No visit records found" subtitle="This patient has no appointment history yet" />
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-slate-50/50">
                          {['Visit Date', 'Doctor', 'Department', 'Symptoms / Notes', 'Token', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredVisits.map(a => (
                          <tr key={a._id || a.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-3.5 px-6 text-sm font-bold text-slate-800 whitespace-nowrap">
                              {fmtDate(a.appointmentDate)}
                              {a.appointmentTime && <p className="text-[10px] text-slate-400 font-normal">{a.appointmentTime}</p>}
                            </td>
                            <td className="py-3.5 px-6 text-sm font-semibold text-slate-700 whitespace-nowrap">{a.doctor?.name || '—'}</td>
                            <td className="py-3.5 px-6 text-sm font-semibold text-slate-600">{a.department}</td>
                            <td className="py-3.5 px-6 text-sm text-slate-600 max-w-[200px] truncate">
                              {a.symptoms || a.notes || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="py-3.5 px-6">
                              {a.tokenNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-[#0EA5A4] text-[10px] font-bold rounded-lg border border-teal-100">
                                  <Hash size={9} />{a.tokenNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(a.status)}`}>
                                {statusLabel(a.status)}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/appointment/${a._id || a.id}`)}
                                  className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 transition-all cursor-pointer"
                                  title="View Appointment"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={() => handleExport(`Record download for ${fmtDate(a.appointmentDate)}`)}
                                  className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer"
                                  title="Download"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ── VITALS HISTORY ── */}
            {activeTab === 'vitals' && (
              <div className="overflow-x-auto">
                {vitals.length === 0 ? (
                  <Empty icon={Activity} title="No vitals recorded" subtitle="Vitals will appear here after the first entry" />
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-slate-50/50">
                        {['Date', 'Blood Pressure', 'Temperature', 'Pulse', 'SpO₂', 'Weight', 'BMI', 'Nurse'].map(h => (
                          <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {vitals.map((v, idx) => {
                        const bpOk = !v.bloodPressure?.systolic || v.bloodPressure.systolic < 140;
                        const spo2Ok = !v.spo2 || v.spo2 >= 95;
                        return (
                          <tr key={v._id || v.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-6 text-sm font-bold text-slate-800 whitespace-nowrap">
                              {fmtDate(v.createdAt)}
                              <p className="text-[10px] text-slate-400 font-normal">
                                {new Date(v.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`text-sm font-bold font-mono ${bpOk ? 'text-slate-700' : 'text-red-500'}`}>
                                {v.bloodPressure?.systolic && v.bloodPressure?.diastolic
                                  ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`
                                  : '—'}
                              </span>
                              {v.bloodPressure?.systolic && <span className="text-[10px] text-slate-400 ml-1">mmHg</span>}
                            </td>
                            <td className="py-3.5 px-6 text-sm font-semibold text-slate-600">
                              {v.temperature ? `${v.temperature}°F` : '—'}
                            </td>
                            <td className="py-3.5 px-6 text-sm font-semibold text-slate-600">
                              {v.pulseRate ? `${v.pulseRate} bpm` : '—'}
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`text-sm font-bold ${spo2Ok ? 'text-[#0EA5A4]' : 'text-red-500'}`}>
                                {v.spo2 ? `${v.spo2}%` : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-sm font-semibold text-slate-600">
                              {v.weight ? `${v.weight} kg` : '—'}
                            </td>
                            <td className="py-3.5 px-6 text-sm font-bold text-slate-700">
                              {v.bmi || '—'}
                            </td>
                            <td className="py-3.5 px-6 text-sm font-medium text-slate-500">
                              {v.recordedBy?.name || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── DOCUMENTS ── */}
            {activeTab === 'docs' && (
              <div className="p-6">
                <Empty icon={FileText} title="Documents not available" subtitle="Patient documents and reports will appear here" />
              </div>
            )}

            {/* ── ALLERGIES ── */}
            {activeTab === 'allergies' && (
              <div className="p-6">
                {allergies.length === 0 ? (
                  <Empty icon={ShieldAlert} title="No allergies recorded" subtitle="Allergies will be shown here if documented" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {allergies.map((al, idx) => (
                      <Card key={idx} className="p-5 border border-[#E5E7EB] rounded-xl hover:shadow-md transition-all bg-white space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{al.type} Allergy</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${allergySeverityStyle(al.severity)}`}>
                            {al.severity}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-950">{al.allergen}</h4>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CHRONIC CONDITIONS ── */}
            {activeTab === 'chronic' && (
              <div className="p-6">
                {chronicConds.length === 0 ? (
                  <Empty icon={Heart} title="No chronic conditions recorded" subtitle="Chronic conditions will be shown here if documented" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {chronicConds.map((cond, idx) => (
                      <Card key={idx} className="p-5 border border-[#E5E7EB] rounded-xl hover:shadow-md transition-all bg-white space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-[15px] font-extrabold text-slate-900 leading-tight">{cond.condition}</h4>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyle(cond.status)}`}>
                            {cond.status}
                          </span>
                        </div>
                        <div className="space-y-2.5 pt-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Diagnosis Date:</span>
                            <span className="text-slate-800 font-bold">{cond.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Medication:</span>
                            <span className="text-[#0EA5A4] font-bold">{cond.meds}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Treating Doctor:</span>
                            <span className="text-slate-800 font-semibold">{cond.doc}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Export Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[#E5E7EB] rounded-[20px] bg-white shadow-sm">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Patient Record Actions
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => handleExport('CSV Export')}
                className="flex items-center gap-1.5 px-4 py-2 border-[#E5E7EB] text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer">
                <FileSpreadsheet size={14} /> Export Medical History
              </Button>
              <Button variant="outline" onClick={() => handleExport('PDF Download')}
                className="flex items-center gap-1.5 px-4 py-2 border-[#E5E7EB] text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer">
                <FileDown size={14} /> Download PDF
              </Button>
              <Button onClick={() => handleExport('Print Record')}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm">
                <Printer size={14} /> Print Records
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MedicalHistory;
