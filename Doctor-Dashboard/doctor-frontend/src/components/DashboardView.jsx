import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Stethoscope, 
  ClipboardCheck, 
  UserPlus, 
  Calendar, 
  ChevronDown 
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

export default function DashboardView({ onDiagnosePatient, onQueueFetched, setActiveTab }) {
  const { user } = useAuth();
  const rawName = user?.fullName || user?.name || 'Arjun';
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

  const [stats, setStats] = useState({
    patientsInQueue: 0,
    todayConsultations: 0,
    completedToday: 0,
    followUps: 0
  });

  const [schedule, setSchedule] = useState([]);

  const [chartData, setChartData] = useState({
    total: 0,
    data: []
  });

  const [loading, setLoading] = useState(true);

  // Fetch all stats, schedule, and chart data from the backend APIs
  const fetchDashboardData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('doctor_token')}`
      };

      // VITE_API_BASE_URL already includes /api (e.g. https://backend.vercel.app/api)
      // Strip trailing /api to get the host, then re-append full paths
      const envBase = import.meta.env.VITE_API_BASE_URL || '';
      const host = envBase.replace(/\/api$/, '');   // '' locally → Vite proxy handles /api/...

      const [statsRes, scheduleRes, chartRes] = await Promise.all([
        axios.get(`${host}/api/doctor/dashboard/stats`, { headers }),
        axios.get(`${host}/api/doctor/dashboard/schedule`, { headers }),
        axios.get(`${host}/api/doctor/dashboard/chart`, { headers })
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (scheduleRes.data) {
        setSchedule(scheduleRes.data);
        if (onQueueFetched) {
          onQueueFetched(scheduleRes.data);
        }
      }
      if (chartRes.data) {
        setChartData(chartRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard API data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen to custom window events triggered by Socket.IO
    const handleRefresh = () => {
      console.log('🔄 Socket event received: refreshing dashboard data...');
      fetchDashboardData();
    };

    window.addEventListener('dashboard_refresh', handleRefresh);
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      window.removeEventListener('dashboard_refresh', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5]">
            In Progress
          </span>
        );
      case 'waiting':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
            Waiting
          </span>
        );
      case 'completed':
      case 'consultation_done':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#F0FDFA] text-[#0F9D8A] border border-[#CCFBF1]">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans overflow-y-auto">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Dashboard</h1>
          <p className="text-sm text-[#64748B] mt-1">Welcome back, {displayName}! Here's your overview.</p>
        </div>
        {/* Date Selector Card */}
        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] hover:border-slate-300 transition-all rounded-2xl px-5 py-3 shadow-sm w-fit">
          <span className="text-sm font-semibold text-[#0B1F3A]">
            {format(new Date(), 'd MMM yyyy, EEEE')}
          </span>
          <Calendar className="w-4 h-4 text-[#94a3b8]" />
        </div>
      </div>

      {/* Top 4 Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Patients in Queue */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[155px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981] shrink-0">
              <Users className="w-[18px] h-[18px]" />
            </div>
            <span className="text-sm font-semibold text-[#64748B]">Patients in Queue</span>
          </div>
          <div className="mt-4 flex flex-col text-left">
            <span className="text-3xl font-bold text-[#0B1F3A]">{loading ? '—' : stats.patientsInQueue}</span>
            <button 
              onClick={() => setActiveTab('consultations')}
              className="text-xs font-bold text-[#0F9D8A] hover:underline mt-2 text-left"
            >
              View Queue
            </button>
          </div>
        </div>

        {/* Card 2: Today's Consultations */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[155px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
              <Stethoscope className="w-[18px] h-[18px]" />
            </div>
            <span className="text-sm font-semibold text-[#64748B]">Today's Consultations</span>
          </div>
          <div className="mt-4 flex flex-col text-left">
            <span className="text-3xl font-bold text-[#0B1F3A]">{loading ? '—' : stats.todayConsultations}</span>
            <button 
              onClick={() => setActiveTab('consultations')}
              className="text-xs font-bold text-[#0F9D8A] hover:underline mt-2 text-left"
            >
              View All
            </button>
          </div>
        </div>

        {/* Card 3: Completed Today */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[155px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED] shrink-0">
              <ClipboardCheck className="w-[18px] h-[18px]" />
            </div>
            <span className="text-sm font-semibold text-[#64748B]">Completed Today</span>
          </div>
          <div className="mt-4 flex flex-col text-left">
            <span className="text-3xl font-bold text-[#0B1F3A]">{loading ? '—' : stats.completedToday}</span>
            <button 
              onClick={() => setActiveTab('records')}
              className="text-xs font-bold text-[#0F9D8A] hover:underline mt-2 text-left"
            >
              View All
            </button>
          </div>
        </div>

        {/* Card 4: Follow-ups */}
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[155px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#EA580C] shrink-0">
              <UserPlus className="w-[18px] h-[18px]" />
            </div>
            <span className="text-sm font-semibold text-[#64748B]">Follow-ups</span>
          </div>
          <div className="mt-4 flex flex-col text-left">
            <span className="text-3xl font-bold text-[#0B1F3A]">{loading ? '—' : stats.followUps}</span>
            <button 
              onClick={() => setActiveTab('consultations')}
              className="text-xs font-bold text-[#0F9D8A] hover:underline mt-2 text-left"
            >
              View All
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Today's Schedule Card */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col h-[460px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0B1F3A]">Today's Schedule</h2>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E5E7EB] hover:border-slate-300 rounded-xl text-xs font-semibold text-[#64748B] transition-all">
              <span>This Week</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="pb-3 text-xs font-bold text-[#64748B] uppercase tracking-wider">Time</th>
                  <th className="pb-3 text-xs font-bold text-[#64748B] uppercase tracking-wider pl-4">Patient Name</th>
                  <th className="pb-3 text-xs font-bold text-[#64748B] uppercase tracking-wider pl-4">Visit Type</th>
                  <th className="pb-3 text-xs font-bold text-[#64748B] uppercase tracking-wider pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-sm text-[#64748B] font-semibold">
                      {loading ? 'Loading schedule...' : 'No appointments scheduled for today'}
                    </td>
                  </tr>
                ) : (
                  schedule.map((item, idx) => (
                    <tr key={item._id || item.id || idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-4 text-sm font-semibold text-[#64748B]">{item.time}</td>
                      <td className="py-4 text-sm font-bold text-[#0B1F3A] pl-4">{item.patientName}</td>
                      <td className="py-4 text-sm font-semibold text-[#64748B] pl-4">{item.visitType}</td>
                      <td className="py-4 pl-4">{getStatusBadge(item.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-[#F1F5F9] mt-auto">
            <button 
              onClick={() => setActiveTab('consultations')}
              className="text-sm font-bold text-[#005AE2] hover:underline"
            >
              View Full Schedule
            </button>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-[20px] p-6 shadow-sm flex flex-col h-[460px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0B1F3A]">Quick Stats</h2>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E5E7EB] hover:border-slate-300 rounded-xl text-xs font-semibold text-[#64748B] transition-all">
              <span>This Week</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Donut Chart & Legend */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-8 flex-1">
            {/* Recharts Donut Pie — fixed 192×192 to prevent width/height=-1 warning */}
            <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
              <PieChart width={192} height={192}>
                <Pie
                  data={chartData.data?.length ? chartData.data : [{ name: 'No data', value: 1, color: '#E2E8F0' }]}
                  cx={96}
                  cy={96}
                  innerRadius={64}
                  outerRadius={80}
                  paddingAngle={chartData.data?.length ? 3 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {(chartData.data?.length ? chartData.data : [{ color: '#E2E8F0' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total</span>
                <span className="text-3xl font-extrabold text-[#0B1F3A] mt-0.5">{chartData.total ?? '—'}</span>
              </div>
            </div>

            {/* Legend Vertical List */}
            <div className="flex flex-col gap-4 w-full sm:max-w-[190px]">
              {(chartData.data || []).map((segment, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="font-semibold text-[#64748B]">{segment.name}</span>
                  </div>
                  <span className="font-bold text-[#0B1F3A]">
                    {segment.value} ({segment.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
