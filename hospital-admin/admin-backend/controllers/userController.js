'use strict';
/**
 * userController.js (Hospital Admin Backend)
 * Refactored to Sequelize and dynamic connection resolution (req.models)
 */
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const { User } = req.models;
    const { role, department } = req.query;
    const where = {};
    if (role) where.role = role;
    if (department) where.department = department;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });

    // Map `employee_id` to `employeeId` for frontend compatibility
    const data = users.map(u => {
      const json = u.toJSON();
      json._id = json.id;
      json.employeeId = json.employee_id;
      json.profileImage = json.profile_image;
      json.availabilityStatus = json.availability_status;
      if (json.role === 'DOCTOR') {
        json.schedule = {
          days: json.schedule_days || [],
          startTime: json.schedule_start,
          endTime: json.schedule_end
        };
      }
      return json;
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createUser = async (req, res) => {
  const { 
    name, email, password, role, department, phone, profileImage, 
    specialization, experience, qualification, shift, schedule, employeeId 
  } = req.body;

  try {
    const { User, AuditLog } = req.models;
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const user = await User.create({
      hospital_id: req.hospitalId,
      name,
      email,
      password: hashedPassword,
      role,
      department,
      phone,
      employee_id: employeeId || null,
      profile_image: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
      specialization: specialization || null,
      experience: experience !== undefined ? parseInt(experience) : null,
      qualification: qualification || null,
      shift: shift || 'Morning',
      schedule_days: schedule?.days || null,
      schedule_start: schedule?.startTime || '09:00 AM',
      schedule_end: schedule?.endTime || '05:00 PM',
      availability_status: 'Available'
    });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user ? req.user.id : user.id,
      action: 'CREATE',
      module: 'User Management',
      description: `Created user ${name} with role ${role} in department ${department}`,
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        _id: user.id, // For frontend compatibility
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { User, AuditLog } = req.models;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      name, phone, profileImage, department, role, status, employeeId,
      specialization, experience, qualification, shift, schedule, availabilityStatus
    } = req.body;

    const fields = {
      name, phone, department, role, status,
      specialization, qualification, shift,
      profile_image: profileImage,
      employee_id: employeeId,
      experience: experience !== undefined && experience !== '' ? parseInt(experience) : undefined,
      schedule_days: schedule?.days,
      schedule_start: schedule?.startTime,
      schedule_end: schedule?.endTime,
      availability_status: availabilityStatus
    };

    Object.keys(fields).forEach(key => {
      if (fields[key] !== undefined) {
        user[key] = fields[key];
      }
    });

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'User Management',
      description: `Updated user profile for ${user.name} (${user.role})`,
      ip_address: req.ip
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { User, AuditLog } = req.models;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userName = user.name;
    const userRole = user.role;
    await user.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'DELETE',
      module: 'User Management',
      description: `Deleted user ${userName} with role ${userRole}`,
      ip_address: req.ip
    });

    res.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
