import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  ShieldCheck,
  Building,
  Mail,
  Phone,
  X,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function UserManagement() {
  const [searchParams] = useSearchParams();
  const roleFilter = searchParams.get('role'); // DOCTOR, NURSE, PHARMACIST, RECEPTIONIST, LAB_TECHNICIAN

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [department, setDepartment] = useState('OTHERS');
  const [status, setStatus] = useState('Active');
  
  // Reset password states
  const [newPassword, setNewPassword] = useState('');

  // Role-specific fields state
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [shift, setShift] = useState('Morning');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { name, email, password, employeeId }
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [employeeId, setEmployeeId] = useState('');

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
    // Auto-suggest employee ID prefix only if field is empty or has old prefix
    setEmployeeId(prev => {
      const prefix = getEmpIdPrefixForRole(selectedRole);
      if (!prev || /^[A-Z]{2,3}\d*$/.test(prev)) return prefix;
      return prev;
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/users', {
        params: { role: roleFilter }
      });
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user portal accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('user123'); // default
    const defaultRole = roleFilter || 'ADMIN';
    setRole(defaultRole);
    setDepartment(getDefaultDeptForRole(defaultRole));
    setStatus('Active');
    setEmployeeId('');

    // Reset role-specific fields
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
      // Role-specific payload mappings
      specialization: role === 'DOCTOR' ? specialization : undefined,
      qualification: role === 'DOCTOR' ? qualification : undefined,
      experience: role === 'DOCTOR' ? (Number(experience) || 0) : undefined,
      shift: role === 'NURSE' ? shift : undefined,
      schedule: role === 'DOCTOR' ? {
        days: scheduleDays,
        startTime,
        endTime
      } : undefined,
      availabilityStatus: (role === 'DOCTOR' || role === 'NURSE') ? availabilityStatus : undefined
    };

    if (password) payload.password = password;

    try {
      if (editingUser) {
        await API.put(`/users/${editingUser._id}`, payload);
        toast.success(`User ${name} updated successfully`);
        setIsModalOpen(false);
      } else {
        await API.post('/users', payload);
        toast.success(`User ${name} registered successfully`);
        setIsModalOpen(false);
        // Show credential summary so admin can share login details
        setCreatedCredentials({ name, email, password, employeeId: employeeId.trim() || null });
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred saving user profile');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return toast.warning('Please enter a new password');
    try {
      const res = await API.post('/auth/reset-password', {
        userId: resetUser._id,
        newPassword
      });
      if (res.data.success) {
        toast.success(`Password reset successfully for ${resetUser.name}`);
        setIsResetModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset user password');
    }
  };

  const handleToggleStatus = async (userObj) => {
    const nextStatus = userObj.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await API.put(`/users/${userObj._id}`, { status: nextStatus });
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
        toast.error('Failed to delete user');
      }
    }
  };

  const formatRoleLabel = (roleStr) => {
    if (!roleStr) return 'All Staff Users';
    return roleStr.toLowerCase().replace('_', ' ') + 's Portal';
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans capitalize">
            {formatRoleLabel(roleFilter)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage logins, security roles, departments, and credentials.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
        >
          <UserPlus className="w-5 h-5" />
          <span>Create User</span>
        </button>
      </div>

      {/* CREATED CREDENTIALS BANNER */}
      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Account Created — Share These Credentials</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">The user can log in immediately with the details below.</p>
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
              <span className="text-slate-400 font-sans font-semibold">Email</span>
              <span className="font-semibold text-primary">{createdCredentials.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans font-semibold">Password</span>
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

      {/* Grid listing */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400 shadow-sm">
          No users registered under this portal. Click "Create User" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map((u) => (
            <div key={u._id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}`}
                      alt="User profile"
                      className="w-12 h-12 rounded-xl border border-slate-100"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 leading-tight">{u.name}</h3>
                      <p className="text-[10px] font-semibold text-primary mt-0.5">{u.role} &bull; {u.department}</p>
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
                    <span className="truncate text-slate-600">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">{u.phone || 'N/A'}</span>
                  </div>
                  {u.employeeId && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-600 font-bold tracking-wider text-[11px]">{u.employeeId}</span>
                    </div>
                  )}

                  {u.role === 'DOCTOR' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-500">Qualification:</span>{' '}
                        <span className="text-slate-700 font-medium">{u.qualification || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Specialization:</span>{' '}
                        <span className="text-slate-700 font-medium">{u.specialization || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Experience:</span>{' '}
                        <span className="text-slate-700 font-medium">{u.experience ? `${u.experience} Years` : '0 Years'}</span>
                      </div>
                      {u.schedule && u.schedule.days && u.schedule.days.length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-500">Schedule:</span>{' '}
                          <span className="text-slate-700 font-medium block leading-tight mt-0.5">
                            {u.schedule.days.map(d => d.substring(0,3)).join(', ')} <br/>
                            ({u.schedule.startTime} - {u.schedule.endTime})
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-semibold text-slate-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          u.availabilityStatus === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          u.availabilityStatus === 'Busy' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {u.availabilityStatus || 'Available'}
                        </span>
                      </div>
                    </div>
                  )}

                  {u.role === 'NURSE' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-500">Shift Assignment:</span>{' '}
                        <span className="text-slate-700 font-medium">{u.shift || 'Morning'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-semibold text-slate-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          u.availabilityStatus === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          u.availabilityStatus === 'Busy' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {u.availabilityStatus || 'Available'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer buttons */}
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
                    onClick={() => handleDeleteUser(u._id, u.name)}
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

      {/* ADD/EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingUser ? 'Edit Portal User' : 'Create Portal User'}
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0103"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
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
                    <option value="LAB_TECHNICIAN">Lab Technician</option>
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
                    <option value="RECEPTION">Receptionist</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
              </div>

              {/* Employee ID field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Employee ID
                  <span className="ml-1 text-slate-300 font-normal normal-case">(used as login ID on staff dashboards)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder={`e.g. ${getEmpIdPrefixForRole(role)}001`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-mono tracking-widest uppercase"
                  />
                  {employeeId && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      ID SET
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">💡 Leave blank to skip. Pharmacists use this ID to log into the Pharmacy Dashboard.</p>
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
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">💡 Make sure to note or copy this password — you'll need it to share with the user.</p>
                </div>
              )}

              {/* Dynamic Doctor Fields */}
              {role === 'DOCTOR' && (
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Doctor Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qualification*</label>
                      <input
                        type="text"
                        required={role === 'DOCTOR'}
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. MD, MBBS"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
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
                        placeholder="e.g. 5"
                        min="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      />
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="e.g. 05:00 PM"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Nurse Fields */}
              {role === 'NURSE' && (
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Nurse Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shift Assignment*</label>
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

              <div className="flex gap-4 pt-4 border-t border-slate-100">
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
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-sm shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Reset Security Password</span>
              </h2>
              <button onClick={() => setIsResetModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">User Account</span>
                <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {resetUser.name} ({resetUser.email})
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password*</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter secure new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
