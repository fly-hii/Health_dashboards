import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Models
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Appointment from './models/Appointment.js';
import Token from './models/Token.js';
import Prescription from './models/Prescription.js';
import History from './models/History.js';
import Report from './models/Report.js';
import Notification from './models/Notification.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const seedDB = async () => {
  try {
    // 1. Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard');
    console.log('✅ MongoDB connected for seeding...');

    // 2. Read db.json
    const rawData = await fs.readFile(DB_PATH, 'utf-8');
    const dbData = JSON.parse(rawData);

    // 3. Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    await Token.deleteMany({});
    await Prescription.deleteMany({});
    await History.deleteMany({});
    await Report.deleteMany({});
    await Notification.deleteMany({});
    console.log('🧹 Cleared all collections...');

    // 4. Seed Patient User
    const profile = dbData.profile || {};
    const patientUser = await User.create({
      fullName: profile.fullName || 'Aravind Bontha',
      email: profile.email || 'aravindbontha563@gmail.com',
      password: 'patient123', // Will be hashed automatically by pre-save hook
      dob: profile.dob || '1992-08-15',
      gender: profile.gender || 'Male',
      mobile: profile.mobile || '07032338115',
      address: profile.address || 'Sivani college of engineering Chilakapalem',
      bloodGroup: profile.bloodGroup || 'O+',
      profileImage: profile.profileImage || '',
      role: 'patient'
    });
    console.log(`👤 Created patient User: ${patientUser.email}`);

    // 5. Seed Doctors
    if (dbData.doctors && dbData.doctors.length > 0) {
      const doctorsToInsert = dbData.doctors.map(doc => ({
        docId: doc.id,
        name: doc.name,
        department: doc.department,
        experience: doc.experience,
        rating: doc.rating,
        avatar: doc.avatar,
        availability: doc.availability
      }));
      await Doctor.insertMany(doctorsToInsert);
      console.log(`🏥 Seeded ${doctorsToInsert.length} Doctors...`);
    }

    // 6. Seed Appointments
    if (dbData.appointments && dbData.appointments.length > 0) {
      const appointmentsToInsert = dbData.appointments.map(appt => ({
        apptId: appt.id,
        patient: patientUser._id,
        doctor: appt.doctor,
        department: appt.department,
        dateTime: appt.dateTime,
        status: appt.status
      }));
      await Appointment.insertMany(appointmentsToInsert);
      console.log(`📅 Seeded ${appointmentsToInsert.length} Appointments...`);
    }

    // 7. Seed Tokens
    // 7.a Current Token
    if (dbData.token) {
      await Token.create({
        patient: patientUser._id,
        number: dbData.token.number,
        department: dbData.token.department,
        estimatedWaitMinutes: dbData.token.estimatedWaitMinutes,
        peopleAhead: dbData.token.peopleAhead,
        status: dbData.token.status,
        appointmentTime: dbData.token.appointmentTime,
        doctor: dbData.token.doctor,
        isCompleted: false
      });
      console.log(`🎟️ Seeded Current Active Token...`);
    }

    // 7.b Past Tokens
    if (dbData.pastTokens && dbData.pastTokens.length > 0) {
      const pastTokensToInsert = dbData.pastTokens.map(tok => ({
        patient: patientUser._id,
        number: tok.number,
        department: tok.department,
        estimatedWaitMinutes: 0,
        peopleAhead: 0,
        status: tok.status,
        doctor: tok.doctor,
        date: tok.date,
        isCompleted: true
      }));
      await Token.insertMany(pastTokensToInsert);
      console.log(`🎟️ Seeded ${pastTokensToInsert.length} Past Tokens...`);
    }

    // 8. Seed Prescriptions
    if (dbData.prescriptions && dbData.prescriptions.length > 0) {
      const prescriptionsToInsert = dbData.prescriptions.map(presc => ({
        prescId: presc.id,
        patient: patientUser._id,
        doctor: presc.doctor,
        date: presc.date,
        medicines: presc.medicines,
        medicineCount: presc.medicines.length
      }));
      await Prescription.insertMany(prescriptionsToInsert);
      console.log(`💊 Seeded ${prescriptionsToInsert.length} Prescriptions...`);
    }

    // 9. Seed Medical History
    if (dbData.history && dbData.history.length > 0) {
      const historyToInsert = dbData.history.map(hist => ({
        patient: patientUser._id,
        date: hist.date,
        doctor: hist.doctor,
        department: hist.department,
        diagnosis: hist.diagnosis,
        notes: hist.notes
      }));
      await History.insertMany(historyToInsert);
      console.log(`📋 Seeded ${historyToInsert.length} History records...`);
    }

    // 10. Seed Reports
    if (dbData.reports && dbData.reports.length > 0) {
      const reportsToInsert = dbData.reports.map(rep => ({
        repId: rep.id,
        patient: patientUser._id,
        name: rep.name,
        date: rep.date,
        size: rep.size,
        category: rep.category
      }));
      await Report.insertMany(reportsToInsert);
      console.log(`📑 Seeded ${reportsToInsert.length} Reports...`);
    }

    // 11. Seed Notifications
    if (dbData.notifications && dbData.notifications.length > 0) {
      const notificationsToInsert = dbData.notifications.map(notif => ({
        notifId: notif.id,
        patient: patientUser._id,
        message: notif.message,
        time: notif.time,
        type: notif.type,
        read: notif.read
      }));
      await Notification.insertMany(notificationsToInsert);
      console.log(`🔔 Seeded ${notificationsToInsert.length} Notifications...`);
    }

    console.log('✅ Seeding completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
