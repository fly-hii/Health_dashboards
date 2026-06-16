import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  FileText, 
  Upload, 
  Download, 
  User, 
  Folder, 
  Search, 
  X, 
  Eye, 
  Trash2, 
  AlertCircle, 
  Check 
} from 'lucide-react';
import './ReportsView.css';

// Card Icon custom stylist based on category & name matching reference colors
const getIconStyle = (type, name) => {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('sugar') || lowerName.includes('sugar') || lowerName.includes('sugar')) {
    return { bg: 'bg-orange-50 border-orange-100 text-orange-500' };
  }
  if (lowerName.includes('blood') || lowerName.includes('sugar') || lowerName.includes('cbc')) {
    return { bg: 'bg-orange-50 border-orange-100 text-orange-600' };
  }
  if (lowerName.includes('lipid') || lowerName.includes('cholesterol')) {
    return { bg: 'bg-blue-50 border-blue-100 text-blue-500' };
  }
  if (lowerName.includes('ecg') || lowerName.includes('electrocardiogram') || lowerName.includes('report')) {
    if (lowerName.includes('ecg')) {
      return { bg: 'bg-emerald-50 border-emerald-100 text-emerald-500' };
    }
  }
  if (lowerName.includes('x-ray') || lowerName.includes('chest') || lowerName.includes('imaging') || lowerName.includes('mri') || lowerName.includes('scan')) {
    return { bg: 'bg-sky-50 border-sky-100 text-sky-500' };
  }
  if (lowerName.includes('echo') || lowerName.includes('tmt') || lowerName.includes('cardiography')) {
    return { bg: 'bg-purple-50 border-purple-100 text-purple-500' };
  }
  // Default fallbacks
  if (type === 'lab') {
    return { bg: 'bg-orange-50 border-orange-100 text-orange-500' };
  }
  if (type === 'imaging') {
    return { bg: 'bg-sky-50 border-sky-100 text-sky-500' };
  }
  return { bg: 'bg-emerald-50 border-emerald-100 text-emerald-500' };
};

// PDF/Image Preview Portal Modal Component
function ReportPreviewModal({ report, onClose }) {
  useEffect(() => {
    // Scroll Lock
    document.body.style.overflow = 'hidden';
    
    // ESC Close
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isPDF = report.fileUrl?.toLowerCase().endsWith('.pdf');

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm transition-opacity"
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-800">{report.reportName || report.name}</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Uploaded on {report.reportDate || report.date} &bull; Size: {report.fileSize || report.size}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-all cursor-pointer focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50">
          {/* Patient Details banner */}
          <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F4F2] text-[#0F9D8A] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-slate-900">{report.patient?.name || 'Patient'}</span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                ID: {report.patient?.patientId || 'N/A'} &bull; Age: {report.patient?.age || 'N/A'} &bull; Gender: {report.patient?.gender || 'N/A'}
              </p>
            </div>
          </div>

          {/* File Preview Container */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[450px] flex items-center justify-center relative">
            {isPDF ? (
              <object
                data={report.fileUrl}
                type="application/pdf"
                className="w-full h-full min-h-[450px]"
              >
                <div className="p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">PDF Viewer is not supported in this browser.</p>
                  <a 
                    href={report.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#0F9D8A] hover:underline mt-2 inline-block text-xs font-bold"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              </object>
            ) : (
              <img 
                src={report.fileUrl} 
                alt={report.reportName || report.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg p-2"
              />
            )}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
          >
            Close
          </button>
          <a 
            href={`/api/reports/download/${report._id}`}
            download
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#0F9D8A] hover:bg-[#0c8776] rounded-xl transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download File
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ReportsView() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // Tabs & Searching States
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all', 'lab', 'imaging', 'others'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Upload Panel States
  const [uploadFile, setUploadFile] = useState(null);
  const [customReportName, setCustomReportName] = useState('');
  const [reportCategory, setReportCategory] = useState('lab');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Preview Modal
  const [previewingReport, setPreviewingReport] = useState(null);

  const fileInputRef = useRef(null);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [repRes, patRes] = await Promise.all([
        api.getReportsV3(),
        api.getPatients()
      ]);
      if (repRes.success) {
        setReports(repRes.reports);
      }
      if (patRes.success) {
        setPatients(patRes.patients);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
      setErrorMsg("Failed to connect to the medical records database.");
    } finally {
      setLoading(false);
    }
  };

  // Socket Connection for Real-Time Sync
  useEffect(() => {
    fetchReportsData();

    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const derivedSocketUrl = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : 'http://localhost:5051';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || derivedSocketUrl;
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('doctor_token')
      }
    });

    socket.on('connect', () => {
      console.log('🔌 ReportsView socket connection established');
    });

    socket.on('reportUploaded', (newReport) => {
      // Add if uploader doesn't already have it
      setReports(prev => {
        if (prev.some(r => r._id === newReport._id)) return prev;
        return [newReport, ...prev];
      });
    });

    socket.on('reportDeleted', ({ id }) => {
      setReports(prev => prev.filter(r => r._id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Toast Timer auto-dismiss
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    // Size check: Max 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setToast({ show: true, message: 'File is too large! Maximum allowed size is 10MB.', type: 'error' });
      return;
    }

    // Type check: PDF, JPG, JPEG, PNG
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setToast({ show: true, message: 'Unsupported file format! Please upload PDF, JPG, or PNG.', type: 'error' });
      return;
    }

    setUploadFile(file);
    setCustomReportName(file.name.split('.')[0]); // Default custom input to file title
  };

  // Trigger file download
  const handleDownload = (rep) => {
    window.open(`/api/reports/download/${rep._id}`);
  };

  // Upload file execution
  const handleUploadReportSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedPatientId) return;

    setUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('patientId', selectedPatientId);
      formData.append('reportName', customReportName.trim());
      formData.append('reportType', reportCategory);
      formData.append('file', uploadFile);

      // Simulate network request progress
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return 85;
          }
          return prev + 15;
        });
      }, 100);

      const res = await api.uploadReportV3(formData);
      
      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.success) {
        setToast({ show: true, message: 'Medical document uploaded successfully!', type: 'success' });
        setUploadFile(null);
        setCustomReportName('');
        // Refresh local reports
        const repRes = await api.getReportsV3();
        if (repRes.success) {
          setReports(repRes.reports);
        }
      }
    } catch (err) {
      console.error("Failed to upload report:", err);
      setToast({ show: true, message: err.message || 'File upload failed. Please try again.', type: 'error' });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  // Delete Report
  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this diagnostic report? This will remove the file from storage.")) {
      return;
    }

    try {
      const res = await api.deleteReportV3(id);
      if (res.success) {
        setToast({ show: true, message: 'Report deleted successfully.', type: 'success' });
        setReports(prev => prev.filter(r => r._id !== id));
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
      setToast({ show: true, message: err.message || 'Failed to delete report.', type: 'error' });
    }
  };

  // Filtering reports
  const filteredReports = reports.filter(rep => {
    // 1. Patient matching
    const repPatientId = rep.patientId || rep.patient?._id || rep.patient;
    if (selectedPatientId && repPatientId?.toString() !== selectedPatientId) return false;

    // 2. Tab Category matching
    if (activeSubTab !== 'all' && rep.reportType !== activeSubTab) return false;

    // 3. Search query matching (Patient name, report name, report type)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pName = (rep.patient?.name || '').toLowerCase();
      const rName = (rep.reportName || '').toLowerCase();
      const rType = (rep.reportType || '').toLowerCase();
      if (!pName.includes(q) && !rName.includes(q) && !rType.includes(q)) return false;
    }

    // 4. Date matching
    if (dateFilter) {
      const rDate = rep.reportDate || rep.date || '';
      const formattedDate = new Date(rep.createdAt).toISOString().split('T')[0];
      if (!rDate.includes(dateFilter) && !formattedDate.includes(dateFilter)) return false;
    }

    // 5. Type filter matching
    if (typeFilter !== 'all' && rep.reportType !== typeFilter) return false;

    return true;
  });

  const selectedPatientObj = patients.find(p => p._id === selectedPatientId);

  // Skeleton grid helper
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(n => (
        <div key={n} className="bg-white rounded-[20px] border border-[#E5E7EB] p-5 shadow-sm animate-pulse flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between">
            <div className="h-3 bg-slate-100 rounded w-12" />
            <div className="h-3 bg-slate-100 rounded w-12" />
            <div className="h-3 bg-slate-100 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-8 flex flex-col gap-6 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans text-left relative">
      
      {/* Toast Alert Banner */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[2000] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-lg border animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {toast.type === 'success' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" />
            </div>
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Title block */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">Reports</h1>
        <p className="text-sm text-[#64748B] mt-1">View and download patient reports.</p>
      </div>

      {/* Patient selector filter bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-sm">
        <select
          value={selectedPatientId}
          onChange={(e) => {
            setSelectedPatientId(e.target.value);
            setActiveSubTab('all');
            setSearchQuery('');
            setDateFilter('');
            setTypeFilter('all');
          }}
          className="flex-1 min-w-[200px] px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] bg-white transition-all cursor-pointer"
        >
          <option value="">Select Patient</option>
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}{p.patientId ? ` (${p.patientId})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Main Card workspace */}
      <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm flex flex-col overflow-hidden p-6">
        
        {loading ? (
          renderSkeletons()
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="text-lg font-bold text-[#0B1F3A]">{errorMsg}</p>
          </div>
        ) : !selectedPatientId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Folder className="w-12 h-12 text-[#0F9D8A]/20" />
            <p className="text-lg font-bold text-[#0B1F3A]">Select patient to view medical reports & documents</p>
            <p className="text-sm text-[#64748B]">Please select a patient from the dropdown to access files or perform document uploads.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Selected Patient summary badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E6F4F2] text-[#0F9D8A] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-[#0B1F3A]">{selectedPatientObj?.name}</span>
                  <span className="text-[11px] text-[#64748B] font-semibold mt-0.5">
                    ID: {selectedPatientObj?.patientId || 'N/A'} &bull; Gender: {selectedPatientObj?.gender || 'N/A'} &bull; Age: {selectedPatientObj?.age || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub Filter controls: Search and Specific Type/Date controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#1E293B] bg-white transition-all"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] bg-white cursor-pointer transition-all"
              >
                <option value="all">All Categories</option>
                <option value="lab">Lab Reports</option>
                <option value="imaging">Imaging</option>
                <option value="others">Others</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F9D8A] text-[#64748B] bg-white cursor-pointer transition-all"
              />
            </div>

            {/* Sub Tabs bar */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {[
                { id: 'all', label: 'All Reports' },
                { id: 'lab', label: 'Lab Reports' },
                { id: 'imaging', label: 'Imaging' },
                { id: 'others', label: 'Others' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeSubTab === tab.id 
                      ? 'bg-gradient-to-r from-[#0F9D8A] to-[#0D9488] text-white shadow-sm shadow-[#0F9D8A]/10' 
                      : 'bg-white border border-[#E5E7EB] text-[#64748B] hover:text-[#0B1F3A] hover:bg-slate-50'
                  }`}
                  onClick={() => setActiveSubTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid of Report cards */}
            {filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-[20px] gap-2">
                <Folder className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-medium">No reports matched your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((rep) => {
                  const design = getIconStyle(rep.reportType, rep.reportName);
                  const isUploader = user && (rep.doctorId?.toString() === user._id?.toString() || rep.doctorId === user.id);
                  const isAdmin = user && user.role?.toLowerCase() === 'admin';
                  
                  return (
                    <div 
                      key={rep._id} 
                      className="bg-white rounded-[20px] border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${design.bg} ${design.border} ${design.text}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold text-slate-800 truncate leading-snug">{rep.reportName || rep.name}</span>
                          <span className="text-[11px] text-slate-400 font-semibold mt-1">{rep.reportDate || rep.date}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(rep);
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#0F9D8A] transition-all cursor-pointer shrink-0"
                          title="Download report file"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Card actions strip */}
                      <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-3.5 text-[11px] font-bold text-slate-500">
                        <button 
                          onClick={() => setPreviewingReport(rep)}
                          className="hover:text-[#0F9D8A] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button 
                          onClick={() => setPreviewingReport(rep)}
                          className="hover:text-[#0F9D8A] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Preview PDF
                        </button>
                        {(isUploader || isAdmin) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(rep._id);
                            }}
                            className="hover:text-rose-500 text-slate-400 flex items-center gap-1 cursor-pointer transition-all ml-auto"
                            title="Delete report"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload Area Bottom Box */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
              <h4 className="text-base font-bold text-slate-900 mb-4">Upload New Report</h4>
              
              <div className="flex flex-col gap-4">
                
                {/* Drag Drop Area */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-[20px] p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging 
                      ? 'border-[#0F9D8A] bg-[#E6F4F2]/30' 
                      : 'border-slate-300 hover:border-[#0F9D8A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#E6F4F2] text-[#0F9D8A] flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Drag & drop files here or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">PDF, JPG, PNG up to 10MB</p>
                </div>

                {/* Preview Selected File Panel */}
                {uploadFile && (
                  <form onSubmit={handleUploadReportSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-200">
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#0F9D8A]" />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-sm">{uploadFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="w-7 h-7 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Report File Name</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F9D8A] bg-white transition-all font-semibold" 
                          placeholder="Custom Report Name" 
                          value={customReportName}
                          onChange={(e) => setCustomReportName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                        <select 
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F9D8A] bg-white transition-all cursor-pointer font-semibold"
                          value={reportCategory}
                          onChange={(e) => setReportCategory(e.target.value)}
                          required
                        >
                          <option value="lab">Lab Report</option>
                          <option value="imaging">Imaging</option>
                          <option value="others">Others</option>
                        </select>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
                        <div 
                          className="bg-[#0F9D8A] h-full rounded-full transition-all duration-350"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="w-full sm:w-auto px-8 py-3 text-xs font-bold text-white bg-gradient-to-r from-[#0F9D8A] to-[#0D9488] hover:opacity-95 rounded-xl transition-all focus:outline-none shadow-sm shadow-[#0F9D8A]/15 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 h-[44px] mt-2 self-end"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading document ({uploadProgress}%)
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Upload Document
                        </>
                      )}
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Embedded Document Previewer Portal Modal */}
      {previewingReport && (
        <ReportPreviewModal 
          report={previewingReport} 
          onClose={() => setPreviewingReport(null)} 
        />
      )}
    </div>
  );
}
