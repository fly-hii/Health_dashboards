const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    tokenNumber: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String },
    status: {
      type: String,
      enum: ['checked_in', 'waiting_for_vitals', 'vitals_done', 'with_doctor', 'consultation_done', 'cancelled'],
      default: 'checked_in',
    },
    isEmergency: { type: Boolean, default: false },
    emergencyPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    symptoms: { type: String },
    notes: { type: String },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vitals: { type: mongoose.Schema.Types.ObjectId, ref: 'Vitals' },
  },
  { timestamps: true }
);

// Auto-generate tokenNumber
appointmentSchema.pre('save', async function (next) {
  if (!this.tokenNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Appointment').countDocuments({
      createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) },
    });
    this.tokenNumber = `T${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
