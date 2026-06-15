/**
 * Notification Seeder
 * Run: node seeds/notificationSeeder.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard';

const samples = [
  { title: 'New Patient Registered', message: 'A new patient Ramesh Kumar has been successfully registered in the system.', type: 'patient', priority: 'medium', module: 'Patients', status: 'unread', metadata: { patientName: 'Ramesh Kumar', patientAge: '45', patientGender: 'Male', patientPhone: '9876543210', registrationId: 'PAT20250515001' } },
  { title: 'New Appointment Booked', message: 'Priya Sharma booked an appointment with Dr. Rohit Mehta for OPD consultation.', type: 'appointment', priority: 'medium', module: 'Appointments', status: 'unread', metadata: { patientName: 'Priya Sharma', doctorName: 'Dr. Rohit Mehta', department: 'OPD' } },
  { title: 'Low Stock Alert', message: 'Paracetamol 500mg stock is running low. Current stock: 28 units remaining.', type: 'pharmacy', priority: 'high', module: 'Pharmacy', status: 'unread', metadata: { medicineName: 'Paracetamol 500mg', stockLevel: '28' } },
  { title: 'Lab Report Completed', message: 'Blood Test report for Amit Singh is ready and available for download.', type: 'laboratory', priority: 'low', module: 'Laboratory', status: 'read', metadata: { patientName: 'Amit Singh', testName: 'Blood Test' } },
  { title: 'Payment Received', message: 'Payment of ₹2,500 received from Neha Gupta for consultation services.', type: 'billing', priority: 'low', module: 'Billing', status: 'read', metadata: { patientName: 'Neha Gupta', amount: '₹2,500' } },
  { title: 'Patient Admitted', message: 'Vikram Patel has been admitted to Room 205 in the IPD ward.', type: 'patient', priority: 'high', module: 'Patients', status: 'unread', metadata: { patientName: 'Vikram Patel', registrationId: 'PAT20250514098' } },
  { title: 'Prescription Generated', message: 'Dr. Anjali Verma generated a prescription for Pooja Sharma.', type: 'pharmacy', priority: 'medium', module: 'Pharmacy', status: 'unread', metadata: { patientName: 'Pooja Sharma', doctorName: 'Dr. Anjali Verma' } },
  { title: 'New Doctor Joined', message: 'Dr. Amit Verma has successfully joined the hospital as Cardiologist.', type: 'doctor', priority: 'medium', module: 'Doctors', status: 'read', metadata: { doctorName: 'Dr. Amit Verma', department: 'Cardiology' } },
  { title: 'Critical Stock Alert', message: 'Insulin injection stock critically low — only 5 units left. Immediate reorder required.', type: 'pharmacy', priority: 'critical', module: 'Pharmacy', status: 'unread', isImportant: true, metadata: { medicineName: 'Insulin Injection', stockLevel: '5' } },
  { title: 'System Maintenance Scheduled', message: 'Planned system maintenance on Sunday 2:00 AM - 4:00 AM. Save all work before then.', type: 'system', priority: 'high', module: 'System', status: 'unread', isImportant: true },
  { title: 'Lab Test Ordered', message: 'MRI Scan ordered for patient Sunita Devi by Dr. Suresh Patel.', type: 'laboratory', priority: 'medium', module: 'Laboratory', status: 'unread', metadata: { patientName: 'Sunita Devi', testName: 'MRI Scan', doctorName: 'Dr. Suresh Patel' } },
  { title: 'Appointment Cancelled', message: 'Rajesh Mehta cancelled his appointment scheduled for today at 3:00 PM.', type: 'appointment', priority: 'low', module: 'Appointments', status: 'read', metadata: { patientName: 'Rajesh Mehta' } },
  { title: 'Invoice Generated', message: 'Invoice #INV-2025-0892 of ₹8,500 generated for patient Kiran Bose.', type: 'billing', priority: 'medium', module: 'Billing', status: 'unread', metadata: { patientName: 'Kiran Bose', amount: '₹8,500' } },
  { title: 'Nurse Shift Updated', message: 'Night shift assigned to Nurse Priya Patil for Ward B effective from tonight.', type: 'nurse', priority: 'low', module: 'Nurses', status: 'resolved' },
  { title: 'Patient Discharged', message: 'Patient Anita Sharma has been successfully discharged from Room 112 after recovery.', type: 'patient', priority: 'low', module: 'Patients', status: 'resolved', metadata: { patientName: 'Anita Sharma', registrationId: 'PAT20250510045' } },
  { title: 'Unauthorized Access Attempt', message: 'Multiple failed login attempts detected from IP 192.168.1.105. Account temporarily locked.', type: 'system', priority: 'critical', module: 'System', status: 'unread', isImportant: true },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  await Notification.deleteMany({});
  console.log('Cleared old notifications');
  // Create with varying timestamps
  for (let i = 0; i < samples.length; i++) {
    const d = new Date();
    d.setHours(d.getHours() - i);
    await Notification.create({ ...samples[i], createdAt: d, updatedAt: d });
  }
  console.log(`✅ Seeded ${samples.length} notifications`);
  await mongoose.disconnect();
}

seed().catch(console.error);
