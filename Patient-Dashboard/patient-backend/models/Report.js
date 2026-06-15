import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // Primary fields (new schema)
    reportId: { type: String, unique: true, sparse: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportName: { type: String, trim: true },
    reportType: {
      type: String,
      enum: ['lab', 'imaging', 'others'],
      default: 'others'
    },
    fileUrl: { type: String, default: '' },
    fileSize: { type: String, default: '0 MB' },
    fileType: {
      type: String,
      enum: ['pdf', 'jpg', 'jpeg', 'png', 'dicom', 'other'],
      default: 'pdf'
    },
    cloudinaryId: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },

    // Backward-compatible aliases
    repId: { type: String, unique: true, sparse: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    date: { type: String },
    size: { type: String },
    category: {
      type: String,
      enum: ['Lab Reports', 'Imaging', 'Others'],
      default: 'Others'
    }
  },
  { timestamps: true }
);

// Map reportType <-> category bidirectionally
const TYPE_TO_CATEGORY = { lab: 'Lab Reports', imaging: 'Imaging', others: 'Others' };
const CATEGORY_TO_TYPE = { 'Lab Reports': 'lab', Imaging: 'imaging', Others: 'others' };

reportSchema.pre('save', async function () {
  // Sync primary IDs
  if (!this.reportId && !this.repId) {
    const id = `REP${Math.floor(1000 + Math.random() * 9000)}`;
    this.reportId = id;
    this.repId = id;
  } else if (this.reportId && !this.repId) {
    this.repId = this.reportId;
  } else if (this.repId && !this.reportId) {
    this.reportId = this.repId;
  }

  // Sync patient fields
  if (this.patientId && !this.patient) this.patient = this.patientId;
  if (this.patient && !this.patientId) this.patientId = this.patient;

  // Sync name fields
  if (this.reportName && !this.name) this.name = this.reportName;
  if (this.name && !this.reportName) this.reportName = this.name;

  // Sync size fields
  if (this.fileSize && !this.size) this.size = this.fileSize;
  if (this.size && !this.fileSize) this.fileSize = this.size;

  // Sync category <-> reportType
  if (this.reportType && !this.category) {
    this.category = TYPE_TO_CATEGORY[this.reportType] || 'Others';
  }
  if (this.category && !this.reportType) {
    this.reportType = CATEGORY_TO_TYPE[this.category] || 'others';
  }

  // Set uploadedAt date string alias
  if (!this.date) {
    this.date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
  if (!this.uploadedAt) this.uploadedAt = new Date();
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
