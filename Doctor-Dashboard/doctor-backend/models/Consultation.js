import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  dosage: { type: String, default: '' },
  frequency: { type: String, default: '' },
  duration: { type: String, default: '' },
  instructions: { type: String, default: '' }
});

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symptoms: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    doctorNotes: { type: String, default: '' },
    medicines: [medicineSchema],
    labTests: [{ type: String }],
    followUpDate: { type: Date },
    status: { type: String, enum: ['in_consultation', 'completed'], default: 'in_consultation' }
  },
  { timestamps: true }
);

const Consultation = mongoose.model('Consultation', consultationSchema);
export default Consultation;
