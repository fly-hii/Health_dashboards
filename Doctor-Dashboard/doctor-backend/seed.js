import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Vitals from './models/Vitals.js';
import DoctorDashboardStats from './models/DoctorDashboardStats.js';

dotenv.config();

const seedDoctor = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard');
    console.log('✅ MongoDB connected for seeding');

    // Clear old data
    await Appointment.deleteMany({});
    await Vitals.deleteMany({});
    await Patient.deleteMany({});
    await DoctorDashboardStats.deleteMany({});
    console.log('🧹 Cleared collections...');

    // Seed Dr. Arjun Mehta
    await User.deleteMany({ email: { $in: ['arjun@hospital.com', 'arjun.mehta@careplus.com'] } });
    console.log('🧹 Cleared old doctor accounts...');

    let doctor = await User.create({
      name: 'Dr. Arjun Mehta',
      fullName: 'Dr. Arjun Mehta',
      email: 'arjun.mehta@careplus.com',
      password: 'doctor123',
      phone: '9876543210',
      role: 'doctor',
      department: 'Cardiology',
      specialization: 'Cardiologist',
      qualification: 'MBBS, MD (Cardiology)',
      registrationNumber: 'Reg. No. RJ/MC/2012/4587',
      address: '123, Green Avenue, Jaipur, Rajasthan - 302001',
      employeeId: 'D-2025-001',
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
      profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        appointmentAlerts: true,
        darkMode: false,
        language: 'English'
      }
    });
    console.log('👨‍⚕️ Demo doctor created: arjun.mehta@careplus.com / doctor123');

    // Seed patients
    const patientsData = [
      { name: 'Ramesh Kumar', age: 45, gender: 'Male', phone: '9876543220', bloodGroup: 'O+', allergies: [], chronicDiseases: [] },
      { name: 'Sunita Devi', age: 38, gender: 'Female', phone: '9876543221', bloodGroup: 'A+', allergies: [], chronicDiseases: [] },
      { name: 'Amit Singh', age: 29, gender: 'Male', phone: '9876543222', bloodGroup: 'B+', allergies: [], chronicDiseases: [] },
      { name: 'Pooja Sharma', age: 32, gender: 'Female', phone: '9876543223', bloodGroup: 'AB+', allergies: [], chronicDiseases: [] },
      { name: 'Vikram Patel', age: 50, gender: 'Male', phone: '9876543224', bloodGroup: 'O-', allergies: [], chronicDiseases: [] },
    ];

    const patients = [];
    for (const data of patientsData) {
      let p = await Patient.findOne({ name: data.name });
      if (!p) {
        p = new Patient(data);
        await p.save();
      }
      patients.push(p);
    }
    console.log(`👤 Seeded ${patients.length} patients`);

    // Seed Appointments matching table
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentsData = [
      {
        patient: patients[0]._id,
        patientId: patients[0]._id.toString(),
        doctor: doctor._id,
        doctorId: doctor._id.toString(),
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '09:30 AM',
        status: 'in_progress',
        type: 'consultation',
        symptoms: 'Mild chest pain on exertion'
      },
      {
        patient: patients[1]._id,
        patientId: patients[1]._id.toString(),
        doctor: doctor._id,
        doctorId: doctor._id.toString(),
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '10:00 AM',
        status: 'waiting',
        type: 'consultation',
        symptoms: 'Routine checkup for hypertension'
      },
      {
        patient: patients[2]._id,
        patientId: patients[2]._id.toString(),
        doctor: doctor._id,
        doctorId: doctor._id.toString(),
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '10:30 AM',
        status: 'waiting',
        type: 'consultation',
        symptoms: 'Shortness of breath'
      },
      {
        patient: patients[3]._id,
        patientId: patients[3]._id.toString(),
        doctor: doctor._id,
        doctorId: doctor._id.toString(),
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '11:00 AM',
        status: 'waiting',
        type: 'follow-up',
        symptoms: 'Review ECG reports'
      },
      {
        patient: patients[4]._id,
        patientId: patients[4]._id.toString(),
        doctor: doctor._id,
        doctorId: doctor._id.toString(),
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '11:30 AM',
        status: 'waiting',
        type: 'consultation',
        symptoms: 'Palpitations and dizziness'
      }
    ];

    for (const appt of appointmentsData) {
      const newAppt = new Appointment(appt);
      await newAppt.save();
    }
    console.log(`📅 Seeded ${appointmentsData.length} appointments for today`);

    // Seed DoctorDashboardStats
    const stats = await DoctorDashboardStats.create({
      doctorId: doctor._id.toString(),
      patientsInQueue: 12,
      todayConsultations: 18,
      completedToday: 15,
      followUps: 5,
      completedCount: 73,
      pendingCount: 16,
      cancelledCount: 9
    });
    console.log('📊 Seeded DoctorDashboardStats:', stats);

    console.log('\n✅ Doctor Dashboard Seeded Successfully!');
    console.log('   Email: arjun@hospital.com / doctor123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDoctor();
