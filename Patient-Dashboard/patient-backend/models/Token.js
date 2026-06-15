import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    number: { type: String, required: true },
    department: { type: String, required: true },
    estimatedWaitMinutes: { type: Number, default: 0 },
    peopleAhead: { type: Number, default: 0 },
    status: { type: String, required: true },
    appointmentTime: { type: String },
    doctor: { type: String },
    date: { type: String }, // Used for completed tokens
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Token = mongoose.model('Token', tokenSchema);
export default Token;
