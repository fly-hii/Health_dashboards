import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, MessageSquare, Menu } from 'lucide-react';
import socket from '../sockets/socket';
import API from '../services/api';

export default function Header({ searchTerm, setSearchTerm, isSidebarMinimized, setIsSidebarMinimized, isMobileOpen, setIsMobileOpen }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Read logged in user
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const res = await API.get('/dashboard/stats'); // Stats includes notifications/activities
        // Fetch specific recent alerts
        const notifRes = await API.get('/notifications');
        if (notifRes.data.success) {
          setNotifications(notifRes.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();

    // Setup real-time socket notification listener
    socket.connect();
    socket.emit('join_admin_room');

    socket.on('new_notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('new_notification');
      socket.disconnect();
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMenuClick = () => {
    if (window.innerWidth < 1024) {
      if (setIsMobileOpen) setIsMobileOpen(!isMobileOpen);
    } else {
      if (setIsSidebarMinimized) setIsSidebarMinimized(!isSidebarMinimized);
    }
  };

  return (
    <header className={`fixed top-0 right-0 z-30 flex items-center justify-between h-header px-4 sm:px-8 bg-white border-b border-slate-200 shadow-sm transition-all duration-300 w-full lg:${isSidebarMinimized ? 'w-[calc(100vw-72px)]' : 'w-[calc(100vw-260px)]'
      }`}>
      {/* Left side: Menu toggle & Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 mr-4">
        <button
          onClick={handleMenuClick}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          title={isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <div className="flex items-center gap-3 w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search patient, billing, orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Controls: Message, Notification, Profile */}
      <div className="flex items-center gap-6">
        {/* Messages */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary border-2 border-white rounded-full"></span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold text-white bg-rose-500 border border-white rounded-full">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">System Alerts</span>
                <span className="text-[10px] text-primary cursor-pointer hover:underline" onClick={() => navigate('/admin/notifications')}>View all</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-none">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No unread alerts</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id)}
                      className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 cursor-pointer flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">{n.title}</span>
                        <span className="text-[9px] text-slate-400">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
            <div className="text-right">
              <h3 className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</h3>
              <p className="text-[11px] text-slate-400 leading-none">{user.role === 'HOSPITAL_ADMIN' ? 'Hospital Admin' : 'Doctor'}</p>
            </div>
            <div className="relative">
              <img
                src={user.profileImage || "https://api.dicebear.com/7.x/adventurer/svg?seed=James"}
                alt="Profile"
                className="w-10 h-10 border border-slate-200 rounded-xl"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white rounded-full"></span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
