import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Eye, Calendar, RotateCcw, AlertCircle, ArrowUpDown, Plus } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { socket } from '../../sockets/socket';



export default function PrescriptionQueue() {
  const navigate = useNavigate();
  // Retrieve global search terms shared by the Header search field
  const { searchTerm, setSearchTerm } = useOutletContext();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default date range: last 90 days → today so recent orders always appear
  const todayStr = new Date().toISOString().split('T')[0];
  const ninetyDaysAgoStr = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filters state
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [startDate, setStartDate] = useState(ninetyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Applied date range (only date needs explicit Apply click)
  const [appliedStartDate, setAppliedStartDate] = useState(ninetyDaysAgoStr);
  const [appliedEndDate, setAppliedEndDate] = useState(todayStr);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/orders');
      // Map DB orders to a consistent shape with a real date field from createdAt
      const mapped = (res.data || []).map(dbOrder => ({
        id: dbOrder._id,
        tokenNumber: dbOrder.tokenNumber,
        patientName: dbOrder.patientId?.name || 'Unknown Patient',
        doctorName: dbOrder.prescriptionId?.doctorName || 'Unknown Doctor',
        count: dbOrder.medicines ? dbOrder.medicines.length : 0,
        status: dbOrder.status || 'Pending',
        // Use real createdAt date for date-range filtering
        date: dbOrder.createdAt ? dbOrder.createdAt.split('T')[0] : todayStr,
        isBackend: true,
      }));
      setOrders(mapped);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch prescription orders from server.');
      toast.error('Failed to load prescription queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    socket.connect();
    const handleStatusUpdate = () => {
      fetchOrders();
    };
    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleStatusUpdate);
    };
  }, []);

  // Apply filters and search constraints to the data
  const filteredOrders = orders.filter((order) => {
    // 1. Status Filter — applied immediately on dropdown change
    if (statusFilter !== 'All Status' && order.status !== statusFilter) {
      return false;
    }
    // 2. Date Range Filter
    const orderDate = order.date;
    if (appliedStartDate && orderDate < appliedStartDate) {
      return false;
    }
    if (appliedEndDate && orderDate > appliedEndDate) {
      return false;
    }
    // 3. Header Search string matching (Token, Patient, or Doctor)
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchToken = order.tokenNumber.toLowerCase().includes(query);
      const matchPatient = order.patientName.toLowerCase().includes(query);
      if (!matchToken && !matchPatient) {
        return false;
      }
    }
    return true;
  });

  // Pagination calculation
  const totalEntries = filteredOrders.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const startEntryIndex = totalEntries === 0 ? 0 : indexOfFirstItem + 1;
  const endEntryIndex = Math.min(indexOfLastItem, totalEntries);

  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
    setShowDatePicker(false);
    toast.success('Filters applied successfully');
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStatusFilter('Pending');
    setStartDate(ninetyDaysAgo);
    setEndDate(today);
    setSearchTerm('');
    setAppliedStartDate(ninetyDaysAgo);
    setAppliedEndDate(today);
    setCurrentPage(1);
    setShowDatePicker(false);
    toast.info('Filters reset to default');
  };

  const handleViewDetails = (order) => {
    navigate(`/pharmacy/prescriptions/${order.id}`);
  };

  // Format YYYY-MM-DD date string to "01 May 2025" style
  const formatDateRangeDisplay = (start, end) => {
    if (!start || !end) return 'Select Date Range';
    const opt = { day: '2-digit', month: 'short', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('en-GB', opt);
    const e = new Date(end).toLocaleDateString('en-GB', opt);
    return `${s} - ${e}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Prescription Queue</h1>
        <Link
          to="/pharmacy/orders/create"
          className="h-[42px] px-5 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white rounded-[10px] text-sm font-semibold transition-all shadow-sm shadow-[#0F9D8A]/10 flex items-center justify-center gap-1.5 cursor-pointer decoration-transparent"
        >
          <Plus className="h-4.5 w-4.5" />
          Add New Order
        </Link>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Status Dropdown — applies instantly */}
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-[#6B7280] uppercase mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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

      {/* TABLE CONTAINER */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden mt-5">
        {loading ? (
          /* SKELETON LOADER STATE */
          <div className="w-full divide-y divide-[#E5E7EB]">
            <div className="h-13 bg-[#F9FAFB] flex items-center px-6">
              <div className="w-full grid grid-cols-6 gap-4">
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/4 ml-auto animate-pulse" />
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 flex items-center px-6">
                <div className="w-full grid grid-cols-6 gap-4">
                  <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-1/4 mx-auto animate-pulse" />
                  <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
                  <div className="h-5 bg-gray-100 rounded w-5 ml-auto animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* ERROR STATE */
          <div className="p-12 text-center text-red-500 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <h3 className="font-semibold text-lg">Failed to load prescription data</h3>
            <p className="text-sm text-gray-500 max-w-md">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-2 px-4 py-2 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white rounded-[8px] text-sm font-semibold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-dashed border-gray-200">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">No prescriptions found</h3>
            <p className="text-sm text-[#6B7280] max-w-sm">
              We couldn't find any orders matching your selected status, doctor, date range, or search string.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[8px] text-sm font-medium transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          /* DATA TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#111827] text-sm font-semibold border-b border-[#E5E7EB] h-[52px]">
                  <th className="px-6 font-semibold select-none">Token Number</th>
                  <th className="px-6 font-semibold select-none">Patient Name</th>
                  <th className="px-6 font-semibold select-none">Doctor Name</th>
                  <th className="px-6 font-semibold text-center select-none">Prescription Count</th>
                  <th className="px-6 font-semibold select-none">Status</th>
                  <th className="px-6 font-semibold text-center select-none">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {currentItems.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC] h-[56px] text-sm text-[#374151] transition-colors">
                    <td className="px-6 font-bold text-[#111827]">{order.tokenNumber}</td>
                    <td className="px-6 font-medium">{order.patientName}</td>
                    <td className="px-6 font-medium">{order.doctorName}</td>
                    <td className="px-6 text-center font-medium">{order.count}</td>
                    <td className="px-6">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold
                          ${order.status === 'Pending' ? 'bg-[#FEF3C7] text-[#D97706]' : ''}
                          ${order.status === 'Processing' ? 'bg-[#DBEAFE] text-[#2563EB]' : ''}
                          ${order.status === 'Packed' ? 'bg-[#F3E8FF] text-[#9333EA]' : ''}
                          ${order.status === 'Ready' ? 'bg-[#DCFCE7] text-[#16A34A]' : ''}
                          ${order.status === 'Delivered' ? 'bg-[#CCFBF1] text-[#0F766E]' : ''}
                        `}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 text-center">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="inline-flex items-center justify-center p-1 text-[#6B7280] hover:text-[#0F9D8A] transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="h-[18px] w-[18px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLE FOOTER / PAGINATION */}
        {!loading && !error && currentItems.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Show Entries Text */}
            <div className="text-xs text-[#6B7280] font-medium">
              Showing {startEntryIndex} to {endEntryIndex} of {totalEntries} entries
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors cursor-pointer text-sm font-semibold"
              >
                &lt;
              </button>

              {/* Page Numbers */}
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-9 h-9 flex items-center justify-center text-sm font-semibold rounded-[8px] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0F9D8A] text-white shadow-sm shadow-[#0F9D8A]/10'
                        : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E7EB] text-[#374151] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors cursor-pointer text-sm font-semibold"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
