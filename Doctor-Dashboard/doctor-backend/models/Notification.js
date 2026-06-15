import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    relatedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
