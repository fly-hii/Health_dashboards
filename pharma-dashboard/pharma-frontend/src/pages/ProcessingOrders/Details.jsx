import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clipboard, User, Clock, ShieldCheck, Stethoscope, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { socket } from '../../sockets/socket';

export default function ProcessingOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('Check expiry dates before packing.');

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/pharmacy/orders/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load order details');
      navigate('/pharmacy/orders/processing');
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

  const handleToggleMedicine = async (idx, field) => {
    try {
      const updatedMedicines = [...order.medicines];
      updatedMedicines[idx][field] = !updatedMedicines[idx][field];

      // Update medicine status based on checklists
      if (updatedMedicines[idx].packed) {
        updatedMedicines[idx].status = 'Picked';
        updatedMedicines[idx].picked = true; // if packed, it must be picked
      } else if (updatedMedicines[idx].picked) {
        updatedMedicines[idx].status = 'Picking';
      } else {
        updatedMedicines[idx].status = 'Pending';
      }

      await api.put(`/api/orders/${id}/medicines`, { medicines: updatedMedicines });
      setOrder({ ...order, medicines: updatedMedicines });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update medicine pick/pack state');
    }
  };

  const handleMarkPacked = async () => {
    // Check if all medicines are picked & packed
    const allPacked = order.medicines.every((m) => m.packed);
    if (!allPacked) {
      toast.warning('Please pick and pack all prescription medicines before completing.');
      return;
    }

    setUpdating(true);
    try {
      // Transition order status to 'Ready' (Packed and ready for delivery)
      await api.patch(`/api/pharmacy/orders/${id}/status`, { status: 'Ready' });
      toast.success('Order packed successfully');
      navigate('/pharmacy/orders/ready');
    } catch (error) {
      console.error(error);
      toast.error('Failed to finalize packing');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await api.patch(`/api/pharmacy/orders/${id}/status`, { status: 'Pending' });
        toast.info('Order processing was cancelled');
        navigate('/pharmacy/prescription-queue');
      } catch (error) {
        toast.error('Failed to cancel order processing');
      }
    }
  };

  const formatStartedTime = (timeStr) => {
    try {
      if (!timeStr) return <span className="text-sm text-gray-400">—</span>;
      const dateObj = new Date(timeStr);
      return (
        <div className="text-sm font-semibold text-[#111827]">
          <div>{format(dateObj, 'dd MMM yyyy')}</div>
          <div className="text-xs text-[#6B7280] font-medium mt-0.5">{format(dateObj, 'hh:mm a')}</div>
        </div>
      );
    } catch (e) {
      return <span className="text-sm text-gray-400">—</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-100 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="h-[300px] bg-gray-50 rounded-xl border border-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/pharmacy/orders/processing')}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Processing Orders
        </button>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Processing Order Details</h1>
      </div>

      {/* TOP INFORMATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Token Card */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-[#0F9D8A]/10 text-[#0F9D8A] flex items-center justify-center">
            <Clipboard className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Token Number</div>
            <div className="text-sm font-bold text-[#111827] mt-0.5">{order.tokenNumber}</div>
          </div>
        </div>

        {/* Patient Card */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-blue-50 text-blue-500 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Patient</div>
            <div className="text-sm font-bold text-[#111827] mt-0.5">{order.patientId?.name || '—'}</div>
          </div>
        </div>

        {/* Doctor Card */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-purple-50 text-purple-500 flex items-center justify-center">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Doctor</div>
            <div className="text-sm font-bold text-[#111827] mt-0.5">{order.prescriptionId?.doctorName || '—'}</div>
          </div>
        </div>

        {/* Started Time Card */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Started At</div>
            <div className="mt-0.5">{formatStartedTime(order.startedAt)}</div>
          </div>
        </div>
      </div>

      {/* MEDICINES CHECKLIST TABLE */}
      <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden p-6 space-y-5">
        <h2 className="text-lg font-bold text-[#111827]">Medicines ({order.medicines?.length || 0})</h2>

        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[12px] bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#111827] text-xs font-semibold uppercase border-b border-[#E5E7EB] h-[48px]">
                <th className="px-6 font-semibold">Medicine Name</th>
                <th className="px-6 font-semibold">Dosage</th>
                <th className="px-6 font-semibold text-center">Quantity</th>
                <th className="px-6 font-semibold text-center select-none">Picked</th>
                <th className="px-6 font-semibold text-center select-none">Packed</th>
                <th className="px-6 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {order.medicines?.map((med, idx) => (
                <tr
                  key={idx}
                  className={`h-[56px] text-sm text-[#374151] transition-colors ${
                    med.packed ? 'bg-emerald-50/20' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <td className="px-6 font-bold text-[#111827]">{med.medicineName}</td>
                  <td className="px-6 font-medium">{med.dosage}</td>
                  <td className="px-6 text-center font-bold text-[#111827]">{med.quantity}</td>
                  
                  {/* Picked Checkbox */}
                  <td className="px-6 text-center">
                    <button
                      onClick={() => handleToggleMedicine(idx, 'picked')}
                      className={`w-6 h-6 rounded-[6px] flex items-center justify-center mx-auto border transition-colors cursor-pointer ${
                        med.picked
                          ? 'bg-[#0F9D8A] border-[#0F9D8A] text-white shadow-sm shadow-[#0F9D8A]/25'
                          : 'border-[#D1D5DB] text-transparent hover:border-[#0F9D8A]'
                      }`}
                    >
                      <Check className="h-4.5 w-4.5" strokeWidth={3} />
                    </button>
                  </td>

                  {/* Packed Checkbox */}
                  <td className="px-6 text-center">
                    <button
                      onClick={() => handleToggleMedicine(idx, 'packed')}
                      disabled={!med.picked}
                      className={`w-6 h-6 rounded-[6px] flex items-center justify-center mx-auto border transition-colors ${
                        !med.picked
                          ? 'bg-[#F3F4F6] border-[#E5E7EB] text-gray-300 cursor-not-allowed opacity-60'
                          : med.packed
                          ? 'bg-[#0D9488] border-[#0D9488] text-white shadow-sm shadow-[#0D9488]/25 cursor-pointer'
                          : 'border-[#D1D5DB] text-transparent hover:border-[#0D9488] cursor-pointer'
                      }`}
                    >
                      <Check className="h-4.5 w-4.5" strokeWidth={3} />
                    </button>
                  </td>

                  {/* Status Badges */}
                  <td className="px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        med.packed
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : med.picked
                          ? 'bg-[#DBEAFE] text-[#2563EB]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {med.packed ? 'Picked' : med.picked ? 'Picking' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER ACTION AREA (Notes Left, Buttons Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-end pt-2">
        {/* Notes input container */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-bold text-[#111827]">Notes</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add instructions or notes..."
            className="w-full h-11 px-4 border border-[#E5E7EB] rounded-[10px] text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Cancel Order */}
          <button
            onClick={handleCancelOrder}
            className="flex-1 lg:flex-initial h-11 px-6 border border-red-500 text-red-500 hover:bg-red-50 font-bold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
          >
            Cancel Order
          </button>

          {/* Mark as Packed */}
          <button
            onClick={handleMarkPacked}
            disabled={updating}
            className="flex-1 lg:flex-initial h-11 px-8 bg-[#0F9D8A] hover:bg-[#0B7F71] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
          >
            Mark as Packed
          </button>
        </div>
      </div>
    </div>
  );
}
