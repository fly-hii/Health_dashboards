// ============================================================
// models/index.js - All Sequelize models with associations
// Single source of truth for the hospitals_db database schema
// ============================================================

const Hospital = require('./Hospital');
const User = require('./User');
const Department = require('./Department');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const Token = require('./Token');
const Vitals = require('./Vitals');
const Consultation = require('./Consultation');
const Prescription = require('./Prescription');
const PrescriptionMedicine = require('./PrescriptionMedicine');
const PharmacyOrder = require('./PharmacyOrder');
const Report = require('./Report');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Payment = require('./Payment');
const LabTest = require('./LabTest');
const MedicineInventory = require('./MedicineInventory');

// ── Hospital ──────────────────────────────────────────────
Hospital.hasMany(User, { foreignKey: 'hospital_id', as: 'staff' });
User.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(Department, { foreignKey: 'hospital_id', as: 'departments' });
Department.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(Patient, { foreignKey: 'hospital_id', as: 'patients' });
Patient.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Hospital.hasMany(Appointment, { foreignKey: 'hospital_id', as: 'appointments' });
Hospital.hasMany(Token, { foreignKey: 'hospital_id', as: 'tokens' });
Hospital.hasMany(Vitals, { foreignKey: 'hospital_id', as: 'vitalRecords' });
Hospital.hasMany(Consultation, { foreignKey: 'hospital_id', as: 'consultations' });
Hospital.hasMany(Prescription, { foreignKey: 'hospital_id', as: 'prescriptions' });
Hospital.hasMany(PharmacyOrder, { foreignKey: 'hospital_id', as: 'pharmacyOrders' });
Hospital.hasMany(Report, { foreignKey: 'hospital_id', as: 'reports' });
Hospital.hasMany(Notification, { foreignKey: 'hospital_id', as: 'notifications' });
Hospital.hasMany(AuditLog, { foreignKey: 'hospital_id', as: 'auditLogs' });
Hospital.hasMany(Payment, { foreignKey: 'hospital_id', as: 'payments' });

// ── Department ─────────────────────────────────────────────
User.belongsTo(Department, { foreignKey: 'department', targetKey: 'code', as: 'departmentInfo', constraints: false });

// ── Appointment ────────────────────────────────────────────
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

User.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'doctorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

Appointment.hasOne(Token, { foreignKey: 'appointment_id', as: 'token' });
Token.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Appointment.hasOne(Vitals, { foreignKey: 'appointment_id', as: 'vitals' });
Vitals.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Appointment.hasOne(Consultation, { foreignKey: 'appointment_id', as: 'consultation' });
Consultation.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

// ── Patient ────────────────────────────────────────────────
Patient.hasMany(Vitals, { foreignKey: 'patient_id', as: 'vitals' });
Vitals.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(Consultation, { foreignKey: 'patient_id', as: 'consultations' });
Consultation.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
Report.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(PharmacyOrder, { foreignKey: 'patient_id', as: 'pharmacyOrders' });
PharmacyOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(Payment, { foreignKey: 'patient_id', as: 'payments' });
Payment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Patient.hasMany(LabTest, { foreignKey: 'patient_id', as: 'labTests' });
LabTest.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// ── Doctor (User) ──────────────────────────────────────────
User.hasMany(Consultation, { foreignKey: 'doctor_id', as: 'doctorConsultations' });
Consultation.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

User.hasMany(Prescription, { foreignKey: 'doctor_id', as: 'doctorPrescriptions' });
Prescription.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

User.hasMany(Vitals, { foreignKey: 'recorded_by', as: 'recordedVitals' });
Vitals.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });

User.hasMany(Report, { foreignKey: 'uploaded_by', as: 'uploadedReports' });
Report.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploadedBy' });

User.hasMany(PharmacyOrder, { foreignKey: 'pharmacist_id', as: 'pharmacistOrders' });
PharmacyOrder.belongsTo(User, { foreignKey: 'pharmacist_id', as: 'pharmacist' });

// ── Consultation ───────────────────────────────────────────
Consultation.hasOne(Prescription, { foreignKey: 'consultation_id', as: 'prescription' });
Prescription.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

Consultation.hasMany(LabTest, { foreignKey: 'consultation_id', as: 'labTests' });
LabTest.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

// ── Prescription ───────────────────────────────────────────
Prescription.hasMany(PrescriptionMedicine, { foreignKey: 'prescription_id', as: 'medicines' });
PrescriptionMedicine.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

Prescription.hasOne(PharmacyOrder, { foreignKey: 'prescription_id', as: 'pharmacyOrder' });
PharmacyOrder.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

// ── Notifications ──────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Audit ──────────────────────────────────────────────────
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  Hospital,
  User,
  Department,
  Patient,
  Appointment,
  Token,
  Vitals,
  Consultation,
  Prescription,
  PrescriptionMedicine,
  PharmacyOrder,
  Report,
  Notification,
  AuditLog,
  Payment,
  LabTest,
  MedicineInventory,
};
