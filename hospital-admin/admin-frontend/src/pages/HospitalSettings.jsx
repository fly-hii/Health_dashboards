import { useState, useEffect } from 'react';
import { Settings, Clock, Activity, ShieldCheck, Save, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function HospitalSettings() {
  const [settings, setSettings] = useState({
    currency: 'INR',
    timezone: 'IST',
    allowOnlineBooking: true,
    slotDuration: '15',
    maxAdvanceBookingDays: '30',
    pharmacyTaxPercent: '18',
    lowStockThreshold: '10',
    sessionTimeoutMins: '30',
    enforceStrongPassword: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/hospitals/settings');
      if (res.data.success) {
        // Merge fetched settings with default fallbacks
        setSettings(prev => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load configuration settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, val) => {
    setSettings(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/hospitals/settings', { settings });
      if (res.data.success) {
        toast.success('Configuration settings saved successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Hospital Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure clinical bookings, billing taxes, inventory alerts, and security policies.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: General Settings */}
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary" />
            <span>General Config & Currency</span>
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Default Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="IST">IST (UTC +5:30) - India</option>
                <option value="EST">EST (UTC -5:00) - US Eastern</option>
                <option value="GMT">GMT (UTC +0:00) - London</option>
                <option value="GST">GST (UTC +4:00) - Dubai</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Bookings & Consultations */}
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            <span>Consultations & Booking</span>
          </h2>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between py-1 bg-slate-50 px-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Allow Online Booking</span>
                <span className="text-[10px] text-slate-400 block">Enable patients to book slots online.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowOnlineBooking}
                onChange={(e) => handleChange('allowOnlineBooking', e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slot Duration</label>
                <select
                  value={settings.slotDuration}
                  onChange={(e) => handleChange('slotDuration', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="10">10 Mins</option>
                  <option value="15">15 Mins</option>
                  <option value="20">20 Mins</option>
                  <option value="30">30 Mins</option>
                  <option value="45">45 Mins</option>
                  <option value="60">60 Mins</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Max Advance Booking</label>
                <select
                  value={settings.maxAdvanceBookingDays}
                  onChange={(e) => handleChange('maxAdvanceBookingDays', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Pharmacy & Lab Settings */}
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            <span>Pharmacy & Lab Inventory</span>
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pharmacy Tax Rate (%)</label>
              <input
                type="number"
                value={settings.pharmacyTaxPercent}
                onChange={(e) => handleChange('pharmacyTaxPercent', e.target.value)}
                placeholder="e.g. 18"
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Low Stock Threshold Limit</label>
              <input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                placeholder="e.g. 10"
                min="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Triggers low stock alert notifications when quantities fall below this number.</span>
            </div>
          </div>
        </div>

        {/* Card 4: Security & Access Policy */}
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Security & Session Policy</span>
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Session Inactive Timeout (Minutes)</label>
              <select
                value={settings.sessionTimeoutMins}
                onChange={(e) => handleChange('sessionTimeoutMins', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="15">15 Mins</option>
                <option value="30">30 Mins</option>
                <option value="60">60 Mins</option>
                <option value="120">2 Hours</option>
                <option value="480">8 Hours</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-1 bg-slate-50 px-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Enforce Strong Passwords</span>
                <span className="text-[10px] text-slate-400 block">Require mixed case, digits, and special characters.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enforceStrongPassword}
                onChange={(e) => handleChange('enforceStrongPassword', e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
