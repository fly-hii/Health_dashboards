import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Key, CheckCircle, XCircle, UserPlus, 
  ShieldCheck, Mail, Phone, X, Eye, EyeOff, Copy, Check, Filter, Briefcase, Calendar, Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function StaffManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  // Filter States
  const [selectedRoleTab, setSelectedRoleTab] = useState('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [department, setDepartment] = useState('OTHERS');
  const [status, setStatus] = useState('Active');
  const [employeeId, setEmployeeId] = useState('');
  
  // Reset password state
  const [newPassword, setNewPassword] = useState('');

  // Role-specific fields state
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [shift, setShift] = useState('Morning');
  const [scheduleDays, setScheduleDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const roleTabs = [
    { label: 'All Staff', val: 'ALL' },
    { label: 'Doctors', val: 'DOCTOR' },
    { label: 'Nurses', val: 'NURSE' },
    { label: 'Pharmacists', val: 'PHARMACIST' },
    { label: 'Lab Techs', val: 'LAB_TECHNICIAN' },
    { label: 'Receptionists', val: 'RECEPTIONIST' },
    { label: 'Admins', val: 'ADMIN' },
    { label: 'Hospital Admins', val: 'HOSPITAL_ADMIN' }
  ];

  const deptOptions = ['ALL', 'OPD', 'IPD', 'PHARMACY', 'LABORATORY', 'RECEPTION', 'OTHERS'];

  const getDefaultDeptForRole = (r) => {
    switch(r) {
      case 'DOCTOR': return 'OPD';
      case 'NURSE': return 'IPD';
      case 'PHARMACIST': return 'PHARMACY';
      case 'LAB_TECHNICIAN': return 'LABORATORY';
      case 'RECEPTIONIST': return 'RECEPTION';
      default: return 'OTHERS';
    }
  };

  const getEmpIdPrefixForRole = (r) => {
    switch(r) {
      case 'DOCTOR': return 'DOC';
      case 'NURSE': return 'NRS';
      case 'PHARMACIST': return 'CPH';
      case 'LAB_TECHNICIAN': return 'LAB';
      case 'RECEPTIONIST': return 'REC';
      case 'ADMIN': return 'ADM';
      case 'HOSPITAL_ADMIN': return 'HAD';
      default: return 'EMP';
    }
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setDepartment(getDefaultDeptForRole(selectedRole));
    setEmployeeId(prev => {
      const prefix = getEmpIdPrefixForRole(selectedRole);
      if (!prev || /^[A-Z]{2,3}\d*$/.test(prev)) return prefix;
      return prev;
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users without filters first, then client-side filter for cleaner tab UI
      const res = await API.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('user123'); // Default password suggestion
    setRole('ADMIN');
    setDepartment('OTHERS');
    setStatus('Active');
    setEmployeeId('ADM');

    // Reset role-specific
    setSpecialization('');
    setQualification('');
    setExperience('');
    setShift('Morning');
    setScheduleDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setStartTime('09:00 AM');
    setEndTime('05:00 PM');
    setAvailabilityStatus('Available');
    setShowPassword(false);
    setCreatedCredentials(null);

    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setPassword('');
    setRole(u.role);
    setDepartment(u.department || 'OTHERS');
    setStatus(u.status);
    setEmployeeId(u.employeeId || '');

    // Set role-specific fields
    setSpecialization(u.specialization || '');
    setQualification(u.qualification || '');
    setExperience(u.experience !== undefined ? u.experience : '');
    setShift(u.shift || 'Morning');
    setScheduleDays(u.schedule?.days || []);
    setStartTime(u.schedule?.startTime || '09:00 AM');
    setEndTime(u.schedule?.endTime || '05:00 PM');
    setAvailabilityStatus(u.availabilityStatus || 'Available');

    setIsModalOpen(true);
  };

  const openResetModal = (u) => {
    setResetUser(u);
    setNewPassword('');
    setIsResetModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) return toast.warning('Please enter name and email');

    const payload = {
      name,
      email,
      phone,
      role,
      department,
      status,
      employeeId: employeeId.trim() || undefined,
      specialization: role === 'DOCTOR' ? specialization : undefined,
      qualification: role === 'DOCTOR' ? qualification : undefined,
      experience: role === 'DOCTOR' ? (Number(experience) || 0) : undefined,
      shift: ['NURSE', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECHNICIAN'].includes(role) ? shift : undefined,
      schedule: role === 'DOCTOR' ? {
        days: scheduleDays,
        startTime,
        endTime
      } : undefined,
      availabilityStatus: ['DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECHNICIAN'].includes(role) ? availabilityStatus : undefined
    };

    if (password) payload.password = password;

    try {
      if (editingUser) {
        await API.put(`/users/${editingUser.id}`, payload);
        toast.success(`Staff account for ${name} updated successfully`);
        setIsModalOpen(false);
      } else {
        const res = await API.post('/users', payload);
        toast.success(`Staff account for ${name} registered successfully`);
        setIsModalOpen(false);
        if (res.data && res.data.success && res.data.data) {
          const created = res.data.data;
          setCreatedCredentials({
            name: created.name,
            email: created.email,
            password: created.password || password,
            employeeId: created.employeeId || employeeId.trim() || null
          });
        } else {
          setCreatedCredentials({ name, email, password, employeeId: employeeId.trim() || null });
        }
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred saving staff profile');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return toast.warning('Please enter a new password');
    try {
      const res = await API.post('/auth/reset-password', {
        userId: resetUser.id,
        newPassword
      });
      if (res.data.success) {
        toast.success(`Password reset successfully for ${resetUser.name}`);
        setIsResetModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset staff password');
    }
  };

  const handleToggleStatus = async (userObj) => {
    const nextStatus = userObj.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await API.put(`/users/${userObj.id}`, { status: nextStatus });
      if (res.data.success) {
        toast.success(`Account status for ${userObj.name} marked: ${nextStatus}`);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to change user status');
    }
  };

  const handleDeleteUser = async (id, userName) => {
    if (window.confirm(`Are you sure you want to delete account: ${userName}?`)) {
      try {
        await API.delete(`/users/${id}`);
        toast.success(`User ${userName} deleted`);
        fetchUsers();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete staff record');
      }
    }
  };

  // Perform client-side filter
  const filteredUsers = users.filter(u => {
    const matchesRole = selectedRoleTab === 'ALL' || u.role === selectedRoleTab;
    const matchesDept = selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;
    const matchesSearch = !searchQuery || 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesRole && matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Register new clinical/operations users, manage shifts, profiles, and reset passwords.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* CREATED CREDENTIALS BANNER */}
      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm animate-fade-in max-w-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Account Created — Copy Login Credentials</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">The employee can log in immediately using these details.</p>
              </div>
            </div>
            <button onClick={() => setCreatedCredentials(null)} className="text-emerald-400 hover:text-emerald-600 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 bg-white border border-emerald-100 rounded-lg p-3 font-mono text-xs text-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans font-semibold">Name</span>
              <span className="font-semibold">{createdCredentials.name}</span>
            </div>
            {createdCredentials.employeeId && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans font-semibold">Employee ID</span>
                <span className="font-semibold text-amber-600 tracking-widest">{createdCredentials.employeeId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans font-semibold">Login Email</span>
              <span className="font-semibold text-primary">{createdCredentials.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans font-semibold">Login Password</span>
              <span className="font-semibold tracking-widest">{createdCredentials.password}</span>
            </div>
          </div>
          <button
            onClick={() => {
              const idLine = createdCredentials.employeeId ? `\nEmployee ID: ${createdCredentials.employeeId}` : '';
              const text = `Name: ${createdCredentials.name}${idLine}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
              navigator.clipboard.writeText(text);
              setCredentialsCopied(true);
              setTimeout(() => setCredentialsCopied(false), 2500);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {credentialsCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{credentialsCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-card p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-400">Department:</span>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-primary"
          >
            {deptOptions.map(dept => (
              <option key={dept} value={dept}>{dept === 'ALL' ? 'All Departments' : dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs list for Roles */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1">
        {roleTabs.map(tab => (
          <button
            key={tab.val}
            onClick={() => setSelectedRoleTab(tab.val)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              selectedRoleTab === tab.val
                ? 'border-primary text-primary bg-primary/5 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400 shadow-sm">
          No staff records matching the filters were found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {filteredUsers.map((u) => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={(!u.profileImage || u.profileImage.includes("localhost") ? null : u.profileImage) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}`}
                      alt="Profile"
                      className="w-12 h-12 rounded-xl border border-slate-100 object-cover"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 leading-tight">{u.name}</h3>
                      <p className="text-[9px] font-bold text-primary mt-1 px-2 py-0.5 bg-primary/5 rounded-full inline-block uppercase tracking-wider">
                        {u.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(u)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                      u.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' :
                      'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                    }`}
                  >
                    {u.status}
                  </button>
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-600" title={u.email}>{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">{u.phone || 'Phone unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Department: <span className="font-semibold text-slate-700">{u.department || 'N/A'}</span></span>
                  </div>
                  {u.employeeId && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-amber-600 font-bold tracking-widest text-[10px]">{u.employeeId}</span>
                    </div>
                  )}

                  {/* Doctor Info */}
                  {u.role === 'DOCTOR' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Qualification / specialty</span>
                        <span className="text-slate-700 font-medium">{u.qualification || 'MBBS'} - {u.specialization || 'General'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Experience</span>
                        <span className="text-slate-700 font-medium">{u.experience ? `${u.experience} Years` : 'N/A'}</span>
                      </div>
                      {u.schedule?.days && u.schedule.days.length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Weekly Schedule</span>
                          <span className="text-slate-700 font-medium block leading-tight mt-0.5">
                            {u.schedule.days.map(d => d.substring(0,3)).join(', ')} <br/>
                            ({u.schedule.startTime} - {u.schedule.endTime})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nurse / Pharmacist / Lab Tech / Receptionist Info */}
                  {['NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST'].includes(u.role) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Shift Rotation</span>
                        <span className="text-slate-700 font-semibold">{u.shift || 'Morning'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Availability</span>
                        <span className="text-slate-700 font-medium">{u.availabilityStatus || 'Available'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Button Bar */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(u)}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => openResetModal(u)}
                    className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                    title="Reset Password"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-all flex items-center justify-center"
                    title="Delete Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingUser ? 'Edit Staff Profile' : 'Register Staff Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-none">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address*</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@careplus.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Security Role*</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="NURSE">Nurse</option>
                    <option value="PHARMACIST">Pharmacist</option>
                    <option value="LAB_TECHNICIAN">Lab Tech</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="OPD">OPD</option>
                    <option value="IPD">IPD</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="RECEPTION">Reception</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder={`e.g. ${getEmpIdPrefixForRole(role)}001`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-mono tracking-widest font-bold uppercase"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Security Password*</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. nurse123"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Doctor Fields */}
              {role === 'DOCTOR' && (
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Physician Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qualification*</label>
                      <input
                        type="text"
                        required={role === 'DOCTOR'}
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. MD, MBBS"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specialization*</label>
                      <input
                        type="text"
                        required={role === 'DOCTOR'}
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Cardiology"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Experience (Years)*</label>
                      <input
                        type="number"
                        required={role === 'DOCTOR'}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g. 8"
                        min="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Availability</label>
                      <select
                        value={availabilityStatus}
                        onChange={(e) => setAvailabilityStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Days</label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const isChecked = scheduleDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setScheduleDays(scheduleDays.filter((d) => d !== day));
                              } else {
                                setScheduleDays([...scheduleDays, day]);
                              }
                            }}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                              isChecked
                                ? 'bg-primary text-white border-primary'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
                      <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="e.g. 09:00 AM"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="e.g. 05:00 PM"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Shift-based Fields (NURSE, PHARMACIST, RECEPTIONIST, LAB_TECHNICIAN) */}
              {['NURSE', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECHNICIAN'].includes(role) && (
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                    {role === 'NURSE' ? 'Nursing Details' :
                     role === 'PHARMACIST' ? 'Pharmacy Staff Details' :
                     role === 'RECEPTIONIST' ? 'Receptionist Details' :
                     'Laboratory Staff Details'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shift Rotation*</label>
                      <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Availability Status</label>
                      <select
                        value={availabilityStatus}
                        onChange={(e) => setAvailabilityStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  {editingUser ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-sm shadow-xl overflow-hidden animate-fade-in font-sans">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Reset Staff Password</span>
              </h2>
              <button onClick={() => setIsResetModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Resetting password for: <span className="font-bold text-slate-700">{resetUser.name}</span></p>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password*</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. newSecurePass123"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
