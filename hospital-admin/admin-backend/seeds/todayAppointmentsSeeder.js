/**
 * Today's Appointments Seeder
 * Seeds 5 new patient appointments for today with sequential token numbers.
 * Run with: node seeds/todayAppointmentsSeeder.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const seedTodayAppointments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard');
    console.log('MongoDB connected...');

    // Fetch existing patients and doctors from DB
    const patients = await Patient.find({ status: 'active' }).limit(8);
    if (patients.length < 5) {
      console.error('Not enough active patients found. Please run the main seeder first.');
      process.exit(1);
    }

    const doctors = await User.find({ role: 'DOCTOR' }).limit(5);
    if (doctors.length < 1) {
      console.error('No doctor users found. Please run the main seeder first.');
      process.exit(1);
    }

    // Today's date boundaries
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Count existing tokens for today to continue the sequence
    const existingTodayCount = await Appointment.countDocuments({
      dateTime: { $gte: startOfDay, $lte: endOfDay }
    });
    console.log(`Found ${existingTodayCount} existing appointments for today. Starting token from ${existingTodayCount + 1}.`);

    // Helper to build a today's datetime at a given hour:minute
    const todayAt = (hour, minute = 0) => {
      const d = new Date(today);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    const appointmentsData = [
      {
        patient: patients[0]._id,
        doctor: doctors[0]._id,
        department: 'OPD',
        dateTime: todayAt(9, 0),
        tokenNumber: existingTodayCount + 1,
        status: 'Confirmed',
        reason: 'Chest pain and breathlessness follow-up',
        notes: 'Patient has history of mild hypertension. ECG suggested.'
      },
      {
        patient: patients[1]._id,
        doctor: doctors[1 % doctors.length]._id,
        department: 'OPD',
        dateTime: todayAt(10, 0),
        tokenNumber: existingTodayCount + 2,
        status: 'Confirmed',
        reason: 'Recurring headaches and dizziness',
        notes: 'Neurology referral recommended.'
      },
      {
        patient: patients[2]._id,
        doctor: doctors[2 % doctors.length]._id,
        department: 'OPD',
        dateTime: todayAt(11, 0),
        tokenNumber: existingTodayCount + 3,
        status: 'Pending',
        reason: 'Knee pain post exercise',
        notes: 'X-ray may be required. Patient is physically active.'
      },
      {
        patient: patients[3]._id,
        doctor: doctors[3 % doctors.length]._id,
        department: 'OPD',
        dateTime: todayAt(12, 0),
        tokenNumber: existingTodayCount + 4,
        status: 'Pending',
        reason: 'Annual general health checkup',
        notes: 'Routine blood panel ordered.'
      },
      {
        patient: patients[4]._id,
        doctor: doctors[4 % doctors.length]._id,
        department: 'OPD',
        dateTime: todayAt(14, 0),
        tokenNumber: existingTodayCount + 5,
        status: 'Confirmed',
        reason: 'Skin rash and allergic reaction',
        notes: 'Possible drug allergy. Allergy history to be reviewed.'
      }
    ];

    const seeded = await Appointment.insertMany(appointmentsData);
    console.log(`\n✅ Successfully seeded ${seeded.length} appointments for today (${today.toDateString()}):`);
    console.log('─────────────────────────────────────────────────');

    // Populate and display for confirmation
    const populated = await Appointment.find({
      _id: { $in: seeded.map(a => a._id) }
    })
      .populate('patient', 'fullName phone')
      .populate('doctor', 'name specialization');

    populated.forEach(appt => {
      console.log(
        `  Token #${appt.tokenNumber}  |  ${appt.patient?.fullName || 'Unknown'}  |  ` +
        `${appt.doctor?.name || 'Unknown'}  |  ` +
        `${appt.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  |  ${appt.status}`
      );
    });

    console.log('─────────────────────────────────────────────────\n');
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seedTodayAppointments();
