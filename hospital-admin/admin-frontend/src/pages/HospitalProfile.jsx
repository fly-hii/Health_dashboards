import { useState, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, Globe, CreditCard, Users, ShieldAlert, Edit, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function HospitalProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [logoUrl, setLogoUrl] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await API.get('/hospitals/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        const data = res.data.data;
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setCountry(data.country || 'India');
        setLogoUrl(data.logo_url || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load hospital profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) return toast.warning('Hospital Name is required');

    try {
      const res = await API.put('/hospitals/profile', {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        logo_url: logoUrl
      });
      if (res.data.success) {
        setProfile(res.data.data);
        setIsEditing(false);
        toast.success('Hospital profile updated successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update hospital profile');
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
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Hospital Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Configure and manage clinical profile, location, and registry identifiers.</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                fetchProfile();
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Logo & Quick stats */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col items-center justify-between text-center">
          <div className="w-full flex flex-col items-center">
            <div className="w-32 h-32 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3 overflow-hidden shadow-inner relative group">
              <img
                src={logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${name || 'CarePlus'}`}
                alt="Hospital Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${name || 'CarePlus'}`;
                }}
              />
            </div>
            
            <h2 className="text-base font-bold text-slate-800 mt-4 leading-snug">{name}</h2>
            <div className="mt-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-mono font-bold text-[10px] uppercase tracking-wider">
              Code: {profile?.code}
            </div>
          </div>

          {/* SaaS Details */}
          <div className="w-full mt-8 pt-6 border-t border-slate-100 text-left space-y-3.5 text-xs text-slate-500">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Subscription Plan</span>
              <span className="font-bold text-primary capitalize">{profile?.plan || 'Basic'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Account Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                profile?.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {profile?.status?.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Plan Renewal</span>
              <span className="font-medium text-slate-700">
                {profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString() : 'Lifetime'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">DB Tenant Mode</span>
              <span className="font-semibold text-slate-700 capitalize">{profile?.database_type || 'Shared'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Edit Form / Display */}
        <form onSubmit={handleSave} className="md:col-span-2 bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-primary" />
            <span>Profile General Info</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hospital Name*</label>
              <input
                type="text"
                disabled={!isEditing}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metro Care Hospital"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hospital Logo URL</label>
              <input
                type="text"
                disabled={!isEditing}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g. https://domain.com/logo.png"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled={!isEditing}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@hospital.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider pb-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Location Details</span>
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Street Address</label>
              <input
                type="text"
                disabled={!isEditing}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 102, Medical Enclave, Civil Lines"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jaipur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">State</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Rajasthan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Country</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Usage Limits & Quotas</span>
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Limit</span>
                  <span className="text-base font-bold text-slate-700 mt-0.5">{profile?.max_users || 10} User Accounts</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Limit</span>
                  <span className="text-base font-bold text-slate-700 mt-0.5">{profile?.max_patients || 500} Patient Profiles</span>
                </div>
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
