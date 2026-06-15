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
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Nurses() {
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('nurse123'); // default
  const [department, setDepartment] = useState('IPD');
  const [shift, setShift] = useState('Morning');

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
      shift
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
                  <img
                    src={nurse.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${nurse.name}`}
                    alt="Nurse Avatar"
                    className="w-12 h-12 rounded-xl border border-slate-100"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 leading-tight">{nurse.name}</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{nurse.email}</p>
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingNurse ? 'Leave blank to retain current' : 'Default: nurse123'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
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
