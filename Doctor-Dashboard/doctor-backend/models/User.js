import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, trim: true },
    fullName: { type: String, trim: true },  // admin portal pattern
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    phone:    { type: String, trim: true },
    mobile:   { type: String, trim: true },  // patient portal pattern
    role: {
      type: String,
      // accept both lowercase (nurse/doctor backend) and uppercase (admin portal)
      default: 'nurse',
    },
    status:     { type: String, trim: true },      // admin portal: 'Active' | 'Inactive'
    department: { type: String, trim: true },
    avatar:        { type: String, default: '' },
    profileImage:  { type: String, default: '' },  // admin portal pattern
    employeeId:    { type: String, unique: true, sparse: true },
    isActive:      { type: Boolean, default: true },
    lastLogin:     { type: Date },
    bloodGroup:    { type: String, trim: true },
    gender:        { type: String, trim: true },
    age:           { type: Number },
    address:       { type: String, trim: true },
    patientId:     { type: String, trim: true },
    specialization:{ type: String, trim: true },
    qualification: { type: String, trim: true },
    experience:    { type: Number },
    registrationNumber: { type: String, trim: true },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      appointmentAlerts: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: 'English' }
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
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

const User = mongoose.model('User', userSchema);
export default User;
