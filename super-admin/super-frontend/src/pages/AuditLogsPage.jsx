import { useState, useEffect } from 'react';
import { getAuditLogs } from '../utils/api';

const ACTION_BADGE = {
  CREATE: 'success', UPDATE: 'primary', DELETE: 'danger',
  LOGIN: 'cyan', LOGOUT: 'warning', VIEW: 'primary', EXPORT: 'amber',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await getAuditLogs({
        page, limit: 30,
        action: actionFilter || undefined,
        hospitalId: hospitalFilter || undefined,
      });
      setLogs(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter, hospitalFilter]);

  const totalPages = pagination.pages || 1;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Audit Logs</h1>
          <p>{pagination.total || 0} total log entries</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <select
            style={{ width: 180 }}
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Actions</option>
            {['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            style={{ width: 180 }}
            placeholder="Hospital ID..."
            value={hospitalFilter}
            onChange={e => { setHospitalFilter(e.target.value); setPage(1); }}
          />
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>HOSPITAL ID</th>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>User</th>
                  <th>Hospital</th>
                  <th>Description</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 60 }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="icon">🔍</div>
                      <h3>No audit logs found</h3>
                      <p>Logs will appear here as users interact with the system</p>
                    </div>
                  </td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)' }}>
                      {log.hospital_id ? `#${log.hospital_id}` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt || log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${ACTION_BADGE[log.action] || 'primary'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{log.module || '—'}</td>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 500 }}>
                        {log.admin?.name || log.user?.name || (log.module === 'Subscription' ? 'Public Visitor' : 'System')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.admin ? 'Super Admin' : (log.user?.role || (log.module === 'Subscription' ? 'Self-Registered' : 'System'))}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {log.hospital?.name || (log.hospital_id ? `#${log.hospital_id}` : 'Global')}
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i+1} className={page === i+1 ? 'active' : ''} onClick={() => setPage(i+1)}>
                  {i+1}
                </button>
              ))}
              {totalPages > 10 && <span style={{ color: 'var(--text-muted)' }}>…{totalPages}</span>}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
