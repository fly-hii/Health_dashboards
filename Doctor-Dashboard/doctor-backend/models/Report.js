import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // New fields requested:
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportName: { type: String, required: true, trim: true },
    reportType: { type: String, required: true }, // 'lab', 'imaging', 'others'
    reportDate: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: String, required: true },
    uploadedBy: { type: String, required: true },

    // Backward compatible fields:
    repId: { type: String },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    name: { type: String, trim: true },
    date: { type: String },
    size: { type: String },
    category: { type: String }
  },
  { timestamps: true }
);

// Pre-save hook to generate repId and map/synchronize compatibility fields
reportSchema.pre('save', function (next) {
  if (!this.repId) {
    this.repId = `REP${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Synchronize fields for backend safety:
  if (this.patientId && !this.patient) this.patient = this.patientId;
  if (this.patient && !this.patientId) this.patientId = this.patient;

  if (this.reportName && !this.name) this.name = this.reportName;
  if (this.name && !this.reportName) this.reportName = this.name;

  if (this.reportDate && !this.date) this.date = this.reportDate;
  if (this.date && !this.reportDate) this.reportDate = this.date;

  if (this.fileSize && !this.size) this.size = this.fileSize;
  if (this.size && !this.fileSize) this.fileSize = this.size;

  if (this.reportType && !this.category) this.category = this.reportType;
  if (this.category && !this.reportType) this.reportType = this.category;

  next();
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
