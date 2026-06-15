import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  RefreshCcw, 
  CheckCircle, 
  Truck, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../../services/api';
import { socket } from '../../sockets/socket';
import { format } from 'date-fns';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#6B7280']; // Pending, Processing, Ready, Delivered

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/orders/stats/dashboard');
      setStats(res.data);
      
      const ordersRes = await api.get('/api/orders?limit=5');
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
    
    socket.connect();
    socket.on('orderStatusUpdated', () => {
      fetchStats();
    });

    return () => {
      socket.off('orderStatusUpdated');
      socket.disconnect();
    };
  }, []);

  const pieData = [
    { name: 'Pending', value: stats.pendingOrders },
    { name: 'Processing', value: stats.processingOrders },
    { name: 'Ready', value: stats.readyOrders },
    { name: 'Delivered', value: stats.deliveredOrders },
  ];

  const lineData = [
    { name: '01 May', orders: 12 },
    { name: '02 May', orders: 19 },
    { name: '03 May', orders: 15 },
    { name: '04 May', orders: 22 },
    { name: '05 May', orders: 28 },
    { name: '06 May', orders: 25 },
    { name: '07 May', orders: 32 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</h3>
            <p className="text-xs text-amber-500 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> Requires attention</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500">Processing Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.processingOrders}</h3>
            <p className="text-xs text-blue-500 mt-1 flex items-center"><RefreshCcw className="w-3 h-3 mr-1"/> Currently packing</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
            <RefreshCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500">Ready Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.readyOrders}</h3>
            <p className="text-xs text-emerald-500 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> Waiting for pickup</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-medium text-gray-500">Delivered Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.deliveredOrders}</h3>
            <p className="text-xs text-emerald-500 mt-1 flex items-center"><Truck className="w-3 h-3 mr-1"/> Completed today</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Order Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="orders" stroke="#0F766E" strokeWidth={3} dot={{r: 4, fill: '#0F766E'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Status</h3>
          <div className="h-64 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">{stats.totalOrders}</span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          <Link to="/history" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Token Number</th>
                <th className="px-6 py-3 font-medium">Patient Name</th>
                <th className="px-6 py-3 font-medium">Doctor Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.tokenNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.patientId?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.prescriptionId?.doctorName || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${order.status === 'Pending' ? 'bg-amber-100 text-amber-800' : ''}
                      ${order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : ''}
                      ${order.status === 'Packed' ? 'bg-indigo-100 text-indigo-800' : ''}
                      ${order.status === 'Ready' ? 'bg-emerald-100 text-emerald-800' : ''}
                      ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : ''}
                    `}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(order.createdAt), 'hh:mm a')}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No recent orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
