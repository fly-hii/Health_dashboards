import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { socket } from '../../sockets/socket';

export default function DeliveredOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDeliveredDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pharmacy/orders/delivered/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load delivered order details');
      navigate('/pharmacy/orders/history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveredDetails();

    socket.connect();
    const handleOrderReload = (updated) => {
      if (updated._id === id) {
        fetchDeliveredDetails();
      }
    };
    socket.on('orderStatusUpdated', handleOrderReload);

    return () => {
      socket.off('orderStatusUpdated', handleOrderReload);
    };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info('Downloading Invoice PDF...');
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(order, null, 2)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice-${order?.tokenNumber || 'CPH'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDeliveredTime = (timeStr) => {
    try {
      if (!timeStr) return '—';
      const dateObj = new Date(timeStr);
      return format(dateObj, 'dd MMM yyyy, hh:mm a');
    } catch (e) {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-100 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="h-72 bg-gray-50 border rounded-xl" />
          <div className="h-[400px] bg-gray-50 border rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-[16px] flex flex-col items-center gap-3">
        <ArrowLeft className="h-10 w-10 text-red-400" />
        <h3 className="font-semibold text-lg text-gray-900">Delivered Order not found</h3>
        <button
          onClick={() => navigate('/pharmacy/orders/history')}
          className="mt-2 px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[10px] text-sm font-medium transition-colors cursor-pointer"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/pharmacy/orders/history')}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Delivered Orders
        </button>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Delivered Order Details</h1>
      </div>

      {/* CORE TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        
        {/* LEFT CARD: Order Information */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-5 w-full lg:w-[320px]">
          <h2 className="text-lg font-bold text-[#111827] border-b pb-2">Order Information</h2>

          <div className="space-y-4 text-sm font-medium text-[#374151]">
            {/* Token */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Token Number</div>
              <div className="text-sm font-extrabold text-[#111827]">{order.tokenNumber}</div>
            </div>

            {/* Patient */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Patient</div>
              <div className="text-sm font-bold text-[#111827]">{order.patientId?.name || '—'}</div>
            </div>

            {/* Doctor */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Doctor</div>
              <div className="text-sm font-bold text-[#111827]">{order.prescriptionId?.doctorName || '—'}</div>
            </div>

            {/* Delivered Time */}
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Delivered At</div>
              <div className="text-sm font-bold text-[#111827]">{formatDeliveredTime(order.deliveredAt)}</div>
            </div>

            {/* Status Badge */}
            <div className="pt-3 border-t border-gray-100 flex items-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F9D8A] text-white rounded-full text-xs font-bold shadow-sm shadow-[#0F9D8A]/10 select-none uppercase tracking-wide">
                <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={3} />
                Delivered
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Medicines Table & Delivery Summary */}
        <div className="space-y-5 flex-1 w-full">
          
          {/* Card Container */}
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-[#111827]">Medicines ({order.medicines?.length || 0})</h2>

            {/* Medicines List Table */}
            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[12px] bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#111827] text-xs font-semibold uppercase border-b border-[#E5E7EB] h-[48px]">
                    <th className="px-5 font-semibold">Medicine Name</th>
                    <th className="px-5 font-semibold">Dosage</th>
                    <th className="px-5 font-semibold text-center">Quantity</th>
                    <th className="px-5 font-semibold">Delivered To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {order.medicines?.map((med, idx) => (
                    <tr key={idx} className="h-[52px] text-sm text-[#374151]">
                      <td className="px-5 font-bold text-[#111827]">{med.medicineName || med.name}</td>
                      <td className="px-5 font-medium">{med.dosage}</td>
                      <td className="px-5 text-center font-bold text-[#111827]">{med.quantity}</td>
                      <td className="px-5 font-bold text-[#6B7280]">{order.patientId?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Delivery Summary Card */}
            <div className="bg-[#DCFCE7]/30 border border-[#DCFCE7] p-5 rounded-[12px] shadow-sm">
              <h3 className="text-sm font-bold text-[#15803D] tracking-tight mb-4 border-b border-[#DCFCE7] pb-1.5">Delivery Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-semibold text-[#15803D]">
                <div>
                  <div className="text-[11px] font-bold text-[#15803D]/60 uppercase tracking-wider mb-0.5">Payment Method</div>
                  <div className="text-base text-[#15803D] font-extrabold">{order.paymentMethod || 'UPI'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#15803D]/60 uppercase tracking-wider mb-0.5">Total Amount</div>
                  <div className="text-base text-[#15803D] font-extrabold">₹{(order.totalAmount || 120).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#15803D]/60 uppercase tracking-wider mb-0.5">Paid Amount</div>
                  <div className="text-base text-[#15803D] font-extrabold">₹{(order.paidAmount || order.totalAmount || 120).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#15803D]/60 uppercase tracking-wider mb-0.5">Transaction ID</div>
                  <div className="text-xs text-[#15803D] font-bold font-mono tracking-tight break-all mt-0.5">
                    {order.transactionId || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM TOOLBAR ACTION (Left Green Banner, Right Buttons) */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
            {/* Left green banner */}
            <div className="w-full md:w-auto h-11 px-4 bg-[#0F9D8A]/10 text-[#0F9D8A] rounded-[10px] border border-[#0F9D8A]/20 flex items-center justify-center gap-1.5 font-bold text-xs shadow-sm">
              💚 Thank you for choosing CarePlus Pharmacy! ❤️
            </div>

            {/* Print and Download buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
