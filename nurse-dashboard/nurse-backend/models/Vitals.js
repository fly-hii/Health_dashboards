const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number },
    },
    temperature: { type: Number }, // Celsius
    pulseRate: { type: Number },   // bpm
    respiratoryRate: { type: Number }, // breaths/min
    spo2: { type: Number },        // %
    weight: { type: Number },      // kg
    height: { type: Number },      // cm
    bmi: { type: Number },         // auto-calculated
    bloodSugar: { type: Number },  // mg/dL
    symptoms: { type: String },
    notes: { type: String },
    isDraft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-calculate BMI
vitalsSchema.pre('save', function (next) {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  next();
});

module.exports = mongoose.model('Vitals', vitalsSchema);
