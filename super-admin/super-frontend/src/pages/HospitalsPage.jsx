import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getHospitals, createHospital, suspendHospital, activateHospital, updateHospitalPlan, testDbConnection } from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';

const STATUS_BADGE = { active: 'success', suspended: 'danger', trial: 'cyan', expired: 'warning' };
const PLAN_BADGE   = { trial: 'cyan', basic: 'primary', professional: 'amber', enterprise: 'green' };

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', code: '', email: '', adminPassword: '',
    phone: '', city: '', state: '', plan: 'trial',
    maxUsers: 10, maxPatients: 500,
    useExternalDb: false,
    dbHost: '', dbPort: 3306, dbName: '',
    dbUser: '', dbPassword: '', dbSsl: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestStatus('');
    try {
      const { data } = await testDbConnection(0, {
        host: form.dbHost,
        port: form.dbPort,
        database_name: form.dbName,
        username: form.dbUser,
        password: form.dbPassword,
        ssl_enabled: form.dbSsl
      });
      if (data?.success) {
        setTestStatus('✅ Connection successful!');
      } else {
        setTestStatus('❌ Connection failed');
      }
    } catch (err) {
      setTestStatus(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setTestingConn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createHospital(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>🏥 Create New Hospital</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Hospital Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="City General Hospital" required />
            </div>
            <div className="form-group">
              <label>Hospital Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="CGH001" required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Admin Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@hospital.com" required />
            </div>
            <div className="form-group">
              <label>Admin Password *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showAdminPassword ? "text" : "password"} 
                  value={form.adminPassword} 
                  onChange={e => set('adminPassword', e.target.value)} 
                  placeholder="Min 8 chars" 
                  required 
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    color: '#94a3b8'
                  }}
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
            </div>
            <div className="form-group">
              <label>Subscription Plan</label>
              <select value={form.plan} onChange={e => set('plan', e.target.value)}>
                <option value="trial">Trial (Free)</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="Maharashtra" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input 
                type="checkbox" 
                checked={form.useExternalDb} 
                onChange={e => set('useExternalDb', e.target.checked)} 
              />
              Use Existing/External Database (BYOD)
            </label>
          </div>

          {form.useExternalDb && (
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>🔌 External Database Settings</h4>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Database Host *</label>
                  <input value={form.dbHost} onChange={e => set('dbHost', e.target.value)} placeholder="host.rds.amazonaws.com" required={form.useExternalDb} />
                </div>
                <div className="form-group">
                  <label>Database Port</label>
                  <input type="number" value={form.dbPort} onChange={e => set('dbPort', +e.target.value)} placeholder="3306" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Database Name *</label>
                  <input value={form.dbName} onChange={e => set('dbName', e.target.value)} placeholder="my_hospital_db" required={form.useExternalDb} />
                </div>
                <div className="form-group">
                  <label>Database Username *</label>
                  <input value={form.dbUser} onChange={e => set('dbUser', e.target.value)} placeholder="db_user" required={form.useExternalDb} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Database Password *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showDbPassword ? "text" : "password"} 
                      value={form.dbPassword} 
                      onChange={e => set('dbPassword', e.target.value)} 
                      placeholder="Password" 
                      required={form.useExternalDb} 
                      style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDbPassword(!showDbPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        color: '#94a3b8'
                      }}
                    >
                      {showDbPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 12 }}>
                    <input type="checkbox" checked={form.dbSsl} onChange={e => set('dbSsl', e.target.checked)} />
                    Enable SSL
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={handleTestConnection} 
                  disabled={testingConn || !form.dbHost || !form.dbName || !form.dbUser || !form.dbPassword}
                >
                  {testingConn ? '⏳ Testing...' : '⚡ Test Connection'}
                </button>
                {testStatus && (
                  <span style={{ fontSize: 13, color: testStatus.includes('✅') ? '#00e676' : '#ff1744' }}>
                    {testStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Creating...' : '✅ Create Hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanModal({ hospital, onClose, onUpdated }) {
  const [form, setForm] = useState({ plan: hospital.plan, billingCycle: 'monthly', amount: 0 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateHospitalPlan(hospital.id, form);
      onUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <h2>🏷️ Update Plan — {hospital.name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Plan</label>
            <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="form-group">
            <label>Billing Cycle</label>
            <select value={form.billingCycle} onChange={e => setForm(p => ({ ...p, billingCycle: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (3 months)</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: +e.target.value }))} min={0} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Updating...' : '✅ Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HospitalsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hospitals, setHospitals] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1');
  const [planModal, setPlanModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getHospitals({ page, limit: 15, search: search || undefined, status: statusFilter || undefined });
      setHospitals(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchHospitals(); }, [fetchHospitals]);

  const handleSuspend = async (h) => {
    if (!confirm(`Suspend "${h.name}"? This will disable access.`)) return;
    setActionLoading(h.id);
    try {
      await suspendHospital(h.id);
      fetchHospitals();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleActivate = async (h) => {
    setActionLoading(h.id);
    try {
      await activateHospital(h.id);
      fetchHospitals();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const totalPages = pagination.pages || 1;

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Hospitals</h1>
          <p>{pagination.total || 0} registered tenants</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ New Hospital</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <span>🔍</span>
            <input
              placeholder="Search hospitals..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            style={{ width: 160 }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hospital</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Staff</th>
                  <th>City</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 60 }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : hospitals.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="icon">🏥</div>
                      <h3>No hospitals found</h3>
                      <p>Create your first hospital to get started</p>
                    </div>
                  </td></tr>
                ) : hospitals.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{h.code} · {h.email}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${PLAN_BADGE[h.plan] || 'primary'}`}>
                        {h.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${STATUS_BADGE[h.status] || 'warning'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td>{h.user_count || 0}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{h.city || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {h.plan_expires_at ? new Date(h.plan_expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/hospitals/${h.id}`)}>
                          👁
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPlanModal(h)}>
                          🏷
                        </button>
                        {actionLoading === h.id ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span>
                        ) : h.status === 'suspended' ? (
                          <button className="btn btn-success-outline btn-sm" onClick={() => handleActivate(h)}>✅</button>
                        ) : (
                          <button className="btn btn-danger-outline btn-sm" onClick={() => handleSuspend(h)}>🚫</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i+1} className={page === i+1 ? 'active' : ''} onClick={() => setPage(i+1)}>
                  {i+1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchHospitals(); }}
        />
      )}
      {planModal && (
        <PlanModal
          hospital={planModal}
          onClose={() => setPlanModal(null)}
          onUpdated={() => { setPlanModal(null); fetchHospitals(); }}
        />
      )}
    </div>
  );
}
