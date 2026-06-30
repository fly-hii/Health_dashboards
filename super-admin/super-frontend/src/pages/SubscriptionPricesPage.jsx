import { useState, useEffect, useCallback } from 'react';
import { getPlans, updatePlan } from '../utils/api';

function PlanCard({ plan, onSaved }) {
  const [form, setForm] = useState({
    name: plan.name,
    price: plan.price,
    currency: plan.currency || 'USD',
    color: plan.color || '#0F9D8A',
    description: plan.description || '',
    features: (plan.features || []).join('\n'),
    is_active: plan.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSuccess(''); };

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (form.price === '' || Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
      setError('Please enter a valid non-negative price.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        currency: form.currency,
        color: form.color,
        description: form.description,
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        is_active: form.is_active,
      };
      const { data } = await updatePlan(plan.id, payload);
      if (data.success) {
        setSuccess('Saved! The marketing site will reflect this on next load.');
        onSaved?.(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24, borderTop: `4px solid ${form.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="badge badge-primary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{plan.plan_key}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Active
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 18px' }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>
          {form.currency === 'USD' ? '$' : `${form.currency} `}{Number(form.price || 0).toLocaleString()}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ month</span>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label>Plan Name</label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Monthly Price</label>
            <input type="number" min="0" step="1" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <input type="text" value={form.currency} onChange={(e) => set('currency', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Accent Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} style={{ width: 44, height: 38, padding: 2, cursor: 'pointer' }} />
            <input type="text" value={form.color} onChange={(e) => set('color', e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="form-group">
          <label>Features <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(one per line)</span></label>
          <textarea rows={6} value={form.features} onChange={(e) => set('features', e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ justifyContent: 'center' }}>
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionPricesPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await getPlans();
      if (data.success) setPlans(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated) => {
    setPlans(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Subscription Prices</h1>
          <p>Edit the public pricing plans shown on the marketing website checkout page</p>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="error-msg">{error}</div>}

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading plans...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onSaved={handleSaved} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
