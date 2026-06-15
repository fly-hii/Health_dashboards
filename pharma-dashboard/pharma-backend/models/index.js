// Pharma backend models - shared hospitals_db schema
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Shared tables
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  email: { type: DataTypes.STRING(200), unique: true },
  password: DataTypes.STRING(255),
  role: DataTypes.STRING(50),
  status: DataTypes.ENUM('Active','Inactive'),
  phone: DataTypes.STRING(20),
  profile_image: DataTypes.TEXT,
  employee_id: DataTypes.STRING(50),
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
  status: DataTypes.STRING(50),
}, { tableName: 'patients', timestamps: true, underscored: true });

const Prescription = sequelize.define('Prescription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  consultation_id: DataTypes.INTEGER,
  appointment_id: DataTypes.INTEGER,
  diagnosis: DataTypes.TEXT,
  instructions: DataTypes.TEXT,
  status: DataTypes.ENUM('Active','Completed','Cancelled'),
  valid_until: DataTypes.DATEONLY,
}, { tableName: 'prescriptions', timestamps: true, underscored: true });

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

const PharmacyOrder = sequelize.define('PharmacyOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  prescription_id: DataTypes.INTEGER,
  patient_id: DataTypes.INTEGER,
  pharmacist_id: DataTypes.INTEGER,
  status: DataTypes.ENUM('Pending','Processing','Ready','Delivered','Cancelled'),
  total_amount: DataTypes.DECIMAL(10,2),
  payment_status: DataTypes.ENUM('Unpaid','Paid','Partial'),
  notes: DataTypes.TEXT,
  processed_at: DataTypes.DATE,
  delivered_at: DataTypes.DATE,
}, { tableName: 'pharmacy_orders', timestamps: true, underscored: true });

// Pharma-specific: Medicine Inventory
const MedicineInventory = sequelize.define('MedicineInventory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hospital_id: DataTypes.INTEGER,
  name: DataTypes.STRING(200),
  generic_name: DataTypes.STRING(200),
  category: DataTypes.STRING(100),
  manufacturer: DataTypes.STRING(200),
  batch_number: DataTypes.STRING(100),
  expiry_date: DataTypes.DATEONLY,
  unit: DataTypes.STRING(50),
  quantity_in_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  reorder_level: { type: DataTypes.INTEGER, defaultValue: 10 },
  unit_price: DataTypes.DECIMAL(10,2),
  location: DataTypes.STRING(100),
  status: {
    type: DataTypes.ENUM('In Stock','Low Stock','Out of Stock','Expired'),
    defaultValue: 'In Stock',
  },
  description: DataTypes.TEXT,
}, { tableName: 'medicine_inventory', timestamps: true, underscored: true });

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
Prescription.hasMany(PrescriptionMedicine, { foreignKey: 'prescription_id', as: 'medicines' });
PrescriptionMedicine.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });
PharmacyOrder.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });
PharmacyOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
PharmacyOrder.belongsTo(User, { foreignKey: 'pharmacist_id', as: 'pharmacist' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Prescription.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });

module.exports = { User, Patient, Prescription, PrescriptionMedicine, PharmacyOrder, MedicineInventory, Notification };
