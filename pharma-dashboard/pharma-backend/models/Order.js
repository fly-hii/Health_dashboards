const mongoose = require('mongoose');

const orderedMedicineSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true },
  picked: { type: Boolean, default: false },
  packed: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending', 'Picking', 'Picked'], default: 'Pending' },
  packedIn: { type: String } // e.g., 'Strip', 'Bottle', 'Tube'
});

const orderSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  tokenNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Packed', 'Ready', 'Delivered'],
    default: 'Pending'
  },
  medicines: [orderedMedicineSchema],
  pharmacistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: { type: Date },
  readyAt: { type: Date },
  deliveredAt: { type: Date },
  paymentMethod: { type: String },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
