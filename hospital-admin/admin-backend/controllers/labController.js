const LabTest = require('../models/LabTest');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { broadcastEvent } = require('../sockets/socket');

const getTests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const tests = await LabTest.find(query)
      .populate('patient', 'name phone dob gender')
      .populate('technician', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTest = async (req, res) => {
  const { status, result, technicianId, notes, reportFile } = req.body;
  try {
    const test = await LabTest.findById(req.params.id).populate('patient', 'name');
    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }

    if (status) test.status = status;
    if (result !== undefined) test.result = result;
    if (notes !== undefined) test.notes = notes;
    if (reportFile !== undefined) test.reportFile = reportFile;
    if (technicianId) test.technician = technicianId;

    await test.save();

    const populatedTest = await LabTest.findById(test._id)
      .populate('patient', 'name')
      .populate('technician', 'name');

    await AuditLog.create({
      user: req.user._id,
      action: 'Lab Test Update',
      module: 'Laboratory',
      description: `Updated lab test '${test.testName}' to status: ${test.status} for patient ${test.patient ? test.patient.name : 'Unknown'}`,
      ipAddress: req.ip
    });

    broadcastEvent('lab_test_update', populatedTest);

    res.json({ success: true, data: populatedTest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTechnicians = async (req, res) => {
  try {
    const technicians = await User.find({ role: 'LAB_TECHNICIAN', status: 'Active' }).select('name email phone status');
    res.json({ success: true, count: technicians.length, data: technicians });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addLabTest = async (req, res) => {
  try {
    const test = await LabTest.create(req.body);
    const populated = await LabTest.findById(test._id).populate('patient', 'name');

    await AuditLog.create({
      user: req.user._id,
      action: 'Lab Test Registered',
      module: 'Laboratory',
      description: `Registered new lab test '${test.testName}' for patient ${populated.patient ? populated.patient.name : 'Unknown'}`,
      ipAddress: req.ip
    });

    broadcastEvent('lab_test_update', populated);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTests,
  updateTest,
  getTechnicians,
  addLabTest
};
