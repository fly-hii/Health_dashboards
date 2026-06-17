'use strict';
/**
 * departmentController.js (Hospital Admin Backend)
 * Handles CRUD operations for hospital departments
 */

const getDepartments = async (req, res) => {
  try {
    const { Department, User } = req.models;
    const departments = await Department.findAll({
      where: { hospital_id: req.hospitalId },
      include: [
        {
          model: User,
          as: 'headDoctor',
          attributes: ['id', 'name', 'email', 'phone', 'profile_image', 'employee_id']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDepartment = async (req, res) => {
  const { name, code, head_doctor_id, description, floor, phone_ext, status } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }

  try {
    const { Department, AuditLog } = req.models;

    // Check if code is already used in this hospital
    if (code) {
      const exists = await Department.findOne({
        where: { hospital_id: req.hospitalId, code: code.toUpperCase() }
      });
      if (exists) {
        return res.status(400).json({ success: false, message: `Department code "${code}" already exists` });
      }
    }

    const dept = await Department.create({
      hospital_id: req.hospitalId,
      name,
      code: code ? code.toUpperCase() : null,
      head_doctor_id: head_doctor_id || null,
      description: description || '',
      floor: floor || '',
      phone_ext: phone_ext || '',
      status: status || 'active'
    });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'CREATE',
      module: 'Department Management',
      description: `Created department ${name} (${code || 'No Code'})`,
      ip_address: req.ip
    });

    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { Department, AuditLog } = req.models;
    const dept = await Department.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const { name, code, head_doctor_id, description, floor, phone_ext, status } = req.body;

    if (code && code.toUpperCase() !== dept.code) {
      const exists = await Department.findOne({
        where: { hospital_id: req.hospitalId, code: code.toUpperCase() }
      });
      if (exists) {
        return res.status(400).json({ success: false, message: `Department code "${code}" already exists` });
      }
    }

    dept.name = name !== undefined ? name : dept.name;
    dept.code = code !== undefined ? code.toUpperCase() : dept.code;
    dept.head_doctor_id = head_doctor_id !== undefined ? head_doctor_id : dept.head_doctor_id;
    dept.description = description !== undefined ? description : dept.description;
    dept.floor = floor !== undefined ? floor : dept.floor;
    dept.phone_ext = phone_ext !== undefined ? phone_ext : dept.phone_ext;
    dept.status = status !== undefined ? status : dept.status;

    await dept.save();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Department Management',
      description: `Updated department ${dept.name} (${dept.code || 'No Code'})`,
      ip_address: req.ip
    });

    res.json({ success: true, data: dept });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { Department, AuditLog } = req.models;
    const dept = await Department.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const deptName = dept.name;
    const deptCode = dept.code;

    await dept.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'DELETE',
      module: 'Department Management',
      description: `Deleted department ${deptName} (${deptCode || 'No Code'})`,
      ip_address: req.ip
    });

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
