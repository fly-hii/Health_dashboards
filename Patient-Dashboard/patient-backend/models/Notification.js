import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    notifId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Requested/Alias
    title: { type: String },
    message: { type: String, required: true },
    type: { type: String, default: 'Alerts' }, // Appointments, Reminders, Alerts, etc.
    status: { type: String, enum: ['unread', 'read'], default: 'unread' },
    read: { type: Boolean, default: false }, // Legacy support
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId }, // Generic reference ID
    
    // Clinical compatibility fields
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    relatedAppointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    isRead: { type: Boolean },
    time: { type: String }
  },
  { timestamps: true }
);

// Pre-save to auto-generate notifId and synchronize status, read, isRead, patient, patientId
notificationSchema.pre('save', function () {
  if (this.status) {
    this.read = (this.status === 'read');
    this.isRead = this.read;
  } else if (this.read !== undefined) {
    this.status = this.read ? 'read' : 'unread';
    this.isRead = this.read;
  }
  if (this.patient && !this.patientId) {
    this.patientId = this.patient;
  } else if (this.patientId && !this.patient) {
    this.patient = this.patientId;
  }
  if (!this.notifId) {
    this.notifId = `N${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
