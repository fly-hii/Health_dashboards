'use strict';
/**
 * userController.js (Hospital Admin Backend)
 * Refactored to Sequelize and dynamic connection resolution (req.models)
 */
const bcrypt = require('bcryptjs');

const getPasswordComplexityError = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !, @, #, $, %, etc.).';
  }
  return null;
};

const getUsers = async (req, res) => {
  try {
    const { User } = req.models;
    const { role, department } = req.query;
    const where = { hospital_id: req.hospitalId };
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

const getEmpIdPrefixForRole = (r) => {
  switch(r) {
    case 'DOCTOR': return 'DOC';
    case 'NURSE': return 'NRS';
    case 'PHARMACIST': return 'CPH';
    case 'LAB_TECHNICIAN': return 'LAB';
    case 'RECEPTIONIST': return 'REC';
    case 'ADMIN': return 'ADM';
    case 'HOSPITAL_ADMIN': return 'HAD';
    default: return 'EMP';
  }
};

const createUser = async (req, res) => {
  const { 
    name, email, password, role, department, phone, profileImage, 
    specialization, experience, qualification, shift, schedule, employeeId 
  } = req.body;

  try {
    const { User, AuditLog, Hospital } = req.models;
    const { Op } = require('sequelize');
    
    // Enforce max users plan restriction
    const hospital = await Hospital.findByPk(req.hospitalId);
    const maxUsers = hospital?.max_users || 10;
    const currentUserCount = await User.count();
    
    if (currentUserCount >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached. Your active plan allows up to ${maxUsers} staff accounts. Please upgrade your subscription plan to add more staff.`
      });
    }
    
    const userExists = await User.findOne({ where: { email, hospital_id: req.hospitalId } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const prefix = getEmpIdPrefixForRole(role);
    let employeeIdToUse = (employeeId || '').trim();
    if (!employeeIdToUse || employeeIdToUse === prefix) {
      const latest = await User.findOne({
        where: { hospital_id: req.hospitalId, employee_id: { [Op.like]: `${prefix}%` } },
        order: [['employee_id', 'DESC']],
      });
      if (!latest?.employee_id) {
        employeeIdToUse = `${prefix}1001`;
      } else {
        const numPart = latest.employee_id.replace(prefix, '');
        const num = parseInt(numPart, 10);
        if (isNaN(num)) {
          employeeIdToUse = `${prefix}1001`;
        } else {
          employeeIdToUse = `${prefix}${num + 1}`;
        }
      }
    }

    let passwordToUse = password;
    if (!passwordToUse) {
      passwordToUse = 'CarePlus@' + Math.floor(1000 + Math.random() * 9000) + 'x!';
    } else {
      const pwdError = getPasswordComplexityError(passwordToUse);
      if (pwdError) {
        return res.status(400).json({ success: false, message: pwdError });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToUse, salt);

    const user = await User.create({
      hospital_id: req.hospitalId,
      name,
      email,
      password: hashedPassword,
      role,
      department,
      phone,
      employee_id: employeeIdToUse,
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
      description: `Created user ${name} (${employeeIdToUse}) with role ${role} in department ${department}`,
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
        department: user.department,
        employeeId: user.employee_id,
        password: passwordToUse
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { User, AuditLog } = req.models;
    const user = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      name, phone, profileImage, department, role, status, employeeId,
      specialization, experience, qualification, shift, schedule, availabilityStatus
    } = req.body;

    const oldStatus = user.status;

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
      const pwdError = getPasswordComplexityError(req.body.password);
      if (pwdError) {
        return res.status(400).json({ success: false, message: pwdError });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    let auditDescription = `Updated user profile for ${user.name} (${user.role})`;
    if (status !== undefined && status !== oldStatus) {
      auditDescription = `${status === 'Active' ? 'Activated' : 'Deactivated'} user account for ${user.name} (${user.role})`;
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'User Management',
      description: auditDescription,
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
    const user = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
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
