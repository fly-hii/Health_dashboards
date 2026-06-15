import { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, Trash2, Star, X, Filter, Search,
  ChevronLeft, ChevronRight, AlertTriangle, User, Calendar,
  ShoppingCart, FlaskConical, DollarSign, UserCheck, Cpu,
  CheckCircle, Clock, AlertCircle, TrendingUp, MoreHorizontal,
  Download, RefreshCw, Eye, Stethoscope, UserPlus
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

// ── Type config ────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  patient:     { label: 'Patient',     color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', iconBg: 'bg-emerald-50 border-emerald-100', Icon: User },
  appointment: { label: 'Appointment', color: 'bg-sky-100 text-sky-700',         dot: 'bg-sky-500',     iconBg: 'bg-sky-50 border-sky-100',         Icon: Calendar },
  pharmacy:    { label: 'Pharmacy',    color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   iconBg: 'bg-amber-50 border-amber-100',     Icon: ShoppingCart },
  laboratory:  { label: 'Laboratory',  color: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500',  iconBg: 'bg-purple-50 border-purple-100',   Icon: FlaskConical },
  billing:     { label: 'Billing',     color: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-500',    iconBg: 'bg-rose-50 border-rose-100',       Icon: DollarSign },
  doctor:      { label: 'Doctor',      color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500',  iconBg: 'bg-indigo-50 border-indigo-100',   Icon: Stethoscope },
  nurse:       { label: 'Nurse',       color: 'bg-pink-100 text-pink-700',       dot: 'bg-pink-500',    iconBg: 'bg-pink-50 border-pink-100',       Icon: UserCheck },
  system:      { label: 'System',      color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400',   iconBg: 'bg-slate-50 border-slate-100',     Icon: Cpu },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium:   { label: 'Medium',   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  high:     { label: 'High',     color: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const STATUS_CONFIG = {
  unread:   { label: 'Unread',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  read:     { label: 'Read',     color: 'bg-slate-100 text-slate-600 border-slate-200' },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconClass, bgClass, title, count, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
      <div className={`p-3 rounded-xl border ${bgClass}`}>
        <Icon className={`w-6 h-6 ${iconClass}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{count ?? '—'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Notification Icon ─────────────────────────────────────────────────────────
function NotifIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.system;
  const Icon = cfg.Icon;
  return (
    <div className={`p-2.5 rounded-xl border shrink-0 ${cfg.iconBg}`}>
      <Icon className={`w-4.5 h-4.5 ${cfg.color.split(' ')[1]}`} />
    </div>
  );
}

export default function Notifications() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8, totalPages: 1 });

  // Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Applied filters (only update on Apply)
  const [applied, setApplied] = useState({});

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/notifications/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) { console.error(err); }
  }, []);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const params = { page, limit: 8, ...filters };
      const res = await API.get('/notifications', { params });
      if (res.data.success) {
        setNotifications(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchNotifications(1, {});

    socket.connect();
    socket.emit('join_admin_room');

    socket.on('NEW_NOTIFICATION', (notif) => {
      setNotifications(prev => [notif, ...prev.slice(0, 7)]);
      fetchStats();
      toast.info(`🔔 ${notif.title}`, { position: 'top-right' });
    });

    socket.on('NOTIFICATION_UPDATED', (notif) => {
      setNotifications(prev => prev.map(n => n._id === notif._id ? notif : n));
      if (selected?._id === notif._id) setSelected(notif);
      fetchStats();
    });

    socket.on('NOTIFICATION_DELETED', ({ _id }) => {
      setNotifications(prev => prev.filter(n => n._id !== _id));
      if (selected?._id === _id) setSelected(null);
      fetchStats();
    });

    socket.on('ALL_NOTIFICATIONS_READ', () => {
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read', isRead: true })));
      fetchStats();
    });

    return () => {
      socket.off('NEW_NOTIFICATION');
      socket.off('NOTIFICATION_UPDATED');
      socket.off('NOTIFICATION_DELETED');
      socket.off('ALL_NOTIFICATIONS_READ');
    };
  }, []);

  // Re-fetch when applied filters change
  useEffect(() => {
    fetchNotifications(1, applied);
  }, [applied]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'read', isRead: true } : n));
      if (selected?._id === id) setSelected(s => ({ ...s, status: 'read', isRead: true }));
      fetchStats();
      toast.success('Marked as read');
    } catch (err) { toast.error('Failed'); }
  };

  const handleMarkImportant = async (id) => {
    try {
      const res = await API.patch(`/notifications/${id}/important`);
      setNotifications(prev => prev.map(n => n._id === id ? res.data.data : n));
      if (selected?._id === id) setSelected(res.data.data);
      fetchStats();
    } catch (err) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (selected?._id === id) setSelected(null);
      fetchStats();
      toast.success('Notification deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read', isRead: true })));
      fetchStats();
      toast.success('All notifications marked as read');
    } catch (err) { toast.error('Failed'); }
  };

  const handleApplyFilters = () => {
    const filters = {};
    if (search) filters.search = search;
    if (filterType !== 'all') filters.type = filterType;
    if (filterPriority !== 'all') filters.priority = filterPriority;
    if (filterModule !== 'all') filters.module = filterModule;
    if (filterStatus !== 'all') filters.status = filterStatus;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    setApplied(filters);
  };

  const handleClearFilters = () => {
    setSearch(''); setFilterType('all'); setFilterPriority('all');
    setFilterModule('all'); setFilterStatus('all');
    setDateFrom(''); setDateTo('');
    setApplied({});
  };

  const handleExport = () => {
    const csv = ['ID,Title,Type,Priority,Module,Status,Date',
      ...notifications.map(n =>
        `${n._id},"${n.title}","${n.type}","${n.priority}","${n.module}","${n.status}","${new Date(n.createdAt).toLocaleString()}"`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'notifications.csv'; a.click();
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d) => new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

  const selectInput = "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary/50 appearance-none";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage all system notifications and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchNotifications(pagination.page); fetchStats(); }}
            className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Bell}         iconClass="text-slate-600"   bgClass="bg-slate-50 border-slate-100"   title="Total"      count={stats?.total}    subtitle="All time notifications" />
        <StatCard icon={Eye}          iconClass="text-sky-600"     bgClass="bg-sky-50 border-sky-100"       title="Unread"     count={stats?.unread}   subtitle="Pending to read" />
        <StatCard icon={AlertCircle}  iconClass="text-amber-600"   bgClass="bg-amber-50 border-amber-100"   title="Important"  count={stats?.important} subtitle="Require attention" />
        <StatCard icon={Calendar}     iconClass="text-primary"     bgClass="bg-emerald-50 border-emerald-100" title="Today"   count={stats?.today}    subtitle="Received today" />
        <StatCard icon={CheckCircle}  iconClass="text-emerald-600" bgClass="bg-emerald-50 border-emerald-100" title="Resolved" count={stats?.resolved}  subtitle="Marked as resolved" />
      </div>

      {/* 3-column layout */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT: Filters ──────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Filters</span>
            </div>
            <button onClick={handleClearFilters} className="text-[11px] font-semibold text-primary hover:underline">
              Clear All
            </button>
          </div>

          {/* Search */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Search Notifications</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                placeholder="Search by title or message..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectInput}>
              <option value="all">All Types</option>
              <option value="patient">Patient</option>
              <option value="appointment">Appointment</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="laboratory">Laboratory</option>
              <option value="billing">Billing</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Priority</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectInput}>
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Module</label>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className={selectInput}>
              <option value="all">All Modules</option>
              <option value="Patients">Patients</option>
              <option value="Doctors">Doctors</option>
              <option value="Nurses">Nurses</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Billing">Billing</option>
              <option value="Appointments">Appointments</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Date Range</label>
            <div className="space-y-1.5">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${selectInput} text-slate-600`} />
              <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className={`${selectInput} text-slate-600`} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status</label>
            <div className="space-y-2">
              {['all', 'unread', 'read'].map(s => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setFilterStatus(s)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                      filterStatus === s ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {filterStatus === s && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs text-slate-600 font-medium capitalize">{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={handleApplyFilters}
            className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
          >
            <Filter className="w-3.5 h-3.5" /> Apply Filters
          </button>
        </div>

        {/* ── CENTER: Notifications List ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-card shadow-sm flex flex-col">
          {/* List header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">
              All Notifications{' '}
              <span className="text-slate-400 font-normal">({pagination.total})</span>
            </span>
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
            </button>
          </div>

          {/* List body */}
          <div className="divide-y divide-slate-50 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-semibold">No notifications found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                const isActive = selected?._id === n._id;
                return (
                  <div
                    key={n._id}
                    onClick={() => setSelected(n)}
                    className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-slate-50 ${
                      isActive ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    } ${n.status === 'unread' ? '' : 'opacity-70'}`}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${n.status === 'unread' ? 'text-slate-800' : 'text-slate-500'}`}>{n.title}</p>
                        {n.isImportant && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400">{fmtTime(n.createdAt)}</span>
                      <span className={`w-2 h-2 rounded-full ${n.status === 'unread' ? cfg.dot : 'bg-transparent'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Showing {notifications.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchNotifications(pagination.page - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (pagination.totalPages > 5 && pagination.page > 3) {
                  p = pagination.page - 2 + i;
                  if (p > pagination.totalPages) p = pagination.totalPages - 4 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => fetchNotifications(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      pagination.page === p ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              {pagination.totalPages > 5 && (
                <>
                  <span className="text-xs text-slate-400 px-1">...</span>
                  <button
                    onClick={() => fetchNotifications(pagination.totalPages)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      pagination.page === pagination.totalPages ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchNotifications(pagination.page + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Details Panel ──────────────────────────────────────────── */}
        <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-card shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-800">Notification Details</span>
            {selected && (
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          {!selected ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center text-slate-400">
              <Bell className="w-10 h-10 mb-3 opacity-25" />
              <p className="text-sm font-semibold">Select a notification</p>
              <p className="text-xs mt-1">Click any notification from the list to view details</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-none p-5 space-y-5">
              {/* Icon + title */}
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl border ${(TYPE_CONFIG[selected.type] || TYPE_CONFIG.system).iconBg}`}>
                  {(() => { const I = (TYPE_CONFIG[selected.type] || TYPE_CONFIG.system).Icon; return <I className="w-5 h-5 text-primary" />; })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{selected.title}</p>
                    {selected.status === 'unread' && (
                      <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[9px] font-bold rounded">New</span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold mt-0.5 capitalize">{selected.type} {selected.module !== 'System' ? `· ${selected.module}` : ''}</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {fmtDate(selected.createdAt)}, {fmtTime(selected.createdAt)}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message</p>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">{selected.message}</p>
              </div>

              {/* Patient Details */}
              {selected.metadata?.patientName && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Details</p>
                  <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    {[
                      ['Patient Name', selected.metadata.patientName],
                      selected.metadata.patientAge && ['Age / Gender', `${selected.metadata.patientAge}${selected.metadata.patientGender ? ' / ' + selected.metadata.patientGender : ''}`],
                      selected.metadata.patientPhone && ['Phone Number', selected.metadata.patientPhone],
                      selected.metadata.registrationId && ['Registration ID', selected.metadata.registrationId],
                      selected.metadata.doctorName && ['Doctor', selected.metadata.doctorName],
                      selected.metadata.department && ['Department', selected.metadata.department],
                      selected.metadata.medicineName && ['Medicine', selected.metadata.medicineName],
                      selected.metadata.stockLevel && ['Stock Level', selected.metadata.stockLevel + ' units'],
                      selected.metadata.testName && ['Test', selected.metadata.testName],
                      selected.metadata.amount && ['Amount', selected.metadata.amount],
                    ].filter(Boolean).map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start gap-2">
                        <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
                        <span className="text-[11px] font-semibold text-slate-700 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Metadata</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">Priority</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${(PRIORITY_CONFIG[selected.priority] || PRIORITY_CONFIG.medium).color}`}>
                      {selected.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">Status</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.unread).color}`}>
                      {selected.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">Module</span>
                    <span className="text-[11px] font-semibold text-slate-700">{selected.module}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selected && (
            <div className="p-4 border-t border-slate-100 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleMarkRead(selected._id)}
                disabled={selected.status !== 'unread'}
                className="flex flex-col items-center gap-1 py-2 px-1 bg-primary text-white text-[10px] font-bold rounded-xl hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark Read
              </button>
              <button
                onClick={() => handleMarkImportant(selected._id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 border text-[10px] font-bold rounded-xl transition-all ${
                  selected.isImportant
                    ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${selected.isImportant ? 'fill-amber-400 text-amber-400' : ''}`} />
                {selected.isImportant ? 'Starred' : 'Important'}
              </button>
              <button
                onClick={() => handleDelete(selected._id)}
                className="flex flex-col items-center gap-1 py-2 px-1 border border-rose-200 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-xl hover:bg-rose-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
