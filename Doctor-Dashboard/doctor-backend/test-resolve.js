import mongoose from 'mongoose';
import Appointment from './models/Appointment.js';
import User from './models/User.js';
import Patient from './models/Patient.js';

// Helper: resolve patient info from either Patient or User collection
const resolvePatientInfo = async (doc, path = 'patient') => {
  if (!doc) return doc;

  const target = doc[path];
  
  // If target is already populated (it's an object with name or fullName)
  if (target && typeof target === 'object' && (target.name || target.fullName)) {
    // Already populated — normalise fullName → name and mobile → phone
    if (!target.name && target.fullName) {
      target.name = target.fullName;
    }
    if (!target.phone && target.mobile) {
      target.phone = target.mobile;
    }
    return doc;
  }

  // Get raw patient ID
  const rawPatientId = target?._id || target;
  if (!rawPatientId) return doc;

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    let birthDate;
    if (dobString.includes('/')) {
      const parts = dobString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        birthDate = new Date(year, month, day);
      }
    }
    if (!birthDate || isNaN(birthDate.getTime())) {
      birthDate = new Date(dobString);
    }
    if (isNaN(birthDate.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  try {
    // 1. Try to find in Patient collection first
    const patientDoc = await Patient.findById(rawPatientId).lean();
    if (patientDoc) {
      doc[path] = patientDoc;
      if (!doc[path].name && doc[path].fullName) {
        doc[path].name = doc[path].fullName;
      }
      if (!doc[path].phone && doc[path].mobile) {
        doc[path].phone = doc[path].mobile;
      }
    } else {
      // 2. Try to find in User collection
      const userDoc = await User.findById(rawPatientId).lean();
      if (userDoc) {
        doc[path] = {
          _id: userDoc._id,
          name: userDoc.fullName || userDoc.name || 'Patient',
          age: userDoc.age || calculateAge(userDoc.dob) || null,
          gender: userDoc.gender || null,
          patientId: userDoc.patientId || `P-USR-${userDoc._id.toString().slice(-4).toUpperCase()}`,
          bloodGroup: userDoc.bloodGroup || null,
          phone: userDoc.mobile || userDoc.phone || null,
          email: userDoc.email || null,
          _fromUser: true,
        };
      }
    }
  } catch (err) {
    console.error('Error resolving patient info in doctor dashboard:', err);
  }

  return doc;
};

async function run() {
  await mongoose.connect('mongodb://localhost:27017/patient_dashboard');
  const appt = await Appointment.findOne({ tokenNumber: /006/ }).lean();
  console.log('Before resolve:', appt);
  
  const resolved = await resolvePatientInfo(appt, 'patient');
  console.log('After resolve:', resolved);
  console.log('Resolved Patient Object:', resolved.patient);
  
  process.exit(0);
}

run().catch(console.error);
