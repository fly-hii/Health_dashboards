const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Pharmacist', 'Senior Pharmacist', 'Store Manager', 'Admin'],
    default: 'Pharmacist',
  },
  storeLocation: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
    default: '',
  },
  otpCode: {
    type: String,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  storeSettings: {
    storeName: { type: String, default: 'CarePlus Pharmacy' },
    storeCode: { type: String, default: 'CP-JPR-001' },
    storeAddress: { type: String, default: 'CarePlus Pharmacy, Jaipur Main Road' },
    storePhone: { type: String, default: '9876543210' },
    storeEmail: { type: String, default: 'jaipur.store@careplus.com' },
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '21:00' },
    taxRegNumber: { type: String, default: 'TAX-9876543' },
    gstNumber: { type: String, default: '08AAAAA1111A1Z1' }
  },
  notificationSettings: {
    newPrescription: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    readyOrders: { type: Boolean, default: true },
    delivery: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
