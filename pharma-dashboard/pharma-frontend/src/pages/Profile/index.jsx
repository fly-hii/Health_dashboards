import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Camera, ShieldAlert, CheckCircle, Info, Lock, Settings, Bell, User, Eye, EyeOff, X } from 'lucide-react';
import api, { getImageUrl } from '../../services/api';

import { toast } from 'react-toastify';
import { socket } from '../../sockets/socket';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('Profile'); // 'Profile', 'Store Settings', 'Notification Settings', 'Change Password'
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const fileInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Pharmacist');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // React Hook Form for Profile
  const { register: regProfile, handleSubmit: submitProfile, reset: resetProfile, control: controlProfile } = useForm();
  // React Hook Form for Store Settings
  const { register: regStore, handleSubmit: submitStore, reset: resetStore } = useForm();
  // React Hook Form for Notifications
  const { control: controlNotif, handleSubmit: submitNotif, reset: resetNotif } = useForm();
  // React Hook Form for Change Password
  const { register: regPass, handleSubmit: submitPass, reset: resetPass, watch: watchPass } = useForm();

  const watchNewPassword = watchPass('newPassword', '');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/pharmacy/profile');
      const user = res.data;
      
      if (user.profilePhoto && !user.profilePhoto.includes('localhost')) {
        setProfilePhoto(user.profilePhoto);

      } else {
        // Use actual name as dicebear seed so the avatar is persona-consistent
        setProfilePhoto(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'Pharmacist')}`);
      }

      // Initialize Profile form
      resetProfile({
        fullName: user.fullName || '',
        employeeId: user.employeeId || '',
        phone: user.phone || user.phoneNumber || '',
        email: user.email || '',
        role: user.role || 'Pharmacist',
        storeLocation: user.storeLocation || ''
      });

      // Initialize Store settings form
      resetStore({
        storeName: user.storeSettings?.storeName || 'CarePlus Pharmacy',
        storeCode: user.storeSettings?.storeCode || 'CP-JPR-001',
        storeAddress: user.storeSettings?.storeAddress || 'CarePlus Pharmacy, Jaipur Main Road',
        storePhone: user.storeSettings?.storePhone || '9876543210',
        storeEmail: user.storeSettings?.storeEmail || 'jaipur.store@careplus.com',
        openingTime: user.storeSettings?.openingTime || '09:00',
        closingTime: user.storeSettings?.closingTime || '21:00',
        taxRegNumber: user.storeSettings?.taxRegNumber || 'TAX-9876543',
        gstNumber: user.storeSettings?.gstNumber || '08AAAAA1111A1Z1'
      });

      // Initialize Notifications preferences
      resetNotif({
        newPrescription: user.notificationSettings?.newPrescription ?? true,
        lowStock: user.notificationSettings?.lowStock ?? true,
        readyOrders: user.notificationSettings?.readyOrders ?? true,
        delivery: user.notificationSettings?.delivery ?? true,
        email: user.notificationSettings?.email ?? true,
        sms: user.notificationSettings?.sms ?? false,
        push: user.notificationSettings?.push ?? true
      });
    } catch (error) {
      toast.error('Failed to load profile data');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Submit profile edit
  const onProfileSave = async (data) => {
    try {
      const res = await api.put('/api/pharmacy/profile', data);
      toast.success('Pharmacist profile updated successfully');
      setIsEditMode(false);
      // Sync layout header with correct event name
      socket.emit('userProfileUpdated', res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Submit store settings
  const onStoreSave = async (data) => {
    try {
      await api.put('/api/pharmacy/settings', data);
      toast.success('Store settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update store settings');
    }
  };

  // Submit notification preferences
  const onNotifSave = async (data) => {
    try {
      await api.put('/api/pharmacy/notifications', data);
      toast.success('Notification preferences saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update preferences');
    }
  };

  // Submit change password
  const onPassSave = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    try {
      await api.put('/api/pharmacy/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      resetPass({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowCurrentPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
      setPasswordChanged(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  // Handle image upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after an error
    e.target.value = '';

    // Validation
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Unsupported file format. Please upload JPG or PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit. Please compress the image.');
      return;
    }

    // Show an optimistic preview immediately
    const objectUrl = URL.createObjectURL(file);
    setProfilePhoto(objectUrl);

    // Convert to Base64 and upload
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64data = reader.result;
      const toastId = toast.loading('Uploading photo...');
      try {
        const res = await api.post('/api/pharmacy/profile/photo', { photoUrl: base64data });
        // Use the persisted base64 from the response if available, else keep object url
        if (res.data?.profilePhoto) {
          setProfilePhoto(res.data.profilePhoto);
        }
        toast.update(toastId, { render: 'Profile photo updated successfully!', type: 'success', isLoading: false, autoClose: 3000 });
        // Sync layout header with correct event name
        socket.emit('userProfileUpdated', { ...res.data, profilePhoto: res.data?.profilePhoto || base64data });
      } catch (err) {
        // Roll back optimistic preview on failure
        setProfilePhoto(`https://api.dicebear.com/7.x/avataaars/svg?seed=Pharmacist`);
        const errMsg = err.response?.data?.message || err.message || 'Failed to upload photo';
        toast.update(toastId, { render: errMsg, type: 'error', isLoading: false, autoClose: 4000 });
      }
    };
    reader.onerror = () => {
      setProfilePhoto(`https://api.dicebear.com/7.x/avataaars/svg?seed=Pharmacist`);
      toast.error('Failed to read image file. Please try again.');
    };
  };

  // Calculate password strength
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', score: 0, color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: 'Weak', score, color: 'bg-red-500 w-1/4' };
    if (score === 3) return { label: 'Medium', score, color: 'bg-amber-500 w-2/4' };
    return { label: 'Strong', score, color: 'bg-emerald-500 w-full' };
  };

  const strength = getPasswordStrength(watchNewPassword);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pharmacist Profile & Settings</h1>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm space-y-6">
        
        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-[#E5E7EB] pb-3 gap-3 overflow-x-auto">
          {[
            { id: 'Profile', label: 'Profile', icon: User },
            { id: 'Store Settings', label: 'Store Settings', icon: Settings },
            { id: 'Notification Settings', label: 'Notification Settings', icon: Bell },
            { id: 'Change Password', label: 'Change Password', icon: Lock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0F9D8A] text-white rounded-[8px] shadow-sm shadow-[#0F9D8A]/20'
                    : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-gray-50 rounded-[8px]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* PROFILE TAB PANEL */}
        {activeTab === 'Profile' && (
          <form onSubmit={submitProfile(onProfileSave)} className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 pt-4">
            
            {/* Full-width Section Header with Edit Profile Button */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB] col-span-full">
              <div>
                <h3 className="text-base font-extrabold text-[#374151] mb-1">Pharmacist Profile</h3>
                <p className="text-xs text-gray-500 font-semibold">Update your professional details and credentials.</p>
              </div>
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-[#0F9D8A] font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" /> Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    fetchProfile();
                  }}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-gray-500 font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            {/* Left circular Photo card */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div 
                onClick={() => isEditMode && fileInputRef.current.click()}
                className={`relative w-[140px] h-[140px] rounded-full overflow-hidden border-2 border-[#E5E7EB] ${isEditMode ? 'hover:border-[#0F9D8A] cursor-pointer group' : ''} transition-all shadow-sm bg-gray-50`}
              >
                <img
                  className="w-full h-full object-cover"
                  src={profilePhoto}
                  alt="Pharmacist Profile Avatar"
                />
                {isEditMode && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={!isEditMode}
              />

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 border-2 border-[#0F9D8A] text-[#0F9D8A] hover:bg-[#0F9D8A]/5 font-bold text-xs rounded-[8px] transition-colors cursor-pointer bg-white"
                >
                  Change Photo
                </button>
              )}
              <p className="text-[10px] text-gray-400 font-semibold leading-tight">JPG, PNG supported.<br/>Max size 2MB.</p>
            </div>

            {/* Right details forms */}
            <div className="space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    readOnly={!isEditMode}
                    {...regProfile('fullName')}
                    className={`w-full h-11 px-4 text-sm text-[#374151] transition-all outline-none rounded-[10px] ${
                      isEditMode 
                        ? 'border border-[#D1D5DB] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white shadow-sm' 
                        : 'border-0 bg-transparent font-semibold shadow-none pointer-events-none'
                    }`}
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    readOnly
                    {...regProfile('employeeId')}
                    className="w-full h-11 px-4 border-0 bg-transparent text-sm text-gray-400 font-semibold outline-none cursor-not-allowed shadow-none pointer-events-none"
                  />
                </div>

                {/* Phone number */}
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    readOnly={!isEditMode}
                    {...regProfile('phone')}
                    className={`w-full h-11 px-4 text-sm text-[#374151] transition-all outline-none rounded-[10px] ${
                      isEditMode 
                        ? 'border border-[#D1D5DB] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white shadow-sm' 
                        : 'border-0 bg-transparent font-semibold shadow-none pointer-events-none'
                    }`}
                  />
                </div>

                {/* Role Select */}
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Role</label>
                  <select
                    disabled={!isEditMode}
                    {...regProfile('role')}
                    className={`w-full h-11 px-4 text-sm text-[#374151] transition-all outline-none rounded-[10px] ${
                      isEditMode 
                        ? 'border border-[#D1D5DB] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white shadow-sm cursor-pointer' 
                        : 'border-0 bg-transparent font-semibold shadow-none pointer-events-none appearance-none'
                    }`}
                  >
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Senior Pharmacist">Senior Pharmacist</option>
                    <option value="Store Manager">Store Manager</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    readOnly={!isEditMode}
                    {...regProfile('email')}
                    className={`w-full h-11 px-4 text-sm text-[#374151] transition-all outline-none rounded-[10px] ${
                      isEditMode 
                        ? 'border border-[#D1D5DB] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white shadow-sm' 
                        : 'border-0 bg-transparent font-semibold shadow-none pointer-events-none'
                    }`}
                  />
                </div>

                {/* Store Location */}
                <div>
                  <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Location</label>
                  <input
                    type="text"
                    required
                    readOnly={!isEditMode}
                    {...regProfile('storeLocation')}
                    className={`w-full h-11 px-4 text-sm text-[#374151] transition-all outline-none rounded-[10px] ${
                      isEditMode 
                        ? 'border border-[#D1D5DB] focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white shadow-sm' 
                        : 'border-0 bg-transparent font-semibold shadow-none pointer-events-none'
                    }`}
                  />
                </div>

              </div>

              {/* Action */}
              {isEditMode && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    className="h-11 w-[160px] bg-[#0F9D8A] hover:bg-[#0B7F71] text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer flex items-center justify-center"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

          </form>
        )}

        {/* STORE SETTINGS TAB PANEL */}
        {activeTab === 'Store Settings' && (
          <form onSubmit={submitStore(onStoreSave)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Name</label>
                <input
                  type="text"
                  required
                  {...regStore('storeName')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Code</label>
                <input
                  type="text"
                  required
                  {...regStore('storeCode')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Address</label>
                <input
                  type="text"
                  required
                  {...regStore('storeAddress')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Phone</label>
                <input
                  type="text"
                  required
                  {...regStore('storePhone')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Store Email</label>
                <input
                  type="email"
                  required
                  {...regStore('storeEmail')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Opening Time</label>
                <input
                  type="time"
                  required
                  {...regStore('openingTime')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Closing Time</label>
                <input
                  type="time"
                  required
                  {...regStore('closingTime')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Tax Registration Number</label>
                <input
                  type="text"
                  required
                  {...regStore('taxRegNumber')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">GST Number</label>
                <input
                  type="text"
                  required
                  {...regStore('gstNumber')}
                  className="w-full h-11 px-4 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="h-11 px-6 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
              >
                Save Store Settings
              </button>
            </div>
          </form>
        )}

        {/* NOTIFICATION SETTINGS TAB PANEL */}
        {activeTab === 'Notification Settings' && (
          <form onSubmit={submitNotif(onNotifSave)} className="space-y-6 pt-4 max-w-xl">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b pb-2">Toggle Alerts Preferences</h3>
            
            <div className="space-y-3.5">
              {[
                { name: 'newPrescription', label: 'New Prescription Alerts' },
                { name: 'lowStock', label: 'Low Stock Alerts' },
                { name: 'readyOrders', label: 'Ready Order Notifications' },
                { name: 'delivery', label: 'Delivery Notifications' },
                { name: 'email', label: 'Email Notifications' },
                { name: 'sms', label: 'SMS Notifications' },
                { name: 'push', label: 'Push Notifications' }
              ].map((pref) => (
                <Controller
                  key={pref.name}
                  name={pref.name}
                  control={controlNotif}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm font-semibold text-gray-700">{pref.label}</span>
                      <button
                        type="button"
                        onClick={() => onChange(!value)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                          value ? 'bg-[#0F9D8A]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all ${
                            value ? 'left-5.75' : 'left-0.75'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                />
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="h-11 px-6 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </form>
        )}

        {/* CHANGE PASSWORD TAB PANEL */}
        {activeTab === 'Change Password' && (
          passwordChanged ? (
            /* ── Success Banner ── */
            <div className="pt-6 pb-2 flex flex-col items-center text-center gap-5 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-gray-900">Password Changed Successfully</h2>
                <p className="text-sm text-gray-500">Your account password has been updated. Keep it safe!</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordChanged(false)}
                className="mt-2 h-11 px-6 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
              >
                Change Password Again
              </button>
            </div>
          ) : (
          <form onSubmit={submitPass(onPassSave)} className="space-y-6 pt-4 max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    {...regPass('currentPassword')}
                    className="w-full h-11 px-4 pr-11 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0F9D8A] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showCurrentPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    {...regPass('newPassword')}
                    className="w-full h-11 px-4 pr-11 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0F9D8A] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {watchNewPassword && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-gray-400">Strength Indicator:</span>
                    <span className={
                      strength.label === 'Strong' ? 'text-emerald-500' : strength.label === 'Medium' ? 'text-amber-500' : 'text-red-500'
                    }>{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color}`} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#374151] uppercase mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    {...regPass('confirmPassword')}
                    className="w-full h-11 px-4 pr-11 border border-[#D1D5DB] rounded-[10px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0F9D8A] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { resetPass({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowCurrentPass(false); setShowNewPass(false); setShowConfirmPass(false); }}
                className="h-11 px-5 border border-[#E5E7EB] hover:bg-gray-50 text-gray-600 font-semibold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 px-6 bg-[#0F9D8A] hover:bg-[#0B7F71] text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
          )
        )}

      </div>
    </div>
  );
}
