import React, { useState, useEffect } from 'react';
import { api, getImageUrl } from '../utils/api';

import { toast } from '../utils/toast';
import './ProfileView.css';

export default function ProfileView({ profile, onUpdateProfile }) {
  const [activeSubTab, setActiveSubTab] = useState('My Profile');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [profileImage, setProfileImage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters');
      return;
    }
    setPwdUpdating(true);
    setPwdError('');
    setPwdSuccess(false);

    api.changePassword({ currentPassword, newPassword })
      .then(() => {
        setPwdSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwdSuccess(false), 3000);
      })
      .catch(err => setPwdError(err.message || 'Failed to change password'))
      .finally(() => setPwdUpdating(false));
  };

  // Sync profile details when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setDob(profile.dob || '');
      setGender(profile.gender || 'Male');
      setMobile(profile.mobile || '');
      setEmail(profile.email || '');
      setAddress(profile.address || '');
      setBloodGroup(profile.bloodGroup || 'O+');
      setProfileImage(getImageUrl(profile.profileImage) || '');

    }
  }, [profile]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result); // Base64 URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUpdating(true);
    setSavedSuccess(false);

    api.updateProfile({
      fullName,
      dob,
      gender,
      mobile,
      email,
      address,
      bloodGroup,
      profileImage
    })
    .then(res => {
      onUpdateProfile(res.profile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    })
    .catch(err => toast.error("Error updating profile: " + err.message))
    .finally(() => setUpdating(false));
  };

  return (
    <div className="profile-view slide-up">
      <div className="view-header">
        <h1 className="title">Profile & Settings</h1>
        <p className="subtitle">Manage your personal information and preferences.</p>
      </div>

      <div className="profile-layout flex gap-6">
        {/* Left Side Settings Navigation */}
        <div className="settings-nav-card card flex-1-left">
          {['My Profile', 'Change Password', 'Notification Settings', 'Privacy Settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`settings-nav-btn ${activeSubTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Side Tab Panel */}
        <div className="settings-panel card flex-3-right">
          {activeSubTab === 'My Profile' && (
            <form onSubmit={handleSubmit} className="profile-form fade-in text-left">
              <h3 className="section-form-title mb-4">My Profile</h3>

              {/* Profile Image Uploader */}
              <div className="profile-image-uploader flex items-center gap-4 mb-6">
                <div className="profile-avatar-large">
                  <img 
                    src={profileImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                    alt="Avatar Preview" 
                    className="avatar-img-large"
                  />
                </div>
                <div className="uploader-details">
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    Upload New Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  <p className="text-muted text-xs mt-1">PNG or JPG, max 2MB</p>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="form-select"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select 
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="form-select"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-textarea" 
                  rows="3"
                  required 
                />
              </div>

              <div className="form-footer flex justify-between items-center mt-6">
                <div>
                  {savedSuccess && (
                    <div className="success-toast flex items-center gap-2 text-success font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Changes saved successfully!
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'Change Password' && (
            <form onSubmit={handlePasswordSubmit} className="password-form fade-in text-left">
              <h3 className="section-form-title mb-4">Change Password</h3>
              {pwdError && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, marginBottom: 16 }}>
                  ⚠️ {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-light)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, marginBottom: 16 }}>
                  ✅ Password changed successfully!
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="form-input" 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="form-input" 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="form-input" 
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary mt-4" disabled={pwdUpdating}>
                {pwdUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeSubTab === 'Notification Settings' && (
            <div className="notifications-settings fade-in text-left">
              <h3 className="section-form-title mb-4">Notification Settings</h3>
              <p className="text-muted text-sm mb-4">Manage how you receive alerts and status notifications.</p>
              
              <div className="settings-list flex flex-col gap-4">
                <label className="settings-checkbox flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="checkbox-input" />
                  <div>
                    <h5 className="font-semibold">SMS Alerts</h5>
                    <p className="text-muted text-xs">Receive queue status alerts on mobile</p>
                  </div>
                </label>

                <label className="settings-checkbox flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="checkbox-input" />
                  <div>
                    <h5 className="font-semibold">Email Alerts</h5>
                    <p className="text-muted text-xs">Receive reports and appointment receipts in email</p>
                  </div>
                </label>

                <label className="settings-checkbox flex items-center gap-3">
                  <input type="checkbox" className="checkbox-input" />
                  <div>
                    <h5 className="font-semibold">WhatsApp Alerts</h5>
                    <p className="text-muted text-xs">Get prescriptions directly on WhatsApp</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeSubTab === 'Privacy Settings' && (
            <div className="privacy-settings fade-in text-left">
              <h3 className="section-form-title mb-4">Privacy & Data Settings</h3>
              <p className="text-muted text-sm mb-4">Manage authorization to your medical reports and charts.</p>
              
              <div className="settings-list flex flex-col gap-4">
                <label className="settings-checkbox flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="checkbox-input" />
                  <div>
                    <h5 className="font-semibold">Share Reports with Doctors</h5>
                    <p className="text-muted text-xs">Let consulting doctors view your history index</p>
                  </div>
                </label>

                <label className="settings-checkbox flex items-center gap-3">
                  <input type="checkbox" className="checkbox-input" />
                  <div>
                    <h5 className="font-semibold">Public Medical Profile</h5>
                    <p className="text-muted text-xs">Let checkup staff search your details using patient card</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
