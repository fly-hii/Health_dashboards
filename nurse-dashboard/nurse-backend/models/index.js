// Nurse backend models - shared hospitals_db schema
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
  employeeId: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('employee_id');
    },
    set(val) {
      this.setDataValue('employee_id', val);
    }
  },
  shift: DataTypes.STRING(20),
  availability_status: DataTypes.STRING(20),
  last_login: DataTypes.DATE,
}, { tableName: 'users', timestamps: true, underscored: true });

const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.STRING(50),
  full_name: DataTypes.STRING(200),
  phone: DataTypes.STRING(20),
  dob: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('Male','Female','Other'),
  blood_group: DataTypes.STRING(10),
  medical_notes: DataTypes.TEXT,
  status: DataTypes.STRING(50),
}, { tableName: 'patients', timestamps: true, underscored: true });

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
}, { tableName: 'appointments', timestamps: true, underscored: true });

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
  bmi: DataTypes.DECIMAL(5,2),
  respiratory_rate: DataTypes.INTEGER,
  blood_sugar: DataTypes.DECIMAL(6,2),
  notes: DataTypes.TEXT,
  recorded_at: DataTypes.DATE,
}, { tableName: 'vitals', timestamps: true, underscored: true });

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  title: DataTypes.STRING(300),
  message: DataTypes.TEXT,
  type: DataTypes.STRING(50),
  priority: DataTypes.STRING(20),
  status: DataTypes.ENUM('unread','read','resolved'),
  metadata: DataTypes.JSON,
  read_at: DataTypes.DATE,
}, { tableName: 'notifications', timestamps: true, underscored: true });

// Associations
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.hasOne(Vitals, { foreignKey: 'appointment_id', as: 'vitals' });
Vitals.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Vitals.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });

module.exports = { User, Patient, Appointment, Vitals, Notification };
