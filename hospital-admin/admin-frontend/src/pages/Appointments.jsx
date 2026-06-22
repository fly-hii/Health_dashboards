import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Clock, 
  User, 
  UserCheck, 
  MapPin, 
  Trash2, 
  Edit, 
  Check, 
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [department, setDepartment] = useState('OPD');
  const [status, setStatus] = useState('Pending');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const fetchAppointmentsData = async () => {
    try {
      const apptRes = await API.get('/appointments');
      if (apptRes.data.success) {
        setAppointments(apptRes.data.data);
      }

      const patRes = await API.get('/patients');
      if (patRes.data.success) {
        setPatients(patRes.data.data);
      }

      const docRes = await API.get('/users?role=DOCTOR');
      if (docRes.data.success) {
        setDoctors(docRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsData();
  }, []);

  const openAddModal = () => {
    setEditingAppt(null);
    setPatientId('');
    setDoctorId('');
    setDateTime('');
    setDepartment('OPD');
    setStatus('Pending');
    setReason('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (appt) => {
    setEditingAppt(appt);
    // Backend returns `id` not `_id` for associations
    setPatientId(appt.patient?.id || appt.patient_id || '');
    setDoctorId(appt.doctor?.id || appt.doctor_id || '');
    // Backend returns `date_time` not `dateTime`
    const rawDate = appt.date_time || appt.dateTime;
    const d = rawDate ? new Date(rawDate) : new Date();
    const dateString = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
    setDateTime(dateString);
    setDepartment(appt.department || 'OPD');
    setStatus(appt.status || 'Pending');
    setReason(appt.reason || '');
    setNotes(appt.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !dateTime) {
      return toast.warning('Please enter all required fields');
    }

    // Field names must match what the backend appointmentController expects
    const payload = {
      patient_id: patientId,
      doctor_id: doctorId,
      date_time: new Date(dateTime).toISOString(),
      department,
      status,
      reason,
      notes,
    };

    try {
      if (editingAppt) {
        // Use `id` from the appointment object (backend returns integer id)
        const apptId = editingAppt.id || editingAppt._id;
        await API.put(`/appointments/${apptId}`, payload);
        toast.success('Appointment schedule updated');
      } else {
        await API.post('/appointments', payload);
        toast.success('Appointment booked successfully');
      }
      setIsModalOpen(false);
      fetchAppointmentsData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save appointment');
    }
  };

  const handleDelete = async (appt, patName) => {
    // Support both `id` (integer) and `_id` (legacy)
    const apptId = appt?.id || appt;
    if (window.confirm(`Are you sure you want to cancel and delete appointment for ${patName}?`)) {
      try {
        await API.delete(`/appointments/${apptId}`);
        toast.success('Appointment deleted');
        fetchAppointmentsData();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete appointment');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Appointments Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Book, update status, and track doctor consultation schedules.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400 shadow-sm">
          No appointments recorded in system. Click "Book Appointment" to add one.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                  <th className="pb-3">Token #</th>
                  <th className="pb-3">Time & Date</th>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Assigned Physician</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Fulfillment Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id || appt._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {appt.token_number ?? appt.tokenNumber ?? '—'}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(appt.date_time || appt.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </td>
                    <td className="py-4 font-bold text-slate-700">{appt.patient?.full_name || appt.patient?.name || 'Walk-in Patient'}</td>
                    <td className="py-4 text-slate-600">{appt.doctor?.name || 'Unassigned'}</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-600">
                        {appt.department}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500 max-w-xs truncate">{appt.reason || 'General Checkup'}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        appt.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(appt)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                        title="Edit Appointment"
                      >
                        <Edit className="w-4.5 h-4.5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(appt, appt.patient?.full_name || appt.patient?.name)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Cancel Appointment"
                      >
                        <Trash2 className="w-4.5 h-4.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOOK/EDIT APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingAppt ? 'Edit Appointment Details' : 'Book New Appointment'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient*</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Select Patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Doctor*</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.specialization}){d.availabilityStatus && d.availabilityStatus !== 'Available' ? ` - ${d.availabilityStatus}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Choose Date & Time*</label>
                  <input
                    type="datetime-local"
                    required
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinic Department</label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Regular health assessment"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Notes</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional patient context or requests"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                ></textarea>
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
                  {editingAppt ? 'Save Details' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
