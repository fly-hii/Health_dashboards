const { Op } = require('sequelize');

// Helper: calculate age from dob
const calculateAge = (dobString) => {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// GET /api/medical-records
const getMedicalRecords = async (req, res) => {
  try {
    const { Consultation, Patient, User, Appointment, Prescription, PrescriptionMedicine, Report } = req.models;
    const { page = 1, limit = 10, search, department, status } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for Consultation
    const consultationWhere = { hospital_id: req.hospitalId };
    if (status) {
      if (status === 'completed') consultationWhere.status = 'Completed';
      else if (status === 'pending_reports') consultationWhere.status = 'Pending';
      else if (status === 'follow_up') consultationWhere.status = 'In-Progress';
    }

    // Build where clause for Patient search
    const patientWhere = {};
    if (search) {
      patientWhere[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { patient_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build where clause for Appointment department
    const appointmentWhere = {};
    if (department) {
      appointmentWhere.department = department;
    }

    const { count, rows } = await Consultation.findAndCountAll({
      where: consultationWhere,
      distinct: true,
      include: [
        {
          model: Patient,
          as: 'patient',
          where: search ? patientWhere : undefined,
          required: search ? true : false,
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'department'],
        },
        {
          model: Appointment,
          as: 'appointment',
          where: department ? appointmentWhere : undefined,
          required: department ? true : false,
          include: [
            { model: req.models.Vitals, as: 'vitals', required: false }
          ]
        },
        {
          model: Prescription,
          as: 'prescription',
          required: false,
          include: [
            { model: PrescriptionMedicine, as: 'medicines', required: false }
          ]
        }
      ],
      order: [['completed_at', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
    });

    // Bulk fetch reports for these appointments
    const appointmentIds = rows.map(r => r.appointment_id).filter(Boolean);
    const reports = appointmentIds.length > 0 ? await Report.findAll({
      where: { appointment_id: appointmentIds, hospital_id: req.hospitalId, is_deleted: false }
    }) : [];

    const reportsByAppt = {};
    reports.forEach(rep => {
      if (!reportsByAppt[rep.appointment_id]) reportsByAppt[rep.appointment_id] = [];
      reportsByAppt[rep.appointment_id].push({
        reportName: rep.title,
        category: rep.report_type,
        url: rep.file_url,
      });
    });

    // Map to frontend expected shape
    const formattedRecords = rows.map(c => {
      let recStatus = 'completed';
      if (c.status === 'Pending') recStatus = 'pending_reports';
      else if (c.status === 'In-Progress') recStatus = 'follow_up';

      const medicines = c.prescription?.medicines || [];
      const formattedMeds = medicines.map(med => ({
        medicineName: med.name,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
      }));

      const apptReports = reportsByAppt[c.appointment_id] || [];

      return {
        _id: c.id.toString(),
        visitDate: c.completed_at || c.created_at || new Date(),
        patientId: c.patient ? {
          _id: c.patient.id,
          name: c.patient.full_name,
          patientId: c.patient.patient_id,
          phone: c.patient.phone,
          email: c.patient.email,
          gender: c.patient.gender?.toLowerCase(),
          age: calculateAge(c.patient.dob),
          bloodGroup: c.patient.blood_group,
        } : null,
        doctorId: c.doctor ? {
          _id: c.doctor.id,
          name: c.doctor.name,
          department: c.doctor.department,
        } : null,
        department: c.appointment?.department || 'OPD',
        diagnosis: c.diagnosis || '',
        doctorNotes: c.notes || '',
        prescriptions: formattedMeds,
        reports: apptReports,
        status: recStatus,
      };
    });

    res.json({
      success: true,
      records: formattedRecords,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/medical-records/:id
const getMedicalRecordById = async (req, res) => {
  try {
    const { Consultation, Patient, User, Appointment, Prescription, PrescriptionMedicine, Report } = req.models;
    const record = await Consultation.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: req.models.Vitals, as: 'vitals', required: false }
          ]
        },
        {
          model: Prescription,
          as: 'prescription',
          required: false,
          include: [
            { model: PrescriptionMedicine, as: 'medicines', required: false }
          ]
        }
      ]
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Medical record not found' });
    }

    const reports = await Report.findAll({
      where: { appointment_id: record.appointment_id, hospital_id: req.hospitalId, is_deleted: false }
    });

    const formattedReports = reports.map(rep => ({
      reportName: rep.title,
      category: rep.report_type,
      url: rep.file_url,
    }));

    let recStatus = 'completed';
    if (record.status === 'Pending') recStatus = 'pending_reports';
    else if (record.status === 'In-Progress') recStatus = 'follow_up';

    const medicines = record.prescription?.medicines || [];
    const formattedMeds = medicines.map(med => ({
      medicineName: med.name,
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      instructions: med.instructions || '',
    }));

    const formattedRecord = {
      _id: record.id.toString(),
      visitDate: record.completed_at || record.created_at || new Date(),
      patientId: record.patient ? {
        _id: record.patient.id,
        name: record.patient.full_name,
        patientId: record.patient.patient_id,
        phone: record.patient.phone,
        email: record.patient.email,
        gender: record.patient.gender?.toLowerCase(),
        age: calculateAge(record.patient.dob),
        bloodGroup: record.patient.blood_group,
      } : null,
      doctorId: record.doctor ? {
        _id: record.doctor.id,
        name: record.doctor.name,
        department: record.doctor.department,
      } : null,
      department: record.appointment?.department || 'OPD',
      diagnosis: record.diagnosis || '',
      doctorNotes: record.notes || '',
      prescriptions: formattedMeds,
      reports: formattedReports,
      status: recStatus,
      vitals: record.appointment?.vitals || null,
    };

    res.json({ success: true, record: formattedRecord });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/medical-records/patient/:patientId
const getPatientMedicalRecords = async (req, res) => {
  try {
    const { Consultation, Patient, User, Appointment, Prescription, PrescriptionMedicine, Report } = req.models;
    const consultations = await Consultation.findAll({
      where: { patient_id: req.params.patientId, hospital_id: req.hospitalId },
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
        {
          model: Appointment,
          as: 'appointment',
          include: [{ model: req.models.Vitals, as: 'vitals', required: false }]
        },
        {
          model: Prescription,
          as: 'prescription',
          required: false,
          include: [{ model: PrescriptionMedicine, as: 'medicines', required: false }]
        }
      ],
      order: [['completed_at', 'DESC'], ['created_at', 'DESC']]
    });

    const appointmentIds = consultations.map(c => c.appointment_id).filter(Boolean);
    const reports = appointmentIds.length > 0 ? await Report.findAll({
      where: { appointment_id: appointmentIds, hospital_id: req.hospitalId, is_deleted: false }
    }) : [];

    const reportsByAppt = {};
    reports.forEach(rep => {
      if (!reportsByAppt[rep.appointment_id]) reportsByAppt[rep.appointment_id] = [];
      reportsByAppt[rep.appointment_id].push({
        reportName: rep.title,
        category: rep.report_type,
        url: rep.file_url,
      });
    });

    const formattedRecords = consultations.map(c => {
      let recStatus = 'completed';
      if (c.status === 'Pending') recStatus = 'pending_reports';
      else if (c.status === 'In-Progress') recStatus = 'follow_up';

      const medicines = c.prescription?.medicines || [];
      const formattedMeds = medicines.map(med => ({
        medicineName: med.name,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
      }));

      const apptReports = reportsByAppt[c.appointment_id] || [];

      return {
        _id: c.id.toString(),
        visitDate: c.completed_at || c.created_at || new Date(),
        patientId: c.patient ? {
          _id: c.patient.id,
          name: c.patient.full_name,
          patientId: c.patient.patient_id,
          phone: c.patient.phone,
          email: c.patient.email,
          gender: c.patient.gender?.toLowerCase(),
          age: calculateAge(c.patient.dob),
          bloodGroup: c.patient.blood_group,
        } : null,
        doctorId: c.doctor ? {
          _id: c.doctor.id,
          name: c.doctor.name,
          department: c.doctor.department,
        } : null,
        department: c.appointment?.department || 'OPD',
        diagnosis: c.diagnosis || '',
        doctorNotes: c.notes || '',
        prescriptions: formattedMeds,
        reports: apptReports,
        status: recStatus,
        vitals: c.appointment?.vitals || null,
      };
    });

    res.json({ success: true, records: formattedRecords });
  } catch (error) {
    console.error('Get patient medical records error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMedicalRecords,
  getMedicalRecordById,
  getPatientMedicalRecords
};
