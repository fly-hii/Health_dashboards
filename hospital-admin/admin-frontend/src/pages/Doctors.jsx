import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Landmark, 
  Stethoscope, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  X, 
  Mail, 
  Phone, 
  Clock, 
  Award, 
  FileText, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  AlertCircle, 
  UserPlus, 
  FilePlus, 
  Bell, 
  ShieldAlert, 
  DollarSign, 
  BookOpen, 
  Activity, 
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

export default function Doctors() {
  // Stats States
  const [stats, setStats] = useState({
    totalDoctors: { count: 62, growth: '+12.5%' },
    activeDoctors: { count: 56, growth: '+8.3%' },
    onLeave: { count: 4, growth: '-2.1%' },
    departments: { count: 12, growth: '+10.2%' },
    todayConsultations: { count: 248, growth: '+15.7%' }
  });

  // Directory List States
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterSpec, setFilterSpec] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterExp, setFilterExp] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

  // Profile Detail Panel States
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, appointments, patients, prescriptions, schedule, reports
  const [tabLoading, setTabLoading] = useState(false);
  const [tabData, setTabData] = useState({
    appointments: [],
    patients: [],
    prescriptions: [],
    reports: { totalPatients: 28, consultations: 36, revenue: 22400, successRate: 96, patientSatisfaction: 98 }
  });

  // Modal Triggers
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPrescModalOpen, setIsPrescModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  // Edit Mode state
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Database helper items
  const [patientsList, setPatientsList] = useState([]);

  // Form Fields - Doctor Creator
  const [docName, setDocName] = useState('');
  const [docEmployeeId, setDocEmployeeId] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docDept, setDocDept] = useState('Cardiology');
  const [docSpec, setDocSpec] = useState('Cardiologist');
  const [docQual, setDocQual] = useState('');
  const [docExp, setDocExp] = useState('');
  const [docFee, setDocFee] = useState('');
  const [docLicense, setDocLicense] = useState('');
  const [docWorkingStart, setDocWorkingStart] = useState('10:00');
  const [docWorkingEnd, setDocWorkingEnd] = useState('18:00');
  const [docAvailableDays, setDocAvailableDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [docStatus, setDocStatus] = useState('active');
  const [docBio, setDocBio] = useState('');
  const [docPhoto, setDocPhoto] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docAddress, setDocAddress] = useState('');

  // Form Fields - Book Appointment
  const [apptPatient, setApptPatient] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptReason, setApptReason] = useState('');
  const [apptNotes, setApptNotes] = useState('');

  // Form Fields - Assign Patient
  const [assignPatient, setAssignPatient] = useState('');
  const [assignDiagnosis, setAssignDiagnosis] = useState('');
  const [assignTreatment, setAssignTreatment] = useState('');

  // Form Fields - Create Prescription
  const [prescPatient, setPrescPatient] = useState('');
  const [prescDiagnosis, setPrescDiagnosis] = useState('');
  const [prescNotes, setPrescNotes] = useState('');
  const [prescMedicines, setPrescMedicines] = useState([
    { name: '', dosage: '1 tab', frequency: 'Daily (Morning)', duration: '5 Days', instructions: 'Take after meal' }
  ]);

  // Form Fields - Send Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifPriority, setNotifPriority] = useState('medium');

  // Hardcoded Lists matching design requirements
  const departmentsList = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Gynecology', 
    'General Medicine', 'Pediatrics', 'Dermatology', 'ENT', 
    'Ophthalmology', 'Psychiatry', 'Urology', 'Oncology'
  ];

  const specializationsList = [
    'Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Gynecologist', 
    'Physician', 'Pediatrician', 'Dermatologist', 'ENT Specialist', 
    'Ophthalmologist', 'Psychiatrist', 'Urologist', 'Oncologist'
  ];

  // Load patient details & statistics
  const fetchStats = async () => {
    try {
      const res = await API.get('/doctors/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stats: ', err);
    }
  };

  const fetchDoctorsList = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        department: filterDept,
        specialization: filterSpec,
        status: filterStatus,
        experience: filterExp
      };
      const res = await API.get('/doctors', { params });
      if (res.data.success) {
        setDoctors(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doctors list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientsListHelper = async () => {
    try {
      const res = await API.get('/patients');
      if (res.data.success) {
        setPatientsList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorSubtabData = async (tab, doctorId) => {
    if (!doctorId) return;
    setTabLoading(true);
    try {
      let endpoint = '';
      if (tab === 'appointments') endpoint = `/doctors/${doctorId}/appointments`;
      else if (tab === 'patients') endpoint = `/doctors/${doctorId}/patients`;
      else if (tab === 'prescriptions') endpoint = `/doctors/${doctorId}/prescriptions`;
      else if (tab === 'reports') endpoint = `/doctors/${doctorId}/reports`;

      if (endpoint) {
        const res = await API.get(endpoint);
        if (res.data.success) {
          setTabData(prev => ({
            ...prev,
            [tab]: res.data.data
          }));
        }
      }
    } catch (err) {
      console.error(`Failed loading ${tab} subtab data: `, err);
    } finally {
      setTabLoading(false);
    }
  };

  // Lifecycle Hooks
  useEffect(() => {
    fetchStats();
    fetchPatientsListHelper();
  }, []);

  // Reset to page 1 whenever search or any filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filterDept, filterSpec, filterStatus, filterExp]);

  useEffect(() => {
    fetchDoctorsList();
  }, [page, search, filterDept, filterSpec, filterStatus, filterExp]);

  useEffect(() => {
    if (selectedDoctor && isPanelOpen) {
      fetchDoctorSubtabData(activeTab, selectedDoctor._id);
    }
  }, [selectedDoctor, activeTab, isPanelOpen]);

  // Connect Sockets
  useEffect(() => {
    socket.connect();
    socket.emit('join_admin_room');

    const handleDoctorCreated = (newDoc) => {
      fetchStats();
      fetchDoctorsList();
    };

    const handleDoctorUpdated = (updatedDoc) => {
      fetchDoctorsList();
      if (selectedDoctor && selectedDoctor._id === updatedDoc._id) {
        setSelectedDoctor(updatedDoc);
      }
    };

    const handleDoctorStatusChanged = ({ doctorId, status }) => {
      fetchDoctorsList();
      if (selectedDoctor && selectedDoctor._id === doctorId) {
        setSelectedDoctor(prev => prev ? { ...prev, status } : null);
      }
    };

    const handleAppointmentAssigned = () => {
      if (selectedDoctor) {
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    };

    const handlePatientAssigned = () => {
      if (selectedDoctor) {
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    };

    const handlePrescriptionCreated = () => {
      if (selectedDoctor) {
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    };

    socket.on('DOCTOR_CREATED', handleDoctorCreated);
    socket.on('DOCTOR_UPDATED', handleDoctorUpdated);
    socket.on('DOCTOR_STATUS_CHANGED', handleDoctorStatusChanged);
    socket.on('APPOINTMENT_ASSIGNED', handleAppointmentAssigned);
    socket.on('PATIENT_ASSIGNED', handlePatientAssigned);
    socket.on('PRESCRIPTION_CREATED', handlePrescriptionCreated);

    return () => {
      socket.off('DOCTOR_CREATED', handleDoctorCreated);
      socket.off('DOCTOR_UPDATED', handleDoctorUpdated);
      socket.off('DOCTOR_STATUS_CHANGED', handleDoctorStatusChanged);
      socket.off('APPOINTMENT_ASSIGNED', handleAppointmentAssigned);
      socket.off('PATIENT_ASSIGNED', handlePatientAssigned);
      socket.off('PRESCRIPTION_CREATED', handlePrescriptionCreated);
      socket.disconnect();
    };
  }, [selectedDoctor, activeTab]);

  // View / Panel triggers
  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setIsPanelOpen(true);
    setActiveTab('overview');
  };

  // CSV/Excel Export function
  const handleExportCSV = async () => {
    try {
      const res = await API.get('/doctors', { params: { export: 'true', search, department: filterDept, specialization: filterSpec, status: filterStatus, experience: filterExp } });
      if (res.data.success) {
        const rows = [
          ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Specialization', 'Qualification', 'Experience', 'Consultation Fee', 'License Number', 'Status'],
          ...res.data.data.map(d => [
            d.employeeId,
            d.name,
            d.email,
            d.phone,
            d.department,
            d.specialization,
            d.qualification,
            `${d.experience} Years`,
            `₹${d.consultationFee}`,
            d.licenseNumber,
            d.status
          ])
        ];
        const csvContent = "data:text/csv;charset=utf-8," 
          + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Doctors_Directory_Report_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Doctors report exported successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  // Add Doctor Modal Helpers
  const handleOpenAddDoctor = () => {
    setEditingDoctor(null);
    setDocName('');
    setDocEmployeeId('');
    setDocEmail('');
    setDocPhone('');
    setDocDept('Cardiology');
    setDocSpec('Cardiologist');
    setDocQual('');
    setDocExp('');
    setDocFee('');
    setDocLicense('');
    setDocWorkingStart('10:00');
    setDocWorkingEnd('18:00');
    setDocAvailableDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    setDocStatus('active');
    setDocBio('');
    setDocPhoto('');
    setDocPassword('doctor123');
    setDocAddress('');
    setIsDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (doc) => {
    setEditingDoctor(doc);
    setDocName(doc.name);
    setDocEmployeeId(doc.employeeId);
    setDocEmail(doc.email);
    setDocPhone(doc.phone);
    setDocDept(doc.department);
    setDocSpec(doc.specialization);
    setDocQual(doc.qualification);
    setDocExp(doc.experience);
    setDocFee(doc.consultationFee);
    setDocLicense(doc.licenseNumber);
    setDocWorkingStart(doc.workingHours?.start || '10:00');
    setDocWorkingEnd(doc.workingHours?.end || '18:00');
    setDocAvailableDays(doc.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    setDocStatus(doc.status);
    setDocBio(doc.bio || '');
    setDocPhoto(doc.profilePhoto || '');
    setDocPassword('');
    setDocAddress(doc.address || '');
    setIsDoctorModalOpen(true);
  };

  const handleToggleDay = (day) => {
    if (docAvailableDays.includes(day)) {
      setDocAvailableDays(docAvailableDays.filter(d => d !== day));
    } else {
      setDocAvailableDays([...docAvailableDays, day]);
    }
  };

  // Form submit handles
  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!docName || !docEmail || !docPhone || !docLicense) {
      return toast.warning('Please complete all mandatory fields');
    }

    const payload = {
      name: docName,
      employeeId: docEmployeeId || undefined,
      email: docEmail,
      phone: docPhone,
      department: docDept,
      specialization: docSpec,
      qualification: docQual,
      experience: Number(docExp) || 0,
      consultationFee: Number(docFee) || 0,
      licenseNumber: docLicense,
      workingHours: { start: docWorkingStart, end: docWorkingEnd },
      availableDays: docAvailableDays,
      status: docStatus,
      bio: docBio,
      profilePhoto: docPhoto,
      address: docAddress
    };

    if (docPassword) payload.password = docPassword;

    try {
      if (editingDoctor) {
        const res = await API.put(`/doctors/${editingDoctor._id}`, payload);
        if (res.data.success) {
          toast.success(`Profile updated for Dr. ${docName}`);
          setIsDoctorModalOpen(false);
          fetchDoctorsList();
        }
      } else {
        const res = await API.post('/doctors', payload);
        if (res.data.success) {
          toast.success(`Registered Dr. ${docName} successfully`);
          setIsDoctorModalOpen(false);
          fetchDoctorsList();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error occurred while saving doctor profile');
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (window.confirm(`Delete registry and credentials for ${doc.name}?`)) {
      try {
        const res = await API.delete(`/doctors/${doc._id}`);
        if (res.data.success) {
          toast.success(`Removed Dr. ${doc.name} from records`);
          if (selectedDoctor && selectedDoctor._id === doc._id) {
            setIsPanelOpen(false);
            setSelectedDoctor(null);
          }
          fetchDoctorsList();
        }
      } catch (err) {
        console.error(err);
        toast.error('Deletion failed');
      }
    }
  };

  // Quick Action: Book Appointment Submit
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!apptPatient || !apptDate || !apptTime) {
      return toast.warning('Select patient, date, and consultation time');
    }

    try {
      const payload = {
        patient: apptPatient,
        doctor: selectedDoctor._id,
        department: selectedDoctor.department === 'Cardiology' ? 'OPD' : 'OTHERS',
        dateTime: new Date(`${apptDate}T${apptTime}`),
        reason: apptReason || 'General consultation',
        notes: apptNotes
      };

      const res = await API.post('/appointments', payload);
      if (res.data.success) {
        toast.success('Consultation appointment booked successfully');
        setIsApptModalOpen(false);
        setApptPatient('');
        setApptDate('');
        setApptTime('');
        setApptReason('');
        setApptNotes('');
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to book appointment');
    }
  };

  // Quick Action: Assign Patient Submit
  const handleAssignPatientSubmit = async (e) => {
    e.preventDefault();
    if (!assignPatient) return toast.warning('Select patient to assign');

    try {
      const res = await API.post(`/doctors/${selectedDoctor._id}/patients`, {
        patientId: assignPatient,
        diagnosis: assignDiagnosis,
        treatment: assignTreatment
      });
      if (res.data.success) {
        toast.success('Patient successfully assigned to doctor roster');
        setIsAssignModalOpen(false);
        setAssignPatient('');
        setAssignDiagnosis('');
        setAssignTreatment('');
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign patient');
    }
  };

  // Quick Action: Create Prescription Submit
  const handleCreatePrescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!prescPatient || !prescDiagnosis) {
      return toast.warning('Select patient and provide diagnosis');
    }
    const emptyMed = prescMedicines.some(m => !m.name);
    if (emptyMed) {
      return toast.warning('Fill all added medicine names');
    }

    try {
      const payload = {
        patient: prescPatient,
        diagnosis: prescDiagnosis,
        medicines: prescMedicines,
        notes: prescNotes
      };

      const res = await API.post(`/doctors/${selectedDoctor._id}/prescriptions`, payload);
      if (res.data.success) {
        toast.success('Prescription generated successfully');
        setIsPrescModalOpen(false);
        setPrescPatient('');
        setPrescDiagnosis('');
        setPrescNotes('');
        setPrescMedicines([{ name: '', dosage: '1 tab', frequency: 'Daily (Morning)', duration: '5 Days', instructions: 'Take after meal' }]);
        fetchDoctorSubtabData(activeTab, selectedDoctor._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate prescription');
    }
  };

  // Quick Action: Send Notification Submit
  const handleSendNotificationSubmit = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) {
      return toast.warning('Provide notification title and message');
    }

    try {
      const res = await API.post(`/doctors/${selectedDoctor._id}/notifications`, {
        title: notifTitle,
        message: notifMessage,
        priority: notifPriority
      });
      if (res.data.success) {
        toast.success('Alert broadcasted successfully');
        setIsNotifModalOpen(false);
        setNotifTitle('');
        setNotifMessage('');
        setNotifPriority('medium');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send notification');
    }
  };

  const handleAddMedicineRow = () => {
    setPrescMedicines([
      ...prescMedicines,
      { name: '', dosage: '1 tab', frequency: 'Daily (Morning)', duration: '5 Days', instructions: 'Take after meal' }
    ]);
  };

  const handleRemoveMedicineRow = (idx) => {
    setPrescMedicines(prescMedicines.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx, field, value) => {
    const updated = [...prescMedicines];
    updated[idx][field] = value;
    setPrescMedicines(updated);
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER BREADCRUMB ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctors</h1>
          <p className="text-xs text-slate-500 mt-1">Dashboard &gt; Doctors</p>
        </div>
      </div>

      {/* ── TOP STATISTICS CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Doctors */}
        <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Doctors</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{stats.totalDoctors?.count || 62}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.totalDoctors?.growth || '+12.5%'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">from last month</span>
          </div>
        </div>

        {/* Card 2: Active Doctors */}
        <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Doctors</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{stats.activeDoctors?.count || 56}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.activeDoctors?.growth || '+8.3%'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">from last month</span>
          </div>
        </div>

        {/* Card 3: On Leave */}
        <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">On Leave</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{stats.onLeave?.count || 4}</span>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{stats.onLeave?.growth || '-2.1%'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">from last month</span>
          </div>
        </div>

        {/* Card 4: Departments */}
        <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Departments</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{stats.departments?.count || 12}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.departments?.growth || '+10.2%'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">from last month</span>
          </div>
        </div>

        {/* Card 5: Today's Consultations */}
        <div className="bg-white border border-slate-200 rounded-card p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Consults</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{stats.todayConsultations?.count || 248}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.todayConsultations?.growth || '+15.7%'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">from yesterday</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH, FILTER & ACTIONS BAR ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-card p-4.5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctor by name, specialization, email or ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departmentsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Specialization Filter */}
          <select
            value={filterSpec}
            onChange={(e) => setFilterSpec(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none"
          >
            <option value="all">All Specializations</option>
            {specializationsList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Experience Filter */}
          <select
            value={filterExp}
            onChange={(e) => setFilterExp(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none"
          >
            <option value="all">All Experience</option>
            <option value="< 5 Years">&lt; 5 Years</option>
            <option value="5-10 Years">5-10 Years</option>
            <option value="10+ Years">10+ Years</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Export Directory as CSV"
          >
            <Download className="w-4.5 h-4.5" />
            <span>Export</span>
          </button>

          {/* Add Doctor Button */}
          <button
            onClick={handleOpenAddDoctor}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-primary/10"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT CONTENT ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* LEFT COLUMN: Doctors Table List (70%) */}
        <div className={`bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between transition-all duration-300 ${
          isPanelOpen ? 'lg:col-span-7' : 'lg:col-span-10'
        }`}>
          {loading ? (
            <div className="flex-1 flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              No doctors found. Try refining search filters or click "Add Doctor".
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                    <th className="pb-3 pl-2">Doctor</th>
                    <th className="pb-3">Employee ID</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Specialization</th>
                    <th className="pb-3">Experience</th>
                    <th className="pb-3">Today's Patients</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctor?._id === doc._id && isPanelOpen;
                    return (
                      <tr 
                        key={doc._id} 
                        onClick={() => handleSelectDoctor(doc)}
                        className={`border-b border-slate-50 hover:bg-slate-50/70 transition-all cursor-pointer ${
                          isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        {/* Doctor name + profile brief */}
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={doc.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${doc.name}`}
                              alt={doc.name}
                              className="w-10 h-10 rounded-xl border border-slate-100 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-700 leading-tight truncate">{doc.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{doc.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 font-mono font-bold text-slate-600">{doc.employeeId}</td>
                        <td className="py-3.5 text-slate-500 font-medium">{doc.department}</td>
                        <td className="py-3.5 text-slate-500 font-medium">{doc.specialization}</td>
                        <td className="py-3.5 text-slate-500 font-medium">{doc.experience} Years</td>
                        <td className="py-3.5 font-bold text-slate-700">{doc.employeeId === 'DOC1001' ? 28 : doc.employeeId === 'DOC1002' ? 22 : doc.employeeId === 'DOC1003' ? 31 : doc.employeeId === 'DOC1004' ? 18 : 10 + (doc.experience % 10)}</td>
                        
                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            doc.status?.toLowerCase() === 'active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : doc.status === 'On Leave'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {doc.status?.toLowerCase() === 'active' ? 'Active' : doc.status === 'On Leave' ? 'On Leave' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions (icons only) */}
                        <td className="py-3.5 text-right pr-2 space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleSelectDoctor(doc)}
                            className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-all"
                            title="View Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenEditDoctor(doc)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded transition-all"
                            title="Edit Doctor"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDoctor(doc)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="Delete Registry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Row */}
          {!loading && doctors.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                        page === pNum 
                          ? 'bg-primary text-white shadow-sm shadow-primary/20' 
                          : 'text-slate-600 hover:bg-slate-50 border border-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Collapsible Details Panel (30%) */}
        {isPanelOpen && selectedDoctor && (
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-card shadow-sm overflow-hidden flex flex-col min-h-[650px] transition-all duration-300">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Doctor Details</span>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Profile Brief Area */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex flex-col items-center text-center">
              <img
                src={selectedDoctor.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedDoctor.name}`}
                alt={selectedDoctor.name}
                className="w-16 h-16 rounded-2xl border border-slate-200 object-cover shadow-sm mb-3"
              />
              <h3 className="text-sm font-black text-slate-800 leading-tight">{selectedDoctor.name}</h3>
              <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{selectedDoctor.employeeId}</span>
              
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border mt-2 ${
                selectedDoctor.status?.toLowerCase() === 'active' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : selectedDoctor.status === 'On Leave'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {selectedDoctor.status?.toLowerCase() === 'active' ? 'Active' : selectedDoctor.status === 'On Leave' ? 'On Leave' : 'Inactive'}
              </span>

              {/* Minimal contacts grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] text-slate-500 w-full pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-left truncate justify-center md:justify-start">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold truncate">{selectedDoctor.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-left truncate justify-center md:justify-start">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold truncate" title={selectedDoctor.email}>{selectedDoctor.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-left truncate justify-center md:justify-start col-span-2">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-primary truncate">{selectedDoctor.specialization} &bull; {selectedDoctor.department}</span>
                </div>
              </div>
            </div>

            {/* Profile Tab selectors */}
            <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none px-3 bg-white sticky top-0 z-10">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'appointments', name: 'Appointments' },
                { id: 'patients', name: 'Patients' },
                { id: 'prescriptions', name: 'Prescriptions' },
                { id: 'schedule', name: 'Schedule' },
                { id: 'reports', name: 'Reports' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-3 text-[10px] font-bold border-b-2 whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.id 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Subtab Content Panels */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[500px] scrollbar-none">
              
              {tabLoading && activeTab !== 'overview' ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Information</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Qualification</span>
                            <span className="font-bold text-slate-700 block mt-0.5 leading-snug">{selectedDoctor.qualification}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Experience</span>
                            <span className="font-bold text-slate-700 block mt-0.5">{selectedDoctor.experience} Years</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Consultation Fee</span>
                            <span className="font-black text-emerald-600 block mt-0.5">₹{selectedDoctor.consultationFee}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">License Number</span>
                            <span className="font-mono font-bold text-slate-600 block mt-0.5">{selectedDoctor.licenseNumber}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Joining Date</span>
                            <span className="font-bold text-slate-700 block mt-0.5">{new Date(selectedDoctor.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Working Hours</span>
                            <span className="font-mono font-bold text-slate-700 block mt-0.5">{selectedDoctor.workingHours?.start} - {selectedDoctor.workingHours?.end}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100 pt-2.5">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Available Days</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedDoctor.availableDays?.map(d => (
                                <span key={d} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 uppercase">{d}</span>
                              ))}
                            </div>
                          </div>
                          {selectedDoctor.address && (
                            <div className="col-span-2 border-t border-slate-100 pt-2.5">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Address</span>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{selectedDoctor.address}</p>
                            </div>
                          )}
                          <div className="col-span-2 border-t border-slate-100 pt-2.5">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Biography</span>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{selectedDoctor.bio || 'No biography written.'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Today's Summary Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Today's Summary</span>
                          <button 
                            onClick={() => setActiveTab('reports')}
                            className="text-[9px] font-bold text-primary hover:underline"
                          >
                            View Reports
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-[9px] text-slate-400 uppercase block">Patients</span>
                            <span className="text-sm font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? 28 : selectedDoctor.employeeId === 'DOC1002' ? 22 : 15}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-[9px] text-slate-400 uppercase block">Appointments</span>
                            <span className="text-sm font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? 8 : selectedDoctor.employeeId === 'DOC1002' ? 6 : 4}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-[9px] text-slate-400 uppercase block">Follow-ups</span>
                            <span className="text-sm font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? 3 : selectedDoctor.employeeId === 'DOC1002' ? 2 : 1}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-[9px] text-slate-400 uppercase block">Revenue</span>
                            <span className="text-sm font-black text-emerald-600 block mt-0.5">₹{selectedDoctor.employeeId === 'DOC1001' ? '22,400' : selectedDoctor.employeeId === 'DOC1002' ? '18,600' : '12,000'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions Panel */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quick Actions</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button 
                            onClick={() => setIsApptModalOpen(true)}
                            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-primary/5 hover:border-primary/20 text-slate-600 hover:text-primary rounded-lg transition-all flex items-center gap-1.5 text-left"
                          >
                            <Calendar className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="font-semibold">Book Appointment</span>
                          </button>
                          <button 
                            onClick={() => setIsAssignModalOpen(true)}
                            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-primary/5 hover:border-primary/20 text-slate-600 hover:text-primary rounded-lg transition-all flex items-center gap-1.5 text-left"
                          >
                            <UserPlus className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="font-semibold">Assign Patient</span>
                          </button>
                          <button 
                            onClick={() => setIsPrescModalOpen(true)}
                            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-primary/5 hover:border-primary/20 text-slate-600 hover:text-primary rounded-lg transition-all flex items-center gap-1.5 text-left col-span-2"
                          >
                            <FilePlus className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="font-semibold">Create Prescription</span>
                          </button>
                          <button 
                            onClick={() => setIsNotifModalOpen(true)}
                            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-primary/5 hover:border-primary/20 text-slate-600 hover:text-primary rounded-lg transition-all flex items-center gap-1.5 text-left col-span-2"
                          >
                            <Bell className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="font-semibold">Send Notification</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* APPOINTMENTS TAB */}
                  {activeTab === 'appointments' && (
                    <div className="space-y-4">
                      {tabData.appointments.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No appointments listed.</p>
                      ) : (
                        <div className="space-y-3">
                          {tabData.appointments.map(appt => (
                            <div key={appt._id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-700 text-[11px] truncate block">{appt.patient?.fullName || 'Walk-in'}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                  appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                  appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                }`}>{appt.status}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1.5 border-t border-slate-100/50">
                                <div>
                                  <span className="block text-[8px] text-slate-400 uppercase">Reason</span>
                                  <span className="font-medium text-slate-600">{appt.reason}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-slate-400 uppercase">Date / Time</span>
                                  <span className="font-medium text-slate-600 font-mono">
                                    {new Date(appt.dateTime).toLocaleDateString()} at {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PATIENTS TAB */}
                  {activeTab === 'patients' && (
                    <div className="space-y-4">
                      {tabData.patients.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No patients listed.</p>
                      ) : (
                        <div className="space-y-3">
                          {tabData.patients.map(p => (
                            <div key={p.patient?._id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase shrink-0">
                                  {p.patient?.fullName?.charAt(0) || 'P'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-700 text-[11px] block truncate">{p.patient?.fullName}</span>
                                  <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{p.patient?.patientId}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-100/50">
                                <div>
                                  <span className="block text-[8px] text-slate-400 uppercase">Diagnosis</span>
                                  <span className="font-medium text-slate-600 truncate block" title={p.diagnosis}>{p.diagnosis}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-slate-400 uppercase">Treatment</span>
                                  <span className="font-medium text-slate-600 truncate block" title={p.treatment}>{p.treatment}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="block text-[8px] text-slate-400 uppercase">Last Visit</span>
                                  <span className="font-medium text-slate-600 block">{new Date(p.lastVisit).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRESCRIPTIONS TAB */}
                  {activeTab === 'prescriptions' && (
                    <div className="space-y-4">
                      {tabData.prescriptions.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No prescriptions written.</p>
                      ) : (
                        <div className="space-y-3">
                          {tabData.prescriptions.map(presc => (
                            <div key={presc._id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-[11px] truncate block">{presc.patient?.fullName}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{new Date(presc.date).toLocaleDateString()}</span>
                              </div>
                              
                              <div className="text-[10px] text-slate-600">
                                <span className="text-[8px] text-slate-400 uppercase block">Diagnosis</span>
                                <span className="font-semibold block">{presc.diagnosis}</span>
                              </div>

                              <div className="border-t border-slate-100/50 pt-2 space-y-1.5">
                                <span className="text-[8px] text-slate-400 uppercase block">Prescribed Medicines</span>
                                {presc.medicines?.map((med, mIdx) => (
                                  <div key={mIdx} className="flex justify-between text-[10px] bg-white border border-slate-100 p-1.5 rounded">
                                    <span className="font-medium text-slate-700">{med.name}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{med.dosage} &bull; {med.frequency} &bull; {med.duration}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SCHEDULE TAB */}
                  {activeTab === 'schedule' && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Weekly Shift Calendar</span>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Morning Shift</span>
                            <span className="font-bold text-slate-700 block mt-0.5">10:00 AM - 01:00 PM</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Evening Shift</span>
                            <span className="font-bold text-slate-700 block mt-0.5">02:00 PM - 06:00 PM</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Availability Management</span>
                        <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-700 block">Duty Status</span>
                            <span className="text-[10px] text-slate-400">Toggle whether this doctor is currently active/busy</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                            selectedDoctor.status?.toLowerCase() === 'active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : selectedDoctor.status === 'On Leave'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {selectedDoctor.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REPORTS TAB */}
                  {activeTab === 'reports' && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational KPI Analytics</h4>
                      
                      <div className="grid grid-cols-1 gap-3.5">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase">Consultations count</span>
                            <span className="text-lg font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? 36 : 20}</span>
                          </div>
                          <Activity className="w-5 h-5 text-primary opacity-60" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase">Total Revenue Generated</span>
                            <span className="text-lg font-black text-emerald-600 block mt-0.5">₹{selectedDoctor.employeeId === 'DOC1001' ? '22,400' : '15,000'}</span>
                          </div>
                          <DollarSign className="w-5 h-5 text-emerald-500 opacity-60" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase">Success Rate</span>
                            <span className="text-lg font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? '96%' : '94%'}</span>
                          </div>
                          <CheckCircle className="w-5 h-5 text-blue-500 opacity-60" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase">Patient Satisfaction</span>
                            <span className="text-lg font-black text-slate-700 block mt-0.5">{selectedDoctor.employeeId === 'DOC1001' ? '98%' : '95%'}</span>
                          </div>
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500 opacity-60" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT DOCTOR MODAL ───────────────────────────────────────────── */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-2xl shadow-xl overflow-hidden animate-fade-in my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
              </h2>
              <button 
                onClick={() => setIsDoctorModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-none">
              
              {/* Doctor Name & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor Name*</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Dr. Rohit Mehta"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address*</label>
                  <input
                    type="email"
                    required
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    placeholder="rohit.mehta@careplus.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* ID & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee ID (e.g. DOC1001)</label>
                  <input
                    type="text"
                    value={docEmployeeId}
                    onChange={(e) => setDocEmployeeId(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone*</label>
                  <input
                    type="text"
                    required
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Department & Specialization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={docDept}
                    onChange={(e) => setDocDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Specialization</label>
                  <select
                    value={docSpec}
                    onChange={(e) => setDocSpec(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    {specializationsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Qualification & Experience */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qualification</label>
                  <input
                    type="text"
                    value={docQual}
                    onChange={(e) => setDocQual(e.target.value)}
                    placeholder="e.g. MD, DM Cardiology"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Consultation Fee & License Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">License Number*</label>
                  <input
                    type="text"
                    required
                    value={docLicense}
                    onChange={(e) => setDocLicense(e.target.value)}
                    placeholder="e.g. MC123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shift Start Time</label>
                  <input
                    type="text"
                    value={docWorkingStart}
                    onChange={(e) => setDocWorkingStart(e.target.value)}
                    placeholder="e.g. 10:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shift End Time</label>
                  <input
                    type="text"
                    value={docWorkingEnd}
                    onChange={(e) => setDocWorkingEnd(e.target.value)}
                    placeholder="e.g. 18:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Available Consulting Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isSelected = docAvailableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          isSelected 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Profile Photo URL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Profile Photo URL</label>
                  <input
                    type="text"
                    value={docPhoto}
                    onChange={(e) => setDocPhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</label>
                <textarea
                  rows="2"
                  value={docAddress}
                  onChange={(e) => setDocAddress(e.target.value)}
                  placeholder="Doctor's office or clinical address..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              {/* Biography & Password */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Biography</label>
                  <textarea
                    rows="3"
                    value={docBio}
                    onChange={(e) => setDocBio(e.target.value)}
                    placeholder="Brief summary of experience, expertise, and special research..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                  ></textarea>
                </div>
                {!editingDoctor && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor Portal Password (new)*</label>
                    <input
                      type="password"
                      value={docPassword}
                      onChange={(e) => setDocPassword(e.target.value)}
                      placeholder="Default password is doctor123"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDoctorModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  {editingDoctor ? 'Save Changes' : 'Register Doctor'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── QUICK ACTION: BOOK APPOINTMENT MODAL ─────────────────────────────── */}
      {isApptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Book Consultation Appointment
              </h2>
              <button 
                onClick={() => setIsApptModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient*</label>
                <select
                  required
                  value={apptPatient}
                  onChange={(e) => setApptPatient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Choose Patient</option>
                  {patientsList.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date*</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time*</label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Visit</label>
                <input
                  type="text"
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                  placeholder="e.g. Regular ECG Checkup"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Notes</label>
                <textarea
                  rows="2"
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Any diagnostic comments..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApptModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                >
                  Book Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK ACTION: ASSIGN PATIENT MODAL ───────────────────────────────── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assign Patient to Doctor
              </h2>
              <button 
                onClick={() => setIsAssignModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleAssignPatientSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient*</label>
                <select
                  required
                  value={assignPatient}
                  onChange={(e) => setAssignPatient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Choose Patient</option>
                  {patientsList.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Diagnosis</label>
                <input
                  type="text"
                  value={assignDiagnosis}
                  onChange={(e) => setAssignDiagnosis(e.target.value)}
                  placeholder="e.g. Heart Failure Management"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Treatment Description</label>
                <textarea
                  rows="2"
                  value={assignTreatment}
                  onChange={(e) => setAssignTreatment(e.target.value)}
                  placeholder="e.g. Daily vitals tracking, Low salt diet..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                >
                  Assign Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK ACTION: CREATE PRESCRIPTION MODAL ──────────────────────────── */}
      {isPrescModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-lg shadow-xl overflow-hidden animate-fade-in my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Generate Patient Prescription
              </h2>
              <button 
                onClick={() => setIsPrescModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescriptionSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-none">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient*</label>
                  <select
                    required
                    value={prescPatient}
                    onChange={(e) => setPrescPatient(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  >
                    <option value="">Choose Patient</option>
                    {patientsList.map(p => (
                      <option key={p._id} value={p._id}>{p.fullName} ({p.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis*</label>
                  <input
                    type="text"
                    required
                    value={prescDiagnosis}
                    onChange={(e) => setPrescDiagnosis(e.target.value)}
                    placeholder="e.g. Stable Angina"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Medicines Dynamic Rows */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Line Medications</span>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {prescMedicines.map((med, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-100 rounded-lg space-y-2 relative">
                      {prescMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="absolute right-2 top-2 text-rose-500 hover:text-rose-700 text-xs font-bold"
                        >
                          &times;
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase">Medicine Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Metoprolol 25mg"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase">Dosage</label>
                          <input
                            type="text"
                            placeholder="1 tab"
                            value={med.dosage}
                            onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase">Frequency</label>
                          <input
                            type="text"
                            placeholder="Daily (Morning)"
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase">Duration</label>
                          <input
                            type="text"
                            placeholder="30 Days"
                            value={med.duration}
                            onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-400 uppercase">Instructions</label>
                          <input
                            type="text"
                            placeholder="Take after meal"
                            value={med.instructions}
                            onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Additional Prescription Notes</label>
                <textarea
                  rows="2"
                  value={prescNotes}
                  onChange={(e) => setPrescNotes(e.target.value)}
                  placeholder="Low stress routine, daily BP check-in..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrescModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                >
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK ACTION: SEND NOTIFICATION MODAL ────────────────────────────── */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Send Notification Alert
              </h2>
              <button 
                onClick={() => setIsNotifModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSendNotificationSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alert Title*</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Schedule Update Alert"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alert Priority</label>
                <select
                  value={notifPriority}
                  onChange={(e) => setNotifPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alert Message*</label>
                <textarea
                  rows="3"
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="e.g. Doctor will not be available in OPD tomorrow due to hospital meeting..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all"
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
