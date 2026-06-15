import { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Plus, 
  Clock, 
  CheckCircle, 
  Edit, 
  Eye,
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Laboratory() {
  const [tests, setTests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Update state
  const [selectedTest, setSelectedTest] = useState(null);
  const [status, setStatus] = useState('Pending');
  const [result, setResult] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLabData = async () => {
    setLoadingTests(true);
    try {
      const testsRes = await API.get('/laboratory/tests');
      if (testsRes.data.success) {
        setTests(testsRes.data.data);
      }

      const techRes = await API.get('/laboratory/technicians');
      if (techRes.data.success) {
        setTechnicians(techRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load laboratory data');
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, []);

  const openUpdateModal = (test) => {
    setSelectedTest(test);
    setStatus(test.status);
    setResult(test.result || '');
    setTechnicianId(test.technician?._id || '');
    setNotes(test.notes || '');
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/laboratory/tests/${selectedTest._id}`, {
        status,
        result,
        technicianId,
        notes
      });

      if (res.data.success) {
        toast.success(`Lab report for ${selectedTest.testName} updated successfully`);
        setIsModalOpen(false);
        fetchLabData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update lab test status');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Lab Tests Queue (Col span 8) */}
      <div className="xl:col-span-8 bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-sans">Lab Diagnostics Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">Fulfilling laboratory testing procedures and uploads</p>
        </div>

        {loadingTests ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
        ) : tests.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No active diagnostic tests registered</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                  <th className="pb-3">Test Date</th>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Diagnostic Test</th>
                  <th className="pb-3">Technician</th>
                  <th className="pb-3">Fulfillment Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4 text-slate-500">{new Date(t.testDate).toLocaleDateString()}</td>
                    <td className="py-4 font-semibold text-slate-700">{t.patient?.name || 'Walk-in Patient'}</td>
                    <td className="py-4 font-semibold text-slate-700">
                      <span className="text-primary">{t.testName}</span>
                    </td>
                    <td className="py-4 text-slate-500">{t.technician?.name || 'Unassigned'}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => openUpdateModal(t)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all text-[10px] flex items-center gap-1.5 ml-auto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Update Result</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Lab Technicians Directory (Col span 4) */}
      <div className="xl:col-span-4 bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lab Technicians</h2>
          <p className="text-xs text-slate-400 mt-0.5">Active diagnostic operators</p>
        </div>

        <div className="space-y-4">
          {technicians.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No lab technicians registered</p>
          ) : (
            technicians.map((tech) => (
              <div key={tech._id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${tech.name}`}
                  alt="Tech profile"
                  className="w-9 h-9 border border-slate-100 rounded-lg"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-700 leading-tight">{tech.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{tech.email} &bull; {tech.phone || 'No phone'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* UPDATE REPORT MODAL */}
      {isModalOpen && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                Upload Findings: {selectedTest.testName}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Profile</span>
                <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedTest.patient?.name || 'Walk-in'} ({selectedTest.patient?.gender})
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Technician*</label>
                <select
                  required
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Select Operator</option>
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fulfillment Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnostic Findings / Results*</label>
                <textarea
                  required
                  rows="3"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g. Hemoglobin levels: 14.2 g/dL (Normal). WBC count normal."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advised immediate physician follow-up"
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
                  Save Findings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
