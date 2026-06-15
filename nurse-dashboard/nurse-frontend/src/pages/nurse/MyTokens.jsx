import { useState, useEffect, useCallback } from 'react';
import { 
  Ticket, 
  Clock, 
  Users, 
  Check, 
  X,
  Calendar, 
  User, 
  Info, 
  RefreshCw, 
  Download, 
  PhoneCall, 
  Bell, 
  Eye, 
  Search, 
  ChevronDown,
  AlertTriangle,
  Volume2
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'react-toastify';
import { nurseService } from '../../services/nurseService';

const TABS = [
  { id: 'current', label: 'Current Token' },
  { id: 'past',    label: 'Past Tokens' }
];

const STAGES = [
  { label: 'Registration', num: 1 },
  { label: 'Vitals',       num: 2 },
  { label: 'Consultation', num: 3 },
  { label: 'Payment',      num: 4 },
  { label: 'Completed',    num: 5 }
];

// Map appointment status from backend to token stage and status
const mapAppointmentToToken = (appt) => {
  const statusMap = {
    'checked_in':          { currentStage: 1, status: 'Active' },
    'waiting_for_vitals':  { currentStage: 2, status: 'Active' },
    'vitals_done':         { currentStage: 3, status: 'Active' },
    'with_doctor':         { currentStage: 3, status: 'Active' },
    'consultation_done':   { currentStage: 5, status: 'Completed' },
    'cancelled':           { currentStage: 2, status: 'Missed' },
  };

  const mapped = statusMap[appt.status] || { currentStage: 1, status: 'Active' };
  const patient = appt.patient || {};
  const doctor = appt.doctor || {};
  const dateStr = appt.appointmentDate
    ? new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  // Build a timeline based on the current status
  const timeline = [];
  timeline.push({
    time: appt.appointmentTime || dateStr,
    title: 'Token Generated',
    desc: `Token ${appt.tokenNumber} created for ${patient.name || 'Patient'}.`,
    completed: true
  });

  if (mapped.currentStage >= 2) {
    timeline.push({
      time: '',
      title: 'Registration Completed',
      desc: 'Patient profile verified at front desk.',
      completed: true
    });
  } else {
    timeline.push({
      time: '',
      title: 'Registration',
      desc: 'Waiting for registration at front desk.',
      current: mapped.currentStage === 1
    });
  }

  if (mapped.currentStage >= 3) {
    timeline.push({
      time: '',
      title: 'Vitals Check Completed',
      desc: 'Preliminary vitals verified and logged by nurse.',
      completed: true
    });
  } else if (mapped.currentStage === 2) {
    timeline.push({
      time: '',
      title: 'Vitals Check',
      desc: 'Vitals recording in progress at triage nursing desk.',
      current: true
    });
  }

  if (mapped.currentStage >= 4) {
    timeline.push({
      time: '',
      title: 'Consultation Completed',
      desc: `Consultation with ${doctor.name || 'Doctor'} completed.`,
      completed: true
    });
  } else if (mapped.currentStage === 3) {
    timeline.push({
      time: '',
      title: 'With Doctor',
      desc: `Patient in consultation with ${doctor.name || 'Doctor'}.`,
      current: true
    });
  } else if (mapped.currentStage < 3) {
    timeline.push({
      time: 'Pending',
      title: 'Waiting for Doctor',
      desc: `Queue assignment to ${doctor.name || 'Doctor'}.`
    });
  }

  return {
    id: appt.tokenNumber || appt._id,
    _id: appt._id,
    patientId: patient.patientId || '',
    patientName: patient.name || 'Unknown Patient',
    ageGender: patient.age && patient.gender ? `${patient.age} Years / ${patient.gender}` : '',
    date: dateStr,
    dept: `${appt.department || ''} - OPD`,
    doctor: doctor.name || 'Duty Doctor',
    estimatedWait: appt.isEmergency ? 'Urgent' : '15 mins',
    peopleAhead: 0,
    appointmentTime: `${dateStr}, ${appt.appointmentTime || ''}`,
    room: 'Room ' + (Math.floor(Math.random() * 5) + 1),
    currentStage: mapped.currentStage,
    status: mapped.status,
    timeline
  };
};

const MyTokens = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  
  // Filters State for Past Tokens
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [searchToken, setSearchToken] = useState('');

  // Fetch tokens from API
  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const res = await nurseService.getPatientQueue({ limit: 50 });
      const appointments = res.data.data || [];
      const mapped = appointments.map(mapAppointmentToToken);
      setTokens(mapped);
      
      // Auto-select first active token
      const firstActive = mapped.find(t => t.status === 'Active');
      if (firstActive) {
        setSelectedTokenId(firstActive.id);
      } else if (mapped.length > 0) {
        setSelectedTokenId(mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
      toast.error('Failed to load patient tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Get active tokens in the queue
  const activeTokens = tokens.filter(t => t.status === 'Active');

  // Selected patient details from the state
  const activePatient = tokens.find(t => t.id === selectedTokenId) || activeTokens[0] || null;

  // Whether current patient can be actioned (only Active status patients in triage)
  const canTakeAction = activePatient && activePatient.status === 'Active' && activePatient.currentStage < 3;

  // Complete Vitals handler — calls the API to persist status, then updates local state
  const handleCompleteVitals = async (tokenId) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token?._id) {
      toast.error('Cannot find appointment to update.');
      return;
    }

    try {
      // Persist to backend: mark as vitals_done → triggers nurse controller to update DB + emit socket
      await nurseService.updateAppointmentStatus(token._id, 'vitals_done');
    } catch (err) {
      toast.error('Failed to update status on server.');
      return;
    }

    // Update local UI state after successful API call
    setTokens(prev => {
      const updated = prev.map(t => {
        if (t.id !== tokenId) return t;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const updatedTimeline = t.timeline
          .filter(item => item.time !== 'Pending')
          .map(item => {
            if (item.current) {
              return {
                ...item,
                current: false,
                completed: true,
                title: 'Vitals Check Completed',
                desc: 'Preliminary vitals verified and logged by nurse.',
                time: timeStr
              };
            }
            return item;
          });

        updatedTimeline.push({
          time: timeStr,
          title: 'Sent to Consultation',
          desc: `Patient assigned to ${t.doctor} in ${t.room}.`,
          completed: true
        });

        return { ...t, currentStage: 2, status: 'Completed', timeline: updatedTimeline };
      });

      const remaining = updated.filter(x => x.status === 'Active' && x.currentStage < 3);
      setTimeout(() => {
        setSelectedTokenId(remaining.length > 0 ? remaining[0].id : '');
      }, 1500);

      return updated;
    });

    toast.success(`Vitals completed for Token ${tokenId}!`);
  };

  // Mark Missed handler — calls API to cancel appointment, then updates local state
  const handleMarkMissed = async (tokenId) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token?._id) {
      toast.error('Cannot find appointment to update.');
      return;
    }

    try {
      await nurseService.updateAppointmentStatus(token._id, 'cancelled');
    } catch (err) {
      toast.error('Failed to update status on server.');
      return;
    }

    setTokens(prev => {
      const updated = prev.map(t => {
        if (t.id !== tokenId) return t;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const updatedTimeline = t.timeline
          .filter(item => item.time !== 'Pending')
          .map(item => {
            if (item.current) {
              return { ...item, current: false, completed: false };
            }
            return item;
          });

        updatedTimeline.push({
          time: timeStr,
          title: 'Token Missed',
          desc: 'Patient called multiple times. Marked as missed by nurse.',
          completed: true
        });

        return { ...t, currentStage: 2, status: 'Missed', timeline: updatedTimeline };
      });

      const remaining = updated.filter(x => x.status === 'Active' && x.currentStage < 3);
      setTimeout(() => {
        setSelectedTokenId(remaining.length > 0 ? remaining[0].id : '');
      }, 1500);

      return updated;
    });

    toast.warning(`Token ${tokenId} marked as Missed!`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTokens();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Token queue status refreshed!');
    }, 800);
  };

  const handleDownload = (tokenId) => {
    toast.success(`Token ${tokenId} slip downloaded successfully!`);
  };

  const handleContactReception = () => {
    toast.info('Connecting to Front Desk Reception...');
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-teal-50 text-[#0EA5A4] border border-teal-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Missed':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  // Filtered past history list
  const filteredPastTokens = tokens.filter(t => {
    // Show completed / missed / active depending on filter
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch = t.id.toLowerCase().includes(searchToken.toLowerCase()) || 
                          t.patientName.toLowerCase().includes(searchToken.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Patient Tokens
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            Track active patient queue status and progress.
          </p>
        </div>
      </div>

      {/* Patient Selector */}
      {activeTab === 'current' && activeTokens.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Patient Token to Track:</span>
          <div className="relative min-w-[320px]">
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-3 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-[#0EA5A4] focus:bg-white transition-all"
            >
              {activeTokens.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patientName} ({p.token || p.id} — {p.dept.split(' ')[0]})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2.5 p-1 bg-slate-100/50 rounded-2xl border border-[#E5E7EB] w-max">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'current' ? (
        activePatient ? (
          <div className="space-y-6">
            {/* Main Featured Current Token Card */}
            <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white overflow-hidden">
              <div className="p-8 space-y-8">
                {/* Token Info Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E5E7EB]">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                        {activePatient.status === 'Active' ? 'Active Patient Token' : activePatient.status === 'Completed' ? 'Vitals Completed' : 'Patient Missed'}
                      </span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        activePatient.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : activePatient.status === 'Missed' ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-teal-50 text-[#0EA5A4] border-teal-100'
                      }`}>{activePatient.status}</span>
                    </div>
                    <div className="text-5xl font-black text-[#0EA5A4] tracking-tight">{activePatient.id}</div>
                    
                    {/* Patient Info Sub-Panel */}
                    <div className="space-y-1 pt-1">
                      <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                        {activePatient.patientName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        ID: {activePatient.patientId} • {activePatient.ageGender}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-2 border-l border-none lg:border-l lg:border-[#E5E7EB] lg:pl-12 flex-1 max-w-[500px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Estimated Wait Time</span>
                      <span className="text-2xl font-black text-slate-900">{activePatient.estimatedWait}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">People Ahead</span>
                        <span className="text-2xl font-black text-slate-900">{activePatient.peopleAhead}</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-teal-50/60 text-[#0EA5A4] flex items-center justify-center shadow-sm select-none">
                        <Users size={22} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step Progress Tracker */}
                <div className="space-y-4">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Queue Progress</span>
                  <div className="relative flex items-center justify-between max-w-[800px] mx-auto py-4">
                    {/* Step Progress Connector Wrapper */}
                    <div className="absolute left-[5%] right-[5%] top-8 -translate-y-1/2 h-1 -z-0">
                      {/* Step Background Line */}
                      <div className="w-full h-full bg-slate-100 rounded" />
                      
                      {/* Active Step Progress Fill Line */}
                      <div 
                        className={`absolute left-0 top-0 h-full rounded transition-all duration-300 ${
                          activePatient.status === 'Missed' ? 'bg-red-400' : 'bg-[#0EA5A4]'
                        }`}
                        style={{ 
                          width: `${
                            activePatient.status === 'Missed'
                              ? (activePatient.currentStage <= 1 ? 0 : (activePatient.currentStage - 1) * 25)
                              : activePatient.currentStage <= 1 ? 0
                              : activePatient.currentStage === 2 ? 25
                              : 25
                          }%` 
                        }} 
                      />
                    </div>

                    {STAGES.map((s) => {
                      const isCompleted = activePatient.currentStage > s.num || (activePatient.status === 'Completed' && s.num === 2);
                      const isActive = activePatient.status === 'Active' && activePatient.currentStage === s.num;
                      const isMissed = activePatient.status === 'Missed' && activePatient.currentStage === s.num;
                      return (
                        <div key={s.num} className="flex flex-col items-center gap-2.5 z-10 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-xs font-bold transition-all duration-200 ${
                            isMissed
                              ? 'bg-red-500 text-white shadow-md animate-pulse ring-4 ring-red-500/10'
                              : isCompleted 
                                ? 'bg-emerald-500 text-white shadow-md' 
                                : isActive 
                                  ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-md ring-4 ring-teal-500/10' 
                                  : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {isMissed ? (
                              <X size={16} strokeWidth={3} className="stroke-white" />
                            ) : isCompleted ? (
                              <Check size={16} strokeWidth={3} className="stroke-white" />
                            ) : (
                              s.num
                            )}
                          </div>
                          <span className={`text-[11px] font-bold transition-all duration-200 ${
                            isMissed
                              ? 'text-red-500'
                              : isCompleted || isActive 
                                ? 'text-[#0EA5A4]' 
                                : 'text-slate-400'
                          }`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub Details Info Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 border border-[#E5E7EB] rounded-xl bg-slate-50/20">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Appointment Time</span>
                    <span className="text-sm font-bold text-slate-800">{activePatient.appointmentTime}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Doctor</span>
                    <span className="text-sm font-bold text-slate-800">{activePatient.doctor}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Counter / Room</span>
                    <span className="text-sm font-bold text-[#0EA5A4]">{activePatient.room}</span>
                  </div>
                </div>

                {/* Queue Actions Row */}
                <div className="pt-6 border-t border-[#E5E7EB]">
                  {canTakeAction ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Queue Actions:</span>
                      <Button
                        onClick={() => handleCompleteVitals(activePatient.id)}
                        className="px-6 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200 h-10 flex items-center justify-center gap-2"
                      >
                        <Check size={14} strokeWidth={3} />
                        Mark Completed
                      </Button>
                      <Button
                        onClick={() => handleMarkMissed(activePatient.id)}
                        variant="outline"
                        className="px-6 py-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 h-10 flex items-center justify-center gap-2"
                      >
                        <X size={14} strokeWidth={3} />
                        Mark Missed
                      </Button>
                    </div>
                  ) : activePatient.status === 'Completed' ? (
                    <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-50/80 to-teal-50/30 border border-emerald-100/80 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Check size={18} strokeWidth={3} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-extrabold text-emerald-950">Vitals Check Completed</p>
                        <p className="text-xs text-emerald-700/90 font-medium">The patient's vital records have been successfully saved and logged. Forwarding to doctor consultation.</p>
                      </div>
                    </div>
                  ) : activePatient.status === 'Missed' ? (
                    <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-rose-50/80 to-amber-50/30 border border-rose-100/80 rounded-2xl text-rose-800 text-xs font-bold shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
                        <X size={18} strokeWidth={3} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-extrabold text-rose-950">Patient Marked as Missed</p>
                        <p className="text-xs text-rose-700/90 font-medium">The patient was not present for vital checks. Token status updated to Missed.</p>
                      </div>
                    </div>
                  ) : null}
                </div>

              </div>
            </Card>

            {/* Secondary Details & Panels Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Timeline */}
              <Card className="lg:col-span-2 p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                  <h3 className="text-base font-extrabold text-slate-900">Status Timeline</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Updates</span>
                </div>

                <div className="relative pl-6 space-y-6 border-l border-slate-200 ml-3">
                  {activePatient.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {item.completed ? (
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-50 border border-white flex items-center justify-center">
                          <Check size={8} strokeWidth={4} className="text-white" />
                        </div>
                      ) : item.current ? (
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#0EA5A4] ring-4 ring-teal-50 border border-white" />
                      ) : (
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-200 border border-white" />
                      )}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className={`text-xs font-bold ${item.current ? 'text-[#0EA5A4]' : 'text-slate-800'}`}>{item.title}</h4>
                          <p className={`text-[11px] ${item.current ? 'text-slate-600 font-semibold' : 'text-slate-500 font-medium'}`}>{item.desc}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${item.current ? 'text-[#0EA5A4]' : 'text-slate-400'} whitespace-nowrap`}>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions and Notification Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions Panel */}
                <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-[#E5E7EB]">Quick Actions</h3>
                  <div className="flex flex-col gap-2.5">
                    <Button 
                      onClick={handleRefresh}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-[#E5E7EB] text-slate-700 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 rounded-xl text-xs font-bold transition-all cursor-pointer h-10"
                    >
                      <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      Refresh Status
                    </Button>
                    <Button 
                      onClick={() => handleDownload(activePatient.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-[#E5E7EB] text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer h-10"
                    >
                      <Download size={14} />
                      Download Token
                    </Button>
                    <Button 
                      onClick={handleContactReception}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#0EA5A4] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer h-10"
                    >
                      <PhoneCall size={14} />
                      Contact Reception
                    </Button>
                  </div>
                </Card>

                {/* Notifications Alert Panel */}
                <Card className="p-6 border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-[#E5E7EB] flex items-center justify-between">
                    <span>Token Alerts</span>
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 text-[10px] font-bold flex items-center justify-center shadow-sm">3</span>
                  </h3>
                  
                  <div className="space-y-3.5">
                    {/* Alert 1 */}
                    <div className="flex gap-3 p-3 bg-red-50/30 border border-red-100/50 rounded-xl">
                      <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-slate-800">Queue Update</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Doctor Consultation is running 5 minutes delayed.</p>
                      </div>
                    </div>

                    {/* Alert 2 */}
                    <div className="flex gap-3 p-3 bg-teal-50/30 border border-teal-100/50 rounded-xl">
                      <Volume2 size={15} className="text-[#0EA5A4] shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-slate-800">Room Call Alert</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Please proceed to {activePatient.room} after vitals are recorded.</p>
                      </div>
                    </div>

                    {/* Alert 3 */}
                    <div className="flex gap-3 p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl">
                      <Bell size={15} className="text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-slate-800">Upcoming Visit Reminder</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Remember to bring previous prescription copies.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <Card className="p-12 border border-[#E5E7EB] rounded-[20px] text-center bg-white text-slate-400 font-semibold text-sm">
            No active patient tokens found in queue.
          </Card>
        )
      ) : (
        /* Past Tokens History tab */
        <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white overflow-hidden">
          <div className="space-y-0">
            {/* Filter Bar */}
            <div className="p-6 border-b border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
              <div className="flex flex-wrap items-center gap-3 flex-1 max-w-[720px]">
                {/* Search Token */}
                <div className="relative flex-1 min-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={15} />
                  </span>
                  <input
                    type="text"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="Search Token or Patient..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-2 focus:ring-teal-500/10 transition-all"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors"
                  >
                    <option value="All">All Tokens</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Missed">Missed</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors"
                  >
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Tokens History Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-slate-50/50">
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Token No</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Patient</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Date</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Department</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Doctor</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Status</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 px-6 select-none">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredPastTokens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold text-sm">
                        No active or past tokens found.
                      </td>
                    </tr>
                  ) : (
                    filteredPastTokens.map((token) => (
                      <tr key={token.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-3.5 px-6 text-sm font-bold text-[#0EA5A4]">{token.id}</td>
                        <td className="py-3.5 px-6 text-sm font-bold text-slate-800">{token.patientName}</td>
                        <td className="py-3.5 px-6 text-sm font-semibold text-slate-700">{token.date}</td>
                        <td className="py-3.5 px-6 text-sm font-semibold text-slate-600">{token.dept}</td>
                        <td className="py-3.5 px-6 text-sm font-semibold text-slate-700">{token.doctor}</td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeStyle(token.status)}`}>
                            {token.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedTokenId(token.id);
                                setActiveTab('current');
                              }}
                              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 transition-all duration-200 cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDownload(token.id)}
                              className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-200 cursor-pointer"
                              title="Download Slip"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MyTokens;
