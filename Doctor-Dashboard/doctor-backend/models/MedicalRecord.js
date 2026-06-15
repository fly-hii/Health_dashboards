import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  dosage: { type: String, default: '' },
  frequency: { type: String, default: '' },
  duration: { type: String, default: '' },
  instructions: { type: String, default: '' }
});

const reportSchema = new mongoose.Schema({
  reportName: { type: String },
  category: { type: String },
  url: { type: String }
});

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    visitDate: { type: Date, required: true, default: Date.now },
    department: { type: String, required: true },
    diagnosis: { type: String, default: '' },
    prescriptions: [prescriptionSchema],
    reports: [reportSchema],
    doctorNotes: { type: String, default: '' },
    vitals: { type: mongoose.Schema.Types.ObjectId, ref: 'Vitals' },
    status: { type: String, enum: ['completed', 'pending_reports', 'follow_up'], default: 'completed' }
  },
  { timestamps: true }
);

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
