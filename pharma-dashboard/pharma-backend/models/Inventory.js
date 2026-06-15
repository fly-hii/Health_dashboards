const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String, // e.g., 'Strip', 'Bottle', 'Capsule'
    required: true
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 10
  },
  price: {
    type: Number,
    required: true,
    default: 0  // price per unit
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'],
    default: 'In Stock'
  }
}, { timestamps: true });

inventorySchema.pre('save', function() {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = 'Expired';
  } else if (this.currentStock === 0) {
    this.status = 'Out of Stock';
  } else if (this.currentStock <= this.reorderLevel) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
});

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
