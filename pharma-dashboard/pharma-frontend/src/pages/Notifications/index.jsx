import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Eye, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { socket } from '../../sockets/socket';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('All'); // 'All', 'Alert', 'Success', 'Info'

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/pharmacy/notifications');
      setNotifications(res.data);
    } catch (error) {
      toast.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();

    socket.connect();
    socket.on('newNotification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      socket.off('newNotification');
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/pharmacy/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/pharmacy/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.put(`/api/pharmacy/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      }

      if (notif.onModel === 'Order' && notif.relatedId) {
        const orderRes = await api.get(`/api/pharmacy/orders/${notif.relatedId}`);
        const order = orderRes.data;
        if (order.status === 'Processing') {
          navigate(`/pharmacy/orders/processing/${order._id}`);
        } else if (order.status === 'Ready' || order.status === 'Packed') {
          navigate(`/pharmacy/orders/ready/${order._id}`);
        } else if (order.status === 'Delivered') {
          navigate(`/pharmacy/orders/delivered/${order._id}`);
        } else {
          navigate('/pharmacy/prescription-queue');
        }
      } else if (notif.onModel === 'Inventory') {
        navigate('/pharmacy/inventory');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Alert':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'Success':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getDistanceDisplay = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'All') return true;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-[#0F9D8A]" />
            Notifications Queue
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white font-bold text-xs px-2.5 py-1 rounded-full ring-2 ring-white">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all system events, manual orders, and inventory stock warnings.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="h-10 px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-semibold text-sm rounded-[10px] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Check className="h-4 w-4 text-[#0F9D8A]" />
            Mark all read
          </button>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-[#E5E7EB] gap-6 overflow-x-auto pb-px">
        {['All', 'Alert', 'Success', 'Info'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`pb-3 font-semibold text-sm transition-all relative border-b-2 cursor-pointer ${
              filterType === type
                ? 'text-[#0F9D8A] border-[#0F9D8A]'
                : 'text-gray-500 border-transparent hover:text-gray-900'
            }`}
          >
            {type === 'Alert' ? 'Alerts' : type === 'Success' ? 'Success Actions' : type === 'Info' ? 'System Info' : 'All Notifications'}
          </button>
        ))}
      </div>

      {/* NOTIFICATION LOG CONTAINER */}
      <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden divide-y divide-[#E5E7EB]">
        {filteredNotifications.map((notif) => (
          <div
            key={notif._id}
            className={`p-5 flex gap-4 transition-all duration-200 hover:bg-gray-50/60 ${
              !notif.isRead ? 'bg-emerald-50/5' : ''
            }`}
          >
            {/* Status Type Icon */}
            <div className="w-10 h-10 rounded-[10px] bg-gray-50 border border-[#E5E7EB] flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(notif.type)}
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h3 className={`text-sm text-gray-900 truncate ${!notif.isRead ? 'font-extrabold' : 'font-semibold'}`}>
                  {notif.title}
                </h3>
                <span className="text-[10px] text-gray-400 font-bold shrink-0">
                  {getDistanceDisplay(notif.createdAt)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{notif.message}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {!notif.isRead && (
                <button
                  onClick={() => handleMarkRead(notif._id)}
                  className="p-2 text-gray-400 hover:text-[#0F9D8A] hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                  title="Mark as Read"
                >
                  <Check className="h-4.5 w-4.5" />
                </button>
              )}
              {notif.relatedId && (
                <button
                  onClick={() => handleNotificationClick(notif)}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                  title="View Source Details"
                >
                  <Eye className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="p-16 text-center text-gray-500">
            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400 border border-dashed border-gray-200 mb-3">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">No notifications found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">There are no system logs matching your selected filter tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}
