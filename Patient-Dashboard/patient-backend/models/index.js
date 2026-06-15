// Patient backend models - shared hospitals_db schema (CommonJS)
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ── Patient (self - logged-in user) ────────────────────────
const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.STRING(50),
  full_name: DataTypes.STRING(200),
  email: { type: DataTypes.STRING(200), unique: true },
  password: DataTypes.STRING(255),
  phone: DataTypes.STRING(20),
  dob: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('Male', 'Female', 'Other'),
  blood_group: DataTypes.STRING(10),
  address: DataTypes.TEXT,
  medical_notes: DataTypes.TEXT,
  medical_history: DataTypes.JSON,
  status: DataTypes.STRING(50),
  profile_image: DataTypes.TEXT,
  is_portal_user: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: DataTypes.DATE,
}, { tableName: 'patients', timestamps: true, underscored: true });

// ── User (Doctors / Staff) ─────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  email: DataTypes.STRING(200),
  role: DataTypes.STRING(50),
  department: DataTypes.STRING(50),
  status: DataTypes.ENUM('Active', 'Inactive'),
  phone: DataTypes.STRING(20),
  profile_image: DataTypes.TEXT,
  employee_id: DataTypes.STRING(50),
  specialization: DataTypes.STRING(200),
  experience: DataTypes.INTEGER,
  qualification: DataTypes.STRING(200),
  availability_status: DataTypes.STRING(20),
}, { tableName: 'users', timestamps: true, underscored: true });

// ── Hospital ───────────────────────────────────────────────
const Hospital = sequelize.define('Hospital', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING(300),
  address: DataTypes.TEXT,
  city: DataTypes.STRING(100),
  state: DataTypes.STRING(100),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(200),
  logo_url: DataTypes.TEXT,
  status: DataTypes.STRING(20),
}, { tableName: 'hospitals', timestamps: true, underscored: true });

// ── Appointment ────────────────────────────────────────────
const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  department: DataTypes.STRING(50),
  date_time: DataTypes.DATE,
  token_number: DataTypes.INTEGER,
  status: DataTypes.ENUM('Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'),
  reason: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  visit_type: DataTypes.STRING(50),
  booked_by: DataTypes.STRING(50),
}, { tableName: 'appointments', timestamps: true, underscored: true });

// ── Token ──────────────────────────────────────────────────
const Token = sequelize.define('Token', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  token_number: DataTypes.INTEGER,
  token_date: DataTypes.DATEONLY,
  status: DataTypes.ENUM('Waiting', 'In-Progress', 'Completed', 'Cancelled', 'Skipped'),
}, { tableName: 'tokens', timestamps: true, underscored: true });

// ── Vitals ─────────────────────────────────────────────────
const Vitals = sequelize.define('Vitals', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  recorded_by: DataTypes.INTEGER,
  blood_pressure: DataTypes.STRING(20),
  pulse: DataTypes.INTEGER,
  temperature: DataTypes.DECIMAL(5, 2),
  spo2: DataTypes.INTEGER,
  weight: DataTypes.DECIMAL(5, 2),
  height: DataTypes.DECIMAL(5, 2),
  bmi: DataTypes.DECIMAL(5, 2),
  notes: DataTypes.TEXT,
  recorded_at: DataTypes.DATE,
}, { tableName: 'vitals', timestamps: true, underscored: true });

// ── Prescription ───────────────────────────────────────────
const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  consultation_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  diagnosis: DataTypes.TEXT,
  instructions: DataTypes.TEXT,
  status: DataTypes.ENUM('Active', 'Completed', 'Cancelled'),
  valid_until: DataTypes.DATEONLY,
}, { tableName: 'prescriptions', timestamps: true, underscored: true });

// ── PrescriptionMedicine ───────────────────────────────────
const PrescriptionMedicine = sequelize.define('PrescriptionMedicine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  prescription_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  dosage: DataTypes.STRING(100),
  frequency: DataTypes.STRING(100),
  duration: DataTypes.STRING(100),
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
  report_type: DataTypes.ENUM('Lab', 'Radiology', 'Pathology', 'Prescription', 'Discharge', 'Other'),
  file_url: DataTypes.TEXT,
  s3_key: DataTypes.TEXT,
  file_name: DataTypes.STRING(500),
  file_size: DataTypes.INTEGER,
  file_type: DataTypes.STRING(50),
  description: DataTypes.TEXT,
  status: DataTypes.ENUM('Pending', 'Ready', 'Reviewed'),
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
  status: DataTypes.ENUM('unread', 'read', 'resolved'),
  is_important: DataTypes.BOOLEAN,
  metadata: DataTypes.JSON,
  read_at: DataTypes.DATE,
}, { tableName: 'notifications', timestamps: true, underscored: true });

// ── PharmacyOrder ──────────────────────────────────────────
const PharmacyOrder = sequelize.define('PharmacyOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  prescription_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  pharmacist_id: DataTypes.INTEGER,
  status: DataTypes.ENUM('Pending', 'Processing', 'Ready', 'Delivered', 'Cancelled'),
  total_amount: DataTypes.DECIMAL(10, 2),
  payment_status: DataTypes.ENUM('Unpaid', 'Paid', 'Partial'),
  notes: DataTypes.TEXT,
  delivered_at: DataTypes.DATE,
}, { tableName: 'pharmacy_orders', timestamps: true, underscored: true });

// ── Associations ───────────────────────────────────────────
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.hasOne(Vitals, { foreignKey: 'appointment_id', as: 'vitals' });
Appointment.hasOne(Token, { foreignKey: 'appointment_id', as: 'token' });
Prescription.hasMany(PrescriptionMedicine, { foreignKey: 'prescription_id', as: 'medicines' });
Prescription.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
Patient.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
PharmacyOrder.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

module.exports = {
  Patient, User, Hospital, Appointment, Token, Vitals,
  Prescription, PrescriptionMedicine, Report, Notification, PharmacyOrder,
};
