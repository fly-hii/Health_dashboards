import { useState, useEffect } from 'react';
import { getAnalytics } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PLAN_COLORS = { trial: '#06b6d4', basic: '#6366f1', professional: '#f59e0b', enterprise: '#10b981' };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div><div className="topbar"><div className="topbar-left"><h1>Analytics</h1></div></div>
      <div className="loader-center"><div className="spinner" /></div></div>
  );

  const ov = data?.overview || {};
  const monthlyRevenue = (data?.monthlyRevenue || []).map(m => ({
    name: new Date(m.year, m.month - 1).toLocaleString('en', { month: 'short', year: '2-digit' }),
    revenue: parseFloat(m.total || 0),
  }));
  const planData = (data?.hospitalsByPlan || []).map(p => ({
    name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    value: parseInt(p.count),
  }));

  const summary = [
    { label: 'Total Hospitals',  value: ov.totalHospitals   || 0, icon: '🏥', color: 'indigo' },
    { label: 'Active',           value: ov.activeHospitals  || 0, icon: '✅', color: 'green' },
    { label: 'Suspended',        value: ov.suspendedHospitals||0, icon: '🚫', color: 'red' },
    { label: 'Trial',            value: ov.trialHospitals   || 0, icon: '⏳', color: 'cyan' },
    { label: 'Total Staff',      value: ov.totalUsers       || 0, icon: '👥', color: 'amber' },
    { label: 'Total Revenue',    value: `₹${(ov.totalRevenue||0).toLocaleString()}`, icon: '💰', color: 'green' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-muted)' }}>{label}</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Analytics</h1>
          <p>Platform-wide performance metrics</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          {summary.map(s => (
            <div key={s.label} className={`stat-card ${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="charts-grid">
          {/* Revenue Chart */}
          <div className="card">
            <div className="card-header"><h3>💰 Monthly Revenue</h3></div>
            <div style={{ padding: '20px 10px' }}>
              {monthlyRevenue.length === 0 ? (
                <div className="empty-state"><div className="icon">📈</div><p>No revenue data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={v => `₹${v.toLocaleString()}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
                    <Bar dataKey="revenue" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Plan Distribution Pie */}
          <div className="card">
            <div className="card-header"><h3>🏷️ Plan Distribution</h3></div>
            <div style={{ padding: '20px 10px' }}>
              {planData.length === 0 ? (
                <div className="empty-state"><div className="icon">📊</div><p>No plan data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={planData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {planData.map((entry) => (
                        <Cell key={entry.name} fill={PLAN_COLORS[entry.name.toLowerCase()] || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Hospitals']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Health Overview */}
        <div className="card">
          <div className="card-header"><h3>📊 Platform Health Overview</h3></div>
          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 24 }}>
            {[
              { label: 'Activation Rate', value: ov.totalHospitals ? Math.round((ov.activeHospitals/ov.totalHospitals)*100) : 0, suffix: '%', color: '#10b981' },
              { label: 'Suspension Rate', value: ov.totalHospitals ? Math.round((ov.suspendedHospitals/ov.totalHospitals)*100) : 0, suffix: '%', color: '#ef4444' },
              { label: 'Trial Conversion Target', value: ov.trialHospitals || 0, suffix: ' hospitals', color: '#06b6d4' },
              { label: 'Avg Revenue/Hospital', value: ov.totalHospitals ? Math.round(ov.totalRevenue/ov.totalHospitals) : 0, prefix: '₹', color: '#f59e0b' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: m.color }}>
                  {m.prefix || ''}{m.value}{m.suffix || ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
