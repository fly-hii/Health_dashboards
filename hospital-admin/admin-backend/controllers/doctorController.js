const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Generate employee ID scoped to hospital
const generateEmployeeId = async (prefix, hospitalId, UserModel) => {
  const latest = await UserModel.findOne({
    where: { hospital_id: hospitalId, employee_id: { [Op.like]: `${prefix}%` } },
    order: [['employee_id', 'DESC']],
  });
  if (!latest?.employee_id) return `${prefix}1001`;
  const num = parseInt(latest.employee_id.replace(prefix, ''), 10);
  return `${prefix}${num + 1}`;
};

// Map database User record to frontend-compatible format
const mapDoctor = (doc) => {
  if (!doc) return null;
  const json = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  return {
    ...json,
    _id: json.id,
    employeeId: json.employee_id,
    profilePhoto: json.profile_image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${json.name}`,
    availabilityStatus: json.availability_status,
    workingHours: {
      start: json.schedule_start || '10:00',
      end: json.schedule_end || '18:00'
    },
    availableDays: json.schedule_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };
};

// GET /api/doctors
const getDoctors = async (req, res) => {
  try {
    const { search, department, specialization, status, experience, sortBy = 'created_at', sortOrder = 'DESC', page = 1, limit = 10, export: isExport } = req.query;
    const hospitalId = req.hospitalId;
    const { User } = req.models;
    const where = { hospital_id: hospitalId, role: 'DOCTOR' };

    // Auto-update availability_status to 'Busy' if inactive for > 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await User.update(
      { availability_status: 'Busy' },
      {
        where: {
          hospital_id: hospitalId,
          role: 'DOCTOR',
          availability_status: 'Available',
          [Op.or]: [
            { last_login: { [Op.lt]: twoHoursAgo } },
            { last_login: null }
          ]
        }
      }
    ).catch(err => console.error('[Auto Availability Expiry Error in admin getDoctors]', err));

    if (search?.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } },
      ];
    }
    if (department && department !== 'all') where.department = department;
    if (specialization && specialization !== 'all') where.specialization = { [Op.like]: `%${specialization}%` };
    if (status && status !== 'all') {
      where.status = status === 'active' ? 'Active' : (status === 'inactive' ? 'Inactive' : status);
    }
    if (experience && experience !== 'all') {
      if (experience.includes('< 5')) where.experience = { [Op.lt]: 5 };
      else if (experience.includes('5-10')) where.experience = { [Op.between]: [5, 10] };
      else if (experience.includes('10+')) where.experience = { [Op.gt]: 10 };
    }

    const validSort = ['name', 'created_at', 'experience', 'employee_id'];
    const orderField = validSort.includes(sortBy) ? sortBy : 'created_at';
    const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (isExport === 'true') {
      const doctors = await User.findAll({ where, order: [[orderField, orderDir]], attributes: { exclude: ['password'] } });
      const mapped = doctors.map(mapDoctor);
      return res.json({ success: true, count: mapped.length, data: mapped });
    }

    const pageNum = parseInt(page); const limitNum = parseInt(limit);
    const { count, rows } = await User.findAndCountAll({ where, order: [[orderField, orderDir]], limit: limitNum, offset: (pageNum - 1) * limitNum, attributes: { exclude: ['password'] } });

    const mapped = rows.map(mapDoctor);
    res.json({ success: true, count: mapped.length, data: mapped, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
  try {
    const { User } = req.models;
    const doctor = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, role: 'DOCTOR' }, attributes: { exclude: ['password'] } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: mapDoctor(doctor) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctors
const createDoctor = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { User, AuditLog, Hospital } = req.models;
    const { name, email, phone, department = 'OPD', specialization, qualification, experience, password, status = 'Active', profilePhoto, bio, availableDays, workingHours } = req.body;

    const existing = await User.findOne({ where: { email, hospital_id: hospitalId } });
    if (existing) return res.status(409).json({ success: false, message: 'Doctor with this email already exists' });

    const employeeId = req.body.employeeId || await generateEmployeeId('DOC', hospitalId, User);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'Doctor@123', salt);

    let dbStatus = 'Active';
    let dbAvailability = 'Available';
    if (status === 'inactive') {
      dbStatus = 'Inactive';
      dbAvailability = 'Busy';
    } else if (status === 'On Leave') {
      dbStatus = 'Active';
      dbAvailability = 'On Leave';
    }

    const doctor = await User.create({
      hospital_id: hospitalId,
      name, email, phone, department, specialization, qualification,
      experience: Number(experience) || 0,
      employee_id: employeeId,
      password: hashedPassword,
      role: 'DOCTOR',
      status: dbStatus,
      profile_image: profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
      availability_status: dbAvailability,
      schedule_days: availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      schedule_start: workingHours?.start || '10:00',
      schedule_end: workingHours?.end || '18:00',
    });

    await AuditLog.create({
      hospital_id: hospitalId,
      user_id: req.user?.id,
      action: 'CREATE',
      module: 'Doctors',
      table_name: 'users',
      record_id: doctor.id,
      new_data: { name, email, department, specialization },
      description: `Created doctor: ${name} (${employeeId})`,
      ip_address: req.ip,
    });

    // Send welcome email with credentials (non-blocking)
    const hospital = await Hospital.findByPk(hospitalId);
    const { sendStaffWelcomeEmail } = require('../services/emailService');
    sendStaffWelcomeEmail({
      to: email,
      name,
      role: 'DOCTOR',
      department,
      employeeId,
      password: password || 'Doctor@123',
      hospitalName: hospital?.name || 'CarePlus Hospital',
      hospitalCode: hospital?.code || ''
    }).catch(err => console.error('⚠️ Doctor welcome email failed:', err.message));

    const io = req.app.get('io');
    if (io) io.to(`hospital_${hospitalId}`).emit('doctor_created', { id: doctor.id, name, department });

    res.status(201).json({ success: true, data: mapDoctor(doctor) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctors/:id
const updateDoctor = async (req, res) => {
  try {
    const { User, AuditLog } = req.models;
    const doctor = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, role: 'DOCTOR' } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const oldData = { name: doctor.name, status: doctor.status };
    const { password, availableDays, workingHours, profilePhoto, status, ...updateFields } = req.body;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }
    if (availableDays !== undefined) updateFields.schedule_days = availableDays;
    if (workingHours?.start !== undefined) updateFields.schedule_start = workingHours.start;
    if (workingHours?.end !== undefined) updateFields.schedule_end = workingHours.end;
    if (profilePhoto !== undefined) updateFields.profile_image = profilePhoto;
    
    if (status !== undefined) {
      if (status === 'inactive') {
        updateFields.status = 'Inactive';
        updateFields.availability_status = 'Busy';
      } else if (status === 'On Leave') {
        updateFields.status = 'Active';
        updateFields.availability_status = 'On Leave';
      } else if (status === 'Active' || status === 'active') {
        updateFields.status = 'Active';
        updateFields.availability_status = 'Available';
      } else {
        updateFields.status = status;
      }
    }

    await doctor.update(updateFields);

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Doctors',
      table_name: 'users',
      record_id: doctor.id,
      old_data: oldData,
      new_data: updateFields,
      description: `Updated doctor: ${doctor.name}`,
      ip_address: req.ip,
    });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('doctor_updated', { id: doctor.id });

    res.json({ success: true, data: mapDoctor(doctor) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/doctors/:id
const deleteDoctor = async (req, res) => {
  try {
    const { User, AuditLog } = req.models;
    const doctor = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, role: 'DOCTOR' } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const docData = { name: doctor.name, employeeId: doctor.employee_id };
    await doctor.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId, user_id: req.user?.id, action: 'DELETE',
      module: 'Doctors', table_name: 'users', old_data: docData,
      description: `Deleted doctor: ${docData.name}`, ip_address: req.ip,
    });

    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/:id/appointments
const getDoctorAppointments = async (req, res) => {
  try {
    const { Appointment, Patient } = req.models;
    const appointments = await Appointment.findAll({
      where: { doctor_id: req.params.id, hospital_id: req.hospitalId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone'] }],
      order: [['date_time', 'DESC']],
    });

    const mapped = appointments.map(appt => {
      const json = appt.toJSON();
      json._id = json.id;
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.fullName = json.patient.full_name;
        json.patient.patientId = json.patient.patient_id;
      }
      return json;
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/:id/patients
const getDoctorPatients = async (req, res) => {
  try {
    const { Appointment, Patient } = req.models;
    const appointments = await Appointment.findAll({
      where: { doctor_id: req.params.id, hospital_id: req.hospitalId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob'] }],
      order: [['date_time', 'DESC']],
    });

    const patientMap = new Map();
    appointments.forEach(app => {
      if (app.patient) {
        const id = app.patient.id;
        if (!patientMap.has(id)) {
          patientMap.set(id, { patient: app.patient, diagnosis: app.reason || 'Consultation', lastVisit: app.date_time });
        } else if (new Date(app.date_time) > new Date(patientMap.get(id).lastVisit)) {
          patientMap.get(id).lastVisit = app.date_time;
        }
      }
    });

    const mapped = Array.from(patientMap.values()).map(p => {
      const patientJson = p.patient.toJSON();
      patientJson._id = patientJson.id;
      patientJson.fullName = patientJson.full_name;
      patientJson.patientId = patientJson.patient_id;
      return {
        ...p,
        patient: patientJson
      };
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/stats
const getDoctorStats = async (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { User, Appointment } = req.models;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const [total, active, onLeave] = await Promise.all([
      User.count({ where: { hospital_id: hospitalId, role: 'DOCTOR' } }),
      User.count({ where: { hospital_id: hospitalId, role: 'DOCTOR', status: 'Active' } }),
      User.count({ where: { hospital_id: hospitalId, role: 'DOCTOR', availability_status: 'On Leave' } }),
    ]);

    const todayConsultations = await Appointment.count({
      where: { hospital_id: hospitalId, date_time: { [Op.between]: [todayStart, todayEnd] } },
    });

    res.json({
      success: true,
      data: { totalDoctors: { count: total }, activeDoctors: { count: active }, onLeave: { count: onLeave }, todayConsultations: { count: todayConsultations } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctors/:id/notifications
const sendDoctorNotification = async (req, res) => {
  try {
    const { title, message, priority = 'medium' } = req.body;
    const { User, Notification } = req.models;
    const doctor = await User.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId, role: 'DOCTOR' }, attributes: ['id', 'name', 'hospital_id'] });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const notification = await Notification.create({
      hospital_id: req.hospitalId,
      user_id: doctor.id,
      title,
      message,
      type: 'system',
      priority,
    });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('notification', { notification });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/:id/prescriptions
const getDoctorPrescriptions = async (req, res) => {
  try {
    const { Prescription, Patient } = req.models;
    const prescriptions = await Prescription.findAll({
      where: { doctor_id: req.params.id, hospital_id: req.hospitalId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone'] }],
      order: [['created_at', 'DESC']],
    });

    const mapped = prescriptions.map(presc => {
      const json = presc.toJSON();
      json._id = json.id;
      json.date = json.createdAt;
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.fullName = json.patient.full_name;
        json.patient.patientId = json.patient.patient_id;
      }
      return json;
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctors/:id/reports
const getDoctorReports = async (req, res) => {
  try {
    const { Report, Patient } = req.models;
    const reports = await Report.findAll({
      where: { uploaded_by: req.params.id, hospital_id: req.hospitalId, is_deleted: false },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] }],
      order: [['created_at', 'DESC']],
    });

    const mapped = reports.map(rep => {
      const json = rep.toJSON();
      json._id = json.id;
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.fullName = json.patient.full_name;
        json.patient.patientId = json.patient.patient_id;
      }
      return json;
    });

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctors/:id/prescriptions
const createDoctorPrescription = async (req, res) => {
  try {
    const { patient_id, diagnosis, instructions, valid_until, medicines = [] } = req.body;
    const doctorId = req.params.id;
    const hospitalId = req.hospitalId;
    const { Prescription, PrescriptionMedicine } = req.models;

    const prescription = await Prescription.create({
      hospital_id: hospitalId,
      doctor_id: doctorId,
      patient_id,
      diagnosis,
      instructions,
      valid_until,
      status: 'Active',
    });

    if (medicines.length > 0) {
      await PrescriptionMedicine.bulkCreate(
        medicines.map(m => ({ prescription_id: prescription.id, ...m }))
      );
    }

    const result = await Prescription.findByPk(prescription.id, {
      include: [{ model: PrescriptionMedicine, as: 'medicines' }],
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctors/:id/patients
const assignDoctorPatient = async (req, res) => {
  try {
    const { patientId } = req.body;
    const doctorId = req.params.id;
    const { User, Patient, AuditLog } = req.models;

    const doctor = await User.findOne({ where: { id: doctorId, role: 'DOCTOR', hospital_id: req.hospitalId } });
    const patient = await Patient.findOne({ where: { id: patientId, hospital_id: req.hospitalId } });

    if (!doctor || !patient) {
      return res.status(404).json({ success: false, message: 'Doctor or Patient not found' });
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Doctors',
      description: `Assigned patient ${patient.full_name} to doctor ${doctor.name}`,
      ip_address: req.ip,
    });

    res.json({ success: true, message: `Successfully assigned patient to Dr. ${doctor.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAppointments,
  getDoctorPatients,
  getDoctorStats,
  sendDoctorNotification,
  getDoctorPrescriptions,
  getDoctorReports,
  createDoctorPrescription,
  assignDoctorPatient,
};
