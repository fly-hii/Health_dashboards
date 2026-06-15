const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load models
const Department = require('./models/Department');
const Role = require('./models/Role');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const Inventory = require('./models/Inventory');
const PharmacyOrder = require('./models/PharmacyOrder');
const LabTest = require('./models/LabTest');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const Prescription = require('./models/Prescription');
const PatientReport = require('./models/PatientReport');
const Vitals = require('./models/Vitals');

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/patient_dashboard');
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await Department.deleteMany();
    await Role.deleteMany();
    await User.deleteMany();
    await Doctor.deleteMany();
    await Patient.deleteMany();
    await Appointment.deleteMany();
    await Inventory.deleteMany();
    await PharmacyOrder.deleteMany();
    await LabTest.deleteMany();
    await Payment.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();
    await Prescription.deleteMany();
    await PatientReport.deleteMany();
    await Vitals.deleteMany();

    console.log('All existing collections cleared.');

    // 1. Seed Departments
    const departments = await Department.insertMany([
      { name: 'Outpatient Department', code: 'OPD', description: 'General outpatient services', status: 'Active' },
      { name: 'Inpatient Department', code: 'IPD', description: 'Inpatient admissions and wards', status: 'Active' },
      { name: 'Pharmacy Department', code: 'PHARMACY', description: 'Medicine stock and sales', status: 'Active' },
      { name: 'Laboratory Department', code: 'LABORATORY', description: 'Diagnostic testing', status: 'Active' },
      { name: 'Receptionist Desk', code: 'RECEPTION', description: 'Appointments and query handling', status: 'Active' },
      { name: 'General Ward / Surgery', code: 'OTHERS', description: 'Other hospital zones', status: 'Active' }
    ]);
    console.log('Departments seeded.');

    // 2. Seed Roles
    const roles = await Role.insertMany([
      { name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Full access to system controls and configurations' },
      { name: 'Admin', code: 'ADMIN', description: 'Standard administrative access' },
      { name: 'Receptionist', code: 'RECEPTIONIST', description: 'Manage appointments, check-ins, and invoices' },
      { name: 'Doctor', code: 'DOCTOR', description: 'Consultations, prescriptions, and diagnostics' },
      { name: 'Nurse', code: 'NURSE', description: 'Admissions, vitals tracking, shift assignments' },
      { name: 'Pharmacist', code: 'PHARMACIST', description: 'Pharmacy orders and inventory management' },
      { name: 'Lab Technician', code: 'LAB_TECHNICIAN', description: 'Laboratory testing and reports generation' }
    ]);
    console.log('Roles seeded.');

    // Hash Password for seeded users
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('admin123', salt);

    // 3. Seed Doctors
    const coreDoctors = [
      {
        employeeId: 'DOC1001',
        name: 'Dr. Rohit Mehta',
        email: 'rohit.mehta@careplus.com',
        phone: '9876543210',
        department: 'Cardiology',
        specialization: 'Cardiologist',
        qualification: 'MD, DM Cardiology',
        experience: 12,
        consultationFee: 800,
        licenseNumber: 'MC123456',
        workingHours: { start: '10:00', end: '18:00' },
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        status: 'active',
        bio: 'Experienced Cardiologist with expertise in Interventional Cardiology and Heart Failure Management.',
        profilePhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1002',
        name: 'Dr. Anjali Verma',
        email: 'anjali.verma@careplus.com',
        phone: '9876543211',
        department: 'Neurology',
        specialization: 'Neurologist',
        qualification: 'MD, DM Neurology',
        experience: 10,
        consultationFee: 900,
        licenseNumber: 'MC123457',
        workingHours: { start: '09:00', end: '17:00' },
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'active',
        bio: 'Specialist in stroke intervention, epilepsy, and neurodegenerative disorders.',
        profilePhoto: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1003',
        name: 'Dr. Vivek Singh',
        email: 'vivek.singh@careplus.com',
        phone: '9876543212',
        department: 'Orthopedics',
        specialization: 'Orthopedic Surgeon',
        qualification: 'MS, MCh Orthopedics',
        experience: 15,
        consultationFee: 1000,
        licenseNumber: 'MC123458',
        workingHours: { start: '10:00', end: '16:00' },
        availableDays: ['Mon', 'Wed', 'Fri'],
        status: 'active',
        bio: 'Expertise in joint replacements, ligament reconstruction, and complex trauma surgeries.',
        profilePhoto: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1004',
        name: 'Dr. Neha Kapoor',
        email: 'neha.kapoor@careplus.com',
        phone: '9876543213',
        department: 'Gynecology',
        specialization: 'Gynecologist',
        qualification: 'MD, DGO Obstetrics & Gynecology',
        experience: 9,
        consultationFee: 750,
        licenseNumber: 'MC123459',
        workingHours: { start: '11:00', end: '19:00' },
        availableDays: ['Tue', 'Thu', 'Sat'],
        status: 'On Leave',
        bio: 'Compassionate specialist in high-risk pregnancy management and gynecological laparoscopic surgeries.',
        profilePhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1005',
        name: 'Dr. Rajesh Sharma',
        email: 'rajesh.sharma@careplus.com',
        phone: '9876543214',
        department: 'General Medicine',
        specialization: 'Physician',
        qualification: 'MD Internal Medicine',
        experience: 11,
        consultationFee: 500,
        licenseNumber: 'MC123460',
        workingHours: { start: '08:00', end: '14:00' },
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        status: 'active',
        bio: 'Dedicated internist focused on primary care, chronic condition tracking, and wellness.',
        profilePhoto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1006',
        name: 'Dr. Pooja Patel',
        email: 'pooja.patel@careplus.com',
        phone: '9876543215',
        department: 'Pediatrics',
        specialization: 'Pediatrician',
        qualification: 'MD Pediatrics, DCH',
        experience: 8,
        consultationFee: 600,
        licenseNumber: 'MC123461',
        workingHours: { start: '09:00', end: '16:00' },
        availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
        status: 'active',
        bio: 'Specialist in newborn intensive care, childhood vaccinations, and developmental screening.',
        profilePhoto: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1007',
        name: 'Dr. Aditya Nair',
        email: 'aditya.nair@careplus.com',
        phone: '9876543216',
        department: 'Dermatology',
        specialization: 'Dermatologist',
        qualification: 'MD Dermatology',
        experience: 7,
        consultationFee: 700,
        licenseNumber: 'MC123462',
        workingHours: { start: '10:00', end: '17:00' },
        availableDays: ['Tue', 'Wed', 'Thu'],
        status: 'inactive',
        bio: 'Advanced clinical training in cosmetic skin treatments, acne scar therapies, and general dermatology.',
        profilePhoto: 'https://images.unsplash.com/photo-1637059824899-a441006a6875?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1008',
        name: 'Dr. Smita Joshi',
        email: 'smita.joshi@careplus.com',
        phone: '9876543217',
        department: 'ENT',
        specialization: 'ENT Specialist',
        qualification: 'MS ENT',
        experience: 6,
        consultationFee: 650,
        licenseNumber: 'MC123463',
        workingHours: { start: '12:00', end: '18:00' },
        availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
        status: 'active',
        bio: 'Providing comprehensive diagnosis and micro-surgical options for throat and inner ear problems.',
        profilePhoto: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1009',
        name: 'Dr. Karan Malhotra',
        email: 'karan.malhotra@careplus.com',
        phone: '9876543218',
        department: 'Ophthalmology',
        specialization: 'Ophthalmologist',
        qualification: 'MS Ophthalmology',
        experience: 13,
        consultationFee: 800,
        licenseNumber: 'MC123464',
        workingHours: { start: '09:00', end: '17:00' },
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status: 'active',
        bio: 'Expert in refractive surgeries, glaucoma screenings, and cataract lens implants.',
        profilePhoto: 'https://images.unsplash.com/photo-1612531388300-172551982e8c?auto=format&fit=crop&q=80&w=200'
      },
      {
        employeeId: 'DOC1010',
        name: 'Dr. Amit Verma',
        email: 'amit.verma@careplus.com',
        phone: '9876543219',
        department: 'Psychiatry',
        specialization: 'Psychiatrist',
        qualification: 'MD Psychiatry',
        experience: 9,
        consultationFee: 900,
        licenseNumber: 'MC123465',
        workingHours: { start: '10:00', end: '16:00' },
        availableDays: ['Tue', 'Thu', 'Sat'],
        status: 'On Leave',
        bio: 'Specialist in cognitive behavior therapies, depression treatments, and neuro-psychological assessments.',
        profilePhoto: 'https://images.unsplash.com/photo-1579684389782-64d84b5e905d?auto=format&fit=crop&q=80&w=200'
      }
    ];

    const extraDepts = [
      { name: 'Cardiology', spec: 'Cardiologist', qual: 'MD, DM Cardiology' },
      { name: 'Neurology', spec: 'Neurologist', qual: 'MD, DM Neurology' },
      { name: 'Orthopedics', spec: 'Orthopedic Surgeon', qual: 'MS, MCh Orthopedics' },
      { name: 'Gynecology', spec: 'Gynecologist', qual: 'MD, DGO Obstetrics & Gynecology' },
      { name: 'General Medicine', spec: 'Physician', qual: 'MD Internal Medicine' },
      { name: 'Pediatrics', spec: 'Pediatrician', qual: 'MD Pediatrics' },
      { name: 'Dermatology', spec: 'Dermatologist', qual: 'MD Dermatology' },
      { name: 'ENT', spec: 'ENT Specialist', qual: 'MS ENT' },
      { name: 'Ophthalmology', spec: 'Ophthalmologist', qual: 'MS Ophthalmology' },
      { name: 'Psychiatry', spec: 'Psychiatrist', qual: 'MD Psychiatry' },
      { name: 'Urology', spec: 'Urologist', qual: 'MCh Urology' },
      { name: 'Oncology', spec: 'Oncologist', qual: 'MD Oncology' }
    ];

    const firstNames = ['Suresh', 'Deepak', 'Sanjay', 'Vijay', 'Arun', 'Rohan', 'Neeraj', 'Geeta', 'Sunita', 'Kiran', 'Nisha', 'Aarti', 'Anil', 'Alok', 'Manoj', 'Preeti', 'Swati', 'Meera', 'Ritu', 'Karan'];
    const lastNames = ['Menon', 'Joshi', 'Pillai', 'Rao', 'Nair', 'Mehta', 'Gupta', 'Patel', 'Reddy', 'Chawla', 'Bose', 'Dutta', 'Kumar', 'Singh', 'Sharma', 'Verma', 'Kapoor', 'Malhotra', 'Nair', 'Mehra'];

    const allDoctorsList = [...coreDoctors];

    let dummyActiveCount = 49;
    let dummyOnLeaveCount = 2;
    let dummyInactiveCount = 1;

    for (let i = 0; i < 52; i++) {
      const empIdNum = 1011 + i;
      const empId = `DOC${empIdNum}`;
      const fName = firstNames[i % firstNames.length];
      const lName = lastNames[i % lastNames.length];
      const name = `Dr. ${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${empIdNum}@careplus.com`;
      const phone = `98765${String(10000 + i).slice(1)}`;
      
      const deptConfig = extraDepts[i % extraDepts.length];
      
      let status = 'active';
      if (dummyOnLeaveCount > 0) {
        status = 'On Leave';
        dummyOnLeaveCount--;
      } else if (dummyInactiveCount > 0) {
        status = 'inactive';
        dummyInactiveCount--;
      } else {
        dummyActiveCount--;
      }

      allDoctorsList.push({
        employeeId: empId,
        name,
        email,
        phone,
        department: deptConfig.name,
        specialization: deptConfig.spec,
        qualification: deptConfig.qual,
        experience: 5 + (i % 15),
        consultationFee: 400 + ((i % 7) * 100),
        licenseNumber: `MC${123466 + i}`,
        workingHours: { start: '09:00', end: '17:00' },
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        status,
        bio: `Specialist physician in ${deptConfig.name} department with dedicated patient services.`,
        profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fName}${i}`
      });
    }

    const seededDoctors = await Doctor.insertMany(allDoctorsList);
    console.log(`Seeded ${seededDoctors.length} doctors.`);

    const doctorUsers = seededDoctors.map(doc => {
      let userStatus = 'Active';
      let userAvail = 'Available';
      if (doc.status === 'inactive') {
        userStatus = 'Inactive';
        userAvail = 'Busy';
      } else if (doc.status === 'On Leave') {
        userStatus = 'Active';
        userAvail = 'On Leave';
      }

      return {
        _id: doc._id,
        name: doc.name,
        email: doc.email,
        password: defaultPassword,
        role: 'DOCTOR',
        department: 'OPD',
        phone: doc.phone,
        profileImage: doc.profilePhoto,
        employeeId: doc.employeeId,
        specialization: doc.specialization,
        experience: doc.experience,
        qualification: doc.qualification,
        availabilityStatus: userAvail,
        status: userStatus
      };
    });

    const otherUsers = [
      {
        name: 'Nurse John Miller',
        email: 'nurse@careplus.com',
        password: defaultPassword,
        role: 'NURSE',
        department: 'IPD',
        phone: '+1 555-0103',
        profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John',
        shift: 'Night',
        availabilityStatus: 'Available'
      },
      {
        name: 'Pharmacist Philip Carter',
        email: 'pharmacist@careplus.com',
        password: defaultPassword,
        role: 'PHARMACIST',
        department: 'PHARMACY',
        phone: '+1 555-0104',
        profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Philip'
      },
      {
        name: 'Technician Clara Oswald',
        email: 'lab@careplus.com',
        password: defaultPassword,
        role: 'LAB_TECHNICIAN',
        department: 'LABORATORY',
        phone: '+1 555-0105',
        profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Clara'
      },
      {
        name: 'Receptionist Rachel Green',
        email: 'reception@careplus.com',
        password: defaultPassword,
        role: 'RECEPTIONIST',
        department: 'RECEPTION',
        phone: '+1 555-0106',
        profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rachel'
      },
      {
        name: 'Super Admin James Smith',
        email: 'admin@careplus.com',
        password: defaultPassword,
        role: 'SUPER_ADMIN',
        department: 'OTHERS',
        phone: '+1 555-9999',
        profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=James'
      }
    ];

    const allUsersList = [...doctorUsers, ...otherUsers];
    const seededUsers = await User.insertMany(allUsersList);
    console.log('Users seeded.');

    const adminUser = seededUsers.find(u => u.role === 'SUPER_ADMIN');
    const doctorUser = seededUsers.find(u => u.role === 'DOCTOR');
    const techUser = seededUsers.find(u => u.role === 'LAB_TECHNICIAN');
    const pharmaUser = seededUsers.find(u => u.role === 'PHARMACIST');

    // 4. Seed Patients matching the exact names and details from UI design
    const seededPatients = await Patient.insertMany([
      {
        patientId: 'PAT20250515001',
        fullName: 'Ramesh Kumar',
        email: 'ramesh.kumar@email.com',
        phone: '9876543210',
        dob: new Date('1980-03-12'),
        gender: 'Male',
        bloodGroup: 'B+',
        address: '123, Green Park, Civil Lines, Jaipur, Rajasthan - 302001',
        emergencyContact: {
          name: 'Suresh Kumar',
          phone: '9876543211',
          relation: 'Brother'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
      },
      {
        patientId: 'PAT20250515002',
        fullName: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '8765432109',
        dob: new Date('1993-05-13'),
        gender: 'Female',
        bloodGroup: 'O+',
        address: '456, Gandhi Nagar, Jaipur, Rajasthan - 302015',
        emergencyContact: {
          name: 'Rajesh Sharma',
          phone: '8765432110',
          relation: 'Father'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
      },
      {
        patientId: 'PAT20250515003',
        fullName: 'Amit Singh',
        email: 'amit.singh@email.com',
        phone: '7054321098',
        dob: new Date('1987-05-13'),
        gender: 'Male',
        bloodGroup: 'A+',
        address: '789, Vaishali Nagar, Jaipur, Rajasthan - 302021',
        emergencyContact: {
          name: 'Suman Singh',
          phone: '7054321099',
          relation: 'Spouse'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      },
      {
        patientId: 'PAT20250515004',
        fullName: 'Neha Gupta',
        email: 'neha.gupta@email.com',
        phone: '6543210987',
        dob: new Date('1997-05-12'),
        gender: 'Female',
        bloodGroup: 'AB+',
        address: '101, Mansarovar, Jaipur, Rajasthan - 302020',
        emergencyContact: {
          name: 'Vikas Gupta',
          phone: '6543210988',
          relation: 'Brother'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        patientId: 'PAT20250515005',
        fullName: 'Vikram Patel',
        email: 'vikram.patel@email.com',
        phone: '5432109876',
        dob: new Date('1976-05-12'),
        gender: 'Male',
        bloodGroup: 'O-',
        address: '202, Malviya Nagar, Jaipur, Rajasthan - 302017',
        emergencyContact: {
          name: 'Meena Patel',
          phone: '5432109877',
          relation: 'Spouse'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        patientId: 'PAT20250515006',
        fullName: 'Suresh Sharma',
        email: 'suresh.sharma@email.com',
        phone: '8765432101',
        dob: new Date('1965-05-11'),
        gender: 'Male',
        bloodGroup: 'B-',
        address: '303, Pratap Nagar, Jaipur, Rajasthan - 302033',
        emergencyContact: {
          name: 'Karan Sharma',
          phone: '8765432102',
          relation: 'Son'
        },
        status: 'inactive',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        patientId: 'PAT20250515007',
        fullName: 'Anita Verma',
        email: 'anita.verma@email.com',
        phone: '7654321098',
        dob: new Date('1985-05-10'),
        gender: 'Female',
        bloodGroup: 'A-',
        address: '404, C-Scheme, Jaipur, Rajasthan - 302001',
        emergencyContact: {
          name: 'Rakesh Verma',
          phone: '7654321099',
          relation: 'Spouse'
        },
        status: 'active',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        patientId: 'PAT20250515008',
        fullName: 'Rahul Mehta',
        email: 'rahul.mehta@email.com',
        phone: '6543210987',
        dob: new Date('2014-05-09'), // Child (12 years old)
        gender: 'Male',
        bloodGroup: 'AB-',
        address: '505, Raja Park, Jaipur, Rajasthan - 302004',
        emergencyContact: {
          name: 'Sunil Mehta',
          phone: '6543210989',
          relation: 'Father'
        },
        status: 'active',
        createdAt: new Date()
      }
    ]);
    console.log('Patients seeded.');

    // 5. Seed Appointments
    const seededAppointments = await Appointment.insertMany([
      {
        patient: seededPatients[0]._id, // Ramesh
        doctor: doctorUser._id,
        department: 'OPD',
        dateTime: new Date('2025-05-15T10:30:00Z'),
        status: 'Completed',
        reason: 'Follow up consultation',
        notes: 'Cardiac parameters stabilizing. Check blood pressure daily.'
      },
      {
        patient: seededPatients[0]._id, // Ramesh
        doctor: doctorUser._id,
        department: 'OPD',
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // In 5 days
        status: 'Confirmed',
        reason: 'Monthly ECG Checkup',
        notes: 'Needs fasting prior to testing.'
      },
      {
        patient: seededPatients[1]._id, // Priya
        doctor: doctorUser._id,
        department: 'OPD',
        dateTime: new Date('2025-05-13T11:00:00Z'),
        status: 'Completed',
        reason: 'General checkup',
        notes: 'Complaining of fever and body pain.'
      },
      {
        patient: seededPatients[2]._id, // Amit
        doctor: seededUsers[1]._id, // Dr Marcus (Neurology)
        department: 'OPD',
        dateTime: new Date('2025-05-13T14:30:00Z'),
        status: 'Completed',
        reason: 'Migraine consultation',
        notes: 'Severe headaches reported twice a week.'
      }
    ]);
    console.log('Appointments seeded.');

    // 6. Seed Prescriptions
    await Prescription.insertMany([
      {
        patient: seededPatients[0]._id, // Ramesh
        doctor: doctorUser._id,
        appointment: seededAppointments[0]._id,
        date: new Date('2025-05-15T10:45:00Z'),
        diagnosis: 'Mild Hypertension & Stable Angina',
        medicines: [
          { name: 'Metoprolol 25mg', dosage: '1 tab', frequency: 'Daily (Morning)', duration: '30 Days', instructions: 'Take after meal' },
          { name: 'Aspirin 75mg', dosage: '1 tab', frequency: 'Daily (Night)', duration: '30 Days', instructions: 'Take after meal' }
        ],
        notes: 'Reduce salt intake. Low stress routine.',
        status: 'Active'
      },
      {
        patient: seededPatients[1]._id, // Priya
        doctor: doctorUser._id,
        appointment: seededAppointments[2]._id,
        date: new Date('2025-05-13T11:15:00Z'),
        diagnosis: 'Viral Fever',
        medicines: [
          { name: 'Paracetamol 500mg', dosage: '1 tab', frequency: 'Thrice daily', duration: '5 Days', instructions: 'SOS if temp > 100F' }
        ],
        notes: 'Stay hydrated.',
        status: 'Completed'
      }
    ]);
    console.log('Prescriptions seeded.');

    // 7. Seed Vitals
    await Vitals.insertMany([
      {
        patient: seededPatients[0]._id,
        bp: '128/82',
        pulse: 74,
        temperature: 98.4,
        spo2: 98,
        weight: 78,
        height: 175,
        recordedBy: adminUser._id,
        recordedAt: new Date('2025-05-15T10:15:00Z')
      },
      {
        patient: seededPatients[1]._id,
        bp: '118/76',
        pulse: 82,
        temperature: 101.2,
        spo2: 97,
        weight: 60,
        height: 162,
        recordedBy: adminUser._id,
        recordedAt: new Date('2025-05-13T10:45:00Z')
      }
    ]);
    console.log('Vitals seeded.');

    // 8. Seed PatientReports (Medical Documents)
    await PatientReport.insertMany([
      {
        patient: seededPatients[0]._id, // Ramesh
        title: 'Cardiac ECG Graph Report',
        category: 'Cardiology',
        date: new Date('2025-05-15T11:30:00Z'),
        doctor: 'Dr. Rohit Mehta',
        fileName: 'ecg_report_ramesh.pdf',
        filePath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: '1.2 MB',
        uploadedBy: adminUser._id
      },
      {
        patient: seededPatients[0]._id, // Ramesh
        title: 'Blood CBC Diagnostic Report',
        category: 'Lab Test',
        date: new Date('2025-05-14T09:15:00Z'),
        doctor: 'Technician Clara Oswald',
        fileName: 'cbc_blood_report.pdf',
        filePath: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: '840 KB',
        uploadedBy: adminUser._id
      }
    ]);
    console.log('Patient Reports seeded.');

    // 9. Seed Inventory Items (medicines)
    await Inventory.insertMany([
      { medicineName: 'Amoxicillin 500mg', category: 'Antibiotic', quantity: 150, unit: 'tablets', price: 15.5, minStockLevel: 25, batchNumber: 'AMX-901', expiryDate: new Date('2027-08-01') },
      { medicineName: 'Ibuprofen 400mg', category: 'Analgesic', quantity: 80, unit: 'tablets', price: 8.0, minStockLevel: 30, batchNumber: 'IBU-444', expiryDate: new Date('2028-01-01') },
      { medicineName: 'Metformin 850mg', category: 'Antidiabetic', quantity: 15, unit: 'tablets', price: 12.0, minStockLevel: 20, batchNumber: 'MET-772', expiryDate: new Date('2026-11-15') },
      { medicineName: 'Lipitor 20mg', category: 'Statin', quantity: 8, unit: 'tablets', price: 45.0, minStockLevel: 15, batchNumber: 'LIP-102', expiryDate: new Date('2027-03-30') },
      { medicineName: 'Panadol 500mg', category: 'Analgesic', quantity: 300, unit: 'tablets', price: 5.5, minStockLevel: 50, batchNumber: 'PAN-003', expiryDate: new Date('2028-12-01') }
    ]);
    console.log('Inventory seeded.');

    // 10. Seed Pharmacy Orders
    await PharmacyOrder.insertMany([
      {
        patient: seededPatients[0]._id,
        pharmacist: pharmaUser._id,
        items: [
          { name: 'Amoxicillin 500mg', quantity: 20, price: 15.5 },
          { name: 'Ibuprofen 400mg', quantity: 10, price: 8.0 }
        ],
        totalAmount: 390.0,
        status: 'Delivered',
        paymentStatus: 'Paid',
        orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        patient: seededPatients[1]._id,
        items: [
          { name: 'Metformin 850mg', quantity: 30, price: 12.0 }
        ],
        totalAmount: 360.0,
        status: 'Pending',
        paymentStatus: 'Unpaid',
        orderDate: new Date(Date.now())
      }
    ]);
    console.log('Pharmacy Orders seeded.');

    // 11. Seed Lab Tests
    await LabTest.insertMany([
      {
        patient: seededPatients[0]._id,
        testName: 'Complete Blood Count (CBC)',
        testDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'Completed',
        result: 'WBC: 6.2 x10^3/uL (Normal), RBC: 4.8 x10^6/uL (Normal), Hemoglobin: 14.1 g/dL (Normal)',
        technician: techUser._id,
        notes: 'All CBC parameters are within reference range.'
      },
      {
        patient: seededPatients[1]._id,
        testName: 'HbA1c Diabetes Profile',
        testDate: new Date(Date.now()),
        status: 'Pending',
        notes: 'Urgent check requested by Dr. Rohit Mehta.'
      }
    ]);
    console.log('Lab Tests seeded.');

    // 12. Seed Payments (Invoices)
    await Payment.insertMany([
      {
        invoiceNumber: 'INV-109923-221',
        patient: seededPatients[0]._id,
        items: [
          { description: 'Cardiology Consultation Fee', amount: 150.0 },
          { description: 'ECG Analysis Diagnostic', amount: 80.0 }
        ],
        subTotal: 230.0,
        discount: 10,
        tax: 5,
        totalAmount: 218.5,
        amountPaid: 218.5,
        paymentMethod: 'Card',
        paymentStatus: 'Paid',
        transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        invoiceNumber: 'INV-887721-391',
        patient: seededPatients[3]._id,
        items: [
          { description: 'ICU Ward Admission Fee (5 days)', amount: 2500.0 },
          { description: 'Post-op Trauma Monitoring', amount: 450.0 }
        ],
        subTotal: 2950.0,
        discount: 0,
        tax: 8,
        totalAmount: 3186.0,
        amountPaid: 0,
        paymentMethod: 'Insurance',
        paymentStatus: 'Unpaid',
        insurance: {
          provider: 'Blue Cross Shield',
          policyNumber: 'BCS-9921102A',
          claimStatus: 'Pending',
          approvedAmount: 0
        },
        transactionDate: new Date(Date.now())
      }
    ]);
    console.log('Payments seeded.');

    // 13. Seed System Notifications & Audit Logs
    await Notification.insertMany([
      { title: 'New Patient Registered', message: 'Patient Ramesh Kumar was registered successfully.', type: 'patient', module: 'Patients', priority: 'medium' },
      { title: 'Low Stock Alert', message: "Medicine 'Metformin 850mg' is low on stock (15 units remaining).", type: 'pharmacy', module: 'Pharmacy', priority: 'high' },
      { title: 'System Alert', message: 'Database backup completed successfully at 02:00 AM.', type: 'system', module: 'System', priority: 'low' }
    ]);

    await AuditLog.insertMany([
      { user: adminUser._id, action: 'User Creation', module: 'User Management', description: 'Created test users doctor, nurse, reception, lab, pharmacist profiles.', ipAddress: '127.0.0.1' },
      { user: adminUser._id, action: 'Login Activity', module: 'Auth', description: 'Super Admin logged in from portal console', ipAddress: '127.0.0.1' }
    ]);
    console.log('Audit Logs and notifications seeded.');

    console.log('Database Seeding Successful! Exiting...');
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error during seeding database: ', error);
    process.exit(1);
  }
};

seedDB();
