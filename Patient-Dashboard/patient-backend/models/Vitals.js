import mongoose from 'mongoose';

const vitalsSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number },
    },
    temperature: { type: Number },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
    bloodSugar: { type: Number },
    symptoms: { type: String },
    notes: { type: String },
    isDraft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-calculate BMI
vitalsSchema.pre('save', async function () {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
});

const Vitals = mongoose.model('Vitals', vitalsSchema);
export default Vitals;
