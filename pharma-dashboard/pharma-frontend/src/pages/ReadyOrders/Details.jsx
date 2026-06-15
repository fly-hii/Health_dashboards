import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Check, CheckCircle2, RotateCw } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { socket } from '../../sockets/socket';

export default function ReadyOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pharmacy/orders/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load ready order details');
      navigate('/pharmacy/orders/ready');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();

    socket.connect();
    const handleOrderReload = (updated) => {
      if (updated._id === id) {
        fetchOrderDetails();
      }
    };
    socket.on('orderStatusUpdated', handleOrderReload);

    return () => {
      socket.off('orderStatusUpdated', handleOrderReload);
    };
  }, [id]);

  const handleMarkDelivered = async () => {
    setUpdating(true);
    try {
      // Transition order status to 'Delivered'
      await api.patch(`/api/pharmacy/orders/${id}/status`, { status: 'Delivered' });
      toast.success('Order delivered successfully');
      navigate('/pharmacy/orders/history');
    } catch (error) {
      console.error(error);
      toast.error('Failed to mark order as delivered');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      await api.post(`/api/pharmacy/orders/${id}/print`);
      toast.success('Invoice printed successfully');
      window.print();
    } catch (error) {
      toast.error('Failed to print invoice');
    }
  };

  const formatReadyTime = (timeStr) => {
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
      <div className="space-y-6">
        <div className="h-10 bg-gray-100 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 animate-pulse">
          <div className="h-72 bg-gray-50 rounded-xl border" />
          <div className="h-[400px] bg-gray-50 rounded-xl border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/pharmacy/orders/ready')}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ready Orders
        </button>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Ready Order Details</h1>
      </div>

      {/* CORE CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        
        {/* LEFT CARD: Order Info */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-6 w-full lg:w-[320px]">
          <div>
            <h2 className="text-lg font-bold text-[#111827] mb-5">Order Info</h2>

            <div className="space-y-5">
              {/* Token */}
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Token Number</div>
                <div className="text-base font-extrabold text-[#111827] tracking-tight">{order.tokenNumber}</div>
              </div>

              {/* Patient */}
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Patient</div>
                <div className="text-sm font-bold text-[#111827]">{order.patientId?.name || '—'}</div>
              </div>

              {/* Doctor */}
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Doctor</div>
                <div className="text-sm font-bold text-[#111827]">{order.prescriptionId?.doctorName || '—'}</div>
              </div>

              {/* Ready At Time */}
              <div>
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Ready At</div>
                <div className="text-sm font-bold text-[#10B981]">{formatReadyTime(order.readyAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Medicines Table & Pickup Instructions */}
        <div className="space-y-5 flex-1 w-full">
          {/* Card */}
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
                    <th className="px-5 font-semibold">Packed In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {order.medicines?.map((med, idx) => (
                    <tr key={idx} className="h-[52px] text-sm text-[#374151]">
                      <td className="px-5 font-bold text-[#111827]">{med.medicineName}</td>
                      <td className="px-5 font-medium">{med.dosage}</td>
                      <td className="px-5 text-center font-bold text-[#111827]">{med.quantity}</td>
                      <td className="px-5 font-bold text-[#6B7280]">{med.packedIn || 'Strip'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pickup Instructions Checklist Card */}
            <div className="bg-[#DCFCE7]/30 border border-[#DCFCE7] p-5 rounded-[12px] space-y-3">
              <h3 className="text-sm font-bold text-[#16A34A] tracking-tight">Pickup Instructions</h3>
              <div className="space-y-2 text-sm text-[#15803D] font-medium">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#16A34A]/10 flex items-center justify-center text-[#16A34A] mt-0.5 shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={3.5} />
                  </div>
                  <span>Please collect your medicines from the counter.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#16A34A]/10 flex items-center justify-center text-[#16A34A] mt-0.5 shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={3.5} />
                  </div>
                  <span>Bring valid token number for pickup.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS TOOLBAR */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
            {/* Print Invoice */}
            <button
              onClick={handlePrintInvoice}
              className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>

            {/* Mark as Delivered */}
            <button
              onClick={handleMarkDelivered}
              disabled={updating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 px-7 bg-[#0F9D8A] hover:bg-[#0B7F71] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
            >
              {updating ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Delivering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Delivered
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
