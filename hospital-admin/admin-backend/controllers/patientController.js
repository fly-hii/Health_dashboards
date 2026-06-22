const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Patient, Appointment, Prescription, LabTest, Vitals, AuditLog, Report, User, PrescriptionMedicine } = require('../models');
const { uploadToS3, deleteFromS3, generateReportKey } = require('../services/s3Service');

// Generate unique PAT+YYYYMMDD+3digit counter scoped to hospital
const generatePatientId = async (hospitalId) => {
  const today = new Date();
  const datePrefix = `PAT${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;

  const lastPatient = await Patient.findOne({
    where: { hospital_id: hospitalId, patient_id: { [Op.like]: `${datePrefix}%` } },
    order: [['patient_id', 'DESC']],
  });

  let sequence = 1;
  if (lastPatient?.patient_id) {
    const num = parseInt(lastPatient.patient_id.replace(datePrefix, ''), 10);
    if (!isNaN(num)) sequence = num + 1;
  }
  return `${datePrefix}${String(sequence).padStart(4, '0')}`;
};

// GET /api/patients
const getPatients = async (req, res) => {
  try {
    const { search, status, gender, ageGroup, sortBy, order = 'DESC', page = 1, limit = 8, export: isExport } = req.query;
    const hospitalId = req.hospitalId;
    const where = { hospital_id: hospitalId };

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { patient_id: { [Op.like]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;
    if (gender) where.gender = gender;

    if (ageGroup) {
      const today = new Date();
      const cutoff18 = new Date(today.getFullYear()-18, today.getMonth(), today.getDate());
      const cutoff60 = new Date(today.getFullYear()-60, today.getMonth(), today.getDate());
      if (ageGroup === 'Child') where.dob = { [Op.gte]: cutoff18 };
      else if (ageGroup === 'Adult') where.dob = { [Op.between]: [cutoff60, cutoff18] };
      else if (ageGroup === 'Senior') where.dob = { [Op.lte]: cutoff60 };
    }

    const validSortFields = ['full_name', 'created_at', 'dob', 'patient_id', 'status'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (isExport === 'true') {
      const patients = await Patient.findAll({ where, order: [[orderField, orderDir]] });
      return res.json({ success: true, count: patients.length, data: patients });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Patient.findAndCountAll({
      where,
      order: [[orderField, orderDir]],
      limit: limitNum,
      offset,
    });

    res.json({
      success: true,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/stats
const getPatientStats = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const cutoff18 = new Date(today.getFullYear()-18, today.getMonth(), today.getDate());

    const [totalCount, maleCount, femaleCount, childrenCount, newThisMonth, newPrevMonth] = await Promise.all([
      Patient.count({ where: { hospital_id: hospitalId } }),
      Patient.count({ where: { hospital_id: hospitalId, gender: 'Male' } }),
      Patient.count({ where: { hospital_id: hospitalId, gender: 'Female' } }),
      Patient.count({ where: { hospital_id: hospitalId, dob: { [Op.gte]: cutoff18 } } }),
      Patient.count({ where: { hospital_id: hospitalId, created_at: { [Op.gte]: thirtyDaysAgo } } }),
      Patient.count({ where: { hospital_id: hospitalId, created_at: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] } } }),
    ]);

    const growthRate = newPrevMonth > 0 ? parseFloat((((newThisMonth - newPrevMonth) / newPrevMonth) * 100).toFixed(1)) : 100;

    res.json({
      success: true,
      data: {
        totalPatients: { count: totalCount, growth: 12.5 },
        malePatients: { count: maleCount, growth: 8.3 },
        femalePatients: { count: femaleCount, growth: 10.2 },
        childrenPatients: { count: childrenCount, growth: -2.1 },
        newThisMonth: { count: newThisMonth, growth: growthRate },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
    });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [appointments, prescriptions, labTests, vitals, reports] = await Promise.all([
      Appointment.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] }],
        order: [['date_time', 'DESC']],
      }),
      Prescription.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [
          { model: User, as: 'doctor', attributes: ['id', 'name'] },
          { model: PrescriptionMedicine, as: 'medicines' },
        ],
        order: [['created_at', 'DESC']],
      }),
      LabTest.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        order: [['created_at', 'DESC']],
      }),
      Vitals.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
        order: [['recorded_at', 'DESC']],
      }),
      Report.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId, is_deleted: false },
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']],
      }),
    ]);

    // Timeline
    const timeline = [
      ...appointments.map(a => ({ id: `apt-${a.id}`, type: 'Appointment', title: `Appointment with Dr. ${a.doctor?.name || 'Unknown'}`, description: `Status: ${a.status} | ${a.reason || 'General Consult'}`, date: a.date_time, status: a.status })),
      ...prescriptions.map(p => ({ id: `pres-${p.id}`, type: 'Prescription', title: 'Prescription Generated', description: `Medicines: ${p.medicines?.map(m => m.name).join(', ') || 'None'}`, date: p.created_at })),
      ...labTests.map(l => ({ id: `lab-${l.id}`, type: 'Lab Test', title: `Lab Test: ${l.test_name}`, description: `Result: ${l.result || 'Pending'}`, date: l.created_at, status: l.status })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const formatBytes = (bytes, decimals = 1) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const mapReport = (r) => {
      const data = r.toJSON ? r.toJSON() : r;
      return {
        ...data,
        category: data.report_type,
        filePath: data.file_url,
        fileSize: formatBytes(data.file_size),
        date: data.created_at || data.createdAt,
        doctor: data.uploadedBy?.name || 'Staff',
        fileName: data.file_name,
      };
    };

    const mappedReports = reports.map(mapReport);

    res.json({ success: true, data: { patient, appointments, prescriptions, labTests, vitals, reports: mappedReports, timeline } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/patients
const createPatient = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const patientId = req.body.patient_id || req.body.patientId || await generatePatientId(hospitalId);

    const patient = await Patient.create({
      ...req.body,
      hospital_id: hospitalId,
      patient_id: patientId,
      full_name: req.body.full_name || req.body.fullName || req.body.name,
    });

    await AuditLog.create({
      hospital_id: hospitalId,
      user_id: req.user?.id,
      action: 'CREATE',
      module: 'Patients',
      table_name: 'patients',
      record_id: patient.id,
      new_data: { name: patient.full_name, patientId: patient.patient_id },
      description: `Registered new patient: ${patient.full_name} (${patient.patient_id})`,
      ip_address: req.ip,
    });

    // Socket: tenant-aware event
    const io = req.app.get('io');
    if (io) io.to(`hospital_${hospitalId}`).emit('new_patient', { patient });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const oldData = patient.toJSON();
    await patient.update({
      ...req.body,
      full_name: req.body.full_name || req.body.fullName || patient.full_name,
    });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Patients',
      table_name: 'patients',
      record_id: patient.id,
      old_data: oldData,
      new_data: req.body,
      description: `Updated patient: ${patient.full_name}`,
      ip_address: req.ip,
    });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('patient_updated', { patient });

    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/patients/:id
const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const patientData = { name: patient.full_name, patientId: patient.patient_id };
    await patient.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'DELETE',
      module: 'Patients',
      table_name: 'patients',
      old_data: patientData,
      description: `Deleted patient: ${patientData.name} (${patientData.patientId})`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/history
const getPatientHistory = async (req, res) => {
  try {
    const where = { patient_id: req.params.id, hospital_id: req.hospitalId };

    const [appointments, prescriptions, labTests, reports] = await Promise.all([
      Appointment.findAll({ where, include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }], order: [['date_time', 'DESC']] }),
      Prescription.findAll({ where, include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }, { model: PrescriptionMedicine, as: 'medicines' }], order: [['created_at', 'DESC']] }),
      LabTest.findAll({ where, order: [['created_at', 'DESC']] }),
      Report.findAll({ where: { ...where, is_deleted: false }, order: [['created_at', 'DESC']] }),
    ]);

    const timeline = [
      ...appointments.map(a => ({ id: `apt-${a.id}`, type: 'Appointment', title: 'Appointment', description: `Reason: ${a.reason || 'General Consult'}`, date: a.date_time, doctor: a.doctor?.name, status: a.status })),
      ...prescriptions.map(p => ({ id: `pres-${p.id}`, type: 'Prescription', title: 'Prescription', description: `Medicines: ${p.medicines?.map(m => m.name).join(', ') || 'None'}`, date: p.created_at, doctor: p.doctor?.name })),
      ...labTests.map(l => ({ id: `lab-${l.id}`, type: 'Lab Test', title: `Lab Test: ${l.test_name}`, description: `Result: ${l.result || 'Pending'}`, date: l.created_at, status: l.status })),
      ...reports.map(r => ({ id: `rep-${r.id}`, type: 'Report', title: `Report: ${r.title}`, description: r.report_type, date: r.created_at })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/appointments
const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { patient_id: req.params.id, hospital_id: req.hospitalId },
      include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'specialization'] }],
      order: [['date_time', 'DESC']],
    });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/prescriptions
const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: { patient_id: req.params.id, hospital_id: req.hospitalId },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'name'] },
        { model: PrescriptionMedicine, as: 'medicines' },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/reports
const getPatientReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      where: { patient_id: req.params.id, hospital_id: req.hospitalId, is_deleted: false },
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    const formatBytes = (bytes, decimals = 1) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const mapReport = (r) => {
      const data = r.toJSON ? r.toJSON() : r;
      return {
        ...data,
        category: data.report_type,
        filePath: data.file_url,
        fileSize: formatBytes(data.file_size),
        date: data.created_at || data.createdAt,
        doctor: data.uploadedBy?.name || 'Staff',
        fileName: data.file_name,
      };
    };

    res.json({ success: true, data: reports.map(mapReport) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/patients/:id/reports
const uploadPatientReport = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const patientId = req.params.id;
    const { title, report_type = 'Other', description, appointment_id } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Verify patient belongs to hospital
    const patient = await Patient.findOne({ where: { id: patientId, hospital_id: hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Upload to S3
    const s3Key = generateReportKey(hospitalId, patientId, req.file.originalname);
    const { file_url, s3_key } = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    const report = await Report.create({
      hospital_id: hospitalId,
      patient_id: patientId,
      appointment_id: appointment_id || null,
      uploaded_by: req.user?.id,
      title: title || req.file.originalname,
      report_type,
      file_url,
      s3_key,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      description,
      status: 'Ready',
    });

    await AuditLog.create({
      hospital_id: hospitalId,
      user_id: req.user?.id,
      action: 'CREATE',
      module: 'Reports',
      table_name: 'reports',
      record_id: report.id,
      description: `Report uploaded: ${report.title} for patient ${patient.full_name}`,
      ip_address: req.ip,
    });

    const fullReport = await Report.findByPk(report.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'name'] }]
    });

    const formatBytes = (bytes, decimals = 1) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const mapReport = (r) => {
      const data = r.toJSON ? r.toJSON() : r;
      return {
        ...data,
        category: data.report_type,
        filePath: data.file_url,
        fileSize: formatBytes(data.file_size),
        date: data.created_at || data.createdAt,
        doctor: data.uploadedBy?.name || 'Staff',
        fileName: data.file_name,
      };
    };

    res.status(201).json({ success: true, data: mapReport(fullReport) });
  } catch (error) {
    console.error('Report upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/patients/:id/reports/:reportId
const deletePatientReport = async (req, res) => {
  try {
    const { id: patientId, reportId } = req.params;
    const report = await Report.findOne({ where: { id: reportId, patient_id: patientId, hospital_id: req.hospitalId } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (report.s3_key) {
      try { await deleteFromS3(report.s3_key); } catch (e) { console.warn('S3 delete warning:', e.message); }
    }

    await report.update({ is_deleted: true });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'DELETE',
      module: 'Reports',
      table_name: 'reports',
      record_id: report.id,
      description: `Report deleted: ${report.title}`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPatients, getPatientStats, getPatientById, createPatient, updatePatient,
  deletePatient, getPatientHistory, getPatientAppointments,
  getPatientPrescriptions, getPatientReports, uploadPatientReport, deletePatientReport,
};
