import { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { notificationService } from '../../services/notificationService';
import NotificationItem from '../../components/nurse/NotificationItem';
import { toast } from 'react-toastify';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  ChevronDown, 
  RefreshCw, 
  X,
  Eye,
  Check,
  Archive,
  SlidersHorizontal,
  Clock
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'alerts', label: 'Alerts' }
];

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const NotificationsCenter = () => {
  const { notifications: contextNotifications, setUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('all');
  
  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [sortBy, setSortBy] = useState('Newest First');
  
  // Details Drawer state
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Sync unreadCount to context when local notifications list changes
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);
  }, [notifications, setUnreadCount]);

  // Sync real-time socket notifications from context
  useEffect(() => {
    if (contextNotifications && contextNotifications.length > 0) {
      setNotifications(prev => {
        // Find items in contextNotifications that are not already present
        const newItems = contextNotifications.filter(cn => 
          !prev.some(ei => ei._id === cn._id)
        );
        
        if (newItems.length > 0) {
          const normalizedNewItems = newItems.map(item => ({
            ...item,
            title: item.title,
            message: item.message,
            isRead: item.isRead,
            createdAt: item.createdAt || new Date().toISOString()
          }));
          return [...normalizedNewItems, ...prev];
        }
        return prev;
      });
    }
  }, [contextNotifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications({ limit: 100 });
      const apiNotifications = res.data.data || [];
      
      // Normalize API notifications
      const normalizedApi = apiNotifications.map(n => ({
        _id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        priority: n.priority,
        createdAt: n.createdAt,
        relatedPatient: n.relatedPatient,
        department: n.relatedAppointment?.department || n.department || '',
        doctor: n.relatedAppointment?.doctor || n.doctor || ''
      }));
      
      setNotifications(normalizedApi);
    } catch (err) {
      console.error('Failed to load notifications from database:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark read on server:', err);
    }
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
    toast.success('Notification archived');
    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error('Failed to archive on server:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter(n => !n.isRead);
    if (unreadItems.length === 0) {
      toast.info('No unread notifications');
      return;
    }
    
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
    
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all read on server:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    
    setNotifications([]);
    toast.success('All notifications cleared');
    
    try {
      await notificationService.clearAll();
    } catch (err) {
      console.error('Failed to clear notifications on server:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Notifications status refreshed!');
    }, 600);
  };

  // Dynamic Statistics Calculations
  const unreadCountLocal = notifications.filter(n => !n.isRead).length;
  
  const appointmentsTodayCount = notifications.filter(n => {
    const isAppointment = n.type === 'appointment';
    const isToday = new Date(n.createdAt).toDateString() === new Date().toDateString();
    return isAppointment && isToday;
  }).length;

  const criticalAlertsCount = notifications.filter(n => n.priority === 'critical').length;
  const completedUpdatesCount = notifications.filter(n => n.isRead).length;

  // Filter & Sort Logic
  const filteredNotifications = notifications.filter(n => {
    // 1. Tab Filtering
    if (activeTab === 'appointments' && n.type !== 'appointment') return false;
    if (activeTab === 'reminders' && !['general', 'vitals_required', 'doctor_request'].includes(n.type)) return false;
    if (activeTab === 'alerts' && n.type !== 'emergency_alert' && n.priority !== 'critical') return false;

    // 2. Search Text Filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = n.title?.toLowerCase().includes(q);
      const descMatch = n.message?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }

    // 3. Date Filtering
    const createdDate = new Date(n.createdAt);
    const diffTime = Math.abs(new Date() - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'Today') {
      const today = new Date();
      if (createdDate.toDateString() !== today.toDateString()) return false;
    } else if (dateFilter === 'Last 7 Days') {
      if (diffDays > 7) return false;
    } else if (dateFilter === 'Last 30 Days') {
      if (diffDays > 30) return false;
    }

    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'Newest First') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'Oldest First') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'Priority') {
      const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityMap[a.priority] || 1;
      const bPriority = priorityMap[b.priority] || 1;
      return bPriority - aPriority;
    }
    return 0;
  });

  return (
    <div className="space-y-8 relative pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Notifications
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            Stay updated with appointments, patient updates, and hospital alerts.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Unread Notifications */}
        <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-5 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Unread Notifications</span>
            <span className="text-3xl font-black text-slate-900 leading-none">{unreadCountLocal}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal-50/60 text-[#0EA5A4] flex items-center justify-center shadow-sm">
            <Bell size={20} strokeWidth={2.5} />
          </div>
        </Card>

        {/* Appointments Today */}
        <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-5 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Appointments Today</span>
            <span className="text-3xl font-black text-slate-900 leading-none">{appointmentsTodayCount}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50/60 text-blue-600 flex items-center justify-center shadow-sm">
            <Calendar size={20} strokeWidth={2.5} />
          </div>
        </Card>

        {/* Critical Alerts */}
        <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-5 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Critical Alerts</span>
            <span className="text-3xl font-black text-red-600 leading-none">{criticalAlertsCount}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50/60 text-red-600 flex items-center justify-center shadow-sm">
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
        </Card>

        {/* Completed Updates */}
        <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-5 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Completed Updates</span>
            <span className="text-3xl font-black text-emerald-600 leading-none">{completedUpdatesCount}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50/60 text-emerald-600 flex items-center justify-center shadow-sm">
            <CheckCircle size={20} strokeWidth={2.5} />
          </div>
        </Card>
      </div>

      {/* Action Header & Tabs Selection */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 p-5 bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2.5 p-1 bg-slate-100/50 rounded-2xl border border-[#E5E7EB]/80 w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            className="px-4 py-2 border-[#E5E7EB] text-slate-700 hover:text-[#0EA5A4] hover:bg-teal-50/20 hover:border-teal-200 rounded-xl text-xs font-bold transition-colors cursor-pointer h-10 flex items-center gap-2"
          >
            <Check size={14} strokeWidth={2.5} />
            Mark All as Read
          </Button>
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="px-4 py-2 border-[#E5E7EB] text-slate-700 hover:text-red-600 hover:bg-red-50/20 hover:border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer h-10 flex items-center gap-2"
          >
            <X size={14} strokeWidth={2.5} />
            Clear Notifications
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40 p-4 border border-[#E5E7EB] rounded-[20px]">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Notifications..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0EA5A4] focus:ring-4 focus:ring-teal-500/5 transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Date</span>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Sort By</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-[#0EA5A4] transition-colors"
              >
                <option value="Newest First">Newest First</option>
                <option value="Oldest First">Oldest First</option>
                <option value="Priority">Priority</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            className="w-10 h-10 bg-white border border-[#E5E7EB] hover:border-teal-200 text-slate-500 hover:text-[#0EA5A4] hover:bg-teal-50/30 rounded-xl flex items-center justify-center p-0 cursor-pointer shadow-sm transition-all"
            title="Refresh List"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-4">
        {loading && sortedNotifications.length === 0 ? (
          /* Loading Skeletons */
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-5 rounded-[18px] border border-slate-100 bg-white flex items-center gap-4 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedNotifications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white border border-[#E5E7EB] rounded-[24px] shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
              <Bell size={28} className="text-slate-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">No notifications available</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-[280px] leading-relaxed">
                You are all caught up! There are no notifications matching your filters.
              </p>
            </div>
            <Button 
              onClick={handleRefresh}
              className="px-5 py-2.5 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 shadow-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh Notifications
            </Button>
          </div>
        ) : (
          /* Notifications Card List */
          <div className="space-y-3.5">
            {sortedNotifications.map((notification) => (
              <NotificationItem 
                key={notification._id} 
                notification={notification} 
                onRead={handleRead} 
                onDelete={handleDelete}
                onViewDetails={setSelectedNotification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notification Details Drawer Side Panel */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedNotification(null)}
        />
      )}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-50 shadow-2xl transition-transform duration-300 transform flex flex-col ${
          selectedNotification ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNotification && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Notification Details</h2>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Category Badges / Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedNotification.type === 'appointment' ? 'bg-teal-50 text-[#0EA5A4] border border-teal-100'
                  : selectedNotification.type === 'emergency_alert' ? 'bg-pink-50 text-pink-600 border border-pink-100'
                  : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {selectedNotification.type?.toUpperCase().replace('_', ' ')}
                </span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  selectedNotification.priority === 'critical' ? 'bg-red-50 text-red-600 border-red-200'
                  : !selectedNotification.isRead ? 'bg-teal-50 text-[#0EA5A4] border-teal-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {selectedNotification.priority?.toUpperCase()}
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {selectedNotification.title}
                </h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Patient Details Section */}
              {selectedNotification.relatedPatient ? (
                <div className="p-5 border border-[#E5E7EB] rounded-2xl bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Patient Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Name:</span>
                      <span className="text-slate-900 font-bold">{selectedNotification.relatedPatient.name}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Patient ID:</span>
                      <span className="text-slate-900">{selectedNotification.relatedPatient.patientId}</span>
                    </div>
                    {selectedNotification.relatedPatient.ageGender && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Age / Gender:</span>
                        <span className="text-slate-900">{selectedNotification.relatedPatient.ageGender}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 border border-[#E5E7EB] rounded-2xl bg-slate-50/50 text-center">
                  <span className="text-xs font-bold text-slate-400">General Hospital notification (No patient linked)</span>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-[#E5E7EB] rounded-xl">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Department</span>
                  <span className="text-xs font-bold text-slate-800">{selectedNotification.department || 'General Medicine'}</span>
                </div>
                <div className="p-4 border border-[#E5E7EB] rounded-xl">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Assigned Doctor</span>
                  <span className="text-xs font-bold text-slate-800">{selectedNotification.doctor || 'Dr. Rohit Mehta'}</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-t border-[#E5E7EB] pt-4">
                <span className="flex items-center gap-1.5"><Clock size={12} /> Received Time</span>
                <span>{formatTime(selectedNotification.createdAt)}</span>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-[#E5E7EB] bg-slate-50/50 flex items-center gap-3">
              {!selectedNotification.isRead && (
                <Button
                  onClick={() => {
                    handleRead(selectedNotification._id);
                    setSelectedNotification(prev => ({ ...prev, isRead: true }));
                  }}
                  className="flex-1 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white rounded-xl text-xs font-bold h-11 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all"
                >
                  <Check size={16} strokeWidth={2.5} />
                  Mark as Read
                </Button>
              )}
              <Button
                onClick={() => {
                  handleDelete(selectedNotification._id);
                  setSelectedNotification(null);
                }}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold h-11 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Archive size={16} strokeWidth={2.5} />
                Archive
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;
