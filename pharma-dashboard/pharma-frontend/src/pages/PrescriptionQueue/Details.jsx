import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, User, Calendar, Phone, CheckCircle2, RotateCw } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { socket } from '../../sockets/socket';

export default function PrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/pharmacy/prescriptions/${id}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      setError('Prescription details could not be loaded from server.');
      toast.error('Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();

    socket.connect();
    const handleStatusChangeNotification = (updatedOrder) => {
      // If the updated order matches the current page ID, refetch details dynamically
      if (updatedOrder._id === id || updatedOrder.tokenNumber === id) {
        fetchOrderDetails();
      }
    };
    socket.on('orderStatusUpdated', handleStatusChangeNotification);

    return () => {
      socket.off('orderStatusUpdated', handleStatusChangeNotification);
    };
  }, [id]);

  const capitalizeStatus = (s) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const getStatusBadgeStyle = (statusStr) => {
    const status = capitalizeStatus(statusStr);
    switch (status) {
      case 'Pending':
        return 'bg-[#FEF3C7] text-[#D97706]';
      case 'Processing':
        return 'bg-[#DBEAFE] text-[#2563EB]';
      case 'Packed':
        return 'bg-[#F3E8FF] text-[#9333EA]';
      case 'Ready':
        return 'bg-[#DCFCE7] text-[#16A34A]';
      case 'Delivered':
        return 'bg-[#CCFBF1] text-[#0F766E]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // From Prescription Queue, we only allow marking Pending → Processing.
  // Further progression (Processing → Ready → Delivered) happens in the
  // Processing Orders and Ready Orders pages respectively.
  const getNextStatus = (currentStatus) => {
    const status = capitalizeStatus(currentStatus);
    if (status === 'Pending') return 'Processing';
    return null; // No further action from prescription queue
  };

  const handleStatusTransition = async () => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    setUpdating(true);
    try {
      // Call endpoint to update state
      await api.put(`/api/pharmacy/prescriptions/${id}/status`, { status: nextStatus });
      toast.success(`Prescription marked as ${nextStatus}`);
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info('Downloading PDF Prescription...');
    // Create a mock download click
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(order, null, 2)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Prescription-${order.tokenNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatVisitDate = (dateStr) => {
    try {
      if (!dateStr) return '—';
      return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
    } catch (e) {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center h-12 bg-gray-50 rounded-lg animate-pulse px-4" />

        {/* Skeleton Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* Left Panel Skeleton */}
          <div className="bg-white p-6 rounded-[16px] border border-[#E5E7EB] space-y-6 h-[450px]">
            <div className="h-6 bg-gray-100 rounded w-1/2 animate-pulse" />
            <div className="flex flex-col items-center gap-4">
              <div className="h-20 w-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-5 bg-gray-100 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
            </div>
          </div>

          {/* Right Panel Skeleton */}
          <div className="bg-white p-6 rounded-[16px] border border-[#E5E7EB] space-y-6">
            <div className="h-6 bg-gray-100 rounded w-1/4 animate-pulse" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-50 rounded w-full animate-pulse" />
              ))}
            </div>
            <div className="h-24 bg-gray-50 rounded w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-[16px] flex flex-col items-center gap-3">
        <ArrowLeft className="h-10 w-10 text-red-400" />
        <h3 className="font-semibold text-lg text-gray-900">Failed to load prescription</h3>
        <p className="text-sm text-gray-500 max-w-sm">{error || 'The prescription order details do not exist.'}</p>
        <button
          onClick={() => navigate('/pharmacy/prescription-queue')}
          className="mt-2 px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[10px] text-sm font-medium transition-colors cursor-pointer"
        >
          Back to Queue
        </button>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status);
  const statusCaps = capitalizeStatus(order.status);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/pharmacy/prescription-queue')}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Prescription Details</h1>
        </div>

        {/* Status Indicator Badges */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#111827] border border-[#E5E7EB] bg-white px-3 py-1.5 rounded-[8px] select-none shadow-sm">
            Status
          </span>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-[8px] select-none shadow-sm capitalize ${getStatusBadgeStyle(order.status)}`}>
            {statusCaps}
          </span>
        </div>
      </div>

      {/* CORE CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        
        {/* LEFT COLUMN: Patient Info */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-6 w-full lg:w-[320px]">
          <div>
            <h2 className="text-lg font-bold text-[#111827] mb-4">Patient Information</h2>
            
            {/* Profile Detail */}
            <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-[#E5E7EB]">
              <img
                src={order.patient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${order.patient?.name || 'Ramesh'}`}
                alt="Patient Avatar"
                className="w-20 h-20 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] object-cover"
              />
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-[#111827]">{order.patient?.name}</h3>
                <p className="text-xs text-[#6B7280] font-medium">
                  Age: {order.patient?.age || 32} Years • {order.patient?.gender || 'Male'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F9D8A]">
                <Phone className="h-4 w-4" />
                {order.patient?.phone}
              </div>
            </div>
          </div>

          {/* Visit and Token Specifications */}
          <div className="space-y-5">
            {/* Token */}
            <div>
              <div className="text-[11px] font-bold text-[#6B7280] uppercase mb-1.5">Token Number</div>
              <span className="inline-block bg-[#0F9D8A]/10 text-[#0F9D8A] px-3.5 py-1 rounded-full text-xs font-bold tracking-wide">
                {order.tokenNumber}
              </span>
            </div>

            {/* Doctor Info */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase mb-1">Doctor</div>
              <div className="text-sm font-bold text-[#111827]">{order.doctor?.name}</div>
              <div className="text-xs text-[#6B7280] font-medium">{order.doctor?.department}</div>
            </div>

            {/* Date and Time */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase mb-1">Date & Time</div>
              <div className="text-sm font-semibold text-[#111827]">{formatVisitDate(order.visitDate)}</div>
            </div>

            {/* Medicine count */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase mb-1">Prescription Count</div>
              <div className="text-sm font-bold text-[#111827]">{order.medicines?.length || 0} Medicines</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Medicines Table & Notes */}
        <div className="space-y-5 flex-1 w-full">
          {/* Card */}
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-[#111827]">Medicines ({order.medicines?.length || 0})</h2>

            {/* Medicine Grid */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[12px] bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#111827] text-xs font-semibold uppercase border-b border-[#E5E7EB] h-[48px]">
                    <th className="px-5 font-semibold">Medicine Name</th>
                    <th className="px-5 font-semibold">Dosage</th>
                    <th className="px-5 font-semibold text-center">Quantity</th>
                    <th className="px-5 font-semibold">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {order.medicines?.map((med, idx) => (
                    <tr key={idx} className="h-[52px] text-sm text-[#374151]">
                      <td className="px-5 font-bold text-[#111827]">{med.name}</td>
                      <td className="px-5 font-medium">{med.dosage}</td>
                      <td className="px-5 text-center font-bold text-[#111827]">{med.quantity}</td>
                      <td className="px-5 font-medium text-[#6B7280]">{med.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Doctor Note Cards */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#111827]">Doctor's Note</h3>
              <div className="relative p-5 bg-[#F8FAFC] border border-[#E5E7EB] border-dashed rounded-[12px] min-h-[100px] flex justify-between items-end gap-6">
                <p className="text-sm text-[#374151] font-medium leading-relaxed max-w-[80%] italic">
                  "{order.doctorNotes || 'No notes available'}"
                </p>
                {/* Doctor Signature path scribble */}
                <div className="flex flex-col items-center pr-2">
                  <svg className="w-24 h-12 text-[#6B7280] opacity-50" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10 25c10-8 15-18 25-5 5 8 10 12 15 5s8-12 12-5 5 10 10 5 4-15 8-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider -mt-1 select-none border-t border-gray-200 pt-0.5">
                    {order.doctor?.name?.split(' ')[1] || 'Doctor'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION TOOLBAR */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
            {/* Print and Download */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>

            {/* State transitions - only allow Pending → Processing from this page */}
            {nextStatus ? (
              <button
                onClick={handleStatusTransition}
                disabled={updating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-7 bg-[#0F9D8A] hover:bg-[#0B7F71] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
              >
                {updating ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Updating Status...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Processing
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
