import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { nurseService } from '../../services/nurseService';
import { CardSkeleton } from '../../components/nurse/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';
import config from '../../config';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Users, 
  Activity, 
  UserCheck, 
  Calendar, 
  ChevronDown, 
  Heart, 
  Briefcase, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const ACTIVITY_ICONS = { check_in: '🏥', vitals: '❤️', update: '📋', emergency: '🚨' };

const DashboardHome = () => {
  const { user }               = useAuth();
  const { queueUpdateTime }    = useNotifications();
  const navigate               = useNavigate();
  const [data, setData]        = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const [filter, setFilter]    = useState('Today');
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');
      const res = await nurseService.getDashboard();
      setData(res.data.data);
    } catch {
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard, queueUpdateTime]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.stats || {};

  // Map values dynamically from backend, fallback to 0
  const patientsInQueue = stats.waitingForVitals ?? 0;
  const vitalsCompleted = stats.vitalsCompleted ?? 0;
  const pendingToDoctor = (stats.activeAppointments != null && stats.completedConsultations != null)
    ? Math.max(0, stats.activeAppointments - stats.completedConsultations)
    : 0;
  const totalPatients = stats.totalPatientsToday ?? 0;

  // Format today's date
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Patient flow chart data from backend
  const fallbackChartData = [
    { hour: '8 AM', patients: 0 },
    { hour: '10 AM', patients: 0 },
    { hour: '12 PM', patients: 0 },
    { hour: '2 PM', patients: 0 },
    { hour: '4 PM', patients: 0 },
    { hour: '6 PM', patients: 0 }
  ];

  const rawFlow = data?.charts?.hourlyFlow || [];
  const chartData = rawFlow.length > 0
    ? [8, 10, 12, 14, 16, 18].map(h => {
        const foundCurrent = rawFlow.find(item => parseInt(item.hour.split(':')[0], 10) === h);
        const foundNext = rawFlow.find(item => parseInt(item.hour.split(':')[0], 10) === h + 1);
        const patientsCount = (foundCurrent ? foundCurrent.patients : 0) + (foundNext ? foundNext.patients : 0);

        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 12 ? '12 PM' : h === 0 ? '12 AM' : `${h % 12} ${ampm}`;
        return { hour: displayHour, patients: patientsCount };
      })
    : fallbackChartData;

  // Dynamic values from user profile and API
  const displayName = user?.name || 'Nurse';
  const departmentName = user?.department || 'General Medicine';
  const doctorOnDuty = data?.doctorOnDuty || 'Loading...';
  const opdTiming = data?.opdTiming || config.opdTiming;

  return (
    <div className="space-y-8">
      {/* Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            Welcome back, {displayName} 👋
          </p>
        </div>
        
        {/* Date Selector Button */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-slate-700 text-sm font-semibold shadow-sm shrink-0 self-start md:self-center">
          <span>{formattedDate}</span>
          <Calendar size={18} className="text-slate-500" />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} height={140} />)
        ) : (
          <>
            {/* Card 1: Patients in Queue */}
            <Card className="hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[145px] p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Patients in Queue</span>
                  <div className="text-4xl font-extrabold text-[#F97316] leading-none">{patientsInQueue}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-teal-50/50 text-[#0EA5A4] flex items-center justify-center transition-colors group-hover:bg-teal-50">
                  <Users size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate('/patient-queue')}
                  className="text-xs text-[#0EA5A4] font-bold hover:text-[#0F766E] transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none p-0"
                >
                  View Queue
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </Card>

            {/* Card 2: Vitals Completed */}
            <Card className="hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[145px] p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vitals Completed</span>
                  <div className="text-4xl font-extrabold text-slate-900 leading-none">{vitalsCompleted}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-50/50 text-[#F97316] flex items-center justify-center transition-colors group-hover:bg-orange-50">
                  <Heart size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-400 font-semibold">Today</span>
              </div>
            </Card>

            {/* Card 3: Pending to Doctor */}
            <Card className="hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[145px] p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending to Doctor</span>
                  <div className="text-4xl font-extrabold text-[#0EA5A4] leading-none">{pendingToDoctor}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-cyan-50/50 text-cyan-600 flex items-center justify-center transition-colors group-hover:bg-cyan-50">
                  <Briefcase size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate('/patient-queue')}
                  className="text-xs text-[#0EA5A4] font-bold hover:text-[#0F766E] transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none p-0"
                >
                  Send to Doctor
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </Card>

            {/* Card 4: Total Patients */}
            <Card className="hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[145px] p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Patients</span>
                  <div className="text-4xl font-extrabold text-slate-900 leading-none">{totalPatients}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50/50 text-[#10B981] flex items-center justify-center transition-colors group-hover:bg-emerald-50">
                  <UserCheck size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-400 font-semibold">Today</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column: Today's Overview Chart */}
        <Card className="lg:col-span-7 p-6 flex flex-col justify-between min-h-[360px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 leading-none">Today's Overview</h3>
            
            {/* Custom Dropdown Filter */}
            <div className="relative inline-block text-left">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-[#E5E7EB] rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>{filter}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </Button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-32 rounded-lg border border-[#E5E7EB] bg-white shadow-md z-40 py-1 text-xs">
                  {['Today', 'Weekly', 'Monthly'].map(opt => (
                    <div
                      key={opt}
                      onClick={() => { setFilter(opt); setFilterOpen(false); }}
                      className={`px-3 py-2 cursor-pointer font-semibold ${opt === filter ? 'text-[#0EA5A4] bg-teal-50/30' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-[250px] w-full" />
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartTealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }}
                    dx={-10}
                    domain={[0, 'dataMax + 6']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      fontSize: '12px',
                      color: '#0F172A',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    formatter={(v) => [v, 'Patients']}
                  />
                  <Area
                    type="monotone"
                    dataKey="patients"
                    stroke="#0EA5A4"
                    strokeWidth={3}
                    fill="url(#chartTealGrad)"
                    dot={{ r: 4, fill: '#0EA5A4', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#0EA5A4', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Right Column: Doctor Info Card */}
        <Card className="lg:col-span-3 flex flex-col justify-center p-8 gap-6 border border-[#E5E7EB]">
          {/* Department */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Department
            </div>
            <div className="text-[16px] font-bold text-slate-900">
              {departmentName}
            </div>
          </div>
          
          <div className="h-[1px] bg-[#E5E7EB] w-full" />

          {/* Doctor On Duty */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Doctor On Duty
            </div>
            <div className="text-[16px] font-bold text-slate-900">
              {doctorOnDuty}
            </div>
          </div>
          
          <div className="h-[1px] bg-[#E5E7EB] w-full" />

          {/* OPD Time */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              OPD Time
            </div>
            <div className="text-[16px] font-bold text-slate-900">
              {opdTiming}
            </div>
          </div>
        </Card>
      </div>

      {/* Supplementary Section: Recent Activities */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900">🕐 Recent Activities</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/patient-queue')}
            className="text-xs font-bold text-[#0EA5A4] border-[#E5E7EB] hover:bg-slate-50 cursor-pointer"
          >
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="skeleton w-10 h-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.recentActivities?.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No recent activities</div>
              <div className="empty-state-text">Patient activities will appear here</div>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] -mb-4">
              {data.recentActivities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => navigate(`/appointment/${activity.id}`)}
                  className="flex gap-4 py-4 items-start cursor-pointer hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    activity.isEmergency ? 'bg-rose-50 text-[#EF4444]' : 'bg-teal-50/30 text-[#0EA5A4]'
                  }`}>
                    {activity.isEmergency ? '🚨' : ACTIVITY_ICONS[activity.type] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="font-bold text-[14px] text-slate-900 truncate">{activity.patientName}</div>
                      <div className="text-[11px] text-slate-400 font-semibold shrink-0">
                        {new Date(activity.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {activity.department} • {activity.doctor}
                    </div>
                    <div className="mt-2.5">
                      <span className={`badge status-${activity.status}`}>{activity.status?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
