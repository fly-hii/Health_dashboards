import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getHospitals, getSystemStatus } from '../utils/api';

const PLANS = { trial: 'cyan', basic: 'primary', professional: 'amber', enterprise: 'green' };
const STATUS = { active: 'success', suspended: 'danger', trial: 'cyan', expired: 'warning' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    Promise.all([getAnalytics(), getHospitals({ limit: 5 }), getSystemStatus()])
      .then(([aRes, hRes, sRes]) => {
        setAnalytics(aRes.data.data);
        setHospitals(hRes.data.data || []);
        setSystemStatus(sRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Poll system status every 15 seconds
    const interval = setInterval(() => {
      getSystemStatus()
        .then(res => setSystemStatus(res.data.data))
        .catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div>
      <div className="topbar"><div className="topbar-left"><h1>Dashboard</h1></div></div>
      <div className="loader-center"><div className="spinner" /></div>
    </div>
  );

  const ov = analytics?.overview || {};

  const stats = [
    { label: 'Total Hospitals',   value: ov.totalHospitals   || 0, icon: '🏥', color: 'indigo', change: 'All registered tenants' },
    { label: 'Active Hospitals',  value: ov.activeHospitals  || 0, icon: '✅', color: 'green',  change: 'Currently operational' },
    { label: 'Suspended',         value: ov.suspendedHospitals||0, icon: '🚫', color: 'red',    change: 'Needs attention' },
    { label: 'Total Staff Users', value: ov.totalUsers       || 0, icon: '👥', color: 'cyan',   change: 'Across all hospitals' },
    { label: 'Total Revenue',     value: `₹${(ov.totalRevenue||0).toLocaleString()}`, icon: '💰', color: 'amber', change: 'Lifetime subscriptions' },
    { label: 'Trial Hospitals',   value: ov.trialHospitals   || 0, icon: '⏳', color: 'indigo', change: 'Convert to paid' },
  ];

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Dashboard</h1>
          <p>Welcome back — CarePlus SaaS Overview</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => navigate('/hospitals?create=1')}>
            ＋ New Hospital
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          {stats.map((s) => (
            <div key={s.label} className={`stat-card ${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change">{s.change}</div>
            </div>
          ))}
        </div>

        {/* Plan Distribution */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-header"><h3>🏷️ Plan Distribution</h3></div>
            <div style={{ padding: '20px' }}>
              {(analytics?.hospitalsByPlan || []).length === 0
                ? <div className="empty-state"><div className="icon">📊</div><p>No data yet</p></div>
                : (analytics?.hospitalsByPlan || []).map((p) => (
                  <div key={p.plan || 'unassigned'} style={{ marginBottom: 14 }}>
                    <div className="flex-between mb-4" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, textTransform: 'capitalize', fontWeight: 500 }}>
                        {p.plan || 'no plan'}
                      </span>
                      <span className={`badge badge-${PLANS[p.plan] || 'primary'}`}>{p.count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (p.count / (ov.totalHospitals || 1)) * 100)}%`,
                        height: '100%',
                        background: 'var(--gradient)',
                        borderRadius: 4,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>💰 Monthly Revenue (Last 6 Months)</h3></div>
            <div style={{ padding: '20px' }}>
              {(analytics?.monthlyRevenue || []).length === 0
                ? <div className="empty-state"><div className="icon">📈</div><p>No revenue data yet</p></div>
                : (analytics?.monthlyRevenue || []).map((m) => {
                    const label = new Date(m.year, m.month - 1).toLocaleString('en', { month: 'short', year: '2-digit' });
                    const maxAmt = Math.max(...(analytics.monthlyRevenue.map(x => x.total)), 1);
                    return (
                      <div key={`${m.year}-${m.month}`} style={{ marginBottom: 14 }}>
                        <div className="flex-between" style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                          <span style={{ fontSize: 13, color: 'var(--success)' }}>₹{parseFloat(m.total).toLocaleString()}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            width: `${(m.total / maxAmt) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg,#10b981,#06b6d4)',
                            borderRadius: 4,
                          }} />
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* Combined Recent Hospitals & System status */}
        <div className="charts-grid" style={{ marginTop: 28, gridTemplateColumns: '2fr 1.2fr' }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h3>🏥 Recent Hospitals</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hospitals')}>View All →</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Staff</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No hospitals yet. Create your first one!
                    </td></tr>
                  ) : hospitals.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.code || h.city}</div>
                      </td>
                      <td><span className={`badge badge-${PLANS[h.plan] || 'primary'}`}>{h.plan}</span></td>
                      <td><span className={`badge badge-${STATUS[h.status] || 'warning'}`}>{h.status}</span></td>
                      <td>{h.user_count || 0}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/hospitals/${h.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🖥️ Server & Platform Monitoring</h3>
              <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: 11 }}>● Live</span>
            </div>
            <div style={{ padding: 20 }}>
              {systemStatus ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="flex-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Master Database</span>
                    <span className={`badge badge-${systemStatus.databases?.masterDb === 'online' ? 'success' : 'danger'}`} style={{ fontSize: 11 }}>
                      {systemStatus.databases?.masterDb === 'online' ? 'Connected' : 'Offline'}
                    </span>
                  </div>

                  <div className="flex-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>External Connections</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      <span style={{ color: 'var(--success)' }}>{systemStatus.databases?.externalActive || 0} OK</span>
                      {systemStatus.databases?.externalFailed > 0 && (
                        <span style={{ color: 'var(--danger)', marginLeft: 8 }}>{systemStatus.databases?.externalFailed} Failed</span>
                      )}
                    </span>
                  </div>

                  <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>CPU Load Average</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {systemStatus.cpuLoad ? systemStatus.cpuLoad[0].toFixed(2) : '0.00'}
                      </span>
                    </div>
                    {systemStatus.cpuLoad && (
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>1m: {systemStatus.cpuLoad[0].toFixed(2)}</span>
                        <span>5m: {systemStatus.cpuLoad[1].toFixed(2)}</span>
                        <span>15m: {systemStatus.cpuLoad[2].toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>RAM Usage</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {systemStatus.memory ? systemStatus.memory.percentage : 0}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{
                        width: `${systemStatus.memory ? systemStatus.memory.percentage : 0}%`,
                        height: '100%',
                        background: systemStatus.memory?.percentage > 85 ? 'var(--danger)' : 'var(--gradient)',
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    {systemStatus.memory && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Used: {(systemStatus.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB / 
                        Total: {(systemStatus.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div className="flex-between">
                      <span>Uptime</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {(() => {
                          const upt = systemStatus.uptime || 0;
                          const h = Math.floor(upt / 3600);
                          const m = Math.floor((upt % 3600) / 60);
                          return `${h}h ${m}m`;
                        })()}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span>Node Version</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{systemStatus.nodeVersion}</span>
                    </div>
                    <div className="flex-between">
                      <span>OS Platform</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{systemStatus.platform}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state"><p>No system status data</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
