import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CheckCircle, Truck, Eye } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { socket } from '../../sockets/socket';
import { format } from 'date-fns';

export default function ReadyOrders() {
  const [orders, setOrders] = useState([]);
  const { searchTerm } = useOutletContext();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders?status=Ready');
      setOrders(res.data);
    } catch (error) {
      toast.error('Failed to fetch ready orders');
    }
  };

  useEffect(() => {
    fetchOrders();

    socket.connect();
    socket.on('orderStatusUpdated', () => {
      fetchOrders();
    });

    return () => {
      socket.off('orderStatusUpdated');
    };
  }, []);

  const handleMarkDelivered = async (id) => {
    try {
      await api.patch(`/api/pharmacy/orders/${id}/status`, { status: 'Delivered' });
      toast.success('Order delivered successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getFormattedDate = (readyAt) => {
    try {
      if (!readyAt) return 'N/A';
      return format(new Date(readyAt), 'dd MMM, hh:mm a');
    } catch (e) {
      return 'N/A';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const matchToken = order.tokenNumber?.toLowerCase().includes(query);
    const matchPatient = order.patientId?.name?.toLowerCase().includes(query);
    const matchDoctor = order.prescriptionId?.doctorName?.toLowerCase().includes(query);
    return matchToken || matchPatient || matchDoctor;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ready Orders</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-medium">Token Number</th>
                <th className="px-6 py-4 font-medium">Patient Name</th>
                <th className="px-6 py-4 font-medium">Doctor Name</th>
                <th className="px-6 py-4 font-medium">Ready Time</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{order.tokenNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.patientId?.name || 'Vikram Patel'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.prescriptionId?.doctorName || 'Dr. Anjali Verma'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {getFormattedDate(order.readyAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right space-x-3 flex justify-end">
                    <Link to={`/pharmacy/orders/ready/${order._id}`} className="text-gray-400 hover:text-primary transition-colors" title="View Details">
                      <Eye className="h-5 w-5" />
                    </Link>
                    <button 
                      onClick={() => handleMarkDelivered(order._id)}
                      className="text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer" 
                      title="Mark Delivered"
                    >
                      <Truck className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="h-8 w-8 text-emerald-300" />
                      <p>No orders ready for pickup match your search criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
