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
    res.json({ success: true, data: reports });
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
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/reports/upload
const uploadReportV3 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { Report } = req.models;
    const { patient_id, appointment_id, title, report_type = 'Other', description } = req.body;
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
      patient_id: patient_id || null,
      appointment_id: appointment_id || null,
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

    res.status(201).json({ success: true, data: report });
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

    res.json({ success: true, download_url: signedUrl, expires_in: 3600 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { upload, getReportsV3, getReportDetailsV3, uploadReportV3, deleteReportV3, downloadReportV3 };
