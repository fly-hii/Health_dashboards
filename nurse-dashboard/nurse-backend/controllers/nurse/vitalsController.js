const { Op } = require('sequelize');

const mapIncomingBody = (body) => {
  const mapped = { ...body };
  if (body.patientId) mapped.patient_id = body.patientId;
  if (body.appointmentId) mapped.appointment_id = body.appointmentId;
  if (body.bloodPressureSystolic) mapped.blood_pressure_systolic = body.bloodPressureSystolic;
  if (body.bloodPressureDiastolic) mapped.blood_pressure_diastolic = body.bloodPressureDiastolic;
  if (body.pulseRate) {
    mapped.pulse_rate = body.pulseRate;
    mapped.pulse = body.pulseRate;
  }
  if (body.respiratoryRate) mapped.respiratory_rate = body.respiratoryRate;
  if (body.bloodSugar) mapped.blood_sugar = body.bloodSugar;
  if (body.painScale !== undefined) mapped.pain_scale = body.painScale;
  return mapped;
};

// POST /api/vitals
const recordVitals = async (req, res, next) => {
  try {
    const { Vitals, Appointment, Notification, User } = req.models;
    const body = mapIncomingBody(req.body);
    const {
      patient_id, appointment_id,
      blood_pressure_systolic, blood_pressure_diastolic,
      temperature, pulse, pulse_rate, respiratory_rate,
      spo2, weight, height, blood_sugar, pain_scale, symptoms, notes,
    } = body;

    const bp = blood_pressure_systolic && blood_pressure_diastolic
      ? `${blood_pressure_systolic}/${blood_pressure_diastolic}`
      : body.blood_pressure;

    const bmi = (weight && height) ? parseFloat((weight / ((height / 100) ** 2)).toFixed(2)) : null;

    const vitals = await Vitals.create({
      hospital_id: req.hospitalId,
      patient_id,
      appointment_id: appointment_id || null,
      recorded_by: req.user?.id,
      blood_pressure: bp,
      pulse: pulse || pulse_rate,
      temperature,
      spo2,
      weight,
      height,
      bmi,
      respiratory_rate,
      blood_sugar,
      pain_scale,
      symptoms,
      notes,
      recorded_at: new Date(),
    });

    // Update appointment status to In-Progress when vitals are done
    if (appointment_id) {
      await Appointment.update({ status: 'In-Progress' }, { where: { id: appointment_id, hospital_id: req.hospitalId } });

      // Notify doctor via notification
      const appointment = await Appointment.findOne({ where: { id: appointment_id, hospital_id: req.hospitalId } });
      if (appointment?.doctor_id) {
        await Notification.create({
          hospital_id: req.hospitalId,
          user_id: appointment.doctor_id,
          title: 'Patient Vitals Ready',
          message: `Vitals recorded. Patient is ready for consultation.`,
          type: 'patient',
          priority: 'medium',
        });
      }

      // Tenant-scoped socket events
      const io = req.app.get('io');
      if (io) {
        io.to(`hospital_${req.hospitalId}`).emit('vitals_recorded', { appointmentId: appointment_id, vitalsId: vitals.id, patientId: patient_id, hospitalId: req.hospitalId });
        io.to(`hospital_${req.hospitalId}`).emit('appointment_status_updated', { appointmentId: appointment_id, status: 'In-Progress', hospitalId: req.hospitalId });
        io.to('system_relay').emit('vitals_recorded', { appointmentId: appointment_id, vitalsId: vitals.id, patientId: patient_id, hospitalId: req.hospitalId });
        io.to('system_relay').emit('appointment_status_updated', { appointmentId: appointment_id, status: 'In-Progress', hospitalId: req.hospitalId });
      }
    }

    const result = await Vitals.findByPk(vitals.id, {
      include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
    });

    res.status(201).json({ success: true, message: 'Vitals recorded successfully', data: result });
  } catch (error) {
    next(error);
  }
};

// PUT /api/vitals/:id
const updateVitals = async (req, res, next) => {
  try {
    const { Vitals } = req.models;
    const vitals = await Vitals.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!vitals) return res.status(404).json({ success: false, message: 'Vitals not found' });

    const body = mapIncomingBody(req.body);
    const { blood_pressure_systolic, blood_pressure_diastolic, ...rest } = body;
    const updates = { ...rest };
    if (blood_pressure_systolic && blood_pressure_diastolic) {
      updates.blood_pressure = `${blood_pressure_systolic}/${blood_pressure_diastolic}`;
    }
    if (updates.weight && updates.height) {
      updates.bmi = parseFloat((updates.weight / ((updates.height / 100) ** 2)).toFixed(2));
    }

    await vitals.update(updates);
    res.json({ success: true, message: 'Vitals updated', data: vitals });
  } catch (error) {
    next(error);
  }
};

// GET /api/vitals/appointment/:appointmentId
const getVitalsByAppointment = async (req, res, next) => {
  try {
    const { Vitals, User } = req.models;
    const vitals = await Vitals.findOne({
      where: { appointment_id: req.params.appointmentId, hospital_id: req.hospitalId },
      include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
    });
    res.json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
};

// GET /api/vitals/patient/:patientId
const getVitalsByPatient = async (req, res, next) => {
  try {
    const { Vitals, User } = req.models;
    const vitals = await Vitals.findAll({
      where: { patient_id: req.params.patientId, hospital_id: req.hospitalId },
      include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
      order: [['recorded_at', 'DESC']],
      limit: 20,
    });
    res.json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
};

module.exports = { recordVitals, updateVitals, getVitalsByAppointment, getVitalsByPatient };
