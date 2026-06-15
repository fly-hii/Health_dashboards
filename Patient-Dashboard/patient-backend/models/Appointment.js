import mongoose from 'mongoose';

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
    
    // Doctor consultation extensions
    diagnosis: { type: String },
    prescription: [
      {
        medicineName: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
        duration: { type: String },
      }
    ],
    clinicalNotes: { type: String }
  },
  { timestamps: true }
);

// Auto-generate/update tokenNumber based on appointmentDate
appointmentSchema.pre('save', async function () {
  if (this.isNew || this.isModified('appointmentDate') || !this.tokenNumber) {
    const apptDate = new Date(this.appointmentDate);
    const year = apptDate.getFullYear();
    const month = String(apptDate.getMonth() + 1).padStart(2, '0');
    const day = String(apptDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const startOfDay = new Date(apptDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(apptDate);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await mongoose.model('Appointment').countDocuments({
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      _id: { $ne: this._id }
    });
    this.tokenNumber = `T${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
