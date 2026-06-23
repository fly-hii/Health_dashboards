/**
 * modelFactory.js
 *
 * Creates all 17 HMS Sequelize models bound to a SPECIFIC Sequelize instance.
 * This is the core of the Hybrid Multi-Tenant architecture.
 *
 * Instead of each model file hard-coding:
 *   const { sequelize } = require('../config/database');
 *
 * We define models as functions that take a sequelize instance.
 * The result is cached per connection instance (using the instance's UUID).
 *
 * Usage:
 *   const db = await getHospitalConnection(hospitalId);
 *   const models = createModels(db);
 *   const { Patient, Appointment } = models;
 */
const { DataTypes } = require('sequelize');

// Model cache: WeakMap<sequelizeInstance, models>
// WeakMap allows garbage-collection when the Sequelize instance is evicted
const modelCache = new WeakMap();

function createModels(sequelize) {
  // Return cached models for this exact connection
  if (modelCache.has(sequelize)) {
    return modelCache.get(sequelize);
  }

  // ── Hospital ──────────────────────────────────────────────────
  const Hospital = sequelize.define('Hospital', {
    id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:     { type: DataTypes.STRING(300), allowNull: false },
    code:     { type: DataTypes.STRING(20), allowNull: false, unique: true },
    email:    { type: DataTypes.STRING(200) },
    phone:    { type: DataTypes.STRING(20) },
    address:  DataTypes.TEXT,
    city:     DataTypes.STRING(100),
    state:    DataTypes.STRING(100),
    country:  { type: DataTypes.STRING(100), defaultValue: 'India' },
    plan:     { type: DataTypes.ENUM('basic','standard','premium','enterprise'), defaultValue: 'basic' },
    status:   { type: DataTypes.ENUM('active','suspended','trial','expired'), defaultValue: 'trial' },
    database_type: { type: DataTypes.ENUM('shared','external'), defaultValue: 'shared' },
    plan_expires_at: DataTypes.DATE,
    max_users: { type: DataTypes.INTEGER, defaultValue: 10 },
    max_patients: { type: DataTypes.INTEGER, defaultValue: 500 },
    logo_url: DataTypes.TEXT,
    settings: { type: DataTypes.JSON, defaultValue: {} },
  }, { tableName: 'hospitals', timestamps: true, underscored: true });

  // ── Department ────────────────────────────────────────────────
  const Department = sequelize.define('Department', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:   { type: DataTypes.INTEGER, allowNull: false },
    name:          { type: DataTypes.STRING(200), allowNull: false },
    code:          DataTypes.STRING(20),
    head_doctor_id: DataTypes.INTEGER,
    description:   DataTypes.TEXT,
    status:        { type: DataTypes.ENUM('active','inactive'), defaultValue: 'active' },
    floor:         DataTypes.STRING(20),
    phone_ext:     DataTypes.STRING(20),
  }, { tableName: 'departments', timestamps: true, underscored: true });

  // ── User (Staff) ──────────────────────────────────────────────
  const User = sequelize.define('User', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id: { type: DataTypes.INTEGER, allowNull: true },
    name:        { type: DataTypes.STRING(200), allowNull: false },
    email:       { type: DataTypes.STRING(200), allowNull: false },
    password:    { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM('SUPER_ADMIN','HOSPITAL_ADMIN','DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','LAB_TECHNICIAN','PATIENT'),
      allowNull: false, defaultValue: 'HOSPITAL_ADMIN',
    },
    department: {
      type: DataTypes.STRING(100),
      defaultValue: 'OTHERS',
    },
    status:               { type: DataTypes.ENUM('Active','Inactive'), defaultValue: 'Active' },
    phone:                DataTypes.STRING(20),
    profile_image:        DataTypes.TEXT,
    avatar: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('profile_image');
      }
    },
    profileImage: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('profile_image');
      }
    },
    employee_id:          DataTypes.STRING(50),
    specialization:       DataTypes.STRING(200),
    experience:           DataTypes.INTEGER,
    qualification:        DataTypes.STRING(200),
    shift:                { type: DataTypes.ENUM('Morning','Evening','Night'), defaultValue: 'Morning' },
    schedule_days:        DataTypes.JSON,
    schedule_start:       { type: DataTypes.STRING(20), defaultValue: '09:00 AM' },
    schedule_end:         { type: DataTypes.STRING(20), defaultValue: '05:00 PM' },
    availability_status:  { type: DataTypes.ENUM('Available','On Leave','Busy'), defaultValue: 'Available' },
    last_login:           DataTypes.DATE,
  }, { tableName: 'users', timestamps: true, underscored: true });

  // ── Patient ───────────────────────────────────────────────────
  const Patient = sequelize.define('Patient', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:  { type: DataTypes.INTEGER, allowNull: false },
    patient_id:   { type: DataTypes.STRING(50), allowNull: false },
    full_name:    { type: DataTypes.STRING(200), allowNull: false },
    email:        DataTypes.STRING(200),
    password:     DataTypes.STRING(255),
    phone:        { type: DataTypes.STRING(20), allowNull: false },
    dob:          { type: DataTypes.DATEONLY, allowNull: false },
    gender:       { type: DataTypes.ENUM('Male','Female','Other'), allowNull: false },
    blood_group:  DataTypes.STRING(10),
    address:      DataTypes.TEXT,
    emergency_contact_name:     DataTypes.STRING(200),
    emergency_contact_phone:    DataTypes.STRING(20),
    emergency_contact_relation: DataTypes.STRING(100),
    insurance_number: DataTypes.STRING(100),
    medical_notes:    DataTypes.TEXT,
    medical_history:  { type: DataTypes.JSON, defaultValue: [] },
    status: {
      type: DataTypes.ENUM('active','inactive','blocked','discharged','Outpatient','Admitted','Discharged'),
      defaultValue: 'active',
    },
    admit_date:      DataTypes.DATE,
    discharge_date:  DataTypes.DATE,
    room_number:     DataTypes.STRING(20),
    profile_image:   DataTypes.TEXT,
    is_portal_user:  { type: DataTypes.BOOLEAN, defaultValue: false },
    last_login:      DataTypes.DATE,
  }, { tableName: 'patients', timestamps: true, underscored: true });

  // ── Appointment ───────────────────────────────────────────────
  const Appointment = sequelize.define('Appointment', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id:  { type: DataTypes.INTEGER, allowNull: false },
    doctor_id:   { type: DataTypes.INTEGER, allowNull: false },
    department:  {
      type: DataTypes.ENUM('OPD','IPD','PHARMACY','LABORATORY','RECEPTION','OTHERS'),
      allowNull: false, defaultValue: 'OPD',
    },
    date_time:    { type: DataTypes.DATE, allowNull: false },
    token_number: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('Pending','Confirmed','In-Progress','Completed','Cancelled','No-Show'),
      defaultValue: 'Pending',
    },
    reason:     DataTypes.TEXT,
    notes:      DataTypes.TEXT,
    visit_type: { type: DataTypes.ENUM('New','Follow-Up','Emergency'), defaultValue: 'New' },
    booked_by:  DataTypes.STRING(100),
  }, { tableName: 'appointments', timestamps: true, underscored: true });

  // ── Token ─────────────────────────────────────────────────────
  const Token = sequelize.define('Token', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id:     DataTypes.INTEGER,
    doctor_id:      DataTypes.INTEGER,
    token_number:   { type: DataTypes.INTEGER, allowNull: false },
    token_date:     { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('Waiting','Called','In-Progress','Completed','Skipped','Cancelled'),
      defaultValue: 'Waiting',
    },
    called_at:          DataTypes.DATE,
    completed_at:       DataTypes.DATE,
    estimated_wait_mins: { type: DataTypes.INTEGER, defaultValue: 15 },
  }, { tableName: 'tokens', timestamps: true, underscored: true });

  // ── Vitals ────────────────────────────────────────────────────
  const Vitals = sequelize.define('Vitals', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
    patient_id:     { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: DataTypes.INTEGER,
    recorded_by:    DataTypes.INTEGER,
    blood_pressure: DataTypes.STRING(20),
    pulse:          DataTypes.INTEGER,
    temperature:    DataTypes.DECIMAL(5, 2),
    spo2:           DataTypes.INTEGER,
    weight:         DataTypes.DECIMAL(5, 2),
    height:         DataTypes.DECIMAL(5, 2),
    bmi:            DataTypes.DECIMAL(5, 2),
    respiratory_rate: DataTypes.INTEGER,
    blood_sugar:    DataTypes.DECIMAL(6, 2),
    notes:          DataTypes.TEXT,
    recorded_at:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'vitals', timestamps: true, underscored: true });

  // ── Consultation ──────────────────────────────────────────────
  const Consultation = sequelize.define('Consultation', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER, allowNull: false },
    patient_id:     { type: DataTypes.INTEGER, allowNull: false },
    doctor_id:      { type: DataTypes.INTEGER, allowNull: false },
    symptoms:       DataTypes.TEXT,
    diagnosis:      DataTypes.TEXT,
    notes:          DataTypes.TEXT,
    follow_up_date: DataTypes.DATE,
    follow_up_notes: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('Pending','In-Progress','Completed'), defaultValue: 'Pending' },
    started_at:     DataTypes.DATE,
    completed_at:   DataTypes.DATE,
    lab_tests:      { type: DataTypes.JSON, defaultValue: [] },
  }, { tableName: 'consultations', timestamps: true, underscored: true });

  // ── Prescription ──────────────────────────────────────────────
  const Prescription = sequelize.define('Prescription', {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:     { type: DataTypes.INTEGER, allowNull: false },
    consultation_id: DataTypes.INTEGER,
    appointment_id:  DataTypes.INTEGER,
    patient_id:      { type: DataTypes.INTEGER, allowNull: false },
    doctor_id:       { type: DataTypes.INTEGER, allowNull: false },
    diagnosis:       DataTypes.TEXT,
    instructions:    DataTypes.TEXT,
    status:          { type: DataTypes.ENUM('Active','Completed','Cancelled'), defaultValue: 'Active' },
    valid_until:     DataTypes.DATEONLY,
  }, { tableName: 'prescriptions', timestamps: true, underscored: true });

  // ── PrescriptionMedicine ──────────────────────────────────────
  const PrescriptionMedicine = sequelize.define('PrescriptionMedicine', {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    prescription_id: { type: DataTypes.INTEGER, allowNull: false },
    name:            { type: DataTypes.STRING(200), allowNull: false },
    generic_name:    DataTypes.STRING(200),
    dosage:          DataTypes.STRING(100),
    frequency:       DataTypes.STRING(100),
    duration:        DataTypes.STRING(100),
    route:           DataTypes.STRING(50),
    instructions:    DataTypes.TEXT,
    quantity:        { type: DataTypes.INTEGER, defaultValue: 1 },
  }, { tableName: 'prescription_medicines', timestamps: true, underscored: true });

  // ── PharmacyOrder ─────────────────────────────────────────────
  const PharmacyOrder = sequelize.define('PharmacyOrder', {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:     { type: DataTypes.INTEGER, allowNull: false },
    prescription_id: DataTypes.INTEGER,
    patient_id:      { type: DataTypes.INTEGER, allowNull: false },
    pharmacist_id:   DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('Pending','Processing','Ready','Delivered','Cancelled'),
      defaultValue: 'Pending',
    },
    total_amount:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    payment_status: { type: DataTypes.ENUM('Unpaid','Paid','Partial'), defaultValue: 'Unpaid' },
    notes:          DataTypes.TEXT,
    processed_at:   DataTypes.DATE,
    delivered_at:   DataTypes.DATE,
  }, { tableName: 'pharmacy_orders', timestamps: true, underscored: true });

  // ── MedicineInventory ─────────────────────────────────────────
  const MedicineInventory = sequelize.define('MedicineInventory', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:      { type: DataTypes.INTEGER, allowNull: false },
    name:             { type: DataTypes.STRING(200), allowNull: false },
    generic_name:     DataTypes.STRING(200),
    category:         DataTypes.STRING(100),
    manufacturer:     DataTypes.STRING(200),
    batch_number:     DataTypes.STRING(100),
    expiry_date:      DataTypes.DATEONLY,
    unit:             DataTypes.STRING(50),
    quantity_in_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    reorder_level:    { type: DataTypes.INTEGER, defaultValue: 10 },
    unit_price:       { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    location:         DataTypes.STRING(100),
    status: {
      type: DataTypes.ENUM('In Stock','Low Stock','Out of Stock','Expired'),
      defaultValue: 'In Stock',
    },
    description: DataTypes.TEXT,
  }, { tableName: 'medicine_inventory', timestamps: true, underscored: true });

  // ── Report ────────────────────────────────────────────────────
  const Report = sequelize.define('Report', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
    patient_id:     { type: DataTypes.INTEGER, allowNull: false },
    appointment_id: DataTypes.INTEGER,
    uploaded_by:    DataTypes.INTEGER,
    title:          { type: DataTypes.STRING(300), allowNull: false },
    report_type: {
      type: DataTypes.ENUM('Lab','Radiology','Pathology','Prescription','Discharge','Other'),
      defaultValue: 'Other',
    },
    file_url:    DataTypes.TEXT,
    s3_key:      DataTypes.TEXT,
    file_name:   DataTypes.STRING(500),
    file_size:   DataTypes.INTEGER,
    file_type:   DataTypes.STRING(50),
    description: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('Pending','Ready','Reviewed'), defaultValue: 'Ready' },
    is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'reports', timestamps: true, underscored: true });

  // ── LabTest ───────────────────────────────────────────────────
  const LabTest = sequelize.define('LabTest', {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:     { type: DataTypes.INTEGER, allowNull: false },
    consultation_id: DataTypes.INTEGER,
    patient_id:      DataTypes.INTEGER,
    doctor_id:       DataTypes.INTEGER,
    test_name:       { type: DataTypes.STRING(200), allowNull: false },
    test_code:       DataTypes.STRING(50),
    category:        DataTypes.STRING(100),
    status: {
      type: DataTypes.ENUM('Ordered','Sample-Collected','Processing','Completed','Cancelled'),
      defaultValue: 'Ordered',
    },
    result:       DataTypes.TEXT,
    result_url:   DataTypes.TEXT,
    s3_key:       DataTypes.TEXT,
    normal_range: DataTypes.STRING(200),
    unit:         DataTypes.STRING(50),
    priority:     { type: DataTypes.ENUM('Routine','Urgent','STAT'), defaultValue: 'Routine' },
    notes:        DataTypes.TEXT,
    completed_at: DataTypes.DATE,
  }, { tableName: 'lab_tests', timestamps: true, underscored: true });

  // ── Payment (HMS billing) ─────────────────────────────────────
  const Payment = sequelize.define('HmsPayment', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
    patient_id:     DataTypes.INTEGER,
    appointment_id: DataTypes.INTEGER,
    amount:         { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency:       { type: DataTypes.STRING(10), defaultValue: 'INR' },
    status:         { type: DataTypes.ENUM('Pending','Paid','Failed','Refunded'), defaultValue: 'Pending' },
    payment_method: { type: DataTypes.ENUM('Cash','Card','UPI','Insurance','Online','Other'), defaultValue: 'Cash' },
    transaction_id: DataTypes.STRING(200),
    description:    DataTypes.TEXT,
    bill_type:      { type: DataTypes.ENUM('Consultation','Lab','Pharmacy','Room','Other'), defaultValue: 'Consultation' },
    paid_at:        DataTypes.DATE,
    invoice_number: DataTypes.STRING(100),
  }, { tableName: 'billing_payments', timestamps: true, underscored: true });

  // ── Notification ──────────────────────────────────────────────
  const Notification = sequelize.define('Notification', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id:     { type: DataTypes.INTEGER, allowNull: true },
    title:       { type: DataTypes.STRING(300), allowNull: false },
    message:     { type: DataTypes.TEXT, allowNull: false },
    type: {
      type: DataTypes.ENUM('patient','appointment','doctor','nurse','pharmacy','laboratory','billing','system'),
      defaultValue: 'system',
    },
    priority:              { type: DataTypes.ENUM('low','medium','high','critical'), defaultValue: 'medium' },
    status:                { type: DataTypes.ENUM('unread','read','resolved'), defaultValue: 'unread' },
    is_important:          { type: DataTypes.BOOLEAN, defaultValue: false },
    related_entity_id:     DataTypes.INTEGER,
    related_entity_type:   DataTypes.STRING(100),
    metadata:              { type: DataTypes.JSON, defaultValue: {} },
    read_at:               DataTypes.DATE,
  }, { tableName: 'notifications', timestamps: true, underscored: true });

  // ── AuditLog ──────────────────────────────────────────────────
  const AuditLog = sequelize.define('AuditLog', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hospital_id: { type: DataTypes.INTEGER, allowNull: true },
    user_id:     { type: DataTypes.INTEGER, allowNull: true },
    action: {
      type: DataTypes.ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT'),
      allowNull: false,
    },
    module:      DataTypes.STRING(100),
    table_name:  DataTypes.STRING(100),
    record_id:   DataTypes.INTEGER,
    old_data:    DataTypes.JSON,
    new_data:    DataTypes.JSON,
    description: DataTypes.TEXT,
    ip_address:  DataTypes.STRING(50),
    user_agent:  DataTypes.TEXT,
  }, { tableName: 'audit_logs', timestamps: true, underscored: true, updatedAt: false });

  // ── ASSOCIATIONS ──────────────────────────────────────────────

  // Hospital ↔ Department
  Hospital.hasMany(Department,  { foreignKey: 'hospital_id', as: 'departments' });
  Department.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

  // Hospital ↔ User
  Hospital.hasMany(User, { foreignKey: 'hospital_id', as: 'staff' });
  User.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

  // Hospital ↔ Patient
  Hospital.hasMany(Patient, { foreignKey: 'hospital_id', as: 'patients' });
  Patient.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

  // Appointment
  Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
  Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'doctorAppointments' });
  Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

  // Token
  Appointment.hasOne(Token, { foreignKey: 'appointment_id', as: 'token' });
  Token.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

  // Vitals
  Appointment.hasOne(Vitals, { foreignKey: 'appointment_id', as: 'vitals' });
  Vitals.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
  Patient.hasMany(Vitals, { foreignKey: 'patient_id', as: 'vitals' });
  Vitals.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(Vitals, { foreignKey: 'recorded_by', as: 'recordedVitals' });
  Vitals.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });

  // Consultation
  Appointment.hasOne(Consultation, { foreignKey: 'appointment_id', as: 'consultation' });
  Consultation.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
  Patient.hasMany(Consultation, { foreignKey: 'patient_id', as: 'consultations' });
  Consultation.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(Consultation, { foreignKey: 'doctor_id', as: 'doctorConsultations' });
  Consultation.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

  // Prescription
  Consultation.hasOne(Prescription, { foreignKey: 'consultation_id', as: 'prescription' });
  Prescription.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
  Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
  Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(Prescription, { foreignKey: 'doctor_id', as: 'doctorPrescriptions' });
  Prescription.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

  // PrescriptionMedicine
  Prescription.hasMany(PrescriptionMedicine, { foreignKey: 'prescription_id', as: 'medicines' });
  PrescriptionMedicine.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

  // PharmacyOrder
  Prescription.hasOne(PharmacyOrder, { foreignKey: 'prescription_id', as: 'pharmacyOrder' });
  PharmacyOrder.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });
  Patient.hasMany(PharmacyOrder, { foreignKey: 'patient_id', as: 'pharmacyOrders' });
  PharmacyOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(PharmacyOrder, { foreignKey: 'pharmacist_id', as: 'pharmacistOrders' });
  PharmacyOrder.belongsTo(User, { foreignKey: 'pharmacist_id', as: 'pharmacist' });

  // Report
  Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
  Report.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  User.hasMany(Report, { foreignKey: 'uploaded_by', as: 'uploadedReports' });
  Report.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploadedBy' });

  // LabTest
  Patient.hasMany(LabTest, { foreignKey: 'patient_id', as: 'labTests' });
  LabTest.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Consultation.hasMany(LabTest, { foreignKey: 'consultation_id', as: 'labTests' });
  LabTest.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

  // Payment
  Patient.hasMany(Payment, { foreignKey: 'patient_id', as: 'payments' });
  Payment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // Notification
  User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // AuditLog
  User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  const models = {
    Hospital, Department, User, Patient, Appointment, Token, Vitals,
    Consultation, Prescription, PrescriptionMedicine, PharmacyOrder,
    MedicineInventory, Report, LabTest, Payment, Notification, AuditLog,
    sequelize,
  };

  modelCache.set(sequelize, models);
  return models;
}

module.exports = { createModels };
