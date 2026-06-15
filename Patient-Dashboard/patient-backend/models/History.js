import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    doctor: { type: String, required: true },
    department: { type: String, required: true },
    diagnosis: { type: String, required: true },
    notes: { type: String }
  },
  { timestamps: true }
);

const History = mongoose.model('History', historySchema);
export default History;
