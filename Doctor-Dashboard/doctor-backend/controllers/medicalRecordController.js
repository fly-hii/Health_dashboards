import MedicalRecord from '../models/MedicalRecord.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

// Helper: resolve patient info from either Patient or User collection
const resolvePatientInfo = async (doc, path = 'patientId') => {
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
    console.error('Error resolving patient info in medicalRecordController:', err);
  }

  return doc;
};

// @desc    Get all medical records (with pagination, filters, search)
// @route   GET /api/medical-records
// @access  Private
export const getMedicalRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, diagnosis, doctor, status, startDate, endDate } = req.query;

    const query = {};

    // Filters
    if (department) query.department = department;
    if (diagnosis) query.diagnosis = new RegExp(diagnosis, 'i');
    if (status) query.status = status;
    if (startDate && endDate) {
      query.visitDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Search by Patient Name or Phone (requires lookup/populate or pre-filtering)
    if (search) {
      const patients = await Patient.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const users = await User.find({
        role: 'patient',
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const patientIds = [...patients.map(p => p._id), ...users.map(u => u._id)];
      
      // Also search by diagnosis if no patient matches or additionally
      if (query.$or) {
        query.$or.push({ patientId: { $in: patientIds } });
        query.$or.push({ diagnosis: { $regex: search, $options: 'i' } });
      } else {
        query.$or = [
          { patientId: { $in: patientIds } },
          { diagnosis: { $regex: search, $options: 'i' } }
        ];
      }
    }

    const skip = (page - 1) * limit;

    const records = await MedicalRecord.find(query)
      .populate('doctorId', 'name department')
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const resolvedRecords = await Promise.all(records.map(r => resolvePatientInfo(r, 'patientId')));

    const total = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      records: resolvedRecords,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get medical record by ID
// @route   GET /api/medical-records/:id
// @access  Private
export const getMedicalRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('doctorId', 'name department')
      .populate('appointmentId')
      .populate('vitals')
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Medical record not found' });
    }

    const resolvedRecord = await resolvePatientInfo(record, 'patientId');

    res.json({ success: true, record: resolvedRecord });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get medical records by Patient ID
// @route   GET /api/medical-records/patient/:patientId
// @access  Private
export const getPatientMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .populate('doctorId', 'name department')
      .sort({ visitDate: -1 });

    res.json({ success: true, records });
  } catch (error) {
    console.error('Get patient medical records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
