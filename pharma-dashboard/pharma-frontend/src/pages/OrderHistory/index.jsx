import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Calendar, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { format } from 'date-fns';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default date range: last 90 days → today so recent orders always appear
  const todayStr = new Date().toISOString().split('T')[0];
  const ninetyDaysAgoStr = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filters state
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [startDate, setStartDate] = useState(ninetyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Applied date range
  const [appliedStartDate, setAppliedStartDate] = useState(ninetyDaysAgoStr);
  const [appliedEndDate, setAppliedEndDate] = useState(todayStr);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/orders');
        setOrders(res.data || []);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setShowDatePicker(false);
  };

  const handleResetFilters = () => {
    setStatusFilter('All Status');
    setStartDate(ninetyDaysAgoStr);
    setEndDate(todayStr);
    setAppliedStartDate(ninetyDaysAgoStr);
    setAppliedEndDate(todayStr);
    setShowDatePicker(false);
  };

  // Format YYYY-MM-DD date string to "01 May 2025" style
  const formatDateRangeDisplay = (start, end) => {
    if (!start || !end) return 'Select Date Range';
    const opt = { day: '2-digit', month: 'short', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('en-GB', opt);
    const e = new Date(end).toLocaleDateString('en-GB', opt);
    return `${s} - ${e}`;
  };

  // Apply filters to orders
  const filteredOrders = orders.filter((order) => {
    // 1. Status Filter
    if (statusFilter !== 'All Status' && order.status !== statusFilter) {
      return false;
    }
    // 2. Date Range Filter
    const orderDate = order.createdAt ? order.createdAt.split('T')[0] : '';
    if (appliedStartDate && orderDate < appliedStartDate) {
      return false;
    }
    if (appliedEndDate && orderDate > appliedEndDate) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Order History</h1>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Status Dropdown */}
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-[#6B7280] uppercase mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[42px] px-3.5 bg-white border border-[#E5E7EB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] transition-all"
            >
              <option value="All Status">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Packed">Packed</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          {/* Date Picker Popover */}
          <div className="relative flex flex-col min-w-[240px]">
            <label className="text-xs font-semibold text-[#6B7280] uppercase mb-1.5">Date Range</label>
            <div
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center justify-between h-[42px] px-3.5 bg-white border border-[#E5E7EB] rounded-[10px] text-sm text-[#374151] cursor-pointer hover:border-[#0F9D8A] transition-all"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-[#6B7280]" />
                <span className="font-medium">{formatDateRangeDisplay(startDate, endDate)}</span>
              </div>
            </div>

            {showDatePicker && (
              <div className="absolute top-[70px] left-0 z-50 p-4 bg-white border border-[#E5E7EB] rounded-[12px] shadow-xl space-y-3 min-w-[280px]">
                <div className="text-xs font-bold text-gray-800">Select Date Range</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:border-[#0F9D8A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:border-[#0F9D8A]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3.5 py-1.5 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white rounded-[8px] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            className="h-[42px] px-4 border border-[#E5E7EB] rounded-[10px] text-sm text-[#374151] hover:bg-[#F3F4F6] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          {/* Apply Filters Button */}
          <button
            onClick={handleApplyFilters}
            className="h-[42px] px-5 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white rounded-[10px] text-sm font-semibold transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer flex items-center justify-center"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-medium">No orders found matching the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-medium">Token Number</th>
                  <th className="px-6 py-4 font-medium">Patient Name</th>
                  <th className="px-6 py-4 font-medium">Doctor Name</th>
                  <th className="px-6 py-4 font-medium text-center">Prescriptions</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{order.tokenNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.patientId?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.prescriptionId?.doctorName || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center">{order.medicines ? order.medicines.length : 0}</td>
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
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      <Link to={`/pharmacy/orders/delivered/${order._id}`} className="text-gray-400 hover:text-primary inline-flex transition-colors" title="View Details">
                        <Eye className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
