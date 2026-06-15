const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Staff fields
    name: { type: String, trim: true },   // staff name; patients use fullName
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['nurse', 'doctor', 'admin', 'patient'],
      default: 'nurse',
    },
    department: { type: String, trim: true },
    avatar: { type: String, default: '' },
    employeeId: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    // Patient portal fields (stored on the same User collection by the patient backend)
    fullName:   { type: String, trim: true },
    mobile:     { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    dob:        { type: String, trim: true },
    gender:     { type: String, trim: true },
    age:        { type: Number },
    address:    { type: String, trim: true },
    patientId:  { type: String, trim: true },
    profileImage: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
