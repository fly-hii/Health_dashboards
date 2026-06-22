import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Search, Users, User, Calendar, Clock, MapPin, Phone, Mail, 
  Plus, Eye, Edit, Trash2, MoreVertical, X, ArrowUpRight, ArrowDownRight,
  TrendingUp, FileDown, Heart, Shield, FileText, Pill, Upload, 
  Trash, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Activity, Baby, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

export default function Patients() {
  const { searchTerm: headerSearch } = useOutletContext();
  
  // Stats
  const [stats, setStats] = useState(null);

  // Patient List
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  
  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected Patient Details
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, history, appointments, prescriptions, reports
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Tab Data
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Form states
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'A+',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    insuranceNumber: '',
    medicalNotes: '',
    status: 'active'
  });

  const [reportForm, setReportForm] = useState({
    title: '',
    category: 'Lab Test',
    doctor: '',
    fileName: '',
    fileSize: '1.4 MB'
  });

  const [appointmentForm, setAppointmentForm] = useState({
    doctor: '',
    department: 'OPD',
    dateTime: '',
    reason: '',
    notes: ''
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: ''
  });

  const [noteForm, setNoteForm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Available Seeded Doctors for selects
  const [doctorsList, setDoctorsList] = useState([]);

  // Fetch doctors list for modals
  const fetchDoctors = async () => {
    try {
      const res = await API.get('/dashboard/stats'); // We can inspect or query users. For mock, let's load or define list
      // Fallback list of doctors
      setDoctorsList([
        { id: 'sarah', name: 'Dr. Sarah Connor', specialization: 'Cardiology', department: 'OPD' },
        { id: 'marcus', name: 'Dr. Marcus Wright', specialization: 'Neurology', department: 'IPD' }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Stats Data
  const fetchStats = async () => {
    try {
      const res = await API.get('/patients/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Patients List
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const searchVal = searchQuery || headerSearch;
      const res = await API.get('/patients', {
        params: {
          search: searchVal,
          gender: genderFilter,
          status: statusFilter,
          ageGroup: ageFilter,
          sortBy,
          order: sortOrder,
          page,
          limit: 8
        }
      });
      if (res.data.success) {
        setPatients(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);

        // Select first patient by default on initial load
        if (res.data.data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(res.data.data[0]._id);
          setIsPanelOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load patients list');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, headerSearch, genderFilter, statusFilter, ageFilter, sortBy, sortOrder, page, selectedPatientId]);

  // Fetch Selected Patient Tab Data
  const fetchPatientTabData = useCallback(async (tab, patientId) => {
    if (!patientId) return;
    setTabLoading(true);
    try {
      let endpoint = `/patients/${patientId}`;
      if (tab === 'history') endpoint += '/history';
      else if (tab === 'appointments') endpoint += '/appointments';
      else if (tab === 'prescriptions') endpoint += '/prescriptions';
      else if (tab === 'reports') endpoint += '/reports';

      const res = await API.get(endpoint);
      if (res.data.success) {
        if (tab === 'overview' || tab === 'vitals') {
          setPatientDetail(res.data.data);
          // Auto set note form if any
          if (tab === 'overview') setNoteForm(res.data.data.patient.medicalNotes || '');
        } else if (tab === 'history') {
          setHistoryTimeline(res.data.data);
        } else if (tab === 'appointments') {
          setAppointments(res.data.data);
        } else if (tab === 'prescriptions') {
          setPrescriptions(res.data.data);
        } else if (tab === 'reports') {
          setReports(res.data.data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to retrieve ${tab} details`);
    } finally {
      setTabLoading(false);
    }
  }, []);

  // Sync effect when activeTab or selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientTabData('overview', selectedPatientId);
      if (activeTab !== 'overview') {
        fetchPatientTabData(activeTab, selectedPatientId);
      }
    }
  }, [selectedPatientId, activeTab, fetchPatientTabData]);

  // Initial loads
  useEffect(() => {
    fetchStats();
    fetchDoctors();
  }, []);

  // Fetch patients on filters change
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Real-time socket events setup
  useEffect(() => {
    socket.connect();
    socket.emit('join_admin_room');

    socket.on('patient_registered', (newPatient) => {
      fetchStats();
      setPatients(prev => [newPatient, ...prev].slice(0, 8));
      toast.info(`New Patient Registered: ${newPatient.fullName}`);
    });

    socket.on('patient_updated', (updatedPatient) => {
      setPatients(prev => prev.map(p => p._id === updatedPatient._id ? updatedPatient : p));
      if (selectedPatientId === updatedPatient._id) {
        setPatientDetail(prev => prev ? { ...prev, patient: updatedPatient } : null);
      }
    });

    socket.on('report_uploaded', (data) => {
      if (selectedPatientId === data.patientId && activeTab === 'reports') {
        fetchPatientTabData('reports', selectedPatientId);
      }
      toast.info('New medical report uploaded.');
    });

    return () => {
      socket.off('patient_registered');
      socket.off('patient_updated');
      socket.off('report_uploaded');
      socket.disconnect();
    };
  }, [selectedPatientId, activeTab, fetchPatientTabData]);

  // Helpers
  const getAge = (dobString) => {
    if (!dobString) return '—';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleRowClick = (patientId) => {
    setSelectedPatientId(patientId);
    setIsPanelOpen(true);
  };

  // Add Patient Form Submit
  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        fullName: patientForm.fullName,
        email: patientForm.email || undefined,
        phone: patientForm.phone,
        dob: patientForm.dob,
        gender: patientForm.gender,
        bloodGroup: patientForm.bloodGroup,
        address: patientForm.address,
        insuranceNumber: patientForm.insuranceNumber || undefined,
        medicalNotes: patientForm.medicalNotes || undefined,
        status: patientForm.status,
        emergencyContact: {
          name: patientForm.emergencyName,
          phone: patientForm.emergencyPhone,
          relation: patientForm.emergencyRelation
        }
      };

      const res = await API.post('/patients', body);
      if (res.data.success) {
        toast.success('Patient registered successfully');
        setIsAddModalOpen(false);
        fetchPatients();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to register patient');
    }
  };

  // Edit Patient Setup
  const openEditModal = (patient) => {
    setEditingPatientId(patient._id);
    setPatientForm({
      fullName: patient.fullName,
      email: patient.email || '',
      phone: patient.phone,
      dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
      gender: patient.gender,
      bloodGroup: patient.bloodGroup || 'A+',
      address: patient.address || '',
      emergencyName: patient.emergencyContact?.name || '',
      emergencyPhone: patient.emergencyContact?.phone || '',
      emergencyRelation: patient.emergencyContact?.relation || '',
      insuranceNumber: patient.insuranceNumber || '',
      medicalNotes: patient.medicalNotes || '',
      status: patient.status || 'active'
    });
    setIsEditModalOpen(true);
    setActiveActionMenuId(null);
  };

  // Edit Patient Form Submit
  const handleEditPatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        fullName: patientForm.fullName,
        email: patientForm.email || undefined,
        phone: patientForm.phone,
        dob: patientForm.dob,
        gender: patientForm.gender,
        bloodGroup: patientForm.bloodGroup,
        address: patientForm.address,
        insuranceNumber: patientForm.insuranceNumber || undefined,
        medicalNotes: patientForm.medicalNotes || undefined,
        status: patientForm.status,
        emergencyContact: {
          name: patientForm.emergencyName,
          phone: patientForm.emergencyPhone,
          relation: patientForm.emergencyRelation
        }
      };

      const res = await API.put(`/patients/${editingPatientId}`, body);
      if (res.data.success) {
        toast.success('Patient details updated successfully');
        setIsEditModalOpen(false);
        fetchPatients();
        if (selectedPatientId === editingPatientId) {
          fetchPatientTabData('overview', selectedPatientId);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update patient');
    }
  };

  // Delete Patient
  const handleDeletePatient = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete patient "${name}"?`)) {
      try {
        const res = await API.delete(`/patients/${id}`);
        if (res.data.success) {
          toast.success('Patient profile deleted');
          setSelectedPatientId(null);
          setPatientDetail(null);
          fetchPatients();
          fetchStats();
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete patient profile');
      }
    }
    setActiveActionMenuId(null);
  };

  // Upload Report Submit
  const handleUploadReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return toast.warning('Please select a file to upload');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', reportForm.title);
      formData.append('report_type', reportForm.category || 'Other');
      formData.append('description', `Consultant: ${reportForm.doctor || 'N/A'}`);

      const res = await API.post(`/patients/${selectedPatientId}/reports`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        toast.success('Report document uploaded successfully');
        setIsReportModalOpen(false);
        setReportForm({ title: '', category: 'Lab Test', doctor: '', fileName: '', fileSize: '1.4 MB' });
        setSelectedFile(null);
        fetchPatientTabData('reports', selectedPatientId);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload report');
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report document?')) {
      try {
        const res = await API.delete(`/patients/${selectedPatientId}/reports/${reportId}`);
        if (res.data.success) {
          toast.success('Report deleted successfully');
          fetchPatientTabData('reports', selectedPatientId);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete report');
      }
    }
  };

  // Book Appointment Submit
  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find selected doctor details
      const doc = doctorsList.find(d => d.id === appointmentForm.doctor || d.name === appointmentForm.doctor);
      const docName = doc ? doc.name : appointmentForm.doctor;
      
      const body = {
        patient: selectedPatientId,
        doctorName: docName,
        department: appointmentForm.department,
        dateTime: appointmentForm.dateTime,
        reason: appointmentForm.reason,
        notes: appointmentForm.notes,
        status: 'Confirmed'
      };

      // Create appointment endpoint
      await API.post('/appointments', body);
      toast.success('Appointment booked successfully');
      setIsAppointmentModalOpen(false);
      setAppointmentForm({ doctor: '', department: 'OPD', dateTime: '', reason: '', notes: '' });
      fetchPatientTabData('appointments', selectedPatientId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to book appointment');
    }
  };

  // Add Prescription Submit
  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        patient: selectedPatientId,
        diagnosis: prescriptionForm.diagnosis,
        medicines: prescriptionForm.medicines,
        notes: prescriptionForm.notes
      };

      // Call pharmacy/prescriptions endpoint
      await API.post(`/prescriptions`, body);
      toast.success('Prescription generated successfully');
      setIsPrescriptionModalOpen(false);
      setPrescriptionForm({
        diagnosis: '',
        medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        notes: ''
      });
      fetchPatientTabData('prescriptions', selectedPatientId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add prescription');
    }
  };

  // Quick Action: Save medical notes
  const handleSaveNotes = async () => {
    try {
      await API.put(`/patients/${selectedPatientId}`, { medicalNotes: noteForm });
      toast.success('Medical notes saved');
      setIsNoteModalOpen(false);
      fetchPatientTabData('overview', selectedPatientId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save notes');
    }
  };

  // Export Data to CSV
  const exportData = async (format) => {
    setIsExportDropdownOpen(false);
    try {
      const res = await API.get('/patients', {
        params: {
          search: searchQuery || headerSearch,
          gender: genderFilter,
          status: statusFilter,
          ageGroup: ageFilter,
          export: 'true'
        }
      });

      if (!res.data.success || res.data.data.length === 0) {
        return toast.warning('No records to export');
      }

      const patientsToExport = res.data.data;
      
      if (format === 'CSV') {
        const headers = ['Patient ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Blood Group', 'Address', 'Status', 'Registration Date'];
        const rows = patientsToExport.map(p => [
          p.patientId,
          p.fullName,
          p.email || 'N/A',
          p.phone,
          p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A',
          p.gender,
          p.bloodGroup || 'N/A',
          p.address || 'N/A',
          p.status,
          new Date(p.createdAt).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Patients_Directory_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported successfully as CSV');
      } else {
        // Mock XLS download (similar CSV file download formatted for excel)
        const headers = ['Patient ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Blood Group', 'Address', 'Status', 'Registration Date'];
        const rows = patientsToExport.map(p => [
          p.patientId,
          p.fullName,
          p.email || 'N/A',
          p.phone,
          p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A',
          p.gender,
          p.bloodGroup || 'N/A',
          p.address || 'N/A',
          p.status,
          new Date(p.createdAt).toLocaleDateString()
        ]);

        const excelContent = "data:application/vnd.ms-excel;charset=utf-8," 
          + [headers.join('\t'), ...rows.map(e => e.join('\t'))].join('\n');
        
        const encodedUri = encodeURI(excelContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Patients_Directory_${Date.now()}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported successfully as Excel');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to export records');
    }
  };

  // Add prescription medicine row helper
  const addMedicineRow = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patients</h1>
        <p className="text-xs text-slate-400">Dashboard &gt; Patients</p>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
      {[
          { 
            title: 'Total Patients', 
            count: stats?.totalPatients?.count ?? '—', 
            growth: stats?.totalPatients?.growth ?? null, 
            isUp: (parseFloat(stats?.totalPatients?.growth) ?? 0) >= 0,
            icon: Users, 
            bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' 
          },
          { 
            title: 'Male Patients', 
            count: stats?.malePatients?.count ?? '—', 
            growth: stats?.malePatients?.growth ?? null, 
            isUp: (parseFloat(stats?.malePatients?.growth) ?? 0) >= 0,
            icon: User, 
            bg: 'bg-sky-50 border-sky-100 text-sky-600' 
          },
          { 
            title: 'Female Patients', 
            count: stats?.femalePatients?.count ?? '—', 
            growth: stats?.femalePatients?.growth ?? null, 
            isUp: (parseFloat(stats?.femalePatients?.growth) ?? 0) >= 0,
            icon: User, 
            bg: 'bg-purple-50 border-purple-100 text-purple-600' 
          },
          { 
            title: 'Children Patients', 
            count: stats?.childrenPatients?.count ?? '—', 
            growth: stats?.childrenPatients?.growth ?? null, 
            isUp: (parseFloat(stats?.childrenPatients?.growth) ?? 0) >= 0,
            icon: Baby, 
            bg: 'bg-orange-50 border-orange-100 text-orange-600' 
          },
          { 
            title: 'New This Month', 
            count: stats?.newThisMonth?.count ?? '—', 
            growth: stats?.newThisMonth?.growth ?? null, 
            isUp: (parseFloat(stats?.newThisMonth?.growth) ?? 0) >= 0,
            icon: Calendar, 
            bg: 'bg-teal-50 border-teal-100 text-teal-600' 
          }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
            <div className={`p-3 rounded-xl border shrink-0 ${item.bg}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.title}</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{item.count}</p>
              {item.growth != null && (
                <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-0.5 ${item.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{item.growth.toString().startsWith('-') ? item.growth : `+${item.growth}`}</span>
                  <span className="text-slate-400 font-normal ml-1">from last month</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        
        {/* Left Column: Patients Directory Table (70% or 100%) */}
        <div className={`${isPanelOpen ? 'lg:col-span-7' : 'lg:col-span-10'} bg-white border border-slate-200 rounded-card shadow-sm p-6 space-y-6 transition-all duration-300`}>
          
          {/* Search, Filter and Actions Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="flex items-center gap-2 w-72 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search patient by name, phone, email or ID..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
                <option value="discharged">Discharged</option>
              </select>

              {/* Age Group Filter */}
              <select
                value={ageFilter}
                onChange={(e) => { setAgeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="">All Age Groups</option>
                <option value="Child">Child (&lt;18)</option>
                <option value="Adult">Adult (18-60)</option>
                <option value="Senior">Senior (&gt;60)</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Export Button */}
              <div className="relative">
                <button 
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
                {isExportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30">
                    <button 
                      onClick={() => exportData('CSV')}
                      className="block w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                    <button 
                      onClick={() => exportData('Excel')}
                      className="block w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Export Excel
                    </button>
                  </div>
                )}
              </div>

              {/* Add Patient Button */}
              <button 
                onClick={() => {
                  setPatientForm({
                    fullName: '', email: '', phone: '', dob: '', gender: 'Male', bloodGroup: 'A+',
                    address: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '',
                    insuranceNumber: '', medicalNotes: '', status: 'active'
                  });
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Patient</span>
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 text-left">Patient</th>
                  <th className="pb-3">Patient ID</th>
                  <th className="pb-3">Age / Gender</th>
                  <th className="pb-3">Phone Number</th>
                  <th className="pb-3">Last Visit</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">Loading patients records...</td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No matching patients found</td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr 
                      key={p._id}
                      onClick={() => handleRowClick(p._id)}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-all ${
                        selectedPatientId === p._id ? 'bg-primary/5 border-l-2 border-primary' : ''
                      }`}
                    >
                      {/* Name/Email Card */}
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase ${
                            p.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {p.fullName ? p.fullName.charAt(0) : 'P'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 block">{p.fullName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.email || 'No Email'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Patient ID */}
                      <td className="py-3.5 text-slate-500 font-medium">{p.patientId}</td>

                      {/* Age/Gender */}
                      <td className="py-3.5 text-slate-500">{getAge(p.dob)} / {p.gender}</td>

                      {/* Phone */}
                      <td className="py-3.5 text-slate-500">{p.phone}</td>

                      {/* Last Visit */}
                      <td className="py-3.5 text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                          p.status === 'active' || p.status === 'Admitted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          p.status === 'inactive' || p.status === 'Outpatient' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          p.status === 'blocked' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleRowClick(p._id)}
                            className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit Profile"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePatient(p._id, p.fullName)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Delete Patient"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          {/* More dropdown */}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveActionMenuId(activeActionMenuId === p._id ? null : p._id)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeActionMenuId === p._id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-left">
                                <button 
                                  onClick={() => {
                                    setSelectedPatientId(p._id);
                                    setIsAppointmentModalOpen(true);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="block w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  Book Appointment
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedPatientId(p._id);
                                    setIsPrescriptionModalOpen(true);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="block w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  Add Prescription
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && patients.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <p>Showing {(page-1)*8 + 1} to {Math.min(page*8, totalRecords)} of {totalRecords} entries</p>
              
              <div className="flex items-center gap-1">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev-1, 1))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg font-semibold border transition-all ${
                      page === i + 1 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev+1, totalPages))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Patient Details Panel (30% width, toggles open/closed) */}
        {isPanelOpen && (
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-card shadow-sm overflow-hidden flex flex-col min-h-[600px] transition-all duration-300">
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
              </div>
            ) : !patientDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <User className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">No Patient Selected</h3>
                <p className="text-xs text-slate-400 mt-1">Select any patient from the list directory to review details.</p>
              </div>
            ) : (
              <>
                {/* Details Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Patient Details</span>
                  <button 
                    onClick={() => setIsPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Brief Info */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 text-center flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-md shadow-primary/10 mb-3 shrink-0 uppercase ${
                    patientDetail.patient.gender === 'Female' ? 'bg-pink-500' : 'bg-primary'
                  }`}>
                    {patientDetail.patient.fullName ? patientDetail.patient.fullName.charAt(0) : 'P'}
                  </div>
                  
                  <div className="flex items-center gap-1.5 justify-center">
                    <h3 className="font-bold text-slate-800 text-base">{patientDetail.patient.fullName}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border capitalize ${
                      patientDetail.patient.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {patientDetail.patient.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{patientDetail.patient.patientId}</p>

                  <div className="grid grid-cols-2 gap-4 w-full mt-4 text-left text-xs bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Age / Gender</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{getAge(patientDetail.patient.dob)} Years, {patientDetail.patient.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contact</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{patientDetail.patient.phone}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-50 pt-2">
                      <span className="text-slate-400 block text-[10px]">Email Address</span>
                      <span className="font-bold text-slate-700 mt-0.5 block truncate">{patientDetail.patient.email || 'No email registered'}</span>
                    </div>
                  </div>
                </div>

                {/* Sub Tab Selectors */}
                <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none px-4 bg-white sticky top-0 z-10">
                  {[
                    { id: 'overview', name: 'Overview' },
                    { id: 'vitals', name: 'Vitals' },
                    { id: 'history', name: 'Medical History' },
                    { id: 'appointments', name: 'Appointments' },
                    { id: 'prescriptions', name: 'Prescriptions' },
                    { id: 'reports', name: 'Reports' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-3 py-3 text-[11px] font-bold border-b-2 whitespace-nowrap transition-all shrink-0 ${
                        activeTab === t.id 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>

                {/* Tab content bodies */}
                <div className="p-5 flex-1 overflow-y-auto max-h-[500px] scrollbar-none">
                  
                  {tabLoading ? (
                    <div className="py-12 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {/* Overview Tab */}
                      {activeTab === 'overview' && (
                        <div className="space-y-5">
                          {/* Personal Info */}
                          <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3.5 shadow-sm relative">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-800">Personal Information</h4>
                              <button 
                                onClick={() => openEditModal(patientDetail.patient)}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                                <span className="font-semibold text-slate-700 block mt-0.5">
                                  {patientDetail.patient.dob ? new Date(patientDetail.patient.dob).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Blood Group</span>
                                <span className="font-semibold text-slate-700 block mt-0.5">{patientDetail.patient.bloodGroup || '—'}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[10px] text-slate-400 block">Full Address</span>
                                <span className="font-semibold text-slate-700 block mt-0.5 leading-relaxed">{patientDetail.patient.address || '—'}</span>
                              </div>
                              <div className="col-span-2 border-t border-slate-50 pt-2">
                                <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                                <span className="font-semibold text-slate-700 block mt-0.5">
                                  {patientDetail.patient.emergencyContact?.name} ({patientDetail.patient.emergencyContact?.relation || 'Relation'})
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">{patientDetail.patient.emergencyContact?.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Last Visit Summary */}
                          <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span>Last Visit Summary</span>
                            </h4>
                            
                            {patientDetail.appointments?.length > 0 ? (
                              <div className="text-xs space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                  <span>{new Date(patientDetail.appointments[0].dateTime).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="font-bold text-slate-700">Dr. {patientDetail.appointments[0].doctor?.name || 'Rohit Mehta'} ({patientDetail.appointments[0].department})</p>
                                <p className="text-slate-500 leading-relaxed">{patientDetail.appointments[0].notes || patientDetail.appointments[0].reason}</p>
                                <button 
                                  onClick={() => setActiveTab('history')}
                                  className="text-[10px] font-bold text-primary hover:underline block pt-1.5"
                                >
                                  View Details
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No visit logs available</p>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
                            <div className="grid grid-cols-2 gap-2.5">
                              <button 
                                onClick={() => setIsAppointmentModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                              >
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Book Appointment</span>
                              </button>
                              <button 
                                onClick={() => setIsPrescriptionModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                              >
                                <Pill className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Add Prescription</span>
                              </button>
                              <button 
                                onClick={() => setIsNoteModalOpen(true)}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                              >
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Add Note</span>
                              </button>
                              <button 
                                onClick={() => setActiveTab('reports')}
                                className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                              >
                                <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>View Documents</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Vitals Tab */}
                      {activeTab === 'vitals' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-primary shrink-0" />
                            <span>Patient Vitals Log</span>
                          </h4>
                          {!patientDetail.vitals || patientDetail.vitals.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No vitals records found</p>
                          ) : (
                            <div className="space-y-4">
                              {patientDetail.vitals.map((v) => (
                                <div key={v._id || v.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-3 hover:border-slate-200 transition-all">
                                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-100 pb-2">
                                    <span>Recorded by: {v.recordedBy?.name || 'Staff'}</span>
                                    <span>{v.recorded_at ? new Date(v.recorded_at).toLocaleString() : v.recordedAt ? new Date(v.recordedAt).toLocaleString() : '—'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.blood_pressure || v.bloodPressure || '—'} mmHg</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">Pulse Rate</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.pulse || v.pulseRate || '—'} bpm</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">Temperature</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.temperature || '—'} °F</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">SpO2</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.spo2 || '—'}%</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">Weight</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.weight || '—'} kg</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block">Height</span>
                                      <span className="font-bold text-slate-700 block mt-0.5">{v.height || '—'} cm</span>
                                    </div>
                                    {(v.blood_sugar || v.bloodSugar) && (
                                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm col-span-1">
                                        <span className="text-[10px] text-slate-400 block">Blood Sugar</span>
                                        <span className="font-bold text-slate-700 block mt-0.5">{v.blood_sugar || v.bloodSugar} mg/dL</span>
                                      </div>
                                    )}
                                    {v.bmi && (
                                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm col-span-1">
                                        <span className="text-[10px] text-slate-400 block">BMI</span>
                                        <span className="font-bold text-slate-700 block mt-0.5">{v.bmi}</span>
                                      </div>
                                    )}
                                  </div>
                                  {v.notes && (
                                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                                      <span className="text-[10px] text-slate-400 block font-semibold mb-1">Notes</span>
                                      <p className="text-slate-600 leading-relaxed">{v.notes}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timeline History Tab */}
                      {activeTab === 'history' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-800">Medical History Timeline</h4>
                          {historyTimeline.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No timeline entries found</p>
                          ) : (
                            <div className="relative pl-5 border-l border-slate-100 space-y-5">
                              {historyTimeline.map((item) => (
                                <div key={item.id} className="relative">
                                  <span className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                    item.type === 'Appointment' ? 'bg-primary' :
                                    item.type === 'Prescription' ? 'bg-amber-500' :
                                    'bg-indigo-500'
                                  }`}></span>
                                  
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1 hover:border-slate-200 transition-all">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                      <span className="font-bold uppercase tracking-wider text-[9px] text-slate-500">{item.type}</span>
                                      <span>{new Date(item.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-bold text-slate-700">{item.title}</p>
                                    <p className="text-slate-500 leading-relaxed">{item.description}</p>
                                    {item.doctor && (
                                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Provider: Dr. {item.doctor}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Appointments Tab */}
                      {activeTab === 'appointments' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-800">Scheduled Appointments</h4>
                            <button 
                              onClick={() => setIsAppointmentModalOpen(true)}
                              className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Book</span>
                            </button>
                          </div>
                          {appointments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No appointment history found</p>
                          ) : (
                            <div className="space-y-3">
                              {appointments.map((apt) => (
                                <div key={apt._id} className="p-3 border border-slate-100 bg-white rounded-xl shadow-sm space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      {new Date(apt.dateTime).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                                      apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      apt.status === 'Completed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                      'bg-slate-50 text-slate-500'
                                    }`}>
                                      {apt.status}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-700">Dr. {apt.doctor?.name || apt.doctorName}</p>
                                  <p className="text-[11px] text-slate-400 font-medium">Department: {apt.department || 'Outpatient'}</p>
                                  <p className="text-xs text-slate-500 mt-1 italic">&quot;{apt.reason}&quot;</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prescriptions Tab */}
                      {activeTab === 'prescriptions' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-800">Prescription Files</h4>
                            <button 
                              onClick={() => setIsPrescriptionModalOpen(true)}
                              className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                          {prescriptions.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No prescriptions found</p>
                          ) : (
                            <div className="space-y-3">
                              {prescriptions.map((pres) => (
                                <div key={pres._id} className="p-3 border border-slate-100 bg-white rounded-xl shadow-sm space-y-2.5">
                                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                                    <span>Dr. {pres.doctor?.name || 'Doctor'}</span>
                                    <span>{new Date(pres.date || pres.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Diagnosis</span>
                                    <span className="text-xs font-bold text-slate-700 block mt-0.5">{pres.diagnosis || 'General Checkup'}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {pres.medicines?.map((med, i) => (
                                      <div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg text-slate-600">
                                        <span className="font-bold text-primary">{med.name} ({med.dosage})</span>
                                        <span>{med.frequency} &bull; {med.duration}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {pres.notes && (
                                    <p className="text-[11px] text-slate-400 mt-1 italic">&quot;{pres.notes}&quot;</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reports Tab */}
                      {activeTab === 'reports' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-800">Medical Reports</h4>
                            <button 
                              onClick={() => {
                                setReportForm({ title: '', category: 'Lab Test', doctor: '', fileName: '', fileSize: '1.4 MB' });
                                setIsReportModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </button>
                          </div>
                          {reports.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No medical reports uploaded</p>
                          ) : (
                            <div className="space-y-3">
                              {reports.map((rep) => (
                                <div key={rep._id} className="p-3 border border-slate-100 bg-white rounded-xl shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl shrink-0">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-700 text-xs block">{rep.title}</span>
                                      <span className="text-[10px] text-slate-400 block mt-0.5">{rep.category} &bull; {rep.fileSize} &bull; {new Date(rep.date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      onClick={() => {
                                        setPreviewReport(rep);
                                        setIsPreviewModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                                      title="Preview Document"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <a 
                                      href={rep.filePath} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-all inline-block"
                                      title="Download Document"
                                    >
                                      <FileDown className="w-4 h-4" />
                                    </a>
                                    <button 
                                      onClick={() => handleDeleteReport(rep._id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all"
                                      title="Delete Document"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    </>
                  )}

                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ==================================== MODALS ==================================== */}

      {/* 1. Add Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">Register New Patient</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddPatientSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Full Name *</label>
                  <input 
                    type="text" required
                    placeholder="Enter full name"
                    value={patientForm.fullName}
                    onChange={(e) => setPatientForm({...patientForm, fullName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Phone Number *</label>
                  <input 
                    type="text" required
                    placeholder="Enter phone number"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Email Address</label>
                  <input 
                    type="email"
                    placeholder="Enter email address"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* DOB */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Date of Birth *</label>
                  <input 
                    type="date" required
                    value={patientForm.dob}
                    onChange={(e) => setPatientForm({...patientForm, dob: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  />
                </div>
                {/* Gender */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Gender *</label>
                  <select 
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Blood Group */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Blood Group</label>
                  <select 
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({...patientForm, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
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
                {/* Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-600">Full Address</label>
                  <input 
                    type="text"
                    placeholder="Enter permanent address"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                
                {/* Emergency Contact */}
                <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Contact Name</label>
                      <input 
                        type="text"
                        placeholder="Name"
                        value={patientForm.emergencyName}
                        onChange={(e) => setPatientForm({...patientForm, emergencyName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Relation</label>
                      <input 
                        type="text"
                        placeholder="Relation (e.g. Spouse)"
                        value={patientForm.emergencyRelation}
                        onChange={(e) => setPatientForm({...patientForm, emergencyRelation: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Phone</label>
                      <input 
                        type="text"
                        placeholder="Phone"
                        value={patientForm.emergencyPhone}
                        onChange={(e) => setPatientForm({...patientForm, emergencyPhone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Number */}
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <label className="font-bold text-slate-600">Insurance Policy Number</label>
                  <input 
                    type="text"
                    placeholder="Enter insurance number"
                    value={patientForm.insuranceNumber}
                    onChange={(e) => setPatientForm({...patientForm, insuranceNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <label className="font-bold text-slate-600">Status *</label>
                  <select 
                    value={patientForm.status}
                    onChange={(e) => setPatientForm({...patientForm, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>

                {/* Medical Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-600">General Medical Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="Add brief note or history..."
                    value={patientForm.medicalNotes}
                    onChange={(e) => setPatientForm({...patientForm, medicalNotes: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Patient Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">Edit Patient Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditPatientSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Full Name *</label>
                  <input 
                    type="text" required
                    placeholder="Enter full name"
                    value={patientForm.fullName}
                    onChange={(e) => setPatientForm({...patientForm, fullName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Phone Number *</label>
                  <input 
                    type="text" required
                    placeholder="Enter phone number"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Email Address</label>
                  <input 
                    type="email"
                    placeholder="Enter email address"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* DOB */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Date of Birth *</label>
                  <input 
                    type="date" required
                    value={patientForm.dob}
                    onChange={(e) => setPatientForm({...patientForm, dob: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  />
                </div>
                {/* Gender */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Gender *</label>
                  <select 
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Blood Group */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Blood Group</label>
                  <select 
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({...patientForm, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
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
                {/* Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-600">Full Address</label>
                  <input 
                    type="text"
                    placeholder="Enter permanent address"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>
                
                {/* Emergency Contact */}
                <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Contact Name</label>
                      <input 
                        type="text"
                        placeholder="Name"
                        value={patientForm.emergencyName}
                        onChange={(e) => setPatientForm({...patientForm, emergencyName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Relation</label>
                      <input 
                        type="text"
                        placeholder="Relation"
                        value={patientForm.emergencyRelation}
                        onChange={(e) => setPatientForm({...patientForm, emergencyRelation: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Phone</label>
                      <input 
                        type="text"
                        placeholder="Phone"
                        value={patientForm.emergencyPhone}
                        onChange={(e) => setPatientForm({...patientForm, emergencyPhone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Number */}
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <label className="font-bold text-slate-600">Insurance Policy Number</label>
                  <input 
                    type="text"
                    placeholder="Enter insurance number"
                    value={patientForm.insuranceNumber}
                    onChange={(e) => setPatientForm({...patientForm, insuranceNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <label className="font-bold text-slate-600">Status *</label>
                  <select 
                    value={patientForm.status}
                    onChange={(e) => setPatientForm({...patientForm, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>

                {/* Medical Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-600">General Medical Notes</label>
                  <textarea 
                    rows="2"
                    placeholder="Add brief note or history..."
                    value={patientForm.medicalNotes}
                    onChange={(e) => setPatientForm({...patientForm, medicalNotes: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Upload Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Upload Patient Medical Document</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadReportSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Document Title *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Brain MRI Scan Report"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Category / Department *</label>
                <select 
                  value={reportForm.category}
                  onChange={(e) => setReportForm({...reportForm, category: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="Lab Test">Lab Test</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Prescription Scan">Prescription Scan</option>
                  <option value="General Documents">General Documents</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Consulting Doctor / Technician</label>
                <input 
                  type="text"
                  placeholder="e.g. Dr. Sarah Connor"
                  value={reportForm.doctor}
                  onChange={(e) => setReportForm({...reportForm, doctor: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Choose File *</label>
                <input 
                  type="file" required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    if (file && !reportForm.title) {
                      const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                      setReportForm(prev => ({ ...prev, title: nameWithoutExt, fileName: file.name }));
                    } else if (file) {
                      setReportForm(prev => ({ ...prev, fileName: file.name }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Book Appointment Modal */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Quick Book Appointment</h2>
              <button onClick={() => setIsAppointmentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAppointmentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Consulting Doctor *</label>
                <select 
                  value={appointmentForm.doctor}
                  onChange={(e) => setAppointmentForm({...appointmentForm, doctor: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                  required
                >
                  <option value="">Select Doctor</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.specialization})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Hospital Zone / Department *</label>
                <select 
                  value={appointmentForm.department}
                  onChange={(e) => setAppointmentForm({...appointmentForm, department: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="OPD">Outpatient Department (OPD)</option>
                  <option value="IPD">Inpatient Department (IPD)</option>
                  <option value="LABORATORY">Laboratory</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Date &amp; Time *</label>
                <input 
                  type="datetime-local" required
                  value={appointmentForm.dateTime}
                  onChange={(e) => setAppointmentForm({...appointmentForm, dateTime: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Reason for Appointment *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Cardiological ECG checkup"
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({...appointmentForm, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Special Instructions</label>
                <textarea 
                  rows="2"
                  placeholder="Additional notes..."
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({...appointmentForm, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Book Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Prescription Modal */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Generate New Prescription</h2>
              <button onClick={() => setIsPrescriptionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePrescriptionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Diagnosis *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Hypertension & Body Pain"
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({...prescriptionForm, diagnosis: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-600 uppercase tracking-wider text-[9px] text-slate-400">Prescribed Medicines</label>
                  <button 
                    type="button" 
                    onClick={addMedicineRow}
                    className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {prescriptionForm.medicines.map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 relative">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400">Medicine Name</label>
                          <input 
                            type="text" required
                            placeholder="e.g. Paracetamol 500mg"
                            value={med.name}
                            onChange={(e) => {
                              const list = [...prescriptionForm.medicines];
                              list[idx].name = e.target.value;
                              setPrescriptionForm({...prescriptionForm, medicines: list});
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400">Dosage</label>
                          <input 
                            type="text" required
                            placeholder="e.g. 1 tablet"
                            value={med.dosage}
                            onChange={(e) => {
                              const list = [...prescriptionForm.medicines];
                              list[idx].dosage = e.target.value;
                              setPrescriptionForm({...prescriptionForm, medicines: list});
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400">Frequency</label>
                          <input 
                            type="text" required
                            placeholder="e.g. Thrice daily"
                            value={med.frequency}
                            onChange={(e) => {
                              const list = [...prescriptionForm.medicines];
                              list[idx].frequency = e.target.value;
                              setPrescriptionForm({...prescriptionForm, medicines: list});
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400">Duration</label>
                          <input 
                            type="text" required
                            placeholder="e.g. 5 Days"
                            value={med.duration}
                            onChange={(e) => {
                              const list = [...prescriptionForm.medicines];
                              list[idx].duration = e.target.value;
                              setPrescriptionForm({...prescriptionForm, medicines: list});
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50 text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-3">
                <label className="font-bold text-slate-600">Prescription Notes</label>
                <textarea 
                  rows="2"
                  placeholder="Special instructions for usage..."
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm({...prescriptionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Medical Notes Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Add Clinical Note</h2>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Update medical logs / general notes</label>
                <textarea 
                  rows="4"
                  placeholder="Record symptoms, diagnosis remarks, or general history updates..."
                  value={noteForm}
                  onChange={(e) => setNoteForm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary/50 resize-none text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNotes}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Save Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Preview Report Modal */}
      {isPreviewModalOpen && previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">{previewReport.title}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">{previewReport.category} &bull; {previewReport.fileSize}</p>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Simulated Medical Document Preview layout */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[260px] relative overflow-hidden">
              <div className="absolute top-2 left-2 bg-primary/10 text-primary text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Preview Mode
              </div>
              <FileText className="w-16 h-16 text-rose-500" />
              <div>
                <h3 className="font-bold text-slate-700 text-sm">{previewReport.fileName}</h3>
                <p className="text-xs text-slate-400 mt-1">Uploaded by CarePlus Medical Diagnostics</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Authorizing Clinician: {previewReport.doctor}</p>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm italic">
                &quot;This is a high-fidelity diagnostic preview. To view fully structured clinical grids or raw files, download or open the PDF record.&quot;
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <a 
                href={previewReport.filePath} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-xs flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Document</span>
              </a>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
