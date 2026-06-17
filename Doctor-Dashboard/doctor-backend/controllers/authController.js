import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'doctor_dashboard_super_secret_jwt_key_2024', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Login doctor
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email' });
    }
    if (!password && !otp) {
      return res.status(400).json({ success: false, message: 'Please provide password or OTP' });
    }

    const user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { employeeId: email }, { phone: email }] });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Accept uppercase (admin portal) and lowercase role values
    const roleNorm = (user.role || '').toLowerCase();
    if (roleNorm !== 'doctor' && roleNorm !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: not a doctor account' });
    }

    if (otp) {
      if (otp !== '123456') {
        return res.status(401).json({ success: false, message: 'Invalid OTP code' });
      }
    } else {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    // Accept isActive (nurse/doctor schema) OR status: 'Active' (admin portal schema)
    const isActive = user.isActive !== false && user.status !== 'Inactive';
    if (!isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.updateOne({ lastLogin: user.lastLogin }); // avoid triggering pre-save password re-hash

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      profile: {
        _id:        user._id,
        name:       user.name || user.fullName,
        email:      user.email,
        phone:      user.phone || user.mobile,
        role:       user.role,
        department: user.department,
        avatar:     user.avatar || user.profileImage,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Register doctor/nurse
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, department, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const assignedRole = role || 'doctor';
    const prefix = assignedRole === 'doctor' ? 'D' : 'N';
    const count = await User.countDocuments({ role: assignedRole });
    const employeeId = `${prefix}-2024-${String(count + 1).padStart(3, '0')}`;

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: assignedRole,
      department: department || 'General Medicine',
      employeeId,
      isActive: true
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        employeeId: user.employeeId,
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current doctor profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        employeeId: user.employeeId,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, department, avatar } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone !== undefined ? phone : user.phone;
    user.department = department || user.department;
    user.avatar = avatar !== undefined ? avatar : user.avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        employeeId: user.employeeId,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get complete doctor profile
// @route   GET /api/doctors/profile
// @access  Private
export const getDoctorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({
      success: true,
      profile: {
        id: user._id,
        _id: user._id,
        name: user.name || user.fullName,
        email: user.email,
        phone: user.phone || user.mobile,
        department: user.department,
        specialization: user.specialization,
        qualification: user.qualification,
        registrationNumber: user.registrationNumber,
        address: user.address,
        profileImage: user.avatar || user.profileImage,
        preferences: user.preferences || {
          emailNotifications: true,
          smsNotifications: true,
          appointmentAlerts: true,
          darkMode: false,
          language: 'English'
        }
      }
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private
export const updateDoctorProfile = async (req, res) => {
  try {
    const { name, email, phone, address, preferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (name !== undefined) {
      user.name = name;
      user.fullName = name; // sync with admin portal pattern
    }

    if (email !== undefined) {
      const emailLower = email.toLowerCase();
      if (emailLower !== user.email.toLowerCase()) {
        const emailExists = await User.findOne({ email: emailLower });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email is already in use by another user' });
        }
        user.email = emailLower;
      }
    }

    if (phone !== undefined) {
      user.phone = phone;
      user.mobile = phone; // sync with patient portal pattern
    }

    if (address !== undefined) {
      user.address = address;
    }

    if (preferences !== undefined) {
      user.preferences = {
        ...(user.preferences || {}),
        ...preferences
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        _id: user._id,
        name: user.name || user.fullName,
        email: user.email,
        phone: user.phone || user.mobile,
        department: user.department,
        specialization: user.specialization,
        qualification: user.qualification,
        registrationNumber: user.registrationNumber,
        address: user.address,
        profileImage: user.avatar || user.profileImage,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change doctor password
// @route   PUT /api/doctors/change-password
// @access  Private
export const changeDoctorPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    // Password strength validation: min 8 characters, uppercase, lowercase, and a number
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const isMinLength = newPassword.length >= 8;

    if (!isMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Upload doctor avatar
// @route   POST /api/doctors/upload-avatar
// @access  Private
export const uploadDoctorAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const imageUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    user.avatar = imageUrl;
    user.profileImage = imageUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
