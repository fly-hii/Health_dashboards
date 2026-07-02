import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { api, getImageUrl } from '../utils/api';

import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  MapPin, 
  Lock, 
  Bell, 
  Shield, 
  Save, 
  X, 
  Camera, 
  Loader2, 
  Globe, 
  Moon,
  ChevronDown
} from 'lucide-react';

export default function ProfileView({ activeTab, setActiveTab }) {
  const { user, updateUser } = useAuth();
  
  // Tab states: 'profile' (My Profile), 'password' (Change Password), 'preferences' (Preferences)
  const [currentTab, setCurrentTab] = useState('profile');
  
  useEffect(() => {
    if (activeTab === 'settings') {
      setCurrentTab('password');
    } else if (activeTab === 'profile') {
      setCurrentTab('profile');
    }
  }, [activeTab]);

  // Loading and edit states
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(() => getImageUrl(null)); // starts null; set from user below

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile Form state (using React Hook Form)
  const { 
    register: registerProfile, 
    handleSubmit: handleSubmitProfile, 
    reset: resetProfile,
    formState: { isDirty: isProfileDirty, errors: profileErrors }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: ''
    }
  });

  // Password Form state (using React Hook Form)
  const { 
    register: registerPassword, 
    handleSubmit: handleSubmitPassword, 
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors }
  } = useForm();

  const watchNewPassword = watchPassword('newPassword');

  // Load and reset user profile data
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || user.fullName || '',
        email: user.email || '',
        phone: user.phone || user.mobile || '',
        address: user.address || ''
      });
    }
  }, [user, resetProfile]);

  // Handle Profile Update Save
  const onProfileSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address
      };
      
      const res = await api.updateProfile(payload);
      if (res.success) {
        updateUser(res.profile);
        toast.success('Profile updated successfully!');
        setIsEditMode(false);
        resetProfile({
          name: res.profile.name,
          email: res.profile.email,
          phone: res.profile.phone,
          address: res.profile.address
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Update
  const onPasswordSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      if (res.success) {
        toast.success('Password updated successfully!');
        resetPassword({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Handle Preferences Auto-save
  const handlePreferenceChange = async (key, value) => {
    const updatedPreferences = {
      ...(user.preferences || {}),
      [key]: value
    };
    
    if (key === 'darkMode') {
      const newTheme = value ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    try {
      const res = await api.updateProfile({ preferences: updatedPreferences });
      if (res.success) {
        updateUser(res.profile);
        toast.success('Preference auto-saved!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save preference');
    }
  };

  // File Upload Logic
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Supported formats: JPG, PNG only');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds the 5MB limit');
      return;
    }

    // Set preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.uploadDoctorAvatar(formData);
      if (res.success) {
        updateUser({ avatar: res.imageUrl, profileImage: res.imageUrl });
        toast.success('Profile photo updated!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Warnings for Unsaved Changes
  const handleTabChange = (newTab) => {
    if (currentTab === 'profile' && isProfileDirty && isEditMode) {
      const confirm = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirm) return;
      setIsEditMode(false);
      resetProfile();
    }
    setCurrentTab(newTab);
  };

  // Skeleton placeholders
  if (!user) {
    return (
      <div className="p-8 w-full font-sans animate-pulse bg-[#F8FAFC]">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded-lg w-1/3 mb-8"></div>
        <div className="flex gap-4 mb-6">
          <div className="w-28 h-10 bg-slate-200 rounded-xl"></div>
          <div className="w-28 h-10 bg-slate-200 rounded-xl"></div>
          <div className="w-28 h-10 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-[24px] border border-slate-100 p-8 h-96 flex flex-col items-center">
            <div className="w-36 h-36 rounded-full bg-slate-200 mb-6"></div>
            <div className="w-3/4 h-6 bg-slate-200 rounded-lg mb-2"></div>
            <div className="w-1/2 h-4 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 p-8 h-96">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex items-center gap-4 py-5 border-b border-slate-50 last:border-0">
                <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                <div className="w-24 h-4 bg-slate-200 rounded-lg"></div>
                <div className="flex-1 h-4 bg-slate-200 rounded-lg ml-8"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active user data
  const rawName = user.fullName || user.name || 'Dr. Arjun Mehta';
  const displayName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  const specialization = user.specialization || 'Cardiologist';
  const qualification = user.qualification || 'MBBS, MD (Cardiology)';
  const registrationNumber = user.registrationNumber || 'Reg. No. RJ/MC/2012/4587';
  const department = user.department || 'Cardiology';
  const avatarUrl = avatarPreview || getImageUrl(user?.avatar || user?.profileImage) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';
  const address = user.address || '123, Green Avenue, Jaipur, Rajasthan - 302001';

  return (
    <div className="p-8 w-full font-sans bg-[#F8FAFC] min-h-screen text-[#0B1F3A]">
      
      {/* Page Header */}
      <div className="mb-8 slide-up">
        <h1 className="text-[32px] font-sans font-bold text-[#0B1F3A] tracking-tight">Profile</h1>
        <p className="text-sm text-[#64748B] mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-3 mb-8 slide-up">
        <button
          onClick={() => handleTabChange('profile')}
          className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            currentTab === 'profile'
              ? 'bg-white text-[#0F9D8A] border border-[#E5E7EB] border-b-2 border-b-[#0F9D8A] shadow-sm'
              : 'bg-white text-[#64748B] border border-[#E5E7EB] hover:text-[#0B1F3A] hover:bg-slate-50'
          }`}
        >
          My Profile
        </button>
        <button
          onClick={() => handleTabChange('password')}
          className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            currentTab === 'password'
              ? 'bg-white text-[#0F9D8A] border border-[#E5E7EB] border-b-2 border-b-[#0F9D8A] shadow-sm'
              : 'bg-white text-[#64748B] border border-[#E5E7EB] hover:text-[#0B1F3A] hover:bg-slate-50'
          }`}
        >
          Change Password
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start slide-up">
        
        {currentTab === 'profile' && (
          <div className="lg:col-span-3 bg-white rounded-[24px] border border-[#E5E7EB] p-8 shadow-sm">
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              
              {/* Left Side: Avatar & basic doctor info */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                width: 180, 
                flexShrink: 0 
              }}>
                <div style={{ 
                  width: 130, 
                  height: 130, 
                  borderRadius: '50%', 
                  border: '3px solid #E5E7EB',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: '#F8FAFC',
                  marginBottom: 16,
                  position: 'relative'
                }}>
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>

                <label 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid #0F9D8A',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#0F9D8A',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.2s ease',
                    marginBottom: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0F9D8A';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#0F9D8A';
                  }}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                  Change Photo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={uploadingAvatar}
                  />
                </label>
                <span style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                  Supported: JPG, PNG.<br />Max size: 5MB.
                </span>
                
                <div style={{ marginTop: 24, textAlign: 'center', width: '100%', paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                  <p className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#0F9D8A', margin: '2px 0 0' }}>{specialization}</p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0' }}>{qualification}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '2px 0 0' }}>{registrationNumber}</p>
                </div>
              </div>

              {/* Right Side: Form details */}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                  <h3 className="text-[#0B1F3A]" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Personal Information</h3>
                  {!isEditMode ? (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-[#0F9D8A] font-semibold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMode(false);
                        resetProfile();
                      }}
                      className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '20px 24px', 
                    marginBottom: 24 
                  }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                        Full Name
                      </label>
                      {isEditMode ? (
                        <div>
                          <input
                            type="text"
                            style={{ width: '100%', borderRadius: 10, background: 'var(--surface, white)', border: '1px solid #E5E7EB', padding: '10px 14px', fontSize: 13, outline: 'none' }}
                            {...registerProfile('name', { required: 'Full Name is required' })}
                          />
                          {profileErrors.name && (
                            <span className="text-xs text-rose-500 mt-1 block">{profileErrors.name.message}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 500, padding: '10px 0' }}>{displayName}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                        Email Address
                      </label>
                      {isEditMode ? (
                        <div>
                          <input
                            type="email"
                            style={{ width: '100%', borderRadius: 10, background: 'var(--surface, white)', border: '1px solid #E5E7EB', padding: '10px 14px', fontSize: 13, outline: 'none' }}
                            {...registerProfile('email', { 
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]/i,
                                message: 'Invalid email address'
                              }
                            })}
                          />
                          {profileErrors.email && (
                            <span className="text-xs text-rose-500 mt-1 block">{profileErrors.email.message}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 500, padding: '10px 0' }}>{user.email}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                        Phone Number
                      </label>
                      {isEditMode ? (
                        <div>
                          <input
                            type="text"
                            style={{ width: '100%', borderRadius: 10, background: 'var(--surface, white)', border: '1px solid #E5E7EB', padding: '10px 14px', fontSize: 13, outline: 'none' }}
                            {...registerProfile('phone', { required: 'Phone Number is required' })}
                          />
                          {profileErrors.phone && (
                            <span className="text-xs text-rose-500 mt-1 block">{profileErrors.phone.message}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 500, padding: '10px 0' }}>{user.phone || user.mobile}</div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                        Department
                      </label>
                      {isEditMode ? (
                        <input
                           type="text"
                           value={department}
                           readOnly
                           disabled
                           style={{ width: '100%', borderRadius: 10, background: '#F1F5F9', border: '1px solid #E5E7EB', padding: '10px 14px', fontSize: 13, color: '#94A3B8', cursor: 'not-allowed', outline: 'none' }}
                        />
                      ) : (
                        <div className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 500, padding: '10px 0' }}>{department}</div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                      Address
                    </label>
                    {isEditMode ? (
                      <div>
                        <textarea
                          rows={2}
                          style={{ width: '100%', borderRadius: 10, background: 'var(--surface, white)', border: '1px solid #E5E7EB', padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'none' }}
                          {...registerProfile('address', { required: 'Address is required' })}
                        />
                        {profileErrors.address && (
                          <span className="text-xs text-rose-500 mt-1 block">{profileErrors.address.message}</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[#0B1F3A]" style={{ fontSize: 13, fontWeight: 500, padding: '10px 0', lineHeight: '1.5' }}>{address}</div>
                    )}
                  </div>

                  {/* Action buttons aligned right */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          resetProfile();
                        }}
                        className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all duration-200"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {isEditMode && (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-[#0F9D8A] hover:bg-[#0c8776] text-white font-semibold text-xs rounded-xl shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" /> Save Changes
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Tab */}
        {currentTab === 'password' && (
          <div className="lg:col-span-3 bg-white rounded-[24px] border border-[#E5E7EB] p-8 shadow-sm">
            <div className="border-b border-[#F1F5F9] pb-4 mb-6">
              <h3 className="text-lg font-bold text-[#0B1F3A]">Change Password</h3>
              <p className="text-xs text-[#64748B] mt-1">Ensure your account is using a secure, long password containing mixed characters.</p>
            </div>

            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="max-w-xl flex flex-col gap-6">
              
              {/* Current Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#475569]">Current Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-[18px] h-[18px] text-[#94a3b8] absolute left-4" />
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-3 pl-12 pr-4 text-sm text-[#0B1F3A] outline-none transition-all"
                    {...registerPassword('currentPassword', { required: 'Current password is required' })}
                  />
                </div>
                {passwordErrors.currentPassword && (
                  <span className="text-xs text-rose-500">{passwordErrors.currentPassword.message}</span>
                )}
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#475569]">New Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-[18px] h-[18px] text-[#94a3b8] absolute left-4" />
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-3 pl-12 pr-4 text-sm text-[#0B1F3A] outline-none transition-all"
                    {...registerPassword('newPassword', { 
                      required: 'New password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters long' },
                      validate: {
                        hasUppercase: v => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
                        hasLowercase: v => /[a-z]/.test(v) || 'Password must contain at least one lowercase letter',
                        hasNumber: v => /[0-9]/.test(v) || 'Password must contain at least one number'
                      }
                    })}
                  />
                </div>
                {passwordErrors.newPassword && (
                  <span className="text-xs text-rose-500">{passwordErrors.newPassword.message}</span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#475569]">Confirm Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-[18px] h-[18px] text-[#94a3b8] absolute left-4" />
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 focus:bg-white rounded-xl py-3 pl-12 pr-4 text-sm text-[#0B1F3A] outline-none transition-all"
                    {...registerPassword('confirmPassword', { 
                      required: 'Please confirm your password',
                      validate: value => value === watchNewPassword || 'Passwords do not match'
                    })}
                  />
                </div>
                {passwordErrors.confirmPassword && (
                  <span className="text-xs text-rose-500">{passwordErrors.confirmPassword.message}</span>
                )}
              </div>

              {/* Update Password Button */}
              <div className="mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 bg-gradient-to-r from-[#0F9D8A] to-[#0A8E7C] hover:from-[#0d8575] hover:to-[#097c6c] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#0F9D8A]/20 transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating Password
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}



      </div>
    </div>
  );
}
