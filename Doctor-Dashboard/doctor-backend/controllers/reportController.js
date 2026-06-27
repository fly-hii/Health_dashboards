const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'careplus-reports';

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, JPEG, PNG files allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/reports
const getReportsV3 = async (req, res) => {
  try {
    const { Report, Patient } = req.models;
    const { patient_id } = req.query;
    const where = { hospital_id: req.hospitalId, is_deleted: false };
    if (patient_id) where.patient_id = patient_id;

    const reports = await Report.findAll({
      where,
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] }],
      order: [['created_at', 'DESC']],
    });

    const mappedReports = reports.map(r => {
      const plain = r.get({ plain: true });
      return {
        _id: plain.id,
        id: plain.id,
        patientId: plain.patient_id,
        patient_id: plain.patient_id,
        appointmentId: plain.appointment_id,
        appointment_id: plain.appointment_id,
        reportName: plain.title,
        title: plain.title,
        reportType: plain.report_type,
        report_type: plain.report_type,
        fileUrl: plain.file_url,
        file_url: plain.file_url,
        fileName: plain.file_name,
        file_name: plain.file_name,
        fileSize: plain.file_size,
        file_size: plain.file_size,
        fileType: plain.file_type,
        file_type: plain.file_type,
        description: plain.description,
        status: plain.status,
        reportDate: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
        date: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
        createdAt: plain.created_at,
        created_at: plain.created_at,
        patient: plain.patient ? {
          _id: plain.patient.id,
          id: plain.patient.id,
          name: plain.patient.full_name,
          full_name: plain.patient.full_name,
          patientId: plain.patient.patient_id,
          patient_id: plain.patient.patient_id,
        } : null,
      };
    });

    res.json({ success: true, data: mappedReports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/:id
const getReportDetailsV3 = async (req, res) => {
  try {
    const { Report, Patient } = req.models;
    const report = await Report.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId, is_deleted: false },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name'] }],
    });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const plain = report.get({ plain: true });
    const mapped = {
      _id: plain.id,
      id: plain.id,
      patientId: plain.patient_id,
      patient_id: plain.patient_id,
      appointmentId: plain.appointment_id,
      appointment_id: plain.appointment_id,
      reportName: plain.title,
      title: plain.title,
      reportType: plain.report_type,
      report_type: plain.report_type,
      fileUrl: plain.file_url,
      file_url: plain.file_url,
      fileName: plain.file_name,
      file_name: plain.file_name,
      fileSize: plain.file_size,
      file_size: plain.file_size,
      fileType: plain.file_type,
      file_type: plain.file_type,
      description: plain.description,
      status: plain.status,
      reportDate: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
      date: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
      createdAt: plain.created_at,
      created_at: plain.created_at,
      patient: plain.patient ? {
        _id: plain.patient.id,
        id: plain.patient.id,
        name: plain.patient.full_name,
        full_name: plain.patient.full_name,
        patientId: plain.patient.patient_id,
        patient_id: plain.patient.patient_id,
      } : null,
    };

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/reports/upload
const uploadReportV3 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { Report } = req.models;
    
    // Support both camelCase (from frontend) and snake_case (from database schema)
    const patient_id = req.body.patient_id || req.body.patientId;
    const appointment_id = req.body.appointment_id || req.body.appointmentId || null;
    const title = req.body.title || req.body.reportName || req.body.report_name;
    const raw_report_type = req.body.report_type || req.body.reportType || 'Other';
    const description = req.body.description;
    
    // Normalize report_type to match DB ENUM: 'Lab','Radiology','Pathology','Prescription','Discharge','Other'
    let report_type = 'Other';
    if (raw_report_type) {
      const typeLower = raw_report_type.toLowerCase();
      if (typeLower === 'lab') report_type = 'Lab';
      else if (typeLower === 'imaging' || typeLower === 'radiology') report_type = 'Radiology';
      else if (typeLower === 'pathology') report_type = 'Pathology';
      else if (typeLower === 'prescription') report_type = 'Prescription';
      else if (typeLower === 'discharge') report_type = 'Discharge';
    }

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required' });
    }

    const hospitalId = req.hospitalId;

    // Generate S3 key
    const ext = path.extname(req.file.originalname).toLowerCase();
    const s3Key = `hospitals/${hospitalId}/patients/${patient_id}/reports/${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const file_url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    const report = await Report.create({
      hospital_id: hospitalId,
      patient_id: patient_id,
      appointment_id: appointment_id,
      uploaded_by: req.user?.id,
      title: title || req.file.originalname,
      report_type,
      file_url,
      s3_key: s3Key,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      description,
    });

    const plain = report.get({ plain: true });
    const mapped = {
      _id: plain.id,
      id: plain.id,
      patientId: plain.patient_id,
      patient_id: plain.patient_id,
      appointmentId: plain.appointment_id,
      appointment_id: plain.appointment_id,
      reportName: plain.title,
      title: plain.title,
      reportType: plain.report_type,
      report_type: plain.report_type,
      fileUrl: plain.file_url,
      file_url: plain.file_url,
      fileName: plain.file_name,
      file_name: plain.file_name,
      fileSize: plain.file_size,
      file_size: plain.file_size,
      fileType: plain.file_type,
      file_type: plain.file_type,
      description: plain.description,
      status: plain.status,
      reportDate: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
      date: plain.created_at ? new Date(plain.created_at).toLocaleDateString() : '',
      createdAt: plain.created_at,
      created_at: plain.created_at,
    };

    res.status(201).json({ success: true, data: mapped });
  } catch (error) {
    console.error('Report upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/reports/:id
const deleteReportV3 = async (req, res) => {
  try {
    const { Report } = req.models;
    const report = await Report.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (report.s3_key) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: report.s3_key }));
      } catch (e) { console.warn('S3 delete error:', e.message); }
    }

    await report.update({ is_deleted: true });
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/download/:id
const downloadReportV3 = async (req, res) => {
  try {
    const { Report } = req.models;
    const report = await Report.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, is_deleted: false } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: report.s3_key }),
      { expiresIn: 3600 }
    );

    // For standard browser navigation (window.open, <a href>), redirect directly to S3.
    // If the client requested JSON (e.g. from programmatic API), return JSON.
    if (req.headers.accept?.includes('application/json') || req.query.json === 'true') {
      res.json({ success: true, download_url: signedUrl, expires_in: 3600 });
    } else {
      res.redirect(signedUrl);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { upload, getReportsV3, getReportDetailsV3, uploadReportV3, deleteReportV3, downloadReportV3 };
