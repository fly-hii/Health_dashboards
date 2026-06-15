import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { nurseService } from '../../services/nurseService';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Activity,
  User,
  Phone,
  Mail,
  MapPin,
  DropletIcon,
  ShieldAlert,
  HeartPulse,
  BadgeCheck,
  PhoneCall,
  CalendarDays,
  Stethoscope,
  Building2,
  Clock,
  TrendingUp,
  FileText,
  Pill,
  FlaskConical,
  SendHorizonal,
  Printer,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clipboard,
  Hash,
  UserRound,
} from 'lucide-react';

/* ─────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────── */
const STATUS_CFG = {
  checked_in:         { label: 'Checked In',        bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500'   },
  waiting_for_vitals: { label: 'Waiting for Vitals', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  vitals_done:        { label: 'Vitals Done',        bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500'},
  with_doctor:        { label: 'With Doctor',        bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  consultation_done:  { label: 'Completed',          bg: 'bg-slate-100', text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400'  },
  cancelled:          { label: 'Cancelled',          bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500'   },
};

function StatusPill({ status, size = 'sm' }) {
  const c = STATUS_CFG[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
  const sz = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sz} ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/* ─────────────────────────────────────────
   TABS
───────────────────────────────────────── */
const TABS = [
  { id: 'overview',  label: 'Overview',        icon: UserRound    },
  { id: 'history',   label: 'Medical History', icon: Clock        },
  { id: 'vitals',    label: 'Vitals',          icon: Activity     },
  { id: 'appts',     label: 'Appointments',    icon: CalendarDays },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '  ' + new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

/* ─────────────────────────────────────────
   INFO FIELD ROW
───────────────────────────────────────── */
function InfoField({ icon: Icon, label, value, iconBg = 'bg-teal-50', iconColor = 'text-[#0F9D8A]' }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-[#F1F5F9] last:border-0">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        {Icon && <Icon size={14} className={iconColor} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[14px] text-[#0F172A] font-semibold break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STAT MINI CARD
───────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, bg, iconColor }) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex items-center gap-3`}>
      <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center shrink-0">
        <Icon size={18} className={iconColor} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[22px] font-extrabold text-[#0F172A] leading-none">{value ?? '—'}</p>
        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   VITALS MINI CHIP (latest vitals widget)
───────────────────────────────────────── */
function VitalChip({ label, value, unit, icon, normalOk }) {
  const ok = normalOk ?? true;
  return (
    <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <span className="text-[22px] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wide truncate">{label}</p>
        <p className="text-[15px] font-bold text-[#0F172A]">
          {value ?? '—'} {value && unit && <span className="text-[11px] font-normal text-[#94A3B8]">{unit}</span>}
        </p>
      </div>
      {value && (
        ok
          ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          : <AlertCircle  size={16} className="text-amber-500  shrink-0" />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────── */
function Empty({ icon: Icon = Clipboard, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon size={24} className="text-slate-400" />
      </div>
      <p className="text-[15px] font-bold text-slate-600">{title}</p>
      {subtitle && <p className="text-[13px] text-slate-400">{subtitle}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
const PatientProfile = () => {
  const { id }              = useParams();
  const navigate            = useNavigate();
  const [activeTab, setTab] = useState('overview');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    nurseService.getPatientProfile(id)
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load patient profile'))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── LOADING ── */
  if (loading) return (
    <div className="space-y-6">
      {/* hero */}
      <div className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-lg p-8">
        <div className="flex items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      {/* content */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );

  /* ── NOT FOUND ── */
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-28 gap-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
        <User size={28} className="text-slate-400" />
      </div>
      <p className="text-[16px] font-bold text-slate-700">Patient not found</p>
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#0F9D8A] text-white text-sm font-bold rounded-xl hover:bg-[#0b8a79] transition-colors cursor-pointer">
        <ArrowLeft size={15} /> Go Back
      </button>
    </div>
  );

  const { patient, appointments = [], vitals = [], stats } = data;
  const totalVisits       = stats?.totalVisits ?? appointments.length;
  const lastAppt          = appointments[0];
  const latestVitals      = vitals[0];
  const completedAppts    = appointments.filter(a => a.status === 'consultation_done').length;
  const isActive          = patient.isActive ?? true;

  const initials = patient.name
    ? patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════
          BACK BUTTON
      ══════════════════════════════════ */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B] hover:text-[#0F9D8A] transition-colors cursor-pointer">
        <ArrowLeft size={14} strokeWidth={2.5} /> Back
      </button>

      {/* ══════════════════════════════════
          HERO BANNER
      ══════════════════════════════════ */}
      <div className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-lg overflow-hidden">
        {/* teal accent strip */}
        <div className="h-2 bg-gradient-to-r from-[#0F9D8A] via-[#14B8A6] to-[#0891B2]" />

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-extrabold text-[28px] shadow-md select-none ring-4 ring-white">
                {patient.gender === 'Female' ? '👩' : patient.gender === 'Male' ? '🧑' : initials}
              </div>
              {/* active dot */}
              <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                  {patient.name}
                </h1>
                <StatusPill status={isActive ? 'checked_in' : 'cancelled'} size="md" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#64748B] font-medium mb-4">
                <span className="flex items-center gap-1">
                  <Hash size={12} className="text-[#0F9D8A]" />
                  {patient.patientId}
                </span>
                <span className="text-[#CBD5E1]">·</span>
                <span>{patient.age} Years</span>
                <span className="text-[#CBD5E1]">·</span>
                <span>{patient.gender}</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="flex items-center gap-1">
                  <DropletIcon size={12} className="text-rose-500" />
                  <span className="font-bold text-[#0F172A]">{patient.bloodGroup || '—'}</span>
                </span>
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap gap-2">
                {patient.allergies?.length > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[11px] font-semibold">
                    <ShieldAlert size={11} /> {patient.allergies.join(', ')}
                  </span>
                )}
                {patient.chronicDiseases?.length > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-semibold">
                    <HeartPulse size={11} /> {patient.chronicDiseases.join(', ')}
                  </span>
                )}
                {patient.department && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-sky-50 border border-sky-200 text-sky-700 rounded-full text-[11px] font-semibold">
                    <Building2 size={11} /> {patient.department}
                  </span>
                )}
                <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[11px] font-semibold">
                  <CalendarDays size={11} /> Registered {fmtDate(patient.createdAt)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 self-start">
              <button
                onClick={() => navigate(`/vitals`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F9D8A] hover:bg-[#0b8a79] text-white text-[13px] font-bold rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Activity size={15} strokeWidth={2.5} /> Record Vitals
              </button>
              <button
                onClick={() => toast.info('Sending patient to doctor...')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-teal-50 text-[#0F9D8A] text-[13px] font-bold rounded-xl border border-[#0F9D8A] transition-colors cursor-pointer whitespace-nowrap"
              >
                <SendHorizonal size={14} strokeWidth={2.5} /> Send to Doctor
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#64748B] text-[13px] font-bold rounded-xl border border-[#E5E7EB] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer size={14} strokeWidth={2} /> Print Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          QUICK STATS
      ══════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Total Visits"   value={totalVisits}        bg="bg-teal-50/80"   iconColor="text-[#0F9D8A]" />
        <StatCard icon={FileText}     label="Records"        value={vitals.length}      bg="bg-sky-50/80"    iconColor="text-sky-600"   />
        <StatCard icon={CheckCircle2} label="Completed"      value={completedAppts}     bg="bg-emerald-50/80" iconColor="text-emerald-600" />
        <StatCard icon={Stethoscope}  label="Appointments"   value={appointments.length} bg="bg-violet-50/80" iconColor="text-violet-600" />
      </div>

      {/* ══════════════════════════════════
          TABS
      ══════════════════════════════════ */}
      <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer flex-1 justify-center
              ${activeTab === id
                ? 'bg-[#0F9D8A] text-white shadow-sm'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F9D8A]'}`}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════ */}

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* Left */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <User size={14} className="text-[#0F9D8A]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <div>
                  <InfoField icon={User}       label="Full Name"   value={patient.name} />
                  <InfoField icon={Hash}       label="Patient ID"  value={patient.patientId} />
                  <InfoField icon={UserRound}  label="Age"         value={patient.age ? `${patient.age} Years` : null} />
                  <InfoField icon={BadgeCheck} label="Gender"      value={patient.gender} />
                </div>
                <div>
                  <InfoField icon={Phone}      label="Phone"       value={patient.phone} />
                  <InfoField icon={Mail}       label="Email"       value={patient.email} />
                  <InfoField icon={MapPin}     label="Address"     value={patient.address} />
                  <InfoField icon={DropletIcon} label="Blood Group" value={patient.bloodGroup}
                    iconBg="bg-rose-50" iconColor="text-rose-500" />
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                  <HeartPulse size={14} className="text-rose-500" />
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">Health Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <InfoField icon={ShieldAlert} label="Allergies"
                  value={patient.allergies?.length ? patient.allergies.join(', ') : 'None'}
                  iconBg="bg-amber-50" iconColor="text-amber-500" />
                <InfoField icon={HeartPulse}  label="Chronic Diseases"
                  value={patient.chronicDiseases?.length ? patient.chronicDiseases.join(', ') : 'None'}
                  iconBg="bg-rose-50" iconColor="text-rose-500" />
              </div>

              {patient.emergencyContact && (
                <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                  <p className="text-[12px] font-bold text-[#0F9D8A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PhoneCall size={12} /> Emergency Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8">
                    <InfoField icon={User}     label="Name"     value={patient.emergencyContact.name} />
                    <InfoField icon={Phone}    label="Phone"    value={patient.emergencyContact.phone} />
                    <InfoField icon={HeartPulse} label="Relation" value={patient.emergencyContact.relation} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Latest Vitals */}
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Activity size={14} className="text-[#0F9D8A]" />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#0F172A]">Latest Vitals</h3>
                </div>
                {latestVitals && (
                  <span className="text-[11px] text-[#94A3B8] font-medium">{fmtDate(latestVitals.createdAt)}</span>
                )}
              </div>
              {latestVitals ? (
                <div className="grid grid-cols-2 gap-3">
                  <VitalChip label="Blood Pressure" icon="💉"
                    value={latestVitals.bloodPressure ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}` : null}
                    unit="mmHg" normalOk={(latestVitals.bloodPressure?.systolic || 0) < 140} />
                  <VitalChip label="Temperature" icon="🌡️"
                    value={latestVitals.temperature} unit="°F"
                    normalOk={latestVitals.temperature >= 97 && latestVitals.temperature <= 99} />
                  <VitalChip label="Pulse Rate" icon="💓"
                    value={latestVitals.pulseRate} unit="bpm"
                    normalOk={latestVitals.pulseRate >= 60 && latestVitals.pulseRate <= 100} />
                  <VitalChip label="SpO₂" icon="🫁"
                    value={latestVitals.spo2 ? `${latestVitals.spo2}%` : null} unit=""
                    normalOk={(latestVitals.spo2 || 0) >= 95} />
                  {latestVitals.bmi && (
                    <VitalChip label="BMI" icon="⚖️"
                      value={latestVitals.bmi} unit="kg/m²"
                      normalOk={latestVitals.bmi >= 18.5 && latestVitals.bmi <= 24.9} />
                  )}
                  {latestVitals.bloodSugar && (
                    <VitalChip label="Blood Sugar" icon="🍬"
                      value={latestVitals.bloodSugar} unit="mg/dL"
                      normalOk={latestVitals.bloodSugar < 140} />
                  )}
                </div>
              ) : (
                <Empty icon={Activity} title="No vitals recorded"
                  subtitle="Vitals will appear here after the first entry" />
              )}
            </div>

            {/* Last Appointment */}
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <CalendarDays size={14} className="text-violet-600" />
                </div>
                <h3 className="text-[15px] font-bold text-[#0F172A]">Last Appointment</h3>
              </div>
              {lastAppt ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <StatusPill status={lastAppt.status} />
                    <span className="text-[12px] text-[#94A3B8]">{fmtDate(lastAppt.appointmentDate)}</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#0F172A] mb-1">{lastAppt.doctor?.name || '—'}</p>
                  <p className="text-[12px] text-[#64748B] mb-3">{lastAppt.department} {lastAppt.appointmentTime && `· ${lastAppt.appointmentTime}`}</p>
                  {lastAppt.tokenNumber && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 rounded-lg w-fit">
                      <Hash size={12} className="text-[#0F9D8A]" />
                      <span className="text-[12px] font-bold text-[#0F9D8A]">{lastAppt.tokenNumber}</span>
                    </div>
                  )}
                  <Link to={`/appointment/${lastAppt._id}`}
                    className="mt-3 flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] hover:bg-teal-50 border border-[#E5E7EB] hover:border-teal-200 rounded-xl transition-all cursor-pointer group">
                    <span className="text-[13px] font-semibold text-[#64748B] group-hover:text-[#0F9D8A]">View Details</span>
                    <ChevronRight size={14} className="text-[#94A3B8] group-hover:text-[#0F9D8A]" />
                  </Link>
                </div>
              ) : (
                <Empty icon={CalendarDays} title="No appointments yet" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEDICAL HISTORY ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
              <Clock size={14} className="text-sky-600" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0F172A]">Medical History Timeline</h3>
            <span className="ml-auto text-[12px] text-[#94A3B8]">{appointments.length} records</span>
          </div>

          {!appointments.length ? (
            <Empty icon={Clock} title="No medical history" subtitle="Past appointments will appear here" />
          ) : (
            <div className="relative">
              {/* timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-[#F1F5F9]" />

              <div className="space-y-1">
                {appointments.map((a, idx) => (
                  <div key={a._id} className="relative flex gap-5 pb-6 last:pb-0">
                    {/* dot */}
                    <div className={`w-[38px] h-[38px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 mt-0.5
                      ${a.status === 'consultation_done' ? 'bg-emerald-50 border-emerald-300' :
                        a.status === 'cancelled'         ? 'bg-rose-50 border-rose-300' :
                        'bg-teal-50 border-teal-300'}`}>
                      {a.status === 'consultation_done'
                        ? <CheckCircle2 size={16} className="text-emerald-600" />
                        : a.status === 'cancelled'
                        ? <XCircle size={16} className="text-rose-600" />
                        : <CalendarDays size={15} className="text-[#0F9D8A]" />}
                    </div>

                    {/* card */}
                    <div className="flex-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-bold text-[#0F172A]">
                              {a.doctor?.name || 'Unknown Doctor'}
                            </span>
                            <StatusPill status={a.status} />
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                            <Building2 size={11} />
                            <span>{a.department}</span>
                            {a.appointmentTime && <><span className="text-[#CBD5E1]">·</span><span>{a.appointmentTime}</span></>}
                          </div>
                          {a.symptoms && (
                            <p className="mt-2 text-[12px] text-[#64748B] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5">
                              <span className="font-semibold text-[#0F172A]">Symptoms: </span>{a.symptoms}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[12px] font-semibold text-[#64748B]">{fmtDate(a.appointmentDate)}</p>
                          {a.tokenNumber && (
                            <span className="text-[11px] text-[#0F9D8A] font-bold">{a.tokenNumber}</span>
                          )}
                        </div>
                      </div>
                      <Link to={`/appointment/${a._id}`}
                        className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#0F9D8A] hover:underline cursor-pointer w-fit">
                        View Appointment <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VITALS ── */}
      {activeTab === 'vitals' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                <Activity size={14} className="text-[#0F9D8A]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Vitals History</h3>
            </div>
            <span className="text-[12px] text-[#94A3B8]">{vitals.length} records</span>
          </div>

          {!vitals.length ? (
            <div className="p-6"><Empty icon={Activity} title="No vitals recorded" subtitle="Vitals will appear here after first entry" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                    {['Date & Time', 'Blood Pressure', 'Temperature', 'Pulse', 'SpO₂', 'Weight', 'Blood Sugar', 'Nurse'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {vitals.map(v => (
                    <tr key={v._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[13px] font-semibold text-[#0F172A]">{fmtDate(v.createdAt)}</p>
                        <p className="text-[11px] text-[#94A3B8]">{new Date(v.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-bold text-[#0F172A]">
                          {v.bloodPressure?.systolic && v.bloodPressure?.diastolic
                            ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`
                            : '—'}
                        </span>
                        {v.bloodPressure?.systolic && <span className="text-[10px] text-[#94A3B8] ml-1">mmHg</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#0F172A]">{v.temperature ? `${v.temperature}°F` : '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#0F172A]">{v.pulseRate ? `${v.pulseRate} bpm` : '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[13px] font-semibold ${v.spo2 && v.spo2 < 95 ? 'text-rose-600' : 'text-[#0F172A]'}`}>
                          {v.spo2 ? `${v.spo2}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#0F172A]">{v.weight ? `${v.weight} kg` : '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#0F172A]">{v.bloodSugar ? `${v.bloodSugar} mg/dL` : '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-medium text-[#64748B]">{v.recordedBy?.name || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {activeTab === 'appts' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <CalendarDays size={14} className="text-violet-600" />
              </div>
              <h3 className="text-[15px] font-bold text-[#0F172A]">Appointment History</h3>
            </div>
            <span className="text-[12px] text-[#94A3B8]">{appointments.length} total</span>
          </div>

          {!appointments.length ? (
            <div className="p-6"><Empty icon={CalendarDays} title="No appointments found" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                    {['Token', 'Date & Time', 'Doctor', 'Department', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {appointments.map(a => (
                    <tr key={a._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-[#0F9D8A] text-[11px] font-bold rounded-lg border border-teal-100">
                          <Hash size={10} />{a.tokenNumber || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[13px] font-semibold text-[#0F172A]">{fmtDate(a.appointmentDate)}</p>
                        {a.appointmentTime && <p className="text-[11px] text-[#94A3B8]">{a.appointmentTime}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-semibold text-[#0F172A]">{a.doctor?.name || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#64748B]">
                          <Building2 size={11} className="text-[#0F9D8A]" />{a.department}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/appointment/${a._id}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-teal-50 border border-[#E5E7EB] hover:border-teal-200 text-[12px] font-bold text-[#64748B] hover:text-[#0F9D8A] rounded-lg transition-all cursor-pointer w-fit">
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default PatientProfile;
