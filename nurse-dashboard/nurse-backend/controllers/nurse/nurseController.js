const { Op, fn, col, literal } = require('sequelize');

// GET /api/nurse/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const { Appointment, Patient, User } = req.models;
    const hospitalId = req.hospitalId;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const whereToday = { hospital_id: hospitalId, date_time: { [Op.between]: [today, todayEnd] } };

    const [
      totalPatientsToday,
      waitingForVitals,
      vitalsCompleted,
      activeAppointments,
      completedConsultations,
    ] = await Promise.all([
      Appointment.count({ where: whereToday }),
      Appointment.count({ where: { ...whereToday, status: { [Op.in]: ['Pending', 'Confirmed'] } } }),
      Appointment.count({ where: { ...whereToday, status: 'In-Progress' } }),
      Appointment.count({ where: { ...whereToday, status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] } } }),
      Appointment.count({ where: { ...whereToday, status: 'Completed' } }),
    ]);

    // Department wise
    const departmentData = await Appointment.findAll({
      where: whereToday,
      attributes: ['department', [fn('COUNT', col('id')), 'count']],
      group: ['department'],
      order: [[literal('count'), 'DESC']],
    });

    // Recent activity
    const recentActivities = await Appointment.findAll({
      where: whereToday,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
      ],
      order: [['updated_at', 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        stats: { totalPatientsToday, waitingForVitals, vitalsCompleted, activeAppointments, completedConsultations },
        departmentWise: departmentData.map(d => ({ department: d.department, count: parseInt(d.dataValues.count) })),
        recentActivities,
        opdTiming: process.env.OPD_TIMING || '09:00 AM - 06:00 PM',
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/patient-queue
const getPatientQueue = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, Vitals } = req.models;
    const { search, department, status, page = 1, limit = 10, date } = req.query;
    const hospitalId = req.hospitalId;

    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const dateRange = date
      ? { [Op.between]: [new Date(date + 'T00:00:00'), new Date(date + 'T23:59:59')] }
      : { [Op.between]: [today, todayEnd] };

    const where = { hospital_id: hospitalId, date_time: dateRange };
    if (department && department !== 'all') where.department = department;
    if (status && status !== 'all') where.status = status;

    const include = [
      { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'] },
      { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
      { model: Vitals, as: 'vitals', required: false },
    ];

    let { count, rows } = await Appointment.findAndCountAll({
      where,
      include,
      order: [['token_number', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true,
    });

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(a =>
        a.patient?.full_name?.toLowerCase().includes(s) ||
        a.patient?.patient_id?.toLowerCase().includes(s) ||
        String(a.token_number).includes(s)
      );
    }

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/nurse/appointment/:id/status
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { Appointment } = req.models;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const appointment = await Appointment.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    await appointment.update({ status });

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${req.hospitalId}`).emit('appointment_status_updated', { appointmentId: appointment.id, status });
      if (status === 'Completed') io.to(`hospital_${req.hospitalId}`).emit('visit_completed', { appointmentId: appointment.id });
    }

    res.json({ success: true, message: 'Status updated', data: appointment });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/appointment/:id
const getAppointmentDetails = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, Vitals } = req.models;
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department', 'phone'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/patient/:id
const getPatientProfile = async (req, res, next) => {
  try {
    const { Patient, Appointment, User, Vitals } = req.models;
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [appointments, vitals] = await Promise.all([
      Appointment.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'department'] }, { model: Vitals, as: 'vitals', required: false }],
        order: [['date_time', 'DESC']],
      }),
      Vitals.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
        order: [['recorded_at', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({ success: true, data: { patient, appointments, vitals, stats: { totalVisits: appointments.length } } });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/patients/search
const searchPatients = async (req, res, next) => {
  try {
    const { Patient } = req.models;
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ success: true, data: [] });

    const patients = await Patient.findAll({
      where: {
        hospital_id: req.hospitalId,
        [Op.or]: [
          { full_name: { [Op.like]: `%${q}%` } },
          { patient_id: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'],
      limit: 20,
    });

    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
};

// PUT /api/nurse/patient/:id
const updatePatient = async (req, res, next) => {
  try {
    const { Patient } = req.models;
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const allowed = ['full_name', 'phone', 'gender', 'blood_group', 'medical_notes', 'address', 'status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await patient.update(updates);
    res.json({ success: true, message: 'Patient updated', data: patient });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/emergency-queue
const getEmergencyQueue = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, Vitals } = req.models;
    const hospitalId = req.hospitalId;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: {
        hospital_id: hospitalId,
        visit_type: 'Emergency',
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] },
        date_time: { [Op.between]: [today, todayEnd] }
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'] },
        { model: User, as: 'doctor', attributes: ['id', 'name', 'department'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
      order: [['date_time', 'ASC']],
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// POST /api/nurse/walk-in
const addWalkInPatient = async (req, res, next) => {
  try {
    const hospitalId = req.hospitalId;
    const { name, age, gender, department, symptoms } = req.body;
    const { Patient, Appointment, AuditLog } = req.models;

    // Generate unique PAT+YYYYMMDD+3digit counter
    const today = new Date();
    const datePrefix = `PAT${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const lastPatient = await Patient.findOne({
      where: { hospital_id: hospitalId, patient_id: { [Op.like]: `${datePrefix}%` } },
      order: [['patient_id', 'DESC']],
    });

    let sequence = 1;
    if (lastPatient?.patient_id) {
      const num = parseInt(lastPatient.patient_id.replace(datePrefix, ''), 10);
      if (!isNaN(num)) sequence = num + 1;
    }
    const patientId = `${datePrefix}${String(sequence).padStart(3, '0')}`;

    // Approximate DOB from age
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    const dobStr = dob.toISOString().split('T')[0];

    const patient = await Patient.create({
      hospital_id: hospitalId,
      patient_id: patientId,
      full_name: name,
      gender,
      dob: dobStr,
      status: 'active',
      phone: '0000000000',
    });

    // Auto token number for the day
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    const tokenCount = await Appointment.count({
      where: { hospital_id: hospitalId, date_time: { [Op.between]: [dayStart, dayEnd] } },
    });
    const tokenNumber = tokenCount + 1;

    // Create walk-in appointment
    const appointment = await Appointment.create({
      hospital_id: hospitalId,
      patient_id: patient.id,
      doctor_id: 1, // Default doctor or first available
      department,
      date_time: new Date(),
      token_number: tokenNumber,
      reason: symptoms || 'Walk-in Consultation',
      visit_type: 'New',
      booked_by: 'NURSE',
      status: 'Pending',
    });

    if (AuditLog) {
      await AuditLog.create({
        hospital_id: hospitalId,
        user_id: req.user?.id,
        action: 'CREATE',
        module: 'Patients',
        table_name: 'patients',
        record_id: patient.id,
        new_data: { name: patient.full_name, patientId: patient.patient_id },
        description: `Registered walk-in patient: ${patient.full_name}`,
        ip_address: req.ip,
      });
    }

    // Emit socket
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${hospitalId}`).emit('new_patient', { patient });
      io.to(`hospital_${hospitalId}`).emit('new_appointment', { appointment });
    }

    res.status(201).json({ success: true, message: `Walk-in patient ${name} registered successfully!`, data: appointment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPatientQueue,
  updateAppointmentStatus,
  getAppointmentDetails,
  getPatientProfile,
  searchPatients,
  updatePatient,
  getEmergencyQueue,
  addWalkInPatient,
};
