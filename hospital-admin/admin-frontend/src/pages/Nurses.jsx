import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Clock, 
  Building,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Nurses() {
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('nurse123'); // default
  const [department, setDepartment] = useState('IPD');
  const [shift, setShift] = useState('Morning');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('Active');
  
  // Credentials block state
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const fetchNurses = async () => {
    try {
      const res = await API.get('/users?role=NURSE');
      if (res.data.success) {
        setNurses(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load nurses directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurses();
  }, []);

  const openAddModal = () => {
    setEditingNurse(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('nurse123');
    setDepartment('IPD');
    setShift('Morning');
    setEmployeeId('');
    setStatus('Active');
    setShowPassword(false);
    setCreatedCredentials(null);
    setIsModalOpen(true);
  };

  const openEditModal = (nurse) => {
    setEditingNurse(nurse);
    setName(nurse.name);
    setEmail(nurse.email);
    setPhone(nurse.phone || '');
    setPassword(''); // leave blank unless changing
    setDepartment(nurse.department || 'IPD');
    setShift(nurse.shift || 'Morning');
    setEmployeeId(nurse.employeeId || '');
    setStatus(nurse.status || 'Active');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      return toast.warning('Please enter name and email');
    }

    const payload = {
      name,
      email,
      phone,
      role: 'NURSE',
      department,
      shift,
      status,
      employeeId: employeeId.trim() || undefined
    };

    if (password) payload.password = password;

    try {
      if (editingNurse) {
        // Edit Mode
        const res = await API.put(`/users/${editingNurse._id}`, payload);
        if (res.data.success) {
          toast.success(`Profile for ${name} updated`);
        }
      } else {
        // Create Mode
        const res = await API.post('/users', payload);
        if (res.data.success) {
          toast.success(`${name} registered successfully as Nurse`);
          setCreatedCredentials({ name, email, password, employeeId: employeeId.trim() || null });
        }
      }
      setIsModalOpen(false);
      fetchNurses();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error saving nurse profile';
      toast.error(msg);
    }
  };

  const handleDelete = async (id, nurseName) => {
    if (window.confirm(`Are you sure you want to delete nurse ${nurseName}?`)) {
      try {
        const res = await API.delete(`/users/${id}`);
        if (res.data.success) {
          toast.success(`${nurseName} removed successfully`);
          fetchNurses();
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete nurse record');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nurses Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Assign departments, ward shifts, and schedules.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Nurse</span>
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

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : nurses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400">
          No nurse profiles registered. Click "Add Nurse" to register one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nurses.map((nurse) => (
            <div key={nurse._id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={nurse.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${nurse.name}`}
                      alt="Nurse Avatar"
                      className="w-12 h-12 rounded-xl border border-slate-100"
                    />
                    {nurse.status === 'Inactive' && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 border-2 border-white" title="Inactive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-700 leading-tight">{nurse.name}</h3>
                      {nurse.status === 'Inactive' && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{nurse.email}</p>
                    {nurse.employeeId && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                        {nurse.employeeId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Department: <span className="font-semibold text-slate-700">{nurse.department}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Shift: <span className="font-semibold text-slate-700">{nurse.shift}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{nurse.phone || 'Phone unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(nurse)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(nurse._id, nurse.name)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-all flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingNurse ? 'Edit Nurse Profile' : 'Register New Nurse'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-none">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nurse Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nurse Miller"
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
                  placeholder="nurse@careplus.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0103"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="OPD">OPD</option>
                    <option value="IPD">IPD</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Shift</label>
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
                    placeholder="e.g. NRS001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-mono tracking-widest uppercase"
                  />
                  {employeeId && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      ID SET
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">💡 Leave blank to skip. Nurses use this ID to log into the Nurse Dashboard.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Security Password*</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingNurse ? 'Leave blank to retain current' : 'Default: nurse123'}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {!editingNurse && (
                  <p className="text-[10px] text-slate-400 mt-1">💡 Make sure to note or copy this password — you'll need it to share with the user.</p>
                )}
              </div>

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
                  {editingNurse ? 'Save Changes' : 'Register Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
