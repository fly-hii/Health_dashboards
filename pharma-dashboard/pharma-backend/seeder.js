const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Prescription = require('./models/Prescription');
const Order = require('./models/Order');
const Inventory = require('./models/Inventory');

dotenv.config();

const importData = async () => {
  try {
    await connectDB();
    
    await Order.deleteMany();
    await Prescription.deleteMany();
    await Patient.deleteMany();
    await Inventory.deleteMany();
    await User.deleteMany();

    const createdUsers = await User.create([
      {
        fullName: 'Pharmacist Rahul',
        employeeId: 'CPH001',
        phoneNumber: '9876543210',
        email: 'rahul.sharma@careplus.com',
        password: 'password123',
        storeLocation: 'CarePlus Pharmacy, Jaipur'
      }
    ]);

    const createdPatients = await Patient.create([
      { name: 'Ramesh Kumar', age: 32, gender: 'Male', phone: '9876543210' },
      { name: 'Amit Singh', age: 45, gender: 'Male', phone: '8765432109' },
      { name: 'Pooja Sharma', age: 28, gender: 'Female', phone: '7654321098' },
      { name: 'Vikram Patel', age: 50, gender: 'Male', phone: '6543210987' },
      { name: 'Neha Gupta', age: 35, gender: 'Female', phone: '5432109876' }
    ]);

    const medicines = [
      { medicineName: 'Paracetamol 500mg', dosage: '500 mg', quantity: 10, instructions: 'After meals' },
      { medicineName: 'Amoxicillin 500mg', dosage: '500 mg', quantity: 15, instructions: 'Twice a day' },
      { medicineName: 'Cetirizine 10mg', dosage: '10 mg', quantity: 10, instructions: 'At night' },
      { medicineName: 'Dolo 650mg', dosage: '650 mg', quantity: 10, instructions: 'When needed' },
      { medicineName: 'Azithromycin 500mg', dosage: '500 mg', quantity: 6, instructions: 'After lunch' }
    ];

    const prescriptions = await Prescription.create([
      {
        patientId: createdPatients[0]._id,
        doctorName: 'Dr. Rohit Mehta',
        department: 'Cardiology',
        tokenNumber: 'RXN10234',
        medicines: [medicines[0], medicines[1], medicines[2]],
        doctorNotes: 'Take full course of antibiotics and stay hydrated.'
      },
      {
        patientId: createdPatients[1]._id,
        doctorName: 'Dr. Vivek Singh',
        tokenNumber: 'RXN09861',
        medicines: [medicines[3], medicines[4]],
      },
      {
        patientId: createdPatients[2]._id,
        doctorName: 'Dr. Rohit Mehta',
        tokenNumber: 'RXN08742',
        medicines: [medicines[0]],
      },
      {
        patientId: createdPatients[3]._id,
        doctorName: 'Dr. Anjali Verma',
        tokenNumber: 'RXN05615',
        medicines: [medicines[1], medicines[2]],
      },
      {
        patientId: createdPatients[4]._id,
        doctorName: 'Dr. Neha Kapoor',
        tokenNumber: 'RXN05402',
        medicines: [medicines[2]],
      }
    ]);

    const mapMedicinesToOrder = (prescriptionMed) => {
      return prescriptionMed.map(med => ({
        medicineName: med.medicineName,
        dosage: med.dosage,
        quantity: med.quantity,
        packedIn: 'Strip'
      }));
    };

    await Order.create([
      {
        prescriptionId: prescriptions[0]._id,
        patientId: createdPatients[0]._id,
        tokenNumber: 'RXN10234',
        status: 'Pending',
        medicines: mapMedicinesToOrder(prescriptions[0].medicines),
        totalAmount: 350
      },
      {
        prescriptionId: prescriptions[1]._id,
        patientId: createdPatients[1]._id,
        tokenNumber: 'RXN09861',
        status: 'Processing',
        medicines: mapMedicinesToOrder(prescriptions[1].medicines).map(m => ({...m, picked: true})),
        startedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        totalAmount: 220
      },
      {
        prescriptionId: prescriptions[2]._id,
        patientId: createdPatients[2]._id,
        tokenNumber: 'RXN08742',
        status: 'Packed',
        medicines: mapMedicinesToOrder(prescriptions[2].medicines).map(m => ({...m, picked: true, packed: true})),
        startedAt: new Date(Date.now() - 1000 * 60 * 30),
        totalAmount: 50
      },
      {
        prescriptionId: prescriptions[3]._id,
        patientId: createdPatients[3]._id,
        tokenNumber: 'RXN05615',
        status: 'Ready',
        medicines: mapMedicinesToOrder(prescriptions[3].medicines).map(m => ({...m, picked: true, packed: true})),
        startedAt: new Date(Date.now() - 1000 * 60 * 60),
        readyAt: new Date(Date.now() - 1000 * 60 * 10),
        totalAmount: 480
      },
      {
        prescriptionId: prescriptions[4]._id,
        patientId: createdPatients[4]._id,
        tokenNumber: 'RXN05402',
        status: 'Delivered',
        medicines: mapMedicinesToOrder(prescriptions[4].medicines).map(m => ({...m, picked: true, packed: true})),
        startedAt: new Date(Date.now() - 1000 * 60 * 120),
        readyAt: new Date(Date.now() - 1000 * 60 * 60),
        deliveredAt: new Date(Date.now() - 1000 * 60 * 30),
        paymentMethod: 'UPI',
        totalAmount: 120,
        paidAmount: 120
      }
    ]);

    await Inventory.create([
      { medicineName: 'Paracetamol 500mg', currentStock: 15, unit: 'Strip', reorderLevel: 30, status: 'Low Stock' },
      { medicineName: 'Amoxicillin 500mg', currentStock: 8, unit: 'Strip', reorderLevel: 20, status: 'Low Stock' },
      { medicineName: 'Cetirizine 10mg', currentStock: 6, unit: 'Strip', reorderLevel: 20, status: 'Low Stock' },
      { medicineName: 'Pantoprazole 40mg', currentStock: 10, unit: 'Strip', reorderLevel: 25, status: 'Low Stock' },
      { medicineName: 'Vitamin D3 60K', currentStock: 5, unit: 'Capsule', reorderLevel: 10, status: 'Low Stock' },
      { medicineName: 'Dolo 650mg', currentStock: 150, unit: 'Strip', reorderLevel: 50, status: 'In Stock' }
    ]);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
