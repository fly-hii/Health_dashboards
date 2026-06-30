import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getHospital, suspendHospital, activateHospital, updateHospitalPlan,
  getDbConfig, upsertDbConfig, deleteDbConfig, testDbConnection
} from '../utils/api';

const STATUS_BADGE = { active: 'success', suspended: 'danger', trial: 'cyan', expired: 'warning' };
const PLAN_BADGE   = { trial: 'cyan', basic: 'primary', professional: 'amber', enterprise: 'green' };

export default function HospitalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [planForm, setPlanForm] = useState({ plan: '', billingCycle: 'monthly', amount: 0 });
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [msg, setMsg] = useState('');

  // DB connection states
  const [dbConfig, setDbConfig] = useState(null);
  const [dbForm, setDbForm] = useState({ host: '', port: 3306, database_name: '', username: '', password: '', ssl_enabled: false, notes: '' });
  const [showDbModal, setShowDbModal] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbMsg, setDbMsg] = useState('');
  const [showDbPassword, setShowDbPassword] = useState(false);

  const fetchHospital = async () => {
    setLoading(true);
    try {
      const { data } = await getHospital(id);
      setHospital(data.data);
      setPlanForm(p => ({ ...p, plan: data.data.plan }));
      if (data.data.database_type === 'external') {
        const connRes = await getDbConfig(id).catch(() => null);
        if (connRes && connRes.data && connRes.data.success) {
          setDbConfig(connRes.data.data);
          setDbForm({
            host: connRes.data.data.host || '',
            port: connRes.data.data.port || 3306,
            database_name: connRes.data.data.database_name || '',
            username: connRes.data.data.username || '',
            password: '',
            ssl_enabled: !!connRes.data.data.ssl_enabled,
            notes: connRes.data.data.notes || ''
          });
        } else {
          setDbConfig(null);
        }
      } else {
        setDbConfig(null);
        setDbForm({ host: '', port: 3306, database_name: '', username: '', password: '', ssl_enabled: false, notes: '' });
      }
    } catch { navigate('/hospitals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHospital(); }, [id]);

  const handleToggle = async () => {
    setActionLoading(true);
    try {
      if (hospital.status === 'suspended') {
        await activateHospital(id);
        setMsg('✅ Hospital activated successfully');
      } else {
        if (!confirm(`Suspend "${hospital.name}"?`)) { setActionLoading(false); return; }
        await suspendHospital(id);
        setMsg('🚫 Hospital suspended');
      }
      await fetchHospital();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.message || 'Action failed')); }
    finally { setActionLoading(false); }
  };

  const handlePlanUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateHospitalPlan(id, planForm);
      setMsg('✅ Plan updated successfully');
      setShowPlanEdit(false);
      await fetchHospital();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.message || 'Failed')); }
    finally { setActionLoading(false); }
  };

  const handleDbSave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setDbMsg('');
    try {
      const res = await upsertDbConfig(id, dbForm);
      setDbMsg('✅ ' + res.data.message);
      setShowDbModal(false);
      await fetchHospital();
    } catch (err) {
      setDbMsg('❌ ' + (err.response?.data?.message || 'Failed to save DB configuration'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestConnection = async (testFormValues = null) => {
    setDbTesting(true);
    setDbMsg('');
    try {
      const res = await testDbConnection(id, testFormValues);
      setDbMsg(res.data.message || '✅ Connection successful');
      if (!testFormValues) {
        await fetchHospital();
      }
    } catch (err) {
      setDbMsg(err.response?.data?.message || '❌ Connection test failed');
    } finally {
      setDbTesting(false);
    }
  };

  const handleDbDelete = async () => {
    if (!confirm('⚠️ Are you sure you want to remove these external database credentials? This will switch the hospital database back to the shared SaaS database. Any data must be migrated beforehand.')) {
      return;
    }
    setActionLoading(true);
    setDbMsg('');
    try {
      const res = await deleteDbConfig(id);
      setDbMsg('✅ ' + res.data.message);
      setDbConfig(null);
      await fetchHospital();
    } catch (err) {
      setDbMsg('❌ ' + (err.response?.data?.message || 'Failed to delete configuration'));
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) return (
    <div><div className="topbar"><div className="topbar-left"><h1>Hospital Details</h1></div></div>
      <div className="loader-center"><div className="spinner" /></div></div>
  );

  if (!hospital) return null;

  const h = hospital;
  const subs = h.subscriptions || [];
  const payments = h.payments || [];

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {h.name}
            {h.database_type === 'external' && (
              <span className="badge badge-success" style={{ fontSize: 11, textTransform: 'uppercase', padding: '3px 8px' }}>
                Private DB
              </span>
            )}
          </h1>
          <p>Hospital Details & Management</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/hospitals')}>← Back</button>
          <button
            className={`btn ${h.status === 'suspended' ? 'btn-success-outline' : 'btn-danger-outline'}`}
            onClick={handleToggle}
            disabled={actionLoading}
          >
            {actionLoading ? '⏳' : h.status === 'suspended' ? '✅ Activate' : '🚫 Suspend'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
          {/* Info */}
          <div className="card">
            <div className="card-header"><h3>🏥 Hospital Info</h3></div>
            <div style={{ padding: 20 }}>
              {[
                ['Name', h.name],
                ['Code', h.code],
                ['Email', h.email],
                ['Phone', h.phone || '—'],
                ['City', h.city || '—'],
                ['State', h.state || '—'],
                ['Type', h.type || '—'],
                ['Beds', h.bed_count || '—'],
                ['Staff Users', h.user_count || 0],
              ].map(([k, v]) => (
                <div key={k} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span>
                </div>
              ))}
              <div className="flex-between" style={{ padding: '9px 0' }}>
                <span className="text-muted">Status</span>
                <span className={`badge badge-${STATUS_BADGE[h.status] || 'warning'}`}>{h.status}</span>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="card">
            <div className="card-header">
              <h3>🏷️ Subscription</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPlanEdit(v => !v)}>
                {showPlanEdit ? 'Cancel' : '✏️ Edit Plan'}
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {showPlanEdit ? (
                <form onSubmit={handlePlanUpdate}>
                  <div className="form-group">
                    <label>Plan</label>
                    <select value={planForm.plan} onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}>
                      <option value="trial">Trial</option>
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Billing Cycle</label>
                    <select value={planForm.billingCycle} onChange={e => setPlanForm(p => ({ ...p, billingCycle: e.target.value }))}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" value={planForm.amount} onChange={e => setPlanForm(p => ({ ...p, amount: +e.target.value }))} min={0} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ width: '100%' }}>
                    {actionLoading ? '⏳ Saving...' : '✅ Save Plan'}
                  </button>
                </form>
              ) : (
                <>
                  {[
                    ['Current Plan', <span className={`badge badge-${PLAN_BADGE[h.plan] || 'primary'}`}>{h.plan}</span>],
                    ['Expires At', h.plan_expires_at ? new Date(h.plan_expires_at).toLocaleDateString() : '—'],
                    ['Max Users', h.max_users || '—'],
                    ['Max Patients', h.max_patients || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="text-muted">{k}</span>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{v}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Subscription History</div>
                    {subs.length === 0 ? <p className="text-muted" style={{ fontSize: 13 }}>No subscription records</p> : subs.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ textTransform: 'capitalize' }}>{s.plan}</span>
                        <span className={`badge badge-${STATUS_BADGE[s.status] || 'warning'}`} style={{ fontSize: 10 }}>{s.status}</span>
                        <span className="text-muted">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Database Connection Settings */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3>🔌 Database Connection</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {h.database_type === 'external' ? (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleTestConnection()} disabled={dbTesting || actionLoading}>
                    {dbTesting ? '⏳ Testing...' : '⚡ Test Connection'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setDbForm({
                      host: dbConfig?.host || '',
                      port: dbConfig?.port || 3306,
                      database_name: dbConfig?.database_name || '',
                      username: dbConfig?.username || '',
                      password: '',
                      ssl_enabled: !!dbConfig?.ssl_enabled,
                      notes: dbConfig?.notes || ''
                    });
                    setShowDbPassword(false);
                    setShowDbModal(true);
                  }}>
                    ✏️ Edit Credentials
                  </button>
                  <button className="btn btn-danger-outline btn-sm" onClick={handleDbDelete} disabled={actionLoading}>
                    🗑️ Delete Credentials
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setDbForm({ host: '', port: 3306, database_name: '', username: '', password: '', ssl_enabled: false, notes: '' });
                  setShowDbPassword(false);
                  setShowDbModal(true);
                }}>
                  🔌 Configure External DB
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {dbMsg && (
              <div className={`alert ${dbMsg.includes('❌') || dbMsg.includes('failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
                {dbMsg}
              </div>
            )}

            {h.database_type === 'external' ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  This tenant is configured to run on an isolated external database instance (BYOD - Bring Your Own Database).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Host</div>
                    <div style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-all' }}>{dbConfig?.host || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Port</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{dbConfig?.port || '3306'}</div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Database Name</div>
                    <div style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-all' }}>{dbConfig?.database_name || '—'}</div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Username</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{dbConfig?.username || '—'}</div>
                  </div>
                </div>
                {dbConfig && (
                  <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>SSL Enabled: <strong>{dbConfig.ssl_enabled ? 'Yes' : 'No'}</strong></span>
                    <span>Test Status: <strong style={{ color: dbConfig.test_status === 'success' ? 'var(--success)' : 'var(--danger)' }}>{dbConfig.test_status || 'Never Tested'}</strong></span>
                    {dbConfig.last_tested_at && (
                      <span>Last Tested: <strong>{new Date(dbConfig.last_tested_at).toLocaleString()}</strong></span>
                    )}
                  </div>
                )}
                {dbConfig?.notes && (
                  <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes: </span>
                    {dbConfig.notes}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Shared Database Deployment</h4>
                <p className="text-muted" style={{ fontSize: 13, maxWidth: 500, margin: '0 auto' }}>
                  This hospital is currently using the primary shared multi-tenant SaaS database. All schemas and resources are isolated logically via row-level client keys.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="card">
          <div className="card-header"><h3>💰 Payment History</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Transaction</th></tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state"><div className="icon">💳</div><p>No payment records yet</p></div>
                  </td></tr>
                ) : payments.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>₹{parseFloat(p.amount || 0).toLocaleString()}</td>
                    <td style={{ fontSize: 13 }}>{p.payment_method || '—'}</td>
                    <td><span className={`badge badge-${p.status === 'success' ? 'success' : 'danger'}`}>{p.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.transaction_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DB Configuration Modal */}
      {showDbModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <h2>🔌 {h.database_type === 'external' ? 'Edit' : 'Configure'} External Database Connection</h2>
            <form onSubmit={handleDbSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Host *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. database.example.com"
                    value={dbForm.host}
                    onChange={e => setDbForm({ ...dbForm, host: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Port *</label>
                  <input
                    type="number"
                    required
                    placeholder="3306"
                    value={dbForm.port}
                    onChange={e => setDbForm({ ...dbForm, port: parseInt(e.target.value) || 3306 })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Database Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. careplus_hospital_db"
                    value={dbForm.database_name}
                    onChange={e => setDbForm({ ...dbForm, database_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={dbForm.username}
                    onChange={e => setDbForm({ ...dbForm, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password {h.database_type === 'external' ? '(Leave blank to keep existing)' : '*'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDbPassword ? 'text' : 'password'}
                    required={h.database_type !== 'external'}
                    placeholder="••••••••"
                    value={dbForm.password}
                    onChange={e => setDbForm({ ...dbForm, password: e.target.value })}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0'
                    }}
                  >
                    {showDbPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={dbForm.ssl_enabled}
                    onChange={e => setDbForm({ ...dbForm, ssl_enabled: e.target.checked })}
                  />
                  Require SSL Connection
                </label>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional deployment details, server location, instance size..."
                  value={dbForm.notes || ''}
                  onChange={e => setDbForm({ ...dbForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={dbTesting || actionLoading}
                  onClick={() => handleTestConnection(dbForm)}
                >
                  {dbTesting ? '⏳ Testing...' : '⚡ Test Connection'}
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={dbTesting || actionLoading}
                    onClick={() => setShowDbModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={dbTesting || actionLoading}
                  >
                    {actionLoading ? '⏳ Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
