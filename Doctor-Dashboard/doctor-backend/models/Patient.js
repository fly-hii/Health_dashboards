import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phone: { type: String },
    email: { type: String, lowercase: true },
    address: { type: String },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    allergies: [{ type: String }],
    chronicDiseases: [{ type: String }],
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    photo: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate patientId
patientSchema.pre('save', async function () {
  if (!this.patientId) {
    const count = await mongoose.model('Patient').countDocuments();
    this.patientId = `P${String(count + 1).padStart(4, '0')}`;
  }
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
