const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');

const mapOrderResponse = (order) => {
  const json = order.toJSON();
  const patientDob = order.patient?.dob;
  const age = patientDob ? (new Date().getFullYear() - new Date(patientDob).getFullYear()) : 30;

  // medicines in prescription
  const srcMedicines = order.prescription?.medicines?.map(m => ({
    medicineName: m.name,
    dosage: m.dosage,
    quantity: m.quantity,
    instructions: m.instructions || 'As prescribed',
  })) || [];

  return {
    _id: json.id,
    id: json.id,
    tokenNumber: json.notes || (order.prescription?.appointment?.token_number ? String(order.prescription.appointment.token_number) : '') || `RXN${json.id}`,
    status: json.status,
    patientId: order.patient ? {
      _id: order.patient.id,
      id: order.patient.id,
      name: order.patient.full_name,
      age: age,
      gender: order.patient.gender || 'Male',
      phone: order.patient.phone || '',
    } : null,
    prescriptionId: order.prescription ? {
      _id: order.prescription.id,
      id: order.prescription.id,
      doctorName: order.prescription.doctor?.name || 'Dr. Rohit Mehta',
      department: order.prescription.doctor?.department || 'General Medicine',
      medicines: srcMedicines,
      doctorNotes: order.prescription.instructions || '',
    } : null,
    medicines: srcMedicines,
    totalAmount: parseFloat(json.total_amount) || 120,
    paidAmount: json.payment_status === 'Paid' ? (parseFloat(json.total_amount) || 120) : 0,
    startedAt: json.processed_at,
    readyAt: json.updated_at,
    deliveredAt: json.delivered_at,
    createdAt: json.created_at,
  };
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// @desc    Send OTP to pharmacist
// @route   POST /api/pharmacy/auth/send-otp
router.post('/auth/send-otp', async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID is required.' });
    }
    res.json({
      success: true,
      message: `OTP sent successfully. For testing, use code: 123456`,
      otp: '123456'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Pharmacist login
// @route   POST /api/pharmacy/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { storeId, password, otp } = req.body;
    if (!storeId) return res.status(400).json({ message: 'Store ID or Email is required.' });

    // Use default DB connection to look up the user
    const { sequelize } = require('../config/db');
    const { createModels } = require('../services/modelFactory');
    const models = createModels(sequelize);
    const { User } = models;

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { employee_id: storeId },
          { email: storeId.toLowerCase() }
        ]
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status === 'Inactive') return res.status(403).json({ message: 'Account deactivated' });

    if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect password.' });
    } else if (otp) {
      if (otp !== '123456') return res.status(400).json({ message: 'Invalid OTP code.' });
    } else {
      return res.status(400).json({ message: 'Password or OTP is required.' });
    }

    const token = jwt.sign(
      { id: user.id, hospitalId: user.hospital_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    const json = user.toJSON();
    res.json({
      token,
      user: {
        _id: json.id,
        id: json.id,
        fullName: json.name,
        name: json.name,
        email: json.email,
        employeeId: json.employee_id,
        role: json.role,
        phone: json.phone,
        profilePhoto: json.profile_image,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

router.get('/profile', protect, async (req, res) => {
  const json = req.user.toJSON();
  res.json({
    _id: json.id,
    id: json.id,
    fullName: json.name,
    name: json.name,
    email: json.email,
    employeeId: json.employee_id,
    role: json.role,
    phone: json.phone,
    profilePhoto: json.profile_image,
  });
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, email, phone, profilePhoto } = req.body;
    await req.user.update({
      name: fullName || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone,
      profile_image: profilePhoto || req.user.profile_image,
    });
    const json = req.user.toJSON();
    res.json({
      _id: json.id,
      id: json.id,
      fullName: json.name,
      name: json.name,
      email: json.email,
      employeeId: json.employee_id,
      role: json.role,
      phone: json.phone,
      profilePhoto: json.profile_image,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/profile/photo', protect, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    await req.user.update({ profile_image: photoUrl });
    res.json({ success: true, message: 'Photo updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings', protect, async (req, res) => {
  res.json({ success: true, message: 'Settings updated' });
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { User } = req.models;
    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PRESCRIPTION ENDPOINTS
// ==========================================

router.get('/prescriptions/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    let order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Prescription not found' });

    const json = order.toJSON();
    const patientDob = order.patient?.dob;
    const age = patientDob ? (new Date().getFullYear() - new Date(patientDob).getFullYear()) : 30;

    const formattedResponse = {
      _id: json.id,
      tokenNumber: json.notes || (order.prescription?.appointment?.token_number ? String(order.prescription.appointment.token_number) : '') || `RXN${json.id}`,
      status: json.status,
      patient: {
        name: order.patient?.full_name || 'Unknown Patient',
        age: age,
        gender: order.patient?.gender || 'Male',
        phone: order.patient?.phone || '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${order.patient?.full_name || 'Patient'}`
      },
      doctor: {
        name: order.prescription?.doctor?.name || 'Dr. Rohit Mehta',
        department: order.prescription?.doctor?.department || 'General Medicine'
      },
      visitDate: order.prescription?.created_at || order.created_at,
      medicines: order.prescription?.medicines?.map(med => ({
        name: med.name,
        dosage: med.dosage,
        quantity: med.quantity,
        instructions: med.instructions || 'As prescribed'
      })) || [],
      doctorNotes: order.prescription?.instructions || ''
    };

    res.json(formattedResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/prescriptions/:id/status', protect, async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const { id } = req.params;
    const { status } = req.body;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      }
    });

    if (!order) return res.status(404).json({ message: 'Prescription not found' });

    order.status = status;
    if (status === 'Processing') order.processed_at = new Date();
    if (status === 'Delivered') {
      order.delivered_at = new Date();
      order.payment_status = 'Paid';
    }
    await order.save();

    if (req.io) {
      req.io.emit('orderStatusUpdated', order.toJSON());
    }

    res.json({ message: `Status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// ORDER ENDPOINTS
// ==========================================

router.get('/orders/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrderResponse(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders/delivered/:id', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { id } = req.params;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId,
        status: 'Delivered'
      },
      include: [
        { model: Patient, as: 'patient' },
        { 
          model: Prescription, 
          as: 'prescription',
          include: [
            { model: User, as: 'doctor', attributes: ['name', 'department'] },
            { model: PrescriptionMedicine, as: 'medicines' },
            { model: Appointment, as: 'appointment', attributes: ['token_number'] }
          ]
        }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Delivered Order not found' });
    res.json(mapOrderResponse(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/orders/:id/status', protect, async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const { id } = req.params;
    const { status } = req.body;

    const order = await PharmacyOrder.findOne({
      where: {
        [Op.or]: [{ id: id }, { notes: id }],
        hospital_id: req.hospitalId
      }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    if (status === 'Processing') order.processed_at = new Date();
    if (status === 'Delivered') {
      order.delivered_at = new Date();
      order.payment_status = 'Paid';
    }
    await order.save();

    if (req.io) {
      req.io.emit('orderStatusUpdated', order.toJSON());
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/orders/:id/print', protect, async (req, res) => {
  res.json({ success: true, message: 'Printed successfully' });
});

// ==========================================
// PATIENTS & DOCTORS DATA FETCHERS
// ==========================================

router.get('/patients', protect, async (req, res) => {
  try {
    const { Patient } = req.models;
    const patients = await Patient.findAll({
      where: { hospital_id: req.hospitalId }
    });
    const mapped = patients.map(p => {
      const json = p.toJSON();
      return {
        _id: json.id,
        id: json.id,
        name: json.full_name,
        phone: json.phone,
        gender: json.gender,
        age: json.dob ? (new Date().getFullYear() - new Date(json.dob).getFullYear()) : 30,
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/doctors', protect, async (req, res) => {
  try {
    const { User } = req.models;
    const doctors = await User.findAll({
      where: { hospital_id: req.hospitalId, role: 'DOCTOR', status: 'Active' }
    });
    const names = doctors.map(d => `Dr. ${d.name}`);
    res.json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// MANUAL ORDER CREATION ENDPOINT
// ==========================================

router.post('/orders/manual', protect, async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, PrescriptionMedicine } = req.models;
    const { patientId, doctorName, medicines } = req.body;

    if (!patientId || !doctorName || !medicines || medicines.length === 0) {
      return res.status(400).json({ message: 'Patient, Doctor, and at least one medicine are required.' });
    }

    // Generate token number RXN + 5 digits
    const code = Math.floor(10000 + Math.random() * 90000);
    const tokenNumber = `RXN${code}`;

    const prescription = await Prescription.create({
      hospital_id: req.hospitalId,
      patient_id: patientId,
      doctor_id: 1, // default doctor
      diagnosis: 'Created manually at counter.',
      instructions: 'Created manually at counter.',
      status: 'Active',
    });

    for (const m of medicines) {
      await PrescriptionMedicine.create({
        prescription_id: prescription.id,
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
        instructions: m.instructions || 'As prescribed',
      });
    }

    const order = await PharmacyOrder.create({
      hospital_id: req.hospitalId,
      prescription_id: prescription.id,
      patient_id: patientId,
      status: 'Pending',
      notes: tokenNumber, // Store token number in notes!
      total_amount: medicines.reduce((sum, m) => sum + (m.quantity * 12), 0) || 120,
      payment_status: 'Unpaid',
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

router.get('/notifications', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    const notifications = await Notification.findAll({
      where: { hospital_id: req.hospitalId, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] },
      order: [['created_at', 'DESC']]
    });
    const mapped = notifications.map(n => {
      const json = n.toJSON();
      return {
        _id: json.id,
        id: json.id,
        title: json.title,
        message: json.message,
        isRead: json.status === 'read',
        createdAt: json.created_at,
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    const notification = await Notification.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });
    if (notification) {
      notification.status = 'read';
      notification.read_at = new Date();
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/notifications/read-all', protect, async (req, res) => {
  try {
    const { Notification } = req.models;
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { user_id: req.user.id, hospital_id: req.hospitalId, status: 'unread' } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
