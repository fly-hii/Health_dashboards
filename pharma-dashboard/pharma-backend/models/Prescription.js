const mongoose = require('mongoose');

const medicineItemSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true },
  instructions: { type: String }
});

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: String, // cross-system ID from hospital DB
    default: ''
  },
  doctorName: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  tokenNumber: {
    type: String,
    required: true,
    unique: true
  },
  medicines: [medicineItemSchema],
  doctorNotes: {
    type: String
  },
  visitDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
module.exports = Prescription;
