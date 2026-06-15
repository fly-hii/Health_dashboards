require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Vitals = require('../models/Vitals');
const Notification = require('../models/Notification');

const departments = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'Emergency', 'Gynecology', 'Dermatology'];

const patientNames = [
  'Ramesh Kumar', 'Sunita Devi', 'Anil Singh', 'Pooja Sharma', 'Vikram Patel',
  'Kavita Mehta', 'Suresh Gupta', 'Anita Joshi', 'Rajesh Verma', 'Priya Nair',
  'Mohan Das', 'Rekha Pillai', 'Arjun Reddy', 'Meena Krishnan', 'Deepak Yadav',
];

const symptoms = [
  'Fever and headache', 'Chest pain and breathlessness', 'Knee pain and swelling',
  'Abdominal pain and nausea', 'Dizziness and fatigue', 'Skin rash and itching',
  'Back pain', 'Cough and cold', 'High blood pressure', 'Diabetes check-up',
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Vitals.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Nurse
    const nurse = await User.create({
      name: 'Nurse Angel',
      email: 'nurse@hospital.com',
      password: 'nurse123',
      phone: '+91 98765 43210',
      role: 'nurse',
      department: 'General Medicine',
      employeeId: 'N-2024-001',
    });
    console.log('👩‍⚕️ Nurse created:', nurse.email);

    // Create Doctors
    const doctors = await User.insertMany([
      { name: 'Dr. Rohit Mehta', email: 'rohit@hospital.com', password: 'doctor123', role: 'doctor', department: 'General Medicine', employeeId: 'D-2024-001', phone: '+91 98765 11111' },
      { name: 'Dr. Priya Kapoor', email: 'priya@hospital.com', password: 'doctor123', role: 'doctor', department: 'Cardiology', employeeId: 'D-2024-002', phone: '+91 98765 22222' },
      { name: 'Dr. Amit Shah', email: 'amit@hospital.com', password: 'doctor123', role: 'doctor', department: 'Orthopedics', employeeId: 'D-2024-003', phone: '+91 98765 33333' },
      { name: 'Dr. Neha Gupta', email: 'neha@hospital.com', password: 'doctor123', role: 'doctor', department: 'Pediatrics', employeeId: 'D-2024-004', phone: '+91 98765 44444' },
      { name: 'Dr. Vivek Singh', email: 'vivek@hospital.com', password: 'doctor123', role: 'doctor', department: 'Neurology', employeeId: 'D-2024-005', phone: '+91 98765 55555' },
    ]);
    console.log('👨‍⚕️ Doctors created:', doctors.length);

    // Create Patients
    const patients = [];
    for (let i = 0; i < patientNames.length; i++) {
      const gender = i % 3 === 0 ? 'Female' : 'Male';
      const age = 18 + Math.floor(Math.random() * 65);
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-'];
      const allergiesList = ['Penicillin', 'Aspirin', 'Sulfa drugs', 'Latex', 'None'];
      const diseases = ['Diabetes', 'Hypertension', 'Asthma', 'Arthritis', 'None'];

      const patient = await Patient.create({
        name: patientNames[i],
        age,
        gender,
        phone: `+91 9876${String(i).padStart(6, '0')}`,
        email: `patient${i + 1}@example.com`,
        bloodGroup: bloodGroups[i % bloodGroups.length],
        allergies: [allergiesList[i % allergiesList.length]].filter(a => a !== 'None'),
        chronicDiseases: [diseases[i % diseases.length]].filter(d => d !== 'None'),
        address: `${100 + i}, MG Road, Jaipur, Rajasthan - 302001`,
        emergencyContact: { name: `Contact ${i + 1}`, phone: `+91 9876000${i}`, relation: 'Spouse' },
        registeredBy: nurse._id,
      });
      patients.push(patient);
    }
    console.log('🏥 Patients created:', patients.length);

    // Create Appointments for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statuses = ['checked_in', 'waiting_for_vitals', 'vitals_done', 'consultation_done', 'with_doctor'];
    const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'];

    const appointments = [];
    for (let i = 0; i < patients.length; i++) {
      const doctor = doctors[i % doctors.length];
      const status = statuses[i % statuses.length];
      const isEmergency = i % 5 === 0;
      const priorities = ['low', 'medium', 'high', 'critical'];

      const appt = await Appointment.create({
        patient: patients[i]._id,
        doctor: doctor._id,
        department: doctor.department,
        appointmentDate: new Date(today),
        appointmentTime: timeSlots[i % timeSlots.length],
        status,
        isEmergency,
        emergencyPriority: isEmergency ? priorities[i % priorities.length] : 'low',
        symptoms: symptoms[i % symptoms.length],
        notes: 'Patient checked in at reception.',
        checkedInBy: nurse._id,
      });
      appointments.push(appt);

      // Record vitals for done ones
      if (['vitals_done', 'consultation_done', 'with_doctor'].includes(status)) {
        const vitals = await Vitals.create({
          patient: patients[i]._id,
          appointment: appt._id,
          recordedBy: nurse._id,
          bloodPressure: { systolic: 110 + Math.floor(Math.random() * 40), diastolic: 70 + Math.floor(Math.random() * 20) },
          temperature: 97 + Math.random() * 4,
          pulseRate: 65 + Math.floor(Math.random() * 35),
          respiratoryRate: 14 + Math.floor(Math.random() * 6),
          spo2: 94 + Math.floor(Math.random() * 6),
          weight: 50 + Math.floor(Math.random() * 50),
          height: 155 + Math.floor(Math.random() * 30),
          bloodSugar: 80 + Math.floor(Math.random() * 120),
          symptoms: symptoms[i % symptoms.length],
          notes: 'Patient appears stable.',
        });

        await Appointment.findByIdAndUpdate(appt._id, { vitals: vitals._id });
      }
    }
    console.log('📅 Appointments created:', appointments.length);

    // Create Notifications for nurse
    const notifTypes = ['new_appointment', 'emergency_alert', 'doctor_request', 'patient_waiting'];
    const notifMessages = [
      { title: 'New Appointment Booked', message: 'Ramesh Kumar has a new appointment at 10:00 AM with Dr. Rohit Mehta.' },
      { title: 'Emergency Alert!', message: 'Critical patient Vikram Patel needs immediate attention.' },
      { title: 'Doctor Request', message: 'Dr. Priya Kapoor requests vitals for patient Sunita Devi.' },
      { title: 'Patient Waiting', message: 'Token A-103 has been waiting for 20+ minutes.' },
      { title: 'Vitals Required', message: 'Patient Anil Singh is ready for vitals recording.' },
    ];

    for (let i = 0; i < 5; i++) {
      await Notification.create({
        recipient: nurse._id,
        type: notifTypes[i % notifTypes.length],
        title: notifMessages[i].title,
        message: notifMessages[i].message,
        relatedPatient: patients[i]._id,
        relatedAppointment: appointments[i]._id,
        priority: i === 1 ? 'critical' : i === 3 ? 'medium' : 'low',
        isRead: i > 2,
      });
    }
    console.log('🔔 Notifications created: 5');

    console.log('\n✅ Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Login Credentials:');
    console.log('   Email:    nurse@hospital.com');
    console.log('   Password: nurse123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
