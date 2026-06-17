import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  ClipboardList,
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Eye, 
  Edit, 
  User, 
  ArrowRight,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Toggles for charts
  const [apptTimeframe, setApptTimeframe] = useState('daily'); // daily, weekly, monthly
  const [revenueTimeframe, setRevenueTimeframe] = useState('daily'); // daily, monthly, yearly

  // Activity Feed state
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await API.get('/dashboard/stats');
        if (res.data.success) {
          setData(res.data.data);
          setActivities(res.data.data.recentActivities || []);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Setup real-time socket events for Dashboard
    socket.connect();
    socket.emit('join_admin_room');

    socket.on('appointment_update', (appt) => {
      // Refresh statistics or append to activities
      const newAct = {
        _id: `act-socket-${Date.now()}`,
        action: 'Appointment Booked/Updated',
        module: 'Appointments',
        description: `Appointment for ${appt.patient?.name || 'Patient'} status changed to: ${appt.status}`,
        createdAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    });

    socket.on('new_patient', (patient) => {
      const newAct = {
        _id: `act-socket-${Date.now()}`,
        action: 'Patient Checked In',
        module: 'Patients',
        description: `New patient registered: ${patient.name}`,
        createdAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    });

    socket.on('pharmacy_order_update', (order) => {
      const newAct = {
        _id: `act-socket-${Date.now()}`,
        action: 'Prescription/Pharmacy Update',
        module: 'Pharmacy',
        description: `Pharmacy order status changed to ${order.status} for ${order.patient?.name || 'Patient'}`,
        createdAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    });

    socket.on('lab_test_update', (test) => {
      const newAct = {
        _id: `act-socket-${Date.now()}`,
        action: 'Lab Test Update',
        module: 'Laboratory',
        description: `Lab test '${test.testName}' marked: ${test.status}`,
        createdAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    });

    socket.on('payment_update', (payment) => {
      const newAct = {
        _id: `act-socket-${Date.now()}`,
        action: 'Payment Received',
        module: 'Billing',
        description: `Invoice ${payment.invoiceNumber} payment received ($${payment.totalAmount})`,
        createdAt: new Date().toISOString()
      };
      setActivities(prev => [newAct, ...prev].slice(0, 10));
    });

    return () => {
      socket.off('appointment_update');
      socket.off('new_patient');
      socket.off('pharmacy_order_update');
      socket.off('lab_test_update');
      socket.off('payment_update');
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, departmentWise, appointmentTrends, revenueTrends, portalData, recentAppointments, todayOverview } = data;

  // Mini helper to render sparkline area graphs in widgets
  const renderSparkline = (trendData) => {
    if (!trendData || !Array.isArray(trendData) || trendData.length === 0) return null;
    // Recharts expects array of objects
    const formattedData = trendData.map((val, i) => ({ id: i, value: val }));
    return (
      <div className="w-24 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#0F9D8A" 
              fill="rgba(15, 157, 138, 0.1)" 
              strokeWidth={1.5} 
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const widgetCards = [
    { 
      title: 'Total Patients', 
      count: stats.totalPatients.count.toLocaleString(), 
      change: stats.totalPatients.change, 
      icon: Users,
      trend: stats.totalPatients.trend,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    { 
      title: "Today's Appointments", 
      count: stats.todayAppointments.count.toLocaleString(), 
      change: stats.todayAppointments.change, 
      icon: Calendar,
      trend: stats.todayAppointments.trend,
      bg: 'bg-sky-50 text-sky-600 border-sky-100'
    },
    { 
      title: 'Patient Queue', 
      count: stats.patientQueue.count.toLocaleString(), 
      change: stats.patientQueue.change, 
      icon: ClipboardList,
      trend: stats.patientQueue.trend,
      bg: 'bg-rose-50 text-rose-600 border-rose-100'
    },
    { 
      title: 'Active Doctors', 
      count: stats.activeDoctors.count.toLocaleString(), 
      change: stats.activeDoctors.change, 
      icon: UserCheck,
      trend: stats.activeDoctors.trend,
      bg: 'bg-purple-50 text-purple-600 border-purple-100'
    },
    { 
      title: 'Pharmacy Orders', 
      count: stats.pharmacyOrders.count.toLocaleString(), 
      change: stats.pharmacyOrders.change, 
      icon: ShoppingCart,
      trend: stats.pharmacyOrders.trend,
      bg: 'bg-amber-50 text-amber-600 border-amber-100'
    },
    { 
      title: "Today's Revenue", 
      count: `$${stats.todayRevenue.count.toLocaleString()}`, 
      change: stats.todayRevenue.change, 
      icon: DollarSign,
      trend: stats.todayRevenue.trend,
      bg: 'bg-teal-50 text-teal-600 border-teal-100'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hospital Activity Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time status monitor of {import.meta.env.VITE_HOSPITAL_NAME || data.hospitalName || 'Hospital'} clinical operations.</p>
      </div>

      {/* Widget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {widgetCards.map((w) => {
          const Icon = w.icon;
          const isPositive = typeof w.change === 'number' && w.change >= 0;
          return (
            <div key={w.title} className="flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-card shadow-sm hover:shadow-md hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl border ${w.bg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {renderSparkline(w.trend)}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{w.title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-slate-800 tracking-tight">{w.count}</span>
                  {typeof w.change === 'number' && (
                    <span className={`flex items-center text-[10px] font-bold ${
                      isPositive ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {Math.abs(w.change)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department Wise Pie Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Department Wise Overview</h3>
            <p className="text-[11px] text-slate-400">Distribution of patient engagements</p>
          </div>
          <div className="h-[200px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentWise}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {departmentWise.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{departmentWise.reduce((sum, d) => sum + (d.value || 0), 0)}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-4 border-t border-slate-100">
            {departmentWise.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Trend Line Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Appointment Trend</h3>
              <p className="text-[11px] text-slate-400">Total appointments booked over time</p>
            </div>
            {/* Timeframe Select Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['daily', 'weekly', 'monthly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setApptTimeframe(t)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md capitalize transition-all ${
                    apptTimeframe === t 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentTrends[apptTimeframe]}>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0F9D8A" 
                  strokeWidth={2.5}
                  dot={{ r: 4, stroke: '#0F9D8A', strokeWidth: 1, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Overview Bar Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Revenue Overview</h3>
              <p className="text-[11px] text-slate-400">Overall collection statistics</p>
            </div>
            {/* Timeframe Select Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['daily', 'monthly', 'yearly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setRevenueTimeframe(t)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md capitalize transition-all ${
                    revenueTimeframe === t 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrends[revenueTimeframe]}>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} width={35} />
                <Tooltip formatter={(value) => `$${value}`} />
                <Bar 
                  dataKey="revenue" 
                  fill="#0F9D8A" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portal Cards Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">User Portal Access Nodes</h3>
          <p className="text-xs text-slate-400 mt-0.5">Quick summaries and control hubs for system sub-dashboards</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {portalData.map((portal) => (
            <div key={portal.name} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] transition-all">
              <div>
                <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${portal.color} mb-3`}></span>
                <h4 className="text-sm font-bold text-slate-800 leading-tight">{portal.name}</h4>
                <div className="flex items-center gap-6 mt-4">
                  <div>
                    <span className="text-xs text-slate-400">Active Users</span>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{portal.activeUsers}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Pending Tasks</span>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{portal.pendingTasks}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button 
                  onClick={() => toast.info(`Quick action triggered for ${portal.name}`)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                >
                  Quick Action
                </button>
                <Link
                  to={`/admin/user-management?role=${
                    portal.name.toUpperCase().replace(' PORTAL', '').replace('RECEPTION', 'RECEPTIONIST').replace('LAB', 'LAB_TECHNICIAN').replace('NURSE', 'NURSE').replace('PHARMACY', 'PHARMACIST')
                  }`}
                  className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg text-center transition-all block"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Layout Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Appointments Table */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Appointments</h3>
              <p className="text-[11px] text-slate-400">Latest scheduled patient visits</p>
            </div>
            <Link to="/admin/appointments" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
              <span>See All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3 font-semibold">Patient Name</th>
                  <th className="pb-3 font-semibold">Doctor</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">No recent appointments found</td>
                  </tr>
                ) : (
                  recentAppointments.map((appt) => (
                    <tr key={appt.id || appt._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                      <td className="py-3 font-semibold text-slate-700">{appt.patient?.name || 'Unknown Patient'}</td>
                      <td className="py-3 text-slate-500">{appt.doctor?.name || 'Unassigned Doctor'}</td>
                      <td className="py-3 text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-600">
                          {appt.department}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(appt.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          appt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          appt.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Overview Details Card */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Today's Overview</h3>
            <p className="text-[11px] text-slate-400">Key operations checklist stats today</p>
          </div>
          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            {[
              { label: 'New Patients Checked-in', value: todayOverview.newPatients, color: 'bg-emerald-500' },
              { label: 'Follow-up Visits Scheduled', value: todayOverview.followUpVisits, color: 'bg-sky-500' },
              { label: 'Lab Tests Sampled', value: todayOverview.labTests, color: 'bg-purple-500' },
              { label: 'Discharged Patients Left', value: todayOverview.dischargedPatients, color: 'bg-indigo-500' },
              { label: 'Pharmacy Sales Fulfilled', value: todayOverview.pharmacySales, color: 'bg-amber-500' }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-200/55">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                  <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Activity Feed</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Real-time socket.io log tracker</p>
          </div>
          <div className="flex-1 mt-4 overflow-y-auto max-h-[250px] space-y-3 pr-2 scrollbar-none">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No recent activity logs available</p>
            ) : (
              activities.map((act) => (
                <div key={act.id || act._id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/30 p-1 rounded transition-all">
                  <div className="p-1 rounded bg-slate-100 text-slate-500 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{act.action}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-snug">{act.description}</p>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
