import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHospital, suspendHospital, activateHospital, updateHospitalPlan } from '../utils/api';

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

  const fetchHospital = async () => {
    setLoading(true);
    try {
      const { data } = await getHospital(id);
      setHospital(data.data);
      setPlanForm(p => ({ ...p, plan: data.data.plan }));
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
          <h1>{h.name}</h1>
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
    </div>
  );
}
