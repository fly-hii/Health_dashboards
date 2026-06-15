import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalytics, getHospitals } from '../utils/api';

const PLANS = { trial: 'cyan', basic: 'primary', professional: 'amber', enterprise: 'green' };
const STATUS = { active: 'success', suspended: 'danger', trial: 'cyan', expired: 'warning' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalytics(), getHospitals({ limit: 5 })])
      .then(([aRes, hRes]) => {
        setAnalytics(aRes.data.data);
        setHospitals(hRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
                  <div key={p.plan} style={{ marginBottom: 14 }}>
                    <div className="flex-between mb-4" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, textTransform: 'capitalize', fontWeight: 500 }}>
                        {p.plan}
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

        {/* Recent Hospitals */}
        <div className="card">
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
      </div>
    </div>
  );
}
