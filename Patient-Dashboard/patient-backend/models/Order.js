import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription'
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient'
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
    }
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
