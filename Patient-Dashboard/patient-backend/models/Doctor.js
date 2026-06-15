import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    docId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true },
    experience: { type: String },
    rating: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    availability: { type: String }
  },
  { timestamps: true }
);

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
