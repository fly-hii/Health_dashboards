import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vitalsService } from '../../services/vitalsService';
import { nurseService } from '../../services/nurseService';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle, X, Edit2, User } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const initialForm = {
  bloodPressureSystolic: '', bloodPressureDiastolic: '',
  temperature: '', pulseRate: '', respiratoryRate: '',
  spo2: '', weight: '', height: '', bloodSugar: '',
  painScale: '', symptoms: '', notes: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const STATUS_BADGE = {
  waiting_for_vitals: { label: 'Waiting',      cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  checked_in:         { label: 'Checked In',   cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  vitals_done:        { label: 'Sent to Doctor',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  with_doctor:        { label: 'Sent to Doctor',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  waiting:            { label: 'Waiting',      cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  in_progress:        { label: 'Sent to Doctor',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  completed:          { label: 'Completed',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
};

function getStatusBadge(status) {
  return STATUS_BADGE[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
}

const VitalsEntry = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [form, setForm]                       = useState(initialForm);
  const [bmi, setBmi]                         = useState('');
  const [appointment, setAppointment]         = useState(null);
  const [existingVitals, setExistingVitals]   = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [apptLoading, setApptLoading]         = useState(!!appointmentId);
  const [errors, setErrors]                   = useState({});

  /* ── queue dropdown ── */
  const [queuePatients, setQueuePatients]     = useState([]);
  const [queueLoading, setQueueLoading]       = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [editOpen, setEditOpen]       = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [editLoading, setEditLoading] = useState(false);

  /* fetch today's queue patients */
  const loadQueuePatients = async () => {
    setQueueLoading(true);
    try {
      // Get all today's active patients (no status filter = all statuses)
      const res = await nurseService.getPatientQueue({ limit: 100 });
      // Backend now returns mapped statuses: waiting_for_vitals, in_progress, consultation_done, etc.
      const list = (res.data?.data || []).filter(a =>
        a.patient && ['waiting_for_vitals', 'in_progress', 'vitals_done', 'with_doctor', 'checked_in', 'waiting'].includes(a.status)
      );
      setQueuePatients(list);
    } catch { toast.error('Failed to load queue'); }
    finally { setQueueLoading(false); }
  };

  useEffect(() => { loadQueuePatients(); }, []);

  /* load appointment when routed via /vitals/:id */
  useEffect(() => {
    if (!appointmentId) {
      setAppointment(null);
      setSelectedPatient(null);
      setExistingVitals(null);
      setForm(initialForm);
      setBmi('');
      return;
    }
    (async () => {
      try {
        setApptLoading(true);
        const [apptRes, vitalsRes] = await Promise.all([
          nurseService.getAppointmentDetails(appointmentId),
          vitalsService.getVitalsByAppointment(appointmentId).catch(() => null),
        ]);
        const appt = apptRes.data.data;
        setAppointment(appt);
        if (appt?.patient) setSelectedPatient(appt.patient);
        if (vitalsRes?.data?.data) {
          const v = vitalsRes.data.data;
          setExistingVitals(v);
          let systolic = '';
          let diastolic = '';
          if (v.blood_pressure) {
            const parts = v.blood_pressure.split('/');
            systolic = parts[0] || '';
            diastolic = parts[1] || '';
          } else if (v.bloodPressure) {
            systolic = v.bloodPressure.systolic ?? '';
            diastolic = v.bloodPressure.diastolic ?? '';
          }

          setForm({
            bloodPressureSystolic:  systolic,
            bloodPressureDiastolic: diastolic,
            temperature: v.temperature ?? '',
            pulseRate: v.pulse ?? v.pulse_rate ?? v.pulseRate ?? '',
            respiratoryRate: v.respiratory_rate ?? v.respiratoryRate ?? '',
            spo2: v.spo2 ?? '',
            weight: v.weight ?? '',
            height: v.height ?? '',
            bloodSugar: v.blood_sugar ?? v.bloodSugar ?? '',
            painScale: v.pain_scale ?? v.painScale ?? '',
            symptoms: v.symptoms ?? '',
            notes: v.notes ?? '',
          });
        } else {
          setExistingVitals(null);
          setForm(initialForm);
          setBmi('');
        }
      } catch { toast.error('Failed to load appointment details'); }
      finally { setApptLoading(false); }
    })();
  }, [appointmentId]);

  /* BMI auto-calc */
  useEffect(() => {
    const w = parseFloat(form.weight), h = parseFloat(form.height);
    setBmi(w > 0 && h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : '');
  }, [form.weight, form.height]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleReset = () => { setForm(initialForm); setBmi(''); setErrors({}); toast.info('Form reset'); };

  const openEdit = () => {
    if (!selectedPatient) return;
    setEditForm({
      name:              selectedPatient.name || '',
      age:               selectedPatient.age  || '',
      gender:            selectedPatient.gender || 'Male',
      phone:             selectedPatient.phone || '',
      email:             selectedPatient.email || '',
      address:           selectedPatient.address || '',
      bloodGroup:        selectedPatient.bloodGroup || 'Unknown',
      allergies:         (selectedPatient.allergies || []).join(', '),
      chronicDiseases:   (selectedPatient.chronicDiseases || []).join(', '),
      emergencyName:     selectedPatient.emergencyContact?.name     || '',
      emergencyPhone:    selectedPatient.emergencyContact?.phone    || '',
      emergencyRelation: selectedPatient.emergencyContact?.relation || '',
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!selectedPatient?._id && !selectedPatient?.id) return;
    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name,
        age:  parseInt(editForm.age, 10) || undefined,
        gender: editForm.gender,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        bloodGroup: editForm.bloodGroup,
        allergies:       editForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
        chronicDiseases: editForm.chronicDiseases.split(',').map(s => s.trim()).filter(Boolean),
        emergencyContact: {
          name:     editForm.emergencyName,
          phone:    editForm.emergencyPhone,
          relation: editForm.emergencyRelation,
        },
      };
      const res = await nurseService.updatePatient(selectedPatient._id || selectedPatient.id, payload);
      setSelectedPatient(res.data.data);
      toast.success('Patient details updated successfully');
      setEditOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update patient');
    } finally {
      setEditLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    const n = (v) => parseFloat(v);
    if (!form.bloodPressureSystolic)  errs.bloodPressureSystolic  = 'Required';
    if (!form.bloodPressureDiastolic) errs.bloodPressureDiastolic = 'Required';
    if (!form.temperature) errs.temperature = 'Required';
    if (!form.pulseRate)   errs.pulseRate   = 'Required';
    if (!form.spo2)        errs.spo2        = 'Required';
    const sys = n(form.bloodPressureSystolic), dia = n(form.bloodPressureDiastolic);
    const tmp = n(form.temperature), pls = n(form.pulseRate), sp = n(form.spo2), pain = n(form.painScale);
    if (form.bloodPressureSystolic  && (sys < 70  || sys > 250)) errs.bloodPressureSystolic  = 'Range: 70-250';
    if (form.bloodPressureDiastolic && (dia < 40  || dia > 150)) errs.bloodPressureDiastolic = 'Range: 40-150';
    if (form.temperature) { const c = tmp <= 45; if (c && (tmp < 30 || tmp > 45)) errs.temperature = '30-45°C'; else if (!c && (tmp < 85 || tmp > 115)) errs.temperature = '85-115°F'; }
    if (form.pulseRate  && (pls  < 30  || pls > 220)) errs.pulseRate  = 'Range: 30-220';
    if (form.spo2       && (sp   < 0   || sp  > 100)) errs.spo2       = 'Range: 0-100';
    if (form.painScale  && (pain < 0   || pain > 10)) errs.painScale  = 'Range: 0-10';
    return errs;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Validation errors — check inputs.'); return; }
    if (!selectedPatient && !appointment?.patient) { toast.warning('Please select a patient first.'); return; }
    setLoading(true);
    try {
      const patientId = selectedPatient?._id || selectedPatient?.id || appointment?.patient?._id || appointment?.patient?.id;
      const apptId    = appointmentId || appointment?._id || appointment?.id;
      const payload   = { patientId, appointmentId: apptId, ...form, isDraft: false };

      // 1. Save / update vitals
      if (existingVitals) {
        await vitalsService.updateVitals(existingVitals._id || existingVitals.id, { ...form, isDraft: false });
      } else {
        await vitalsService.recordVitals(payload);
      }

      // 2. Mark appointment as In-Progress so it appears in the Doctor queue
      if (apptId) {
        await nurseService.updateAppointmentStatus(apptId, 'In-Progress');
      }

      toast.success('Vitals saved. Patient marked as completed.');
      navigate('/patient-queue');
    } catch { toast.error('Failed to save vitals record'); }
    finally { setLoading(false); }
  };

  const statuses = {
    temperature: !!form.temperature && !errors.temperature,
    bp:     !!form.bloodPressureSystolic && !!form.bloodPressureDiastolic && !errors.bloodPressureSystolic && !errors.bloodPressureDiastolic,
    oxygen: !!form.spo2 && !errors.spo2,
    bmi:    !!bmi,
  };
  const progressPercent  = Math.round((Object.values(statuses).filter(Boolean).length / 4) * 100);
  const displayPatient   = selectedPatient || appointment?.patient;
  const displayAppt      = appointment;
  const initials         = displayPatient?.name ? displayPatient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;

  /* ─── field helper ─── */
  const Field = ({ label, name, type = 'number', step, placeholder, required, error, extra }) => (
    <div className={`space-y-1.5 ${extra || ''}`}>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type} step={step} name={name} value={form[name]}
        onChange={handleChange} placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 outline-none transition-all
          ${error ? 'border-red-300 ring-2 ring-red-500/10' : 'border-[#E5E7EB] focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10'}`}
      />
      {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">Vitals Entry</h1>
          <p className="text-slate-500 font-medium text-[15px]">Enter and save patient vital signs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/patient-queue')}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0 self-start md:self-center cursor-pointer">
          <ArrowLeft size={14} strokeWidth={2.5} /> Back to Queue
        </Button>
      </div>

      {/* ── Patient Selector ── */}
      <Card className="p-5 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white">
        <div className="flex flex-col md:flex-row md:items-center gap-4">

          {/* Simple select dropdown */}
          <div className="flex-1 max-w-sm">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Patient from Queue
            </label>
            <select
              value={selectedPatient?._id || selectedPatient?.id || ''}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                const appt = queuePatients.find(a => (a.patient?._id || a.patient?.id) === val);
                if (appt) {
                  setSelectedPatient(appt.patient);
                  setAppointment(appt);
                  navigate(`/vitals/${appt._id || appt.id}`);
                } else {
                  setSelectedPatient(null);
                  setAppointment(null);
                  navigate('/vitals');
                }
              }}
              className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-700 bg-white outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 cursor-pointer transition-all"
            >
              <option value="">
                {queueLoading ? 'Loading queue…' : `— Select patient (${queuePatients.length} in queue) —`}
              </option>
              {queuePatients.map((appt, idx) => {
                const pat    = appt.patient;
                const badge  = getStatusBadge(appt.status);
                return (
                  <option key={appt._id || appt.id || idx} value={pat?._id || pat?.id}>
                    {appt.tokenNumber}  ·  {pat?.name || 'Unknown'}  ·  {pat?.age ? `${pat.age}Y` : '—'} / {pat?.gender || '—'}  ·  {appt.department}  [{badge.label}]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected patient info chip */}
          {displayPatient ? (
            <div className="flex-1 flex items-center justify-between gap-4 bg-teal-50/60 border border-teal-100 rounded-xl px-5 py-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{displayPatient.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {displayPatient.age} Yrs / {displayPatient.gender}
                    {displayPatient.bloodGroup && displayPatient.bloodGroup !== 'Unknown' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">{displayPatient.bloodGroup}</span>
                    )}
                  </div>
                  {displayPatient.patientId && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ID: {displayPatient.patientId} · {displayPatient.phone || '—'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {displayAppt && (
                  <div className="hidden md:block text-right border-r border-teal-200 pr-4 mr-2">
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Token · <span className="text-slate-800 font-bold font-mono">{displayAppt.tokenNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {displayAppt.department} · {displayAppt.appointmentTime}
                    </div>
                  </div>
                )}
                <button type="button" onClick={openEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-[11px] font-bold text-[#0EA5A4] hover:bg-teal-50 hover:border-teal-200 transition-colors cursor-pointer">
                  <Edit2 size={12} strokeWidth={2.5} /> Edit Details
                </button>
                {!appointmentId && (
                  <button type="button"
                    onClick={() => { setSelectedPatient(null); setAppointment(null); }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-5 py-4 text-slate-400">
              <User size={18} strokeWidth={1.5} />
              <span className="text-xs font-medium">Select a patient from the dropdown to begin</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Main Form ── */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">

          {/* Vital Signs */}
          <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-6">
            <h3 className="text-[15px] font-bold text-slate-900 pb-3 border-b border-[#E5E7EB] leading-none">Vital Signs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">

              {/* Blood Pressure — spans 2 cols */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  Blood Pressure <span className="text-red-500">*</span>
                  <span className="text-[9px] text-slate-400 font-normal normal-case">(mmHg)</span>
                </label>
                <div className={`flex items-center px-3.5 py-2.5 bg-white border rounded-xl transition-all
                  ${errors.bloodPressureSystolic || errors.bloodPressureDiastolic
                    ? 'border-red-300 ring-2 ring-red-500/10'
                    : 'border-[#E5E7EB] focus-within:border-[#0EA5A4] focus-within:ring-2 focus-within:ring-teal-500/10'}`}>
                  <input type="number" name="bloodPressureSystolic"  value={form.bloodPressureSystolic}  onChange={handleChange} placeholder="120" className="w-16 text-center text-sm font-bold text-slate-800 outline-none bg-transparent" />
                  <span className="mx-2.5 text-slate-300 font-bold">/</span>
                  <input type="number" name="bloodPressureDiastolic" value={form.bloodPressureDiastolic} onChange={handleChange} placeholder="80"  className="w-16 text-center text-sm font-bold text-slate-800 outline-none bg-transparent" />
                </div>
                {(errors.bloodPressureSystolic || errors.bloodPressureDiastolic) && (
                  <p className="text-[10px] text-red-500 font-semibold">{errors.bloodPressureSystolic || errors.bloodPressureDiastolic}</p>
                )}
              </div>

              <Field label="Temperature" name="temperature" step="0.1" placeholder="98.6" required error={errors.temperature} />
              <Field label="Pulse Rate"  name="pulseRate"   placeholder="82"   required error={errors.pulseRate} />
              <Field label="Resp. Rate"  name="respiratoryRate" placeholder="18" />
              <Field label="SpO₂"        name="spo2"        placeholder="98"   required error={errors.spo2} />
              <Field label="Weight (kg)" name="weight"      step="0.1" placeholder="72" />
              <Field label="Height (cm)" name="height"      placeholder="170" />
              <Field label="Blood Sugar (mg/dL)" name="bloodSugar" placeholder="110" />
              <Field label="Pain Scale (0–10)"   name="painScale"  placeholder="2" error={errors.painScale} />

              {/* BMI — readonly */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BMI (kg/m²)</label>
                <input type="text" readOnly disabled value={bmi} placeholder="Auto"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed outline-none" />
              </div>
            </div>
          </Card>

          {/* Symptoms & Notes */}
          <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-6">
            <h3 className="text-[15px] font-bold text-slate-900 pb-3 border-b border-[#E5E7EB] leading-none">Symptoms & Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chief Complaint / Symptoms</label>
                <textarea name="symptoms" value={form.symptoms} onChange={handleChange} rows={3}
                  placeholder="Fever and headache since 2 days"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 resize-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                  placeholder="Patient appears stable."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 resize-none transition-all" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Status + Actions */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-5">
            <h3 className="text-[14px] font-bold text-slate-900 pb-3 border-b border-[#E5E7EB] leading-none">Vitals Status Card</h3>
            <div className="space-y-4">
              {[
                { label: 'Temperature Recorded',    ok: statuses.temperature },
                { label: 'Blood Pressure Recorded', ok: statuses.bp },
                { label: 'Oxygen Level Recorded',   ok: statuses.oxygen },
                { label: 'BMI Calculated',           ok: statuses.bmi },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">{label}</span>
                  {ok
                    ? <CheckCircle size={16} className="text-emerald-500" />
                    : <div className="w-4 h-4 rounded-full border border-slate-200" />}
                </div>
              ))}
            </div>
            <div className="h-px bg-[#E5E7EB]" />
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Progress</span><span>{progressPercent}% Completed</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0EA5A4] to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleReset}
              className="flex-1 py-2.5 border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Reset
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-2 py-2.5 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] hover:from-[#0F766E] hover:to-[#0d6962] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : <>Save & Send to Doctor <ArrowLeft size={13} className="rotate-180" strokeWidth={2.5} /></>}
            </Button>
          </div>
        </div>
      </form>

      {/* ══ Edit Patient Modal ══ */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">Edit Patient Details</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Updating info for {selectedPatient?.name}</p>
              </div>
              <button type="button" onClick={() => setEditOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleEditSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                  <input required name="name" value={editForm.name} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Age *</label>
                  <input required type="number" name="age" value={editForm.age} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                  <select name="gender" value={editForm.gender} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] bg-white">
                    {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input name="phone" value={editForm.phone} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" name="email" value={editForm.email} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
                  <select name="bloodGroup" value={editForm.bloodGroup} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] bg-white">
                    {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Address</label>
                  <input name="address" value={editForm.address} onChange={handleEditChange}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Allergies <span className="font-normal text-slate-400 normal-case">(comma-separated)</span>
                  </label>
                  <input name="allergies" value={editForm.allergies} onChange={handleEditChange}
                    placeholder="e.g. Penicillin, Dust"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Chronic Diseases <span className="font-normal text-slate-400 normal-case">(comma-separated)</span>
                  </label>
                  <input name="chronicDiseases" value={editForm.chronicDiseases} onChange={handleEditChange}
                    placeholder="e.g. Diabetes, Hypertension"
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                </div>
              </div>

              {/* Emergency contact */}
              <div className="border-t border-[#E5E7EB] pt-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Emergency Contact</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Name',     name: 'emergencyName',     placeholder: 'Contact name' },
                    { label: 'Phone',    name: 'emergencyPhone',    placeholder: 'Phone number' },
                    { label: 'Relation', name: 'emergencyRelation', placeholder: 'e.g. Spouse' },
                  ].map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</label>
                      <input name={f.name} value={editForm[f.name] || ''} onChange={handleEditChange}
                        placeholder={f.placeholder}
                        className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-slate-800 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#E5E7EB] pt-4 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}
                  className="px-5 py-2.5 border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2">
                  {editLoading
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                    : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsEntry;
