import { useState, useEffect, useCallback } from 'react';
import { nurseService } from '../../services/nurseService';
import { useNotifications } from '../../context/NotificationContext';
import EmergencyCard from '../../components/nurse/EmergencyCard';
import { toast } from 'react-toastify';

const PRIORITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'];

const PRIORITY_COLORS = {
  critical: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  high:     { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
  medium:   { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' },
  low:      { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
};

const EmergencyQueue = () => {
  const { queueUpdateTime }           = useNotifications();
  const [queue, setQueue]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [priorityFilter, setPriority] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await nurseService.getEmergencyQueue();
      setQueue(res.data.data);
    } catch { toast.error('Failed to load emergency queue'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue, queueUpdateTime]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue]);

  const filtered = priorityFilter === 'all' ? queue : queue.filter((a) => a.emergencyPriority === priorityFilter);

  const counts = queue.reduce((acc, a) => {
    acc[a.emergencyPriority] = (acc[a.emergencyPriority] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🚨 Emergency Queue</h1>
          <p className="page-subtitle">{queue.length} active emergency patient{queue.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ accentColor: 'var(--primary-600)' }} />
            Auto-refresh (30s)
          </label>
          <button className="btn btn-danger btn-sm" onClick={fetchQueue}>🔄 Refresh</button>
        </div>
      </div>

      {/* Priority Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {['critical', 'high', 'medium', 'low'].map((p) => {
          const colors = PRIORITY_COLORS[p];
          return (
            <div
              key={p}
              onClick={() => setPriority(priorityFilter === p ? 'all' : p)}
              style={{
                background: priorityFilter === p ? colors.bg : 'var(--bg-card)',
                border: `2px solid ${priorityFilter === p ? colors.border : 'var(--border-color)'}`,
                borderRadius: 12, padding: '16px 20px',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={(e) => { if (priorityFilter !== p) e.currentTarget.style.borderColor = colors.border; }}
              onMouseLeave={(e) => { if (priorityFilter !== p) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: colors.text }}>{counts[p] || 0}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p}</div>
              </div>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: colors.text,
                ...(p === 'critical' ? { animation: 'pulse-ring 1.5s ease-out infinite' } : {}),
              }} />
            </div>
          );
        })}
      </div>

      {/* Priority Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {PRIORITY_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`badge ${p === 'all' ? (priorityFilter === 'all' ? 'badge-blue' : 'badge-gray') : `priority-${p}`}`}
            style={{
              padding: '6px 14px', border: 'none', cursor: 'pointer',
              opacity: priorityFilter === p ? 1 : 0.5,
              transform: priorityFilter === p ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.15s',
              fontSize: '0.8125rem',
            }}
          >
            {p === 'all' ? `All (${queue.length})` : `${p.charAt(0).toUpperCase() + p.slice(1)} (${counts[p] || 0})`}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 240 }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="empty-state card" style={{ padding: '48px' }}>
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">No emergency patients</div>
          <div className="empty-state-text">
            {priorityFilter === 'all' ? 'No active emergency cases at the moment.' : `No ${priorityFilter} priority cases.`}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((appt) => (
            <EmergencyCard key={appt._id} appointment={appt} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default EmergencyQueue;
