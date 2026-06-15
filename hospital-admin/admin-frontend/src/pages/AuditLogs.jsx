import { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionQuery, setActionQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await API.get('/audit-logs', {
        params: {
          module: moduleFilter,
          action: actionQuery,
          startDate,
          endDate
        }
      });
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [moduleFilter, actionQuery, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Audit Activity Trails</h1>
        <p className="text-sm text-slate-500 mt-1">Track login activities, database mutations, and system actions.</p>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Module select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">System Module</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
          >
            <option value="">All Modules</option>
            <option value="Auth">Authentication</option>
            <option value="User Management">User Management</option>
            <option value="Patients">Patients File</option>
            <option value="Appointments">Appointments Desk</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Billing">Billing</option>
            <option value="Reports">Reports</option>
          </select>
        </div>

        {/* Action text search */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Search Action Activity</label>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Search className="w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Creation, Update..."
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Date start */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Date end */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* LOGS TABLE LIST */}
      <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No audit logs matching this query found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Triggered By</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Action Type</th>
                  <th className="pb-3">System Module</th>
                  <th className="pb-3">Activity Description</th>
                  <th className="pb-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4 text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(l.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">{l.user?.name || 'System Auto'}</td>
                    <td className="py-4 text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                        {l.user?.role || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-slate-700">{l.action}</td>
                    <td className="py-4 text-slate-500 font-semibold">{l.module}</td>
                    <td className="py-4 text-slate-500 max-w-xs truncate" title={l.description}>{l.description}</td>
                    <td className="py-4 text-right font-mono text-slate-400">{l.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
