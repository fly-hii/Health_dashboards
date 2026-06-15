const { Op } = require('sequelize');
const { Appointment, Patient, User, Token, Notification, AuditLog } = require('../models');
const { sequelize } = require('../config/database');

// POST /api/appointments
const createAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const hospitalId = req.hospitalId;
    const { patient_id, doctor_id, department = 'OPD', date_time, reason, notes, visit_type = 'New' } = req.body;

    // Get today's token count for this doctor
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const tokenCount = await Appointment.count({
      where: { hospital_id: hospitalId, doctor_id, date_time: { [Op.between]: [today, todayEnd] } },
      transaction: t,
    });
    const tokenNumber = tokenCount + 1;

    const appointment = await Appointment.create({
      hospital_id: hospitalId,
      patient_id, doctor_id, department,
      date_time: new Date(date_time),
      token_number: tokenNumber,
      reason, notes, visit_type,
      booked_by: req.user?.role || 'RECEPTIONIST',
      status: 'Confirmed',
    }, { transaction: t });

    // Create token
    await Token.create({
      hospital_id: hospitalId,
      appointment_id: appointment.id,
      patient_id, doctor_id,
      token_number: tokenNumber,
      token_date: new Date().toISOString().split('T')[0],
      status: 'Waiting',
    }, { transaction: t });

    await AuditLog.create({
      hospital_id: hospitalId,
      user_id: req.user?.id,
      action: 'CREATE',
      module: 'Appointments',
      table_name: 'appointments',
      record_id: appointment.id,
      description: `Appointment created, Token #${tokenNumber}`,
      ip_address: req.ip,
    }, { transaction: t });

    await t.commit();

    // Notify via socket
    const io = req.app.get('io');
    if (io) io.to(`hospital_${hospitalId}`).emit('new_appointment', { appointment, tokenNumber });

    res.status(201).json({ success: true, data: { ...appointment.toJSON(), tokenNumber } });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    const { date, status, doctor_id, page = 1, limit = 20 } = req.query;
    const hospitalId = req.hospitalId;
    const where = { hospital_id: hospitalId };

    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0);
      const dEnd = new Date(date); dEnd.setHours(23,59,59,999);
      where.date_time = { [Op.between]: [d, dEnd] };
    }
    if (status) where.status = status;
    if (doctor_id) where.doctor_id = doctor_id;

    const pageNum = parseInt(page); const limitNum = parseInt(limit);
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'specialization', 'department'] },
      ],
      order: [['date_time', 'ASC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/appointments/:id/status
const updateAppointmentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const { status } = req.body;
    const oldStatus = appointment.status;
    await appointment.update({ status });

    // Update token status too
    await Token.update(
      { status: status === 'In-Progress' ? 'In-Progress' : status === 'Completed' ? 'Completed' : 'Waiting' },
      { where: { appointment_id: appointment.id } }
    );

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('appointment_updated', { id: appointment.id, status, oldStatus });

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/appointments/today
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, date_time: { [Op.between]: [today, todayEnd] } },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
      ],
      order: [['token_number', 'ASC']],
    });

    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const oldData = appointment.toJSON();
    const updateFields = req.body;
    await appointment.update(updateFields);

    if (updateFields.status) {
      await Token.update(
        { status: updateFields.status === 'In-Progress' ? 'In-Progress' : updateFields.status === 'Completed' ? 'Completed' : 'Waiting' },
        { where: { appointment_id: appointment.id } }
      );
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Appointments',
      table_name: 'appointments',
      record_id: appointment.id,
      old_data: oldData,
      new_data: updateFields,
      description: `Updated appointment #${appointment.id}`,
      ip_address: req.ip,
    });

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/appointments/:id
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const oldData = appointment.toJSON();
    await appointment.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'DELETE',
      module: 'Appointments',
      table_name: 'appointments',
      record_id: appointment.id,
      old_data: oldData,
      description: `Deleted appointment #${appointment.id}`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createAppointment, getAppointments, updateAppointmentStatus, getTodayAppointments, updateAppointment, deleteAppointment };
