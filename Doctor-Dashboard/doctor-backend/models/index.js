// Doctor backend models - connect to shared hospitals_db schema
// These are read-only mirrors of the admin backend models
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── User (Doctors) ────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  email: { type: DataTypes.STRING(200), unique: true },
  password: DataTypes.STRING(255),
  role: DataTypes.ENUM('SUPER_ADMIN','HOSPITAL_ADMIN','DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','LAB_TECHNICIAN','PATIENT'),
  department: DataTypes.STRING(50),
  status: DataTypes.ENUM('Active','Inactive'),
  phone: DataTypes.STRING(20),
  profile_image: DataTypes.TEXT,
  employee_id: DataTypes.STRING(50),
  specialization: DataTypes.STRING(200),
  experience: DataTypes.INTEGER,
  qualification: DataTypes.STRING(200),
  shift: DataTypes.STRING(20),
  schedule_days: DataTypes.JSON,
  schedule_start: DataTypes.STRING(20),
  schedule_end: DataTypes.STRING(20),
  availability_status: DataTypes.STRING(20),
  last_login: DataTypes.DATE,
}, { tableName: 'users', timestamps: true, underscored: true });

// ── Patient ────────────────────────────────────────────────
const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.STRING(50),
  full_name: DataTypes.STRING(200),
  email: DataTypes.STRING(200),
  phone: DataTypes.STRING(20),
  dob: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('Male','Female','Other'),
  blood_group: DataTypes.STRING(10),
  address: DataTypes.TEXT,
  medical_notes: DataTypes.TEXT,
  medical_history: DataTypes.JSON,
  status: DataTypes.STRING(50),
}, { tableName: 'patients', timestamps: true, underscored: true });

// ── Appointment ────────────────────────────────────────────
const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  department: DataTypes.STRING(50),
  date_time: DataTypes.DATE,
  token_number: DataTypes.INTEGER,
  status: DataTypes.ENUM('Pending','Confirmed','In-Progress','Completed','Cancelled','No-Show'),
  reason: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  visit_type: DataTypes.STRING(50),
}, { tableName: 'appointments', timestamps: true, underscored: true });

// ── Vitals ─────────────────────────────────────────────────
const Vitals = sequelize.define('Vitals', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  recorded_by: DataTypes.INTEGER,
  blood_pressure: DataTypes.STRING(20),
  pulse: DataTypes.INTEGER,
  temperature: DataTypes.DECIMAL(5,2),
  spo2: DataTypes.INTEGER,
  weight: DataTypes.DECIMAL(5,2),
  height: DataTypes.DECIMAL(5,2),
  notes: DataTypes.TEXT,
  recorded_at: DataTypes.DATE,
}, { tableName: 'vitals', timestamps: true, underscored: true });

// ── Consultation ───────────────────────────────────────────
const Consultation = sequelize.define('Consultation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  symptoms: DataTypes.TEXT,
  diagnosis: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  follow_up_date: DataTypes.DATE,
  follow_up_notes: DataTypes.TEXT,
  status: DataTypes.ENUM('Pending','In-Progress','Completed'),
  started_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  lab_tests: DataTypes.JSON,
}, { tableName: 'consultations', timestamps: true, underscored: true });

// ── Prescription ───────────────────────────────────────────
const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  consultation_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  diagnosis: DataTypes.TEXT,
  instructions: DataTypes.TEXT,
  status: DataTypes.ENUM('Active','Completed','Cancelled'),
  valid_until: DataTypes.DATEONLY,
}, { tableName: 'prescriptions', timestamps: true, underscored: true });

// ── PrescriptionMedicine ───────────────────────────────────
const PrescriptionMedicine = sequelize.define('PrescriptionMedicine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prescription_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  generic_name: DataTypes.STRING(200),
  dosage: DataTypes.STRING(100),
  frequency: DataTypes.STRING(100),
  duration: DataTypes.STRING(100),
  route: DataTypes.STRING(50),
  instructions: DataTypes.TEXT,
  quantity: DataTypes.INTEGER,
}, { tableName: 'prescription_medicines', timestamps: true, underscored: true });

// ── Report ─────────────────────────────────────────────────
const Report = sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  uploaded_by: DataTypes.INTEGER,
  title: DataTypes.STRING(300),
  report_type: DataTypes.ENUM('Lab','Radiology','Pathology','Prescription','Discharge','Other'),
  file_url: DataTypes.TEXT,
  s3_key: DataTypes.TEXT,
  file_name: DataTypes.STRING(500),
  file_size: DataTypes.INTEGER,
  file_type: DataTypes.STRING(50),
  description: DataTypes.TEXT,
  status: DataTypes.ENUM('Pending','Ready','Reviewed'),
  is_deleted: DataTypes.BOOLEAN,
}, { tableName: 'reports', timestamps: true, underscored: true });

// ── Notification ───────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  title: DataTypes.STRING(300),
  message: DataTypes.TEXT,
  type: DataTypes.STRING(50),
  priority: DataTypes.STRING(20),
  status: DataTypes.ENUM('unread','read','resolved'),
  is_important: DataTypes.BOOLEAN,
  metadata: DataTypes.JSON,
  read_at: DataTypes.DATE,
}, { tableName: 'notifications', timestamps: true, underscored: true });

// ── AuditLog ───────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  action: DataTypes.ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT'),
  module: DataTypes.STRING(100),
  table_name: DataTypes.STRING(100),
  record_id: DataTypes.INTEGER,
  old_data: DataTypes.JSON,
  new_data: DataTypes.JSON,
  description: DataTypes.TEXT,
  ip_address: DataTypes.STRING(50),
}, { tableName: 'audit_logs', timestamps: true, underscored: true, updatedAt: false });

// ── Associations ───────────────────────────────────────────
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.hasOne(Vitals, { foreignKey: 'appointment_id', as: 'vitals' });
Appointment.hasOne(Consultation, { foreignKey: 'appointment_id', as: 'consultation' });
Consultation.hasOne(Prescription, { foreignKey: 'consultation_id', as: 'prescription' });
Prescription.hasMany(PrescriptionMedicine, { foreignKey: 'prescription_id', as: 'medicines' });
Patient.hasMany(Vitals, { foreignKey: 'patient_id', as: 'vitals' });
Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
User.hasMany(Consultation, { foreignKey: 'doctor_id', as: 'consultations' });

module.exports = { User, Patient, Appointment, Vitals, Consultation, Prescription, PrescriptionMedicine, Report, Notification, AuditLog };
