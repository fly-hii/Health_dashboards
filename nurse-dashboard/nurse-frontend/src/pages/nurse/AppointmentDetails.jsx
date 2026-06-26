import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nurseService } from '../../services/nurseService';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import config from '../../config';
import {
  ArrowLeft,
  User,
  Stethoscope,
  CalendarDays,
  Info,
  Activity,
  SendHorizonal,
  History,
  Printer,
  ExternalLink,
  DropletIcon,
  Phone,
  Mail,
  HeartPulse,
  ShieldAlert,
  BadgeCheck,
  Clock,
  UserCheck,
  Building2,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */
const STATUS_CFG = {
  checked_in:         { label: 'Checked In',        bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200'   },
  waiting_for_vitals: { label: 'Waiting for Vitals', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  vitals_done:        { label: 'Vitals Done',        bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200'},
  with_doctor:        { label: 'With Doctor',        bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  consultation_done:  { label: 'Consultation Done',  bg: 'bg-slate-100', text: 'text-slate-600',  border: 'border-slate-200'  },
  cancelled:          { label: 'Cancelled',          bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200'   },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Reusable info row
───────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, iconColor = 'text-[#0F9D8A]' }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#F1F5F9] last:border-0">
      <div className="w-[130px] flex items-center gap-2 shrink-0">
        {Icon && <Icon size={14} className={`shrink-0 ${iconColor}`} />}
        <span className="text-[13px] text-[#64748B] font-medium">{label}</span>
      </div>
      <span className="text-[14px] text-[#0B1F3A] font-semibold flex-1">{value || '—'}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton loader
───────────────────────────────────────────── */
function SkeletonCard({ rows = 4 }) {
  return (
    <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 shadow-sm">
      <div className="skeleton h-4 w-36 rounded mb-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-[#F1F5F9] last:border-0">
          <div className="skeleton h-3.5 w-28 rounded" />
          <div className="skeleton h-3.5 w-40 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Format date helpers
───────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─────────────────────────────────────────────
   Print Token — browser print window
───────────────────────────────────────────── */
function printToken(appt) {
  if (!appt) return;
  const pat = appt.patient;
  const doc = appt.doctor;
  const html = `
    <!DOCTYPE html><html><head>
    <title>Token ${appt.tokenNumber}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', Arial, sans-serif; background: #fff; padding: 40px; color: #0B1F3A; }
      .header { text-align: center; border-bottom: 2px solid #0F9D8A; padding-bottom: 18px; margin-bottom: 24px; }
      .hospital { font-size: 22px; font-weight: 800; color: #0F9D8A; letter-spacing: -0.5px; }
      .token-num { font-size: 42px; font-weight: 900; color: #0B1F3A; margin: 12px 0 4px; letter-spacing: 2px; }
      .dept { font-size: 14px; color: #64748B; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
      .lbl { color: #64748B; }
      .val { font-weight: 600; }
      .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #94A3B8; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header">
      <div class="hospital">CarePlus Hospital</div>
      <div class="token-num">${appt.tokenNumber}</div>
      <div class="dept">${appt.department}</div>
    </div>
    <div class="row"><span class="lbl">Patient</span><span class="val">${pat?.name || '—'}</span></div>
    <div class="row"><span class="lbl">Doctor</span><span class="val">${doc?.name || '—'}</span></div>
    <div class="row"><span class="lbl">Date</span><span class="val">${fmtDate(appt.appointmentDate)}</span></div>
    <div class="row"><span class="lbl">Time</span><span class="val">${appt.appointmentTime || '—'}</span></div>
    <div class="row"><span class="lbl">Department</span><span class="val">${appt.department}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val">${STATUS_CFG[appt.status]?.label || appt.status}</span></div>
    <div class="footer">Please arrive 10 minutes before your scheduled time.</div>
    </body></html>`;
  const win = window.open('', '_blank', 'width=480,height=640');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const AppointmentDetails = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [appt, setAppt]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const socketRef               = useRef(null);

  /* fetch */
  const loadAppt = async () => {
    try {
      const res = await nurseService.getAppointmentDetails(id);
      setAppt(res.data.data);
    } catch { toast.error('Failed to load appointment details'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAppt(); }, [id]);

  /* socket */
  useEffect(() => {
    if (!user?._id && !user?.id) return;
    // config.socketUrl is null on Vercel (serverless can't handle WebSockets)
    if (!config.socketUrl) return;
    const token = localStorage.getItem('nurse_token');
    const socket = io(config.socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 5000,
      auth: { token },
    });
    socketRef.current = socket;
    socket.emit('join', user._id || user.id);
    socket.on('appointment_status_updated', ({ appointmentId }) => {
      if (String(appointmentId) === String(id)) loadAppt();
    });
    return () => socket.disconnect();
  }, [user?._id, user?.id, id]);

  /* send to doctor */
  const handleSendToDoctor = async () => {
    setSending(true);
    try {
      await nurseService.updateAppointmentStatus(id, 'with_doctor');
      socketRef.current?.emit('PATIENT_SENT_TO_DOCTOR', { appointmentId: id });
      toast.success('Patient sent to doctor successfully');
      loadAppt();
    } catch { toast.error('Failed to update status'); }
    finally { setSending(false); }
  };

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="space-y-6 animate-pulse">
      {/* header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton h-8 w-52 rounded-xl" />
            <div className="skeleton h-7 w-28 rounded-full" />
          </div>
          <div className="skeleton h-5 w-44 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      {/* two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 items-start">
        <div className="space-y-6">
          <SkeletonCard rows={5} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
        <div className="space-y-6">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={1} />
        </div>
      </div>
    </div>
  );

  /* ── not found ── */
  if (!appt) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
        <CalendarDays size={28} className="text-slate-400" />
      </div>
      <p className="text-[16px] font-bold text-slate-700">Appointment not found</p>
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 bg-[#0F9D8A] text-white text-sm font-semibold rounded-xl hover:bg-[#0b8a79] transition-colors cursor-pointer">
        <ArrowLeft size={15} /> Go Back
      </button>
    </div>
  );

  const { patient, doctor } = appt;
  const patInitials = patient?.name
    ? patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P';
  const docInitials = doctor?.name
    ? doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'D';

  return (
    <div className="space-y-6">

      {/* ════════════════════════════════════
          PAGE HEADER
      ════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          {/* Title + Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[26px] font-extrabold text-[#0B1F3A] tracking-tight leading-none">
              Appointment Details
            </h1>
            <StatusPill status={appt.status} />
          </div>
          {/* Token */}
          <p className="text-[15px] font-bold text-[#0B1F3A]">
            Token: <span className="text-[#0F9D8A]">{appt.tokenNumber}</span>
          </p>
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B] hover:text-[#0F9D8A] transition-colors cursor-pointer mt-0.5"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> Back
          </button>
        </div>

        {/* Full Profile button */}
        {(patient?._id || patient?.id) && (
          <button
            onClick={() => navigate(`/patient/${patient._id || patient.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0F9D8A] hover:bg-[#0b8a79] text-white text-[13px] font-bold rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <ExternalLink size={14} strokeWidth={2.5} />
            Full Profile
          </button>
        )}
      </div>

      {/* ════════════════════════════════════
          2-COLUMN GRID
      ════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* ── Patient Information Card ── */}
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <User size={17} className="text-[#0F9D8A]" />
                <h3 className="text-[14px] font-bold text-[#0B1F3A] uppercase tracking-wide">
                  Patient Information
                </h3>
              </div>

              {/* Patient avatar + name row */}
              <div className="flex items-center gap-4 mb-2">
                {/* Avatar */}
                <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-[18px] shadow-sm shrink-0 select-none">
                  {patient?.gender === 'Female' ? '👩' : patient?.gender === 'Male' ? '🧑' : patInitials}
                </div>
                <div>
                  <div className="text-[18px] font-extrabold text-[#0B1F3A] leading-tight">
                    {patient?.name || '—'}
                  </div>
                  <div className="text-[13px] text-[#64748B] font-medium mt-0.5 flex items-center gap-1.5">
                    <span>{patient?.patientId}</span>
                    <span className="text-slate-300">·</span>
                    <span>{patient?.age} Years</span>
                    <span className="text-slate-300">·</span>
                    <span>{patient?.gender}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="px-6 pb-5">
              <InfoRow icon={DropletIcon}   label="Blood Group" value={patient?.bloodGroup} />
              <InfoRow icon={Phone}         label="Phone"       value={patient?.phone} />
              <InfoRow icon={Mail}          label="Email"       value={patient?.email} />
              <InfoRow icon={ShieldAlert}   label="Allergies"
                value={patient?.allergies?.length ? patient.allergies.join(', ') : 'None'} />
              <InfoRow icon={HeartPulse}    label="Conditions"
                value={patient?.chronicDiseases?.length ? patient.chronicDiseases.join(', ') : 'None'} />
            </div>
          </div>

          {/* ── Appointment Information Card ── */}
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays size={17} className="text-[#0F9D8A]" />
                <h3 className="text-[14px] font-bold text-[#0B1F3A] uppercase tracking-wide">
                  Appointment Information
                </h3>
              </div>
            </div>

            {/* 4-col stats strip */}
            <div className="mx-6 mb-5 bg-[#F8FAFC] rounded-[14px] border border-[#E5E7EB] overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E5E7EB]">
                {[
                  { label: 'Token Number',      value: appt.tokenNumber },
                  { label: 'Appointment Date',  value: fmtDate(appt.appointmentDate) },
                  { label: 'Appointment Time',  value: appt.appointmentTime || '—' },
                  {
                    label: 'Status',
                    value: null,
                    node: <StatusPill status={appt.status} />
                  },
                ].map(({ label, value, node }) => (
                  <div key={label} className="px-4 py-4 flex flex-col gap-1">
                    <span className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wide">{label}</span>
                    {node
                      ? <div className="mt-0.5">{node}</div>
                      : <span className="text-[14px] font-bold text-[#0B1F3A]">{value}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Quick Actions Card ── */}
          <div className="bg-gradient-to-br from-[#0F9D8A] via-[#0b9180] to-[#0a7a6d] rounded-[20px] shadow-md overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <h3 className="text-[14px] font-bold text-white/90 uppercase tracking-wide">
                Quick Actions
              </h3>
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              {/* Vitals Entry */}
              <button
                onClick={() => navigate(`/vitals/${id}`)}
                className="flex flex-col items-center gap-2.5 p-4 bg-white/10 hover:bg-white/20 rounded-[14px] transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                  <Activity size={20} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-bold text-white text-center leading-tight">Vitals Entry</span>
              </button>

              {/* Send to Doctor */}
              <button
                onClick={handleSendToDoctor}
                disabled={sending || appt.status === 'with_doctor' || appt.status === 'consultation_done'}
                className="flex flex-col items-center gap-2.5 p-4 bg-white/10 hover:bg-white/20 rounded-[14px] transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-11 h-11 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                  {sending
                    ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <SendHorizonal size={20} className="text-white" strokeWidth={2} />
                  }
                </div>
                <span className="text-[12px] font-bold text-white text-center leading-tight">Send to Doctor</span>
              </button>

              {/* View History */}
              <button
                onClick={() => navigate(`/medical-history`)}
                className="flex flex-col items-center gap-2.5 p-4 bg-white/10 hover:bg-white/20 rounded-[14px] transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                  <History size={20} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-bold text-white text-center leading-tight">View History</span>
              </button>

              {/* Print Token */}
              <button
                onClick={() => printToken(appt)}
                className="flex flex-col items-center gap-2.5 p-4 bg-white/10 hover:bg-white/20 rounded-[14px] transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                  <Printer size={20} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[12px] font-bold text-white text-center leading-tight">Print Token</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* ── Doctor Information Card ── */}
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope size={17} className="text-[#0F9D8A]" />
                <h3 className="text-[14px] font-bold text-[#0B1F3A] uppercase tracking-wide">
                  Doctor Information
                </h3>
              </div>

              {/* Doctor avatar + name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-[64px] h-[64px] rounded-[14px] bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center text-[26px] shrink-0 shadow-sm select-none">
                  👨‍⚕️
                </div>
                <div>
                  <div className="text-[16px] font-extrabold text-[#0B1F3A] leading-tight">
                    {doctor?.name || '—'}
                  </div>
                  <div className="text-[12px] text-[#64748B] font-medium mt-0.5">
                    {doctor?.department || appt.department}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-5">
              <InfoRow icon={BadgeCheck} label="Employee ID" value={doctor?.employeeId} />
              <InfoRow icon={Phone}      label="Phone"       value={doctor?.phone} />
            </div>
          </div>

          {/* ── Additional Information Card ── */}
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Info size={17} className="text-[#0F9D8A]" />
                <h3 className="text-[14px] font-bold text-[#0B1F3A] uppercase tracking-wide">
                  Additional Information
                </h3>
              </div>
            </div>

            <div className="px-6 pb-5">
              <InfoRow
                icon={Clock}
                label="Registration Date"
                value={fmtDateTime(appt.createdAt)}
              />
              <InfoRow
                icon={Clock}
                label="Checked In At"
                value={fmtDateTime(appt.updatedAt)}
              />
              <InfoRow
                icon={UserCheck}
                label="Assigned To"
                value={appt.checkedInBy?.name || user?.name || 'Nurse Angel'}
              />
              <InfoRow
                icon={Building2}
                label="Department"
                value={appt.department}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;
