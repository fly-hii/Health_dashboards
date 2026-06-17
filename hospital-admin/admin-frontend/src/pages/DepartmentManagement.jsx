import { useState, useEffect } from 'react';
import { Building, Plus, Edit, Trash2, User, Phone, MapPin, X, Layers, Activity } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [headDoctorId, setHeadDoctorId] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('');
  const [phoneExt, setPhoneExt] = useState('');
  const [status, setStatus] = useState('active');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/users?role=DOCTOR');
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load doctors list', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setHeadDoctorId('');
    setDescription('');
    setFloor('');
    setPhoneExt('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code || '');
    setHeadDoctorId(dept.head_doctor_id || '');
    setDescription(dept.description || '');
    setFloor(dept.floor || '');
    setPhoneExt(dept.phone_ext || '');
    setStatus(dept.status || 'active');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return toast.warning('Department Name is required');

    const payload = {
      name,
      code: code.trim() || undefined,
      head_doctor_id: headDoctorId || null,
      description,
      floor,
      phone_ext: phoneExt,
      status
    };

    try {
      if (editingDept) {
        const res = await API.put(`/departments/${editingDept.id}`, payload);
        if (res.data.success) {
          toast.success(`Department "${name}" updated successfully`);
        }
      } else {
        const res = await API.post('/departments', payload);
        if (res.data.success) {
          toast.success(`Department "${name}" created successfully`);
        }
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while saving department details');
    }
  };

  const handleDelete = async (id, deptName) => {
    if (window.confirm(`Are you sure you want to delete department: ${deptName}?`)) {
      try {
        const res = await API.delete(`/departments/${id}`);
        if (res.data.success) {
          toast.success(`Department "${deptName}" removed`);
          fetchDepartments();
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete department');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Department Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage clinical and administrative zones, locations, and lead physician directories.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400 shadow-sm">
          No departments registered. Click "Add Department" to register one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 text-primary rounded-xl shrink-0">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 leading-tight truncate max-w-[160px]" title={dept.name}>
                        {dept.name}
                      </h3>
                      {dept.code && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 mt-1 inline-block uppercase tracking-wider font-mono">
                          {dept.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                    dept.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {dept.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-normal line-clamp-2 min-h-[32px]">
                  {dept.description || 'No description provided.'}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Head: <span className="font-semibold text-slate-700">{dept.headDoctor?.name || 'Unassigned'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Floor: <span className="font-semibold text-slate-700">{dept.floor || 'N/A'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Phone Ext: <span className="font-semibold text-slate-700">{dept.phone_ext || 'N/A'}</span></span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(dept)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => handleDelete(dept.id, dept.name)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-all flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-5 h-5 text-primary" />
                <span>{editingDept ? 'Modify Department' : 'Register Department'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-none">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department Name*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cardiology"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Code/Abbr</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CARD"
                    maxLength={10}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-mono uppercase font-bold tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Head Doctor</label>
                <select
                  value={headDoctorId}
                  onChange={(e) => setHeadDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">-- Assign Head Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Floor / Wing</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="e.g. 2nd Floor"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Extension</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phoneExt}
                      onChange={(e) => setPhoneExt(e.target.value)}
                      placeholder="e.g. 1045"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe department operations, specialities..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
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
                  {editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
