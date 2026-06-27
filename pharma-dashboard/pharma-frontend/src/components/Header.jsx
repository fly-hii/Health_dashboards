import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Search, Menu, Check, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import api, { getImageUrl } from '../services/api';
import { socket } from '../sockets/socket';

import { formatDistanceToNow } from 'date-fns';

export default function Header({ searchTerm = '', setSearchTerm, setIsSidebarOpen, isMinimized, setIsMinimized }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const [profile, setProfile] = useState({
    fullName: '',
    employeeId: '',
    profilePhoto: null
  });

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/pharmacy/profile');
      setProfile(res.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/pharmacy/notifications');
      setNotifications(res.data);
      const unread = res.data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchNotifications();

    socket.connect();
    
    // Listen for new notifications in real-time
    socket.on('newNotification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    // Listen for profile changes
    socket.on('userProfileUpdated', (updated) => {
      setProfile(updated);
    });

    // Handle outside clicks to close both dropdowns
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      socket.off('newNotification');
      socket.off('userProfileUpdated');
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Disconnect socket
    socket.disconnect();
    // Redirect to login
    navigate('/pharmacy/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/pharmacy/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = async (notif) => {
    setShowDropdown(false);
    try {
      if (!notif.isRead) {
        await api.put(`/api/pharmacy/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      
      // Navigate to the appropriate route if possible
      if (notif.onModel === 'Order' && notif.relatedId) {
        // Find order status/type to navigate correctly
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
      console.error('Error handling notification click', error);
    }
  };

  const getNotificationTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] h-[72px] fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6">
      {/* Left section: Hamburger Icon & Logo Placeholder for Mobile */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="p-2 -ml-2 text-gray-500 hover:bg-[#F3F4F6] rounded-md transition-colors cursor-pointer lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Invisible spacer to align with sidebar on desktop */}
        <div className={`hidden lg:block transition-all duration-300 ease-in-out ${
          isMinimized ? 'w-[48px]' : 'w-[216px]'
        }`} />
        {/* Desktop toggle button repositioned to align with blue circle marker */}
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="hidden lg:flex p-2 text-gray-500 hover:bg-[#F3F4F6] rounded-md transition-colors cursor-pointer items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
          title={isMinimized ? "Expand Menu" : "Collapse Menu"}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Center section: Search Bar */}
      <div className="flex-1 max-w-[420px] px-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#6B7280]" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] rounded-[10px] leading-5 bg-[#F8FAFC] placeholder-[#6B7280] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] sm:text-sm transition-all duration-200"
            placeholder="Search by token, patient or doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Right section: Notifications & User Profile */}
      <div className="flex items-center gap-4 relative">
        {/* Notification Bell */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-full transition-colors cursor-pointer flex items-center justify-center"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {showDropdown && (
            <div className="absolute right-0 mt-3.5 w-[360px] bg-white border border-[#E5E7EB] rounded-[16px] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/70">
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#0F9D8A] hover:text-[#0B7F71] flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E5E7EB]">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${
                      !notif.isRead ? 'bg-emerald-50/10' : ''
                    }`}
                  >
                    {/* Color dot indicator */}
                    <div className="mt-1.5 shrink-0">
                      <span
                        className={`block h-2.5 w-2.5 rounded-full ${
                          notif.type === 'Alert'
                            ? 'bg-red-500'
                            : notif.type === 'Success'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs text-gray-900 leading-tight ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1 font-semibold">
                        {getNotificationTime(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-xs font-medium">
                    No new notifications
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[#E5E7EB] bg-gray-50/50">
                <Link
                  to="/pharmacy/notifications"
                  onClick={() => setShowDropdown(false)}
                  className="block text-center py-3 text-xs font-bold text-[#0F9D8A] hover:text-[#0B7F71] transition-colors decoration-transparent"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={profileDropdownRef} className="relative border-l border-[#E5E7EB] pl-4">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer focus:outline-none group"
          >
            <img
              className="h-10 w-10 rounded-full bg-gray-100 border border-[#E5E7EB] object-cover"
              src={getImageUrl(profile.profilePhoto) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.fullName || 'Pharmacist')}`}
              alt="Profile Avatar"
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-[#111827]">{profile.fullName}</p>
              <p className="text-xs text-[#6B7280] font-medium">Store ID: {profile.employeeId}</p>
            </div>
            <ChevronDown
              className={`hidden sm:block h-4 w-4 text-[#6B7280] transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileDropdown && (
            <div className="absolute right-0 top-[calc(100%+12px)] w-[220px] bg-white border border-[#E5E7EB] rounded-[14px] shadow-xl overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-3.5 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-[#E5E7EB]">
                <p className="text-sm font-bold text-[#111827] truncate">{profile.fullName || 'Pharmacist'}</p>
                <p className="text-xs text-[#6B7280] font-medium mt-0.5">{profile.role || 'Pharmacist'}</p>
                <p className="text-[11px] text-[#2E7D32] font-bold mt-0.5">ID: {profile.employeeId}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1.5">
                <Link
                  to="/pharmacy/profile"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors decoration-transparent font-medium"
                >
                  <User className="h-4 w-4 text-[#6B7280]" />
                  My Profile
                </Link>
                <Link
                  to="/pharmacy/profile"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors decoration-transparent font-medium"
                >
                  <Settings className="h-4 w-4 text-[#6B7280]" />
                  Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-[#E5E7EB] py-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
