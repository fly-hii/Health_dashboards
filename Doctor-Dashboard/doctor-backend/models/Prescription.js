import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    prescId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: String, required: true },
    date: { type: String, required: true },
    medicines: [{ type: String }],
    medicineCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Pre-save to auto-generate prescId and calculate medicineCount
prescriptionSchema.pre('save', async function () {
  if (!this.prescId) {
    this.prescId = `RXN${Math.floor(1000 + Math.random() * 9000)}`;
  }
  if (this.medicines) {
    this.medicineCount = this.medicines.length;
  }
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
