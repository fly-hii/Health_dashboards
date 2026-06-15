const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['new_appointment', 'emergency_alert', 'doctor_request', 'patient_waiting', 'vitals_required', 'general'],
      default: 'general',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    relatedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
