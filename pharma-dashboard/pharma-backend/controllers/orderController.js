const { Op } = require('sequelize');

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
    // Sequelize aliases timestamp columns: created_at → createdAt, updated_at → updatedAt
    startedAt: json.processed_at,
    readyAt: json.updatedAt,
    deliveredAt: json.delivered_at,
    createdAt: json.createdAt,
  };
};

// @desc    Get all orders (with filters)
// @route   GET /api/orders
// @access  Public (should be private)
const getOrders = async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { status, search } = req.query;

    const where = { hospital_id: req.hospitalId };
    if (status && status !== 'All Status') {
      where.status = status;
    }

    const orders = await PharmacyOrder.findAll({
      where,
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
      ],
      order: [['created_at', 'DESC']]
    });

    let mapped = orders.map(mapOrderResponse);

    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter(o => 
        o.tokenNumber?.toLowerCase().includes(q) ||
        o.patientId?.name?.toLowerCase().includes(q)
      );
    }

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public
const getOrderById = async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const order = await PharmacyOrder.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
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

    if (order) {
      res.json(mapOrderResponse(order));
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Public
const updateOrderStatus = async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const { status } = req.body;
    const order = await PharmacyOrder.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
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

    if (order) {
      order.status = status;
      if (status === 'Processing') order.processed_at = new Date();
      if (status === 'Delivered') {
        order.delivered_at = new Date();
        order.payment_status = 'Paid';
      }
      
      await order.save();
      const updatedMapped = mapOrderResponse(order);
      
      // Emit socket event to this hospital's room only
      if (req.io) {
        req.io.to(`hospital_${req.hospitalId}`).emit('orderStatusUpdated', updatedMapped);
      }
      
      res.json(updatedMapped);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order medicine status (picked/packed)
// @route   PUT /api/orders/:id/medicines
// @access  Public
const updateOrderMedicines = async (req, res) => {
  try {
    const { PharmacyOrder, Prescription, Patient, User, PrescriptionMedicine, Appointment } = req.models;
    const order = await PharmacyOrder.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
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

    if (order) {
      const updatedMapped = mapOrderResponse(order);
      if (req.io) {
        req.io.to(`hospital_${req.hospitalId}`).emit('orderStatusUpdated', updatedMapped);
      }
      res.json(updatedMapped);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/orders/stats/dashboard
// @access  Public
const getDashboardStats = async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const totalOrders = await PharmacyOrder.count({ where: { hospital_id: req.hospitalId } });
    const pendingOrders = await PharmacyOrder.count({ where: { hospital_id: req.hospitalId, status: 'Pending' } });
    const processingOrders = await PharmacyOrder.count({ where: { hospital_id: req.hospitalId, status: 'Processing' } });
    const readyOrders = await PharmacyOrder.count({ where: { hospital_id: req.hospitalId, status: 'Ready' } });
    const deliveredOrders = await PharmacyOrder.count({ where: { hospital_id: req.hospitalId, status: 'Delivered' } });

    // Aggregate revenue
    const revenueSum = await PharmacyOrder.sum('total_amount', {
      where: { hospital_id: req.hospitalId, status: 'Delivered' }
    });
    const revenue = parseFloat(revenueSum) || 0;

    res.json({
      totalOrders,
      pendingOrders,
      processingOrders,
      readyOrders,
      deliveredOrders,
      revenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily order counts for last 7 days
// @route   GET /api/orders/stats/daily-trend
// @access  Private
const getDailyTrend = async (req, res) => {
  try {
    const { PharmacyOrder } = req.models;
    const { Sequelize } = require('sequelize');
    const { Op } = require('sequelize');

    // Build last 7 days array (newest last)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]); // 'YYYY-MM-DD'
    }

    // Count orders per day using raw query for reliability across MySQL dialects
    const db = req.db;
    const [rows] = await db.query(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM pharmacy_orders
       WHERE hospital_id = :hospitalId
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      { replacements: { hospitalId: req.hospitalId } }
    );

    // Map to all 7 days, filling 0 for days with no orders
    const countByDay = {};
    rows.forEach(row => {
      const dayStr = row.day instanceof Date
        ? row.day.toISOString().split('T')[0]
        : String(row.day).slice(0, 10);
      countByDay[dayStr] = Number(row.count);
    });

    const trend = days.map(day => {
      const date = new Date(day + 'T00:00:00');
      const label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return { name: label, orders: countByDay[day] || 0 };
    });

    res.json(trend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderMedicines,
  getDashboardStats,
  getDailyTrend
};
