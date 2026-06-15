import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Eye } from 'lucide-react';
import api from '../../services/api';
import { socket } from '../../sockets/socket';
import { formatDistanceToNow } from 'date-fns';

export default function ProcessingOrders() {
  const [orders, setOrders] = useState([]);
  const { searchTerm } = useOutletContext();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders?status=Processing');
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch processing orders');
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

  const getDistanceDisplay = (startedAt) => {
    try {
      if (!startedAt) return 'N/A';
      return formatDistanceToNow(new Date(startedAt), { addSuffix: true });
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
        <h1 className="text-2xl font-bold text-gray-900">Processing Orders</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-medium">Token Number</th>
                <th className="px-6 py-4 font-medium">Patient Name</th>
                <th className="px-6 py-4 font-medium">Doctor Name</th>
                <th className="px-6 py-4 font-medium text-center">Prescription Count</th>
                <th className="px-6 py-4 font-medium">Started Time</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{order.tokenNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.patientId?.name || 'Amit Singh'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.prescriptionId?.doctorName || 'Dr. Vivek Singh'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center">{order.medicines?.length || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {getDistanceDisplay(order.startedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right space-x-3 flex justify-end">
                    <Link to={`/pharmacy/orders/processing/${order._id}`} className="text-gray-400 hover:text-primary transition-colors" title="View Details">
                      <Eye className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No processing orders match your search criteria.
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
