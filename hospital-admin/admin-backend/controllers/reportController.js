'use strict';
const multer = require('multer');
const { uploadToS3, getSignedDownloadUrl, deleteFromS3, generateReportKey } = require('../services/s3Service');

// Use memory storage - files go directly to S3
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type. Allowed: PDF, JPG, PNG, DOC'));
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// POST /api/reports/upload
const uploadReport = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { Report, Patient, AuditLog } = req.models;
    const { patient_id, appointment_id, title, report_type = 'Other', description } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id is required' });

    // Verify patient belongs to hospital
    const patient = await Patient.findOne({ where: { id: patient_id, hospital_id: hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found in this hospital' });

    // Upload to S3
    const s3Key = generateReportKey(hospitalId, patient_id, req.file.originalname);
    const { file_url, s3_key } = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    const report = await Report.create({
      hospital_id: hospitalId,
      patient_id,
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

    const io = req.app.get('io');
    if (io) io.to(`hospital_${hospitalId}`).emit('report_uploaded', { report: { id: report.id, title: report.title }, patientId: patient_id });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Report upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports
const getReports = async (req, res) => {
  try {
    const { Report, Patient, User } = req.models;
    const { patient_id, report_type, page = 1, limit = 20 } = req.query;
    const hospitalId = req.hospitalId;
    const where = { hospital_id: hospitalId, is_deleted: false };
    if (patient_id) where.patient_id = patient_id;
    if (report_type) where.report_type = report_type;

    const pageNum = parseInt(page); const limitNum = parseInt(limit);
    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] },
        { model: User, as: 'uploadedBy', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/:id/download
const downloadReport = async (req, res) => {
  try {
    const { Report } = req.models;
    const report = await Report.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, is_deleted: false } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const signedUrl = await getSignedDownloadUrl(report.s3_key, 3600);
    res.json({ success: true, download_url: signedUrl, expires_in: 3600 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/reports/:id
const deleteReport = async (req, res) => {
  try {
    const { Report, AuditLog } = req.models;
    const report = await Report.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // Delete from S3
    if (report.s3_key) {
      try { await deleteFromS3(report.s3_key); } catch (e) { console.warn('S3 delete warning:', e.message); }
    }

    await report.update({ is_deleted: true });

    await AuditLog.create({
      hospital_id: req.hospitalId, user_id: req.user?.id, action: 'DELETE',
      module: 'Reports', table_name: 'reports', record_id: report.id,
      description: `Report deleted: ${report.title}`, ip_address: req.ip,
    });

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports (list system report logs)
const getReportsList = async (req, res) => {
  try {
    const { AuditLog, User } = req.models;
    const logs = await AuditLog.findAll({
      where: {
        hospital_id: req.hospitalId,
        action: 'EXPORT',
        module: 'Reports'
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    const reports = logs.map(log => {
      const data = log.toJSON();
      return {
        _id: data.id,
        title: data.description,
        format: data.new_data?.format || 'CSV',
        type: data.new_data?.type || 'Patient',
        generatedBy: data.user,
        createdAt: data.created_at
      };
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Fetch reports list error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/reports (compile system report data)
const generateReport = async (req, res) => {
  try {
    const { title, type, format } = req.body;
    const hospitalId = req.hospitalId;

    let results = [];
    
    if (type === 'Patient') {
      const { Patient } = req.models;
      results = await Patient.findAll({ where: { hospital_id: hospitalId }, attributes: { exclude: ['password'] } });
    } else if (type === 'Doctor') {
      const { User } = req.models;
      results = await User.findAll({ where: { hospital_id: hospitalId, role: 'DOCTOR' }, attributes: { exclude: ['password'] } });
    } else if (type === 'Appointment') {
      const { Appointment, Patient, User } = req.models;
      results = await Appointment.findAll({
        where: { hospital_id: hospitalId },
        include: [
          { model: Patient, as: 'patient', attributes: ['full_name'] },
          { model: User, as: 'doctor', attributes: ['name'] }
        ]
      });
    } else if (type === 'Revenue') {
      const { Patient } = req.models;
      const PaymentModel = req.models.HmsPayment || req.models.Payment;
      results = await PaymentModel.findAll({
        where: { hospital_id: hospitalId },
        include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }]
      });
    } else if (type === 'Pharmacy') {
      const { PharmacyOrder, Patient } = req.models;
      results = await PharmacyOrder.findAll({
        where: { hospital_id: hospitalId },
        include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }]
      });
    } else if (type === 'Lab') {
      const { LabTest, Patient } = req.models;
      results = await LabTest.findAll({
        where: { hospital_id: hospitalId },
        include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }]
      });
    }

    const { AuditLog } = req.models;
    await AuditLog.create({
      hospital_id: hospitalId,
      user_id: req.user?.id,
      action: 'EXPORT',
      module: 'Reports',
      description: title || `${type} Report Export`,
      new_data: { type, format }
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  upload, 
  uploadReport, 
  getReports, 
  downloadReport, 
  deleteReport,
  getReportsList,
  generateReport
};
