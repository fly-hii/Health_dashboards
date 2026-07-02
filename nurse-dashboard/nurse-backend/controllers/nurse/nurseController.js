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
      missedAppointments,
    ] = await Promise.all([
      Appointment.count({ where: whereToday }),
      Appointment.count({ where: { ...whereToday, status: { [Op.in]: ['Pending', 'Confirmed'] } } }),
      Appointment.count({ where: { ...whereToday, status: 'In-Progress' } }),
      Appointment.count({ where: { ...whereToday, status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] } } }),
      Appointment.count({ where: { ...whereToday, status: 'Completed' } }),
      Appointment.count({ where: { ...whereToday, status: 'No-Show' } }),
    ]);

    // Department wise (grouped by doctor's department)
    const departmentData = await Appointment.findAll({
      where: whereToday,
      include: [{ model: User, as: 'doctor', attributes: [] }],
      attributes: [[col('doctor.department'), 'department'], [fn('COUNT', col('Appointment.id')), 'count']],
      group: [col('doctor.department')],
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

    const mappedActivities = recentActivities.map(appt => {
      const json = appt.toJSON();
      json.patientName = json.patient?.full_name;
      json.doctor = json.doctor?.name;
      json.time = json.updated_at || json.date_time;
      json.type = json.status === 'In-Progress' ? 'vitals' : 'check_in';
      return json;
    });

    // Fetch doctor on duty (matching nurse's department first, then fallback to any active doctor in the hospital)
    const nurseDept = req.user?.department;
    let doctorOnDutyUser = null;
    if (nurseDept) {
      doctorOnDutyUser = await User.findOne({
        where: { hospital_id: hospitalId, role: 'DOCTOR', department: nurseDept, status: 'Active' },
        attributes: ['name']
      });
    }
    if (!doctorOnDutyUser) {
      doctorOnDutyUser = await User.findOne({
        where: { hospital_id: hospitalId, role: 'DOCTOR', status: 'Active' },
        attributes: ['name']
      });
    }
    const doctorOnDuty = doctorOnDutyUser ? `Dr. ${doctorOnDutyUser.name}` : 'No Doctor On Duty';

    res.json({
      success: true,
      data: {
        stats: { totalPatientsToday, waitingForVitals, vitalsCompleted, activeAppointments, completedConsultations, missedAppointments },
        departmentWise: departmentData.map(d => ({ department: d.department, count: parseInt(d.dataValues.count) })),
        recentActivities: mappedActivities,
        doctorOnDuty,
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
    
    if (status && status !== 'all') {
      if (status === 'waiting_for_vitals') {
        where.status = { [Op.in]: ['Pending', 'Confirmed'] };
      } else if (status === 'consultation_done') {
        where.status = { [Op.in]: ['In-Progress', 'Completed'] };
      } else if (status === 'in_progress') {
        where.status = 'In-Progress';
      } else {
        where.status = status;
      }
    }

    const include = [
      { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'] },
      { 
        model: User, 
        as: 'doctor', 
        attributes: ['id', 'name', 'department'],
        ...(department && department !== 'all' && department !== 'All Departments' ? { where: { department } } : {})
      },
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

    const mapStatus = (s) => {
      if (s === 'Pending' || s === 'Confirmed') return 'waiting_for_vitals';
      if (s === 'In-Progress') return 'in_progress';
      if (s === 'Completed') return 'consultation_done';
      if (s === 'No-Show') return 'No-Show';
      if (s === 'Cancelled') return 'Cancelled';
      return s;
    };

    const mappedRows = rows.map(appt => {
      const json = appt.toJSON();
      json._id = json.id;
      json.status = mapStatus(json.status);
      json.appointmentDate = json.date_time;
      json.appointmentTime = json.date_time
        ? new Date(json.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
        : null;
      json.tokenNumber = json.token_number;
      json.department = json.doctor?.department || json.department || 'OPD';
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.name = json.patient.full_name;
        json.patient.patientId = json.patient.patient_id;
        json.patient.bloodGroup = json.patient.blood_group;
        // Compute age from dob
        if (json.patient.dob) {
          const dob = new Date(json.patient.dob);
          json.patient.age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }
      }
      return json;
    });

    const totalPages = Math.ceil(count / parseInt(limit)) || 1;
    res.json({ success: true, data: mappedRows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: totalPages } });
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
      io.to(`hospital_${req.hospitalId}`).emit('appointment_status_updated', { appointmentId: appointment.id, status, hospitalId: req.hospitalId });
      if (status === 'Completed') io.to(`hospital_${req.hospitalId}`).emit('visit_completed', { appointmentId: appointment.id, hospitalId: req.hospitalId });
      io.to('system_relay').emit('appointment_status_updated', { appointmentId: appointment.id, status, hospitalId: req.hospitalId });
      if (status === 'Completed') io.to('system_relay').emit('visit_completed', { appointmentId: appointment.id, hospitalId: req.hospitalId });
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

    const json = appointment.toJSON();
    json._id = json.id;
    json.appointmentDate = json.date_time;
    json.appointmentTime = json.date_time
      ? new Date(json.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
      : null;
    json.tokenNumber = json.token_number;
    json.department = json.doctor?.department || json.department || 'OPD';

    if (json.patient) {
      json.patient._id = json.patient.id;
      json.patient.name = json.patient.full_name;
      json.patient.patientId = json.patient.patient_id;
      json.patient.bloodGroup = json.patient.blood_group;
      if (json.patient.dob) {
        const dob = new Date(json.patient.dob);
        json.patient.age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }

    res.json({ success: true, data: json });
  } catch (error) {
    next(error);
  }
};

// GET /api/nurse/patient/:id
const getPatientProfile = async (req, res, next) => {
  try {
    const { Patient, Appointment, User, Vitals } = req.models;

    // Look up by numeric PK, scoped to the caller's hospital to prevent
    // cross-tenant access in the shared SaaS database.
    const idParam = req.params.id;
    let patient = await Patient.findOne({
      where: { id: idParam, hospital_id: req.hospitalId },
    });

    // Fallback: try by patient_id string (also scoped to this hospital)
    if (!patient) {
      patient = await Patient.findOne({
        where: { patient_id: idParam, hospital_id: req.hospitalId },
      });
    }
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const [appointments, vitals] = await Promise.all([
      Appointment.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'department'] }],
        order: [['date_time', 'DESC']],
      }),
      Vitals.findAll({
        where: { patient_id: patient.id, hospital_id: req.hospitalId },
        include: [{ model: User, as: 'recordedBy', attributes: ['id', 'name'] }],
        order: [['recorded_at', 'DESC']],
        limit: 20,
      }),
    ]);

    // Compute age from dob
    const dob = patient.dob ? new Date(patient.dob) : null;
    const age = dob
      ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;



    const patientData = {
      _id: patient.id,
      id: patient.id,
      name: patient.full_name,
      patientId: patient.patient_id,
      phone: patient.phone,
      email: patient.email,
      gender: patient.gender,
      dob: patient.dob,
      age,
      address: patient.address,
      bloodGroup: patient.blood_group,
      allergies: (() => {
        // Try extracting allergies from medical_history JSON if present
        const mh = patient.medical_history;
        if (Array.isArray(mh)) return mh.filter(i => i.type === 'allergy').map(i => i.name || i);
        return [];
      })(),
      chronicDiseases: (() => {
        const mh = patient.medical_history;
        if (Array.isArray(mh)) return mh.filter(i => i.type === 'chronic').map(i => i.name || i);
        return [];
      })(),
      emergencyContact: patient.emergency_contact_name ? {
        name: patient.emergency_contact_name,
        phone: patient.emergency_contact_phone,
        relation: patient.emergency_contact_relation,
      } : null,
      medicalNotes: patient.medical_notes,
      department: patient.department,
      isActive: (patient.status || '').toLowerCase() === 'active' || patient.status === 'Outpatient',
      createdAt: patient.created_at || patient.createdAt,
    };

    const mappedAppointments = appointments.map(a => {
      const j = a.toJSON();
      return {
        _id: j.id,
        appointmentDate: j.date_time,
        appointmentTime: j.date_time
          ? new Date(j.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
          : null,
        department: j.department,
        tokenNumber: j.token_number,
        status: (() => {
          if (j.status === 'Completed') return 'consultation_done';
          if (j.status === 'Cancelled' || j.status === 'No-Show') return 'cancelled';
          if (j.status === 'In-Progress') return 'vitals_done';
          return 'waiting_for_vitals';
        })(),
        doctor: j.doctor ? { name: j.doctor.name, department: j.doctor.department } : null,
        symptoms: j.reason,
      };
    });

    const mappedVitals = vitals.map(v => {
      const j = v.toJSON();
      return {
        _id: j.id,
        bloodPressure: j.blood_pressure
          ? (() => { const p = String(j.blood_pressure).split('/'); return { systolic: parseInt(p[0]), diastolic: parseInt(p[1]) }; })()
          : null,
        temperature: j.temperature,
        pulseRate: j.pulse,
        spo2: j.spo2,
        weight: j.weight,
        height: j.height,
        bmi: j.bmi,
        bloodSugar: j.blood_sugar,
        recordedBy: j.recordedBy ? { name: j.recordedBy.name } : null,
        createdAt: j.recorded_at || j.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        patient: patientData,
        appointments: mappedAppointments,
        vitals: mappedVitals,
        stats: { totalVisits: appointments.length },
      },
    });
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
    // Scope to the caller's hospital to prevent cross-tenant writes in the shared SaaS database.
    const patient = await Patient.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
    });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const body = req.body;
    const updates = {};

    // Accept both camelCase (frontend) and snake_case (direct) field names
    if (body.full_name   !== undefined) updates.full_name   = body.full_name;
    if (body.name        !== undefined) updates.full_name   = body.name;
    if (body.phone       !== undefined) updates.phone       = body.phone;
    if (body.email       !== undefined) updates.email       = body.email;
    if (body.gender      !== undefined) updates.gender      = body.gender;
    if (body.address     !== undefined) updates.address     = body.address;
    if (body.blood_group !== undefined) updates.blood_group = body.blood_group;
    if (body.bloodGroup  !== undefined) updates.blood_group = body.bloodGroup;
    if (body.medical_notes !== undefined) updates.medical_notes = body.medical_notes;
    if (body.medicalNotes  !== undefined) updates.medical_notes = body.medicalNotes;
    if (body.status      !== undefined) updates.status      = body.status;

    // Emergency contact fields
    if (body.emergencyContact) {
      if (body.emergencyContact.name)     updates.emergency_contact_name     = body.emergencyContact.name;
      if (body.emergencyContact.phone)    updates.emergency_contact_phone    = body.emergencyContact.phone;
      if (body.emergencyContact.relation) updates.emergency_contact_relation = body.emergencyContact.relation;
    }

    await patient.update(updates);

    // Return mapped patient data same as getPatientProfile
    const dob = patient.dob ? new Date(patient.dob) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const patientData = {
      _id: patient.id, id: patient.id,
      name: patient.full_name, patientId: patient.patient_id,
      phone: patient.phone, email: patient.email,
      gender: patient.gender, dob: patient.dob, age,
      address: patient.address, bloodGroup: patient.blood_group,
      medicalNotes: patient.medical_notes,
      emergencyContact: patient.emergency_contact_name ? {
        name: patient.emergency_contact_name,
        phone: patient.emergency_contact_phone,
        relation: patient.emergency_contact_relation,
      } : null,
    };

    res.json({ success: true, message: 'Patient updated', data: patientData });
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
    const { Patient, Appointment, AuditLog, User } = req.models;

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

    // Find first available doctor in this hospital matching department, fall back to any doctor
    let defaultDoctor = await User.findOne({
      where: { hospital_id: hospitalId, role: 'DOCTOR', department },
      order: [['id', 'ASC']],
    });
    if (!defaultDoctor) {
      defaultDoctor = await User.findOne({
        where: { hospital_id: hospitalId, role: 'DOCTOR' },
        order: [['id', 'ASC']],
      });
    }

    // Create walk-in appointment
    const appointment = await Appointment.create({
      hospital_id: hospitalId,
      patient_id: patient.id,
      doctor_id: defaultDoctor?.id ?? null,
      department: 'OPD',
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

const callPatient = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, Notification } = req.models;
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'doctor', attributes: ['name', 'department'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const patient = appointment.patient;
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const doctorName = appointment.doctor?.name || 'Doctor';
    const department = appointment.doctor?.department || appointment.department || 'OPD';

    // 1. Create in-app Notification for the patient
    const notification = await Notification.create({
      hospital_id: req.hospitalId,
      user_id: patient.id,
      title: 'It is your turn!',
      message: `You are being called for your appointment with Dr. ${doctorName}. Please proceed to the consultation room or vitals entry counter. Token #${appointment.token_number}.`,
      type: 'appointment',
      priority: 'high',
      metadata: { appointmentId: appointment.id, doctorId: appointment.doctor_id },
      status: 'unread',
    });

    // 2. Send email to patient if they have a valid email
    if (patient.email) {
      const { sendCallPatientEmail } = require('../../services/emailService');
      try {
        await sendCallPatientEmail(
          patient.email,
          patient.full_name || 'Patient',
          appointment.token_number,
          doctorName,
          department
        );
      } catch (emailErr) {
        console.error('[callPatient] Email sending failed:', emailErr.message);
      }
    }

    // 3. Emit real-time notification socket event to the patient via system relay
    const io = req.app.get('io');
    if (io) {
      // Emit patient_called event to the hospital room and system_relay room
      const callData = {
        appointmentId: appointment.id,
        patientId: patient.id,
        tokenNumber: appointment.token_number,
        doctorName: doctorName,
        department: department,
        hospitalId: req.hospitalId,
        notification: {
          title: notification.title,
          message: notification.message,
          type: notification.type,
        }
      };
      io.to(`hospital_${req.hospitalId}`).emit('patient_called', callData);
      io.to('system_relay').emit('patient_called', callData);
    }

    res.json({ success: true, message: 'Patient called. Notification and email sent successfully.' });
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
  callPatient,
};
