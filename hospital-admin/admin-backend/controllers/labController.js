'use strict';

const { broadcastEvent } = require('../sockets/socket');

// Helper to map DB status to frontend expected status
const mapDbStatusToFrontend = (status) => {
  if (['Ordered', 'Sample-Collected', 'Processing'].includes(status)) {
    return 'Pending';
  }
  return status;
};

// Helper to map frontend status to DB status
const mapFrontendStatusToDb = (status) => {
  if (status === 'Pending') {
    return 'Ordered'; // Default/initial status in HMS DB schema
  }
  return status;
};

const getTests = async (req, res) => {
  try {
    const { LabTest, Patient, User } = req.models;
    const { status } = req.query;

    const where = { hospital_id: req.hospitalId };
    if (status) {
      // If filtering by status, map the frontend query status to the appropriate DB status
      if (status === 'Pending') {
        // Pending maps to Ordered, Sample-Collected, or Processing in the database
        where.status = ['Ordered', 'Sample-Collected', 'Processing'];
      } else {
        where.status = status;
      }
    }

    const tests = await LabTest.findAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'dob', 'gender']
        },
        {
          model: User,
          as: 'technician',
          foreignKey: 'technician_id',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const mapped = tests.map(test => {
      const json = test.toJSON();
      json._id = json.id;
      json.testDate = json.created_at || json.createdAt;
      json.status = mapDbStatusToFrontend(json.status);
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.name = json.patient.full_name;
      }
      if (json.technician) {
        json.technician._id = json.technician.id;
      }
      return json;
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    console.error('Error in getTests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTest = async (req, res) => {
  const { status, result, technicianId, notes } = req.body;
  try {
    const { LabTest, Patient, User, AuditLog } = req.models;
    const test = await LabTest.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }

    if (status) {
      test.status = mapFrontendStatusToDb(status);
      if (test.status === 'Completed') {
        test.completed_at = new Date();
      }
    }
    if (result !== undefined) test.result = result;
    if (notes !== undefined) test.notes = notes;
    // Store technician in technician_id (not doctor_id which is the ordering doctor)
    if (technicianId) test.technician_id = technicianId;

    await test.save();

    const populatedTest = await LabTest.findOne({
      where: { id: test.id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name']
        },
        {
          model: User,
          as: 'technician',
          foreignKey: 'technician_id',
          attributes: ['id', 'name']
        }
      ]
    });

    const mapped = populatedTest.toJSON();
    mapped._id = mapped.id;
    mapped.testDate = mapped.created_at || mapped.createdAt;
    mapped.status = mapDbStatusToFrontend(mapped.status);
    if (mapped.patient) {
      mapped.patient._id = mapped.patient.id;
      mapped.patient.name = mapped.patient.full_name;
    }
    if (mapped.technician) {
      mapped.technician._id = mapped.technician.id;
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Laboratory',
      description: `Updated lab test '${test.test_name || ''}' to status: ${mapped.status} for patient ${mapped.patient ? mapped.patient.name : 'Unknown'}`,
      ip_address: req.ip
    });

    broadcastEvent('lab_test_update', mapped);

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error in updateTest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTechnicians = async (req, res) => {
  try {
    const { User } = req.models;
    const technicians = await User.findAll({
      where: {
        hospital_id: req.hospitalId,
        role: 'LAB_TECHNICIAN',
        status: 'Active'
      },
      attributes: ['id', 'name', 'email', 'phone', 'status']
    });

    const mapped = technicians.map(tech => {
      const json = tech.toJSON();
      json._id = json.id;
      return json;
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    console.error('Error in getTechnicians:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addLabTest = async (req, res) => {
  try {
    const { LabTest, Patient, AuditLog } = req.models;
    const patient_id = req.body.patientId || req.body.patient_id;
    const test_name = req.body.testName || req.body.test_name;
    const category = req.body.category;
    const priority = req.body.priority;
    const notes = req.body.notes;
    const doctor_id = req.body.technicianId || req.body.doctor_id || req.body.technician;
    const consultation_id = req.body.consultationId || req.body.consultation_id;

    const test = await LabTest.create({
      hospital_id: req.hospitalId,
      patient_id,
      test_name,
      category,
      priority,
      notes,
      // doctor_id = ordering doctor (from consultation), technician_id = assigned tech
      doctor_id: req.body.doctor_id || req.body.consultingDoctorId || null,
      technician_id: req.body.technicianId || req.body.technician || null,
      consultation_id,
      status: 'Ordered'
    });

    const populated = await LabTest.findByPk(test.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name']
        }
      ]
    });

    const mapped = populated.toJSON();
    mapped._id = mapped.id;
    mapped.testDate = mapped.created_at || mapped.createdAt;
    mapped.status = mapDbStatusToFrontend(mapped.status);
    if (mapped.patient) {
      mapped.patient._id = mapped.patient.id;
      mapped.patient.name = mapped.patient.full_name;
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'CREATE',
      module: 'Laboratory',
      description: `Registered new lab test '${test.test_name}' for patient ${mapped.patient ? mapped.patient.name : 'Unknown'}`,
      ip_address: req.ip
    });

    broadcastEvent('lab_test_update', mapped);

    res.status(201).json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error in addLabTest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTests,
  updateTest,
  getTechnicians,
  addLabTest
};
