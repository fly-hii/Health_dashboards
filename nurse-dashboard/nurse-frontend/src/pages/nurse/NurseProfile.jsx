import { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import config from '../../config';
import { 
  User, 
  Briefcase, 
  Lock, 
  Settings, 
  History, 
  Upload, 
  Trash2, 
  Calendar, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Check, 
  X,
  Key,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

const DEPARTMENTS = [
  'General Medicine', 
  'Cardiology', 
  'Orthopedics', 
  'Pediatrics', 
  'Neurology', 
  'Emergency', 
  'Gynecology', 
  'Dermatology'
];

const DEFAULT_AVATAR = config.defaultAvatar;

const NurseProfile = () => {
  const { user, updateUser, theme, toggleTheme } = useAuth();
  
  // Tabs: 'personal', 'professional', 'security'
  const [activeTab, setActiveTab] = useState('personal');
  
  // File input ref for photo change
  const fileInputRef = useRef(null);
  
  // Password change modal state
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdLoading, setPwdLoading] = useState(false);

  // States for profile form
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    dob: '',
    gender: 'Female',
    phone: '',
    email: '',
    address: ''
  });

  const [professionalInfo, setProfessionalInfo] = useState({
    employeeId: '',
    department: '',
    designation: 'Senior Staff Nurse',
    employeeType: 'Full Time',
    joiningDate: '2022-03-15',
    shiftTiming: '09:00 AM – 06:00 PM',
    licenseNumber: 'RN-458721',
    emergencyContact: '+91 9876543211',
    accountStatus: 'Active'
  });

  const [accountSettings, setAccountSettings] = useState({
    username: 'nurseanjali',
    is2faEnabled: false
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    appointmentUpdates: true,
    patientAlerts: true,
    vitalsNotifications: true,
    emergencyAlerts: true,
    emailNotifications: true
  });

  const [systemPrefs, setSystemPrefs] = useState({
    darkMode: false,
    smsNotifications: true,
    desktopNotifications: true
  });

  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load profile data from user object
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        dob: user.dob || '1995-05-12',
        gender: user.gender || 'Female',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '123 Green Street, Hyderabad, Telangana - 500001'
      });
      
      setProfessionalInfo({
        employeeId: user.employeeId || '',
        department: user.department || 'General Medicine',
        designation: user.designation || 'Senior Staff Nurse',
        employeeType: user.employeeType || 'Full Time',
        joiningDate: user.joiningDate || '2022-03-15',
        shiftTiming: user.shiftTiming || '09:00 AM – 06:00 PM',
        licenseNumber: user.licenseNumber || 'RN-458721',
        emergencyContact: user.emergencyContact || '+91 9876543211',
        accountStatus: user.status || 'Active'
      });

      setAccountSettings({
        username: user.username || 'nurseanjali',
        is2faEnabled: user.is2faEnabled ?? false
      });

      setAvatar(getImageUrl(user.avatar) || DEFAULT_AVATAR);
    }

    // Load extra local preferences from localStorage
    const storageKey = user ? `nurse_profile_details_${user.email || user.id}` : 'nurse_profile_details';
    const savedDetails = localStorage.getItem(storageKey);
    if (savedDetails) {
      try {
        const details = JSON.parse(savedDetails);
        if (details.notifications) setNotificationPrefs(n => ({ ...n, ...details.notifications }));
        if (details.system) setSystemPrefs(s => ({ ...s, ...details.system }));
      } catch (err) {
        console.error('Failed to parse saved profile details:', err);
      }
    }
  }, [user]);

  // Handle Input Changes
  const handlePersonalChange = (e) => {
    setPersonalInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfessionalChange = (e) => {
    setProfessionalInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAccountChange = (e) => {
    setAccountSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationToggle = (key) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSystemToggle = (key) => {
    setSystemPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Photo Upload Handlers
  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Maximum photo upload size is 2MB');
      return;
    }

    // Validate format
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG and PNG formats are supported');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
      toast.success('Photo preview updated! Click Save Changes to save.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatar(DEFAULT_AVATAR);
    toast.success('Photo reset to default!');
  };

  // Form Submit Handler
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Save critical fields to backend
      const res = await authService.updateProfile({
        name: personalInfo.name,
        phone: personalInfo.phone,
        dob: personalInfo.dob,
        gender: personalInfo.gender,
        address: personalInfo.address,
        department: professionalInfo.department,
        designation: professionalInfo.designation,
        employeeType: professionalInfo.employeeType,
        joiningDate: professionalInfo.joiningDate,
        shiftTiming: professionalInfo.shiftTiming,
        licenseNumber: professionalInfo.licenseNumber,
        emergencyContact: professionalInfo.emergencyContact,
        username: accountSettings.username,
        is2faEnabled: accountSettings.is2faEnabled,
        avatar: avatar !== DEFAULT_AVATAR ? avatar : ''
      });
      
      // Update global context user state
      updateUser(res.data.user);

      // 2. Save preferences to localStorage
      const extraDetails = {
        notifications: notificationPrefs,
        system: systemPrefs
      };
      const storageKey = user ? `nurse_profile_details_${user.email || user.id}` : 'nurse_profile_details';
      localStorage.setItem(storageKey, JSON.stringify(extraDetails));

      toast.success('Profile changes saved successfully!');
      setIsEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset Changes Handler
  const handleResetForm = () => {
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        dob: user.dob || '1995-05-12',
        gender: user.gender || 'Female',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '123 Green Street, Hyderabad, Telangana - 500001'
      });
      setProfessionalInfo({
        employeeId: user.employeeId || '',
        department: user.department || 'General Medicine',
        designation: user.designation || 'Senior Staff Nurse',
        employeeType: user.employeeType || 'Full Time',
        joiningDate: user.joiningDate || '2022-03-15',
        shiftTiming: user.shiftTiming || '09:00 AM – 06:00 PM',
        licenseNumber: user.licenseNumber || 'RN-458721',
        emergencyContact: user.emergencyContact || '+91 9876543211',
        accountStatus: user.status || 'Active'
      });
      setAccountSettings({
        username: user.username || 'nurseanjali',
        is2faEnabled: user.is2faEnabled ?? false
      });
      setNotificationPrefs({
        appointmentUpdates: true,
        patientAlerts: true,
        vitalsNotifications: true,
        emergencyAlerts: true,
        emailNotifications: true
      });
      setSystemPrefs({
        darkMode: false,
        smsNotifications: true,
        desktopNotifications: true
      });
      setAvatar(user.avatar || DEFAULT_AVATAR);
      const storageKey = user ? `nurse_profile_details_${user.email || user.id}` : 'nurse_profile_details';
      localStorage.removeItem(storageKey);
      toast.info('Form reset to initial account settings!');
    }
  };

  // Password Submit Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwdForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 6) errs.newPassword = 'Password must be at least 6 characters';
    if (pwdForm.newPassword !== pwdForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(errs).length > 0) {
      setPwdErrors(errs);
      return;
    }

    setPwdLoading(true);
    try {
      await authService.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      toast.success('Password updated successfully!');
      setShowPwdModal(false);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwdErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  // Profile completion rate (derived check)
  const getCompletionPercentage = () => {
    let score = 0;
    let total = 5;
    if (personalInfo.name) score++;
    if (personalInfo.dob) score++;
    if (personalInfo.address) score++;
    if (professionalInfo.licenseNumber) score++;
    if (professionalInfo.emergencyContact) score++;
    return Math.round((score / total) * 100);
  };

  const completionPercent = getCompletionPercentage();

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-2">
            Profile
          </h1>
          <p className="text-slate-500 font-medium text-[15px]">
            Manage your personal and professional information.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Left Side Panels (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Profile Photo Panel */}
          <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-6 flex flex-col items-center">
            <h3 className="text-sm font-extrabold text-slate-800 self-start mb-6">Profile Photo</h3>
            
            {/* Avatar Circle Container */}
            <div className="relative group cursor-pointer mb-5" onClick={triggerFileSelect}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 ring-4 ring-teal-500/5 shadow-inner">
                <img 
                  src={avatar} 
                  alt="Nurse Profile" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              <div className="absolute inset-0 bg-slate-950/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Upload className="text-white w-6 h-6" />
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/png, image/jpeg" 
              className="hidden" 
            />

            {/* Photo Action Buttons */}
            {isEditMode && (
              <div className="flex items-center gap-2 mb-4 w-full">
                <Button
                  onClick={triggerFileSelect}
                  className="flex-1 bg-white border border-[#E5E7EB] text-slate-700 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 rounded-xl text-xs font-bold transition-all h-9 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  Change Photo
                </Button>
                {avatar !== DEFAULT_AVATAR && (
                  <Button
                    onClick={handleRemovePhoto}
                    className="w-9 h-9 p-0 bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="Remove Photo"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            )}
            
            <p className="text-[10px] text-slate-400 font-bold text-center">
              JPG, PNG up to 2MB. Image crop supported.
            </p>
          </Card>

          {/* Profile Completion Panel */}
          <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-extrabold text-slate-800">Verification & Progress</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                <ShieldCheck size={11} strokeWidth={3} /> Verified
              </span>
            </div>

            {/* Progress Bar Widget */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Profile Completion</span>
                <span className="text-[#0EA5A4]">{completionPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Completion Checklist */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-bold">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>Personal Info Complete</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-bold">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>Professional Details Complete</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-bold">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>License Verified</span>
              </div>

            </div>
          </Card>


        </div>

        {/* Right Side Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Navigation Tab selection for Profile sections */}
          <div className="flex flex-wrap gap-2.5 p-1 bg-slate-100/50 rounded-2xl border border-[#E5E7EB] w-max">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent flex items-center gap-2 ${
                activeTab === 'personal'
                  ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'
              }`}
            >
              <User size={14} />
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('professional')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent flex items-center gap-2 ${
                activeTab === 'professional'
                  ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'
              }`}
            >
              <Briefcase size={14} />
              Professional details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-transparent flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0EA5A4] hover:bg-white hover:shadow-sm hover:border-[#E5E7EB]/60'
              }`}
            >
              <Lock size={14} />
              Security & Settings
            </button>
          </div>

          {/* Form Container Card */}
          <Card className="border border-[#E5E7EB] rounded-[20px] shadow-sm bg-white overflow-hidden">
            <form onSubmit={handleSaveChanges} className="p-6 md:p-8 space-y-8">
              
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">Personal Information</h3>
                      <p className="text-xs text-slate-500 font-semibold">Update your demographic details and contact fields.</p>
                    </div>
                    {!isEditMode ? (
                      <Button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-[#0EA5A4] font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                      >
                        <User size={14} /> Edit Profile
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          handleResetForm();
                        }}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                      >
                        <X size={14} /> Cancel
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                      {isEditMode ? (
                        <input 
                          type="text" 
                          name="name" 
                          value={personalInfo.name} 
                          onChange={handlePersonalChange} 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all"
                          placeholder="Nurse Name" 
                          required
                        />
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{personalInfo.name}</div>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Date of Birth</label>
                      {isEditMode ? (
                        <div className="relative">
                          <input 
                            type="date" 
                            name="dob" 
                            value={personalInfo.dob} 
                            onChange={handlePersonalChange} 
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                          />
                          <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{personalInfo.dob}</div>
                      )}
                    </div>

                    {/* Gender select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Gender</label>
                      {isEditMode ? (
                        <select 
                          name="gender" 
                          value={personalInfo.gender} 
                          onChange={handlePersonalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{personalInfo.gender}</div>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Phone Number</label>
                      {isEditMode ? (
                        <div className="relative">
                          <input 
                            type="tel" 
                            name="phone" 
                            value={personalInfo.phone} 
                            onChange={handlePersonalChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all"
                            placeholder="Phone number" 
                          />
                          <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{personalInfo.phone}</div>
                      )}
                    </div>

                    {/* Email address */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          name="email" 
                          value={personalInfo.email} 
                          disabled
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-slate-400 outline-none cursor-not-allowed"
                          placeholder="Email Address" 
                        />
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">Contact system admin to update your email identifier.</span>
                    </div>

                    {/* Address Textarea */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Address</label>
                      {isEditMode ? (
                        <div className="relative">
                          <textarea 
                            name="address" 
                            value={personalInfo.address} 
                            onChange={handlePersonalChange}
                            rows={3}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all resize-none leading-relaxed"
                            placeholder="Your complete residential address..." 
                          />
                          <MapPin size={14} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5 leading-relaxed">{personalInfo.address}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFESSIONAL INFORMATION */}
              {activeTab === 'professional' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">Professional Details</h3>
                      <p className="text-xs text-slate-500 font-semibold">Verify clinical credentials and organizational assignments.</p>
                    </div>
                    {!isEditMode ? (
                      <Button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-[#0EA5A4] font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                      >
                        <User size={14} /> Edit Profile
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          handleResetForm();
                        }}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl flex items-center gap-1.5 bg-transparent cursor-pointer"
                      >
                        <X size={14} /> Cancel
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Employee ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Employee ID</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="employeeId" 
                          value={professionalInfo.employeeId} 
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-slate-400 outline-none cursor-not-allowed"
                        />
                        <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Department dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Department</label>
                      {isEditMode ? (
                        <select 
                          name="department" 
                          value={professionalInfo.department} 
                          onChange={handleProfessionalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.department}</div>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Designation</label>
                      {isEditMode ? (
                        <input 
                          type="text" 
                          name="designation" 
                          value={professionalInfo.designation} 
                          onChange={handleProfessionalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all"
                          placeholder="e.g. Senior Nurse" 
                        />
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.designation}</div>
                      )}
                    </div>

                    {/* Employee Type select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Employee Type</label>
                      {isEditMode ? (
                        <select 
                          name="employeeType" 
                          value={professionalInfo.employeeType} 
                          onChange={handleProfessionalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                        >
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Contract">Contract</option>
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.employeeType}</div>
                      )}
                    </div>

                    {/* Joining Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Joining Date</label>
                      {isEditMode ? (
                        <div className="relative">
                          <input 
                            type="date" 
                            name="joiningDate" 
                            value={professionalInfo.joiningDate} 
                            onChange={handleProfessionalChange}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                          />
                          <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.joiningDate}</div>
                      )}
                    </div>

                    {/* Shift Timing */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shift Timing</label>
                      {isEditMode ? (
                        <select 
                          name="shiftTiming" 
                          value={professionalInfo.shiftTiming} 
                          onChange={handleProfessionalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all cursor-pointer"
                        >
                          <option value="09:00 AM – 06:00 PM">09:00 AM – 06:00 PM (Morning)</option>
                          <option value="02:00 PM – 10:00 PM">02:00 PM – 10:00 PM (Evening)</option>
                          <option value="10:00 PM – 06:00 AM">10:00 PM – 06:00 AM (Night)</option>
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.shiftTiming}</div>
                      )}
                    </div>

                    {/* License Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registered Nurse License No.</label>
                      {isEditMode ? (
                        <input 
                          type="text" 
                          name="licenseNumber" 
                          value={professionalInfo.licenseNumber} 
                          onChange={handleProfessionalChange}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all"
                          placeholder="License Number" 
                        />
                      ) : (
                        <div className="text-xs font-bold text-slate-700 py-2.5">{professionalInfo.licenseNumber}</div>
                      )}
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Emergency Contact</label>
                      <input 
                        type="tel" 
                        name="emergencyContact" 
                        value={professionalInfo.emergencyContact} 
                        onChange={handleProfessionalChange}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all"
                        placeholder="Emergency Contact" 
                      />
                    </div>

                    {/* Account Status */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Account Status</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="accountStatus" 
                          value={professionalInfo.accountStatus} 
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-slate-400 outline-none cursor-not-allowed"
                        />
                        <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY & PREFERENCES */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  {/* Account settings */}
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">Account Credentials</h3>
                      <p className="text-xs text-slate-500 font-semibold">Manage system login details and credentials.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={personalInfo.email} 
                            disabled
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-slate-400 outline-none cursor-not-allowed"
                            placeholder="Email Address" 
                          />
                          <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Password Placeholder */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value="••••••••" 
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-slate-400 outline-none cursor-not-allowed"
                          />
                          <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Security buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => setShowPwdModal(true)}
                        className="px-4 py-2 bg-white border border-[#E5E7EB] text-slate-700 hover:text-[#0EA5A4] hover:bg-teal-50/50 hover:border-teal-200 rounded-xl text-xs font-bold transition-all h-9 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Key size={14} />
                        Change Password
                      </Button>
                    </div>
                  </div>

                  {/* Notification preferences checkboxes */}
                  <div className="space-y-5 pt-4 border-t border-[#E5E7EB]">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">Notification Preferences</h3>
                      <p className="text-xs text-slate-500 font-semibold">Select alerts and updates you wish to receive in your queue.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Checkbox item 1 */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleNotificationToggle('appointmentUpdates')}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            notificationPrefs.appointmentUpdates 
                              ? 'bg-[#0EA5A4] border-[#0EA5A4] text-white shadow-sm shadow-teal-500/25' 
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {notificationPrefs.appointmentUpdates && <Check size={13} strokeWidth={3} />}
                        </button>
                        <span className="text-xs text-slate-700 font-semibold">Appointment Updates</span>
                      </div>

                      {/* Checkbox item 2 */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleNotificationToggle('patientAlerts')}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            notificationPrefs.patientAlerts 
                              ? 'bg-[#0EA5A4] border-[#0EA5A4] text-white shadow-sm shadow-teal-500/25' 
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {notificationPrefs.patientAlerts && <Check size={13} strokeWidth={3} />}
                        </button>
                        <span className="text-xs text-slate-700 font-semibold">Patient Alerts</span>
                      </div>

                      {/* Checkbox item 3 */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleNotificationToggle('vitalsNotifications')}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            notificationPrefs.vitalsNotifications 
                              ? 'bg-[#0EA5A4] border-[#0EA5A4] text-white shadow-sm shadow-teal-500/25' 
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {notificationPrefs.vitalsNotifications && <Check size={13} strokeWidth={3} />}
                        </button>
                        <span className="text-xs text-slate-700 font-semibold">Vitals Notifications</span>
                      </div>

                      {/* Checkbox item 4 */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleNotificationToggle('emergencyAlerts')}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            notificationPrefs.emergencyAlerts 
                              ? 'bg-[#0EA5A4] border-[#0EA5A4] text-white shadow-sm shadow-teal-500/25' 
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {notificationPrefs.emergencyAlerts && <Check size={13} strokeWidth={3} />}
                        </button>
                        <span className="text-xs text-slate-700 font-semibold">Emergency Alerts</span>
                      </div>

                      {/* Checkbox item 5 */}
                      <div className="flex items-center gap-3 md:col-span-2">
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleNotificationToggle('emailNotifications')}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            notificationPrefs.emailNotifications 
                              ? 'bg-[#0EA5A4] border-[#0EA5A4] text-white shadow-sm shadow-teal-500/25' 
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {notificationPrefs.emailNotifications && <Check size={13} strokeWidth={3} />}
                        </button>
                        <span className="text-xs text-slate-700 font-semibold">Email Notifications</span>
                      </div>
                    </div>
                  </div>

                  {/* System Toggles */}
                  <div className="space-y-5 pt-4 border-t border-[#E5E7EB]">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 mb-1">System Preferences</h3>
                      <p className="text-xs text-slate-500 font-semibold">Adjust display settings and routing updates.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Toggle 1: Dark Mode */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-800">Dark Mode</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Switch dashboard theme style.</p>
                        </div>
                        <button 
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => {
                            handleSystemToggle('darkMode');
                            toggleTheme();
                            toast.info(`Dark Mode preference updated!`);
                          }}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            theme === 'dark' ? 'bg-[#0EA5A4]' : 'bg-slate-300'
                          } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                            theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Toggle 2: SMS Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-800">SMS Notifications</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Receive text messages for critical emergency alerts.</p>
                        </div>
                        <button 
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleSystemToggle('smsNotifications')}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            systemPrefs.smsNotifications ? 'bg-[#0EA5A4]' : 'bg-slate-300'
                          } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                            systemPrefs.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Toggle 3: Desktop Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-800">Desktop Push Notifications</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Display banner notifications in browser workspace.</p>
                        </div>
                        <button 
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => handleSystemToggle('desktopNotifications')}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            systemPrefs.desktopNotifications ? 'bg-[#0EA5A4]' : 'bg-slate-300'
                          } ${!isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                            systemPrefs.desktopNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Footer Action Buttons */}
              {isEditMode && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      handleResetForm();
                    }}
                    variant="outline"
                    className="px-6 py-2 border-[#E5E7EB] text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer h-10 flex items-center justify-center"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-gradient-to-r from-[#0EA5A4] to-[#0F766E] text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 shadow-md hover:shadow-lg transition-all h-10 flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}

            </form>
          </Card>


        </div>

      </div>

      {/* Change Password Dialog Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowPwdModal(false)}
          />
          
          {/* Modal Container */}
          <Card className="relative w-full max-w-[420px] bg-white border border-[#E5E7EB] rounded-[24px] shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3.5 mb-5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Lock size={16} className="text-[#0EA5A4]" /> Change Password
              </h3>
              <button 
                onClick={() => setShowPwdModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Password Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Security Hint */}
              <div className="flex gap-2.5 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Use a strong, unique password with at least 6 characters, mixing digits and alphabets.
                </p>
              </div>

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Current Password</label>
                <input 
                  type="password" 
                  name="currentPassword" 
                  value={pwdForm.currentPassword} 
                  onChange={(e) => {
                    setPwdForm(prev => ({ ...prev, currentPassword: e.target.value }));
                    setPwdErrors(prev => ({ ...prev, currentPassword: '' }));
                  }}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none transition-all ${
                    pwdErrors.currentPassword ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-[#E5E7EB] focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5'
                  }`}
                  placeholder="Your current password" 
                  required
                />
                {pwdErrors.currentPassword && <p className="text-[10px] font-bold text-red-500">{pwdErrors.currentPassword}</p>}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">New Password</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  value={pwdForm.newPassword} 
                  onChange={(e) => {
                    setPwdForm(prev => ({ ...prev, newPassword: e.target.value }));
                    setPwdErrors(prev => ({ ...prev, newPassword: '' }));
                  }}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none transition-all ${
                    pwdErrors.newPassword ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-[#E5E7EB] focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5'
                  }`}
                  placeholder="Min. 6 characters" 
                  required
                />
                {pwdErrors.newPassword && <p className="text-[10px] font-bold text-red-500">{pwdErrors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  value={pwdForm.confirmPassword} 
                  onChange={(e) => {
                    setPwdForm(prev => ({ ...prev, confirmPassword: e.target.value }));
                    setPwdErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none transition-all ${
                    pwdErrors.confirmPassword ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/5' : 'border-[#E5E7EB] focus:border-[#0EA5A4] focus:bg-white focus:ring-4 focus:ring-teal-500/5'
                  }`}
                  placeholder="Repeat new password" 
                  required
                />
                {pwdErrors.confirmPassword && <p className="text-[10px] font-bold text-red-500">{pwdErrors.confirmPassword}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] mt-6">
                <Button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  variant="outline"
                  className="px-4 py-2 border-[#E5E7EB] text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer h-10 flex items-center justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 bg-[#0EA5A4] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold h-10 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NurseProfile;
