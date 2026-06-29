const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loginOtpStore } = require('./forgotPasswordController');
const fs = require('fs');
const path = require('path');

const isValidLoginOtp = (email, otp) => {
  const record = loginOtpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) { loginOtpStore.delete(email.toLowerCase()); return false; }
  if (record.otp !== otp.toString()) return false;
  loginOtpStore.delete(email.toLowerCase());
  return true;
};

const getPasswordComplexityError = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !, @, #, $, %, etc.).';
  }
  return null;
};

// Static imports only for the public login endpoint
const { User: StaticUser, AuditLog: StaticAuditLog } = require('../models');
const { masterDb } = require('../services/databaseResolver');
const { decrypt } = require('../services/encryptionService');

const isOtpValid = (email, otp) => {
  if (!otp) return false;
  const record = loginOtpStore.get(email.toLowerCase());
  return record && record.otp === otp.toString() && Date.now() <= record.expiresAt;
};

const checkUserInOtherPortals = async (email, password, otp) => {
  try {
    const [superAdmins] = await masterDb.query("SELECT password FROM super_admin_users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (superAdmins && superAdmins.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, superAdmins[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  const { sharedSaasDb } = require('../services/databaseResolver');
  try {
    const [users] = await sharedSaasDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
    if (users && users.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  try {
    const [patients] = await sharedSaasDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
    if (patients && patients.length > 0) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
      if (ok) return true;
    }
  } catch (_) {}

  try {
    const [connections] = await masterDb.query("SELECT * FROM db_connections WHERE is_active = 1");
    const { getHospitalConnection } = require('../services/databaseResolver');
    const { Sequelize } = require('sequelize');
    for (const conn of connections) {
      try {
        const decryptedPassword = decrypt(conn.password_encrypted);
        const externalDb = new Sequelize(conn.database_name, conn.username, decryptedPassword, {
          host: conn.host, port: conn.port || 3306, dialect: 'mysql', dialectModule: require('mysql2'), logging: false,
          dialectOptions: conn.ssl_enabled ? { ssl: { require: true, rejectUnauthorized: false } } : {},
        });
        const [users] = await externalDb.query("SELECT password FROM users WHERE email = ? LIMIT 1", { replacements: [email] });
        if (users && users.length > 0) {
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, users[0].password);
          await externalDb.close();
          if (ok) return true;
        }
        const [patients] = await externalDb.query("SELECT password FROM patients WHERE email = ? LIMIT 1", { replacements: [email] });
        if (patients && patients.length > 0) {
          const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, patients[0].password);
          await externalDb.close();
          if (ok) return true;
        }
        await externalDb.close();
      } catch (_) {}
    }
  } catch (_) {}

  return false;
};

const generateToken = (user) => jwt.sign(
  { id: user.id, hospitalId: user.hospital_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, otp } = req.body;
  const hospitalCode = req.body.hospitalCode || req.headers['x-hospital-code'] || process.env.HOSPITAL_CODE;

  try {
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    if (!password && !otp) return res.status(400).json({ success: false, message: 'Password or OTP required' });

    const { masterDb, getHospitalConnection } = require('../services/databaseResolver');
    const { createModels } = require('../services/modelFactory');

    let resolvedHospitalId;
    let db, models;
    let user;

    if (hospitalCode) {
      // Step 1: Resolve hospital from master DB
      const [hospRows] = await masterDb.query(
        'SELECT id, status, database_type FROM hospitals WHERE code = ? LIMIT 1',
        { replacements: [hospitalCode.toUpperCase()] }
      );
      const hospital = hospRows?.[0];
      if (!hospital?.id) {
        return res.status(404).json({ success: false, message: `Hospital code "${hospitalCode}" not found` });
      }
      if (hospital.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
      }
      resolvedHospitalId = hospital.id;

      // Step 2: Resolve tenant DB. Scope the lookup to this hospital — in the
      // shared SaaS DB an unscoped email match could belong to another tenant.
      db = await getHospitalConnection(resolvedHospitalId);
      models = createModels(db);
      user = await models.User.findOne({ where: { email, hospital_id: resolvedHospitalId } });
    } else {
      // Fallback: look up in shared database. Because the shared SaaS DB holds
      // users from every hospital, the same email can exist under multiple
      // tenants — resolving an arbitrary one would cross tenant boundaries.
      // Require an explicit hospital code to disambiguate in that case.
      const matches = await StaticUser.findAll({ where: { email } });
      if (matches.length > 1) {
        return res.status(409).json({
          success: false,
          message: 'This email is registered with multiple hospitals. Please provide your hospital code to sign in.',
        });
      }
      user = matches[0] || null;
      if (user) {
        resolvedHospitalId = user.hospital_id;
        // Verify hospital status in master registry
        const [hospRows] = await masterDb.query(
          'SELECT status FROM hospitals WHERE id = ? LIMIT 1',
          { replacements: [resolvedHospitalId] }
        );
        const hospital = hospRows?.[0];
        if (hospital?.status === 'suspended') {
          return res.status(403).json({ success: false, message: 'Hospital account is suspended. Contact CarePlus support.' });
        }
        db = await getHospitalConnection(resolvedHospitalId);
        models = createModels(db);
      }
    }

    if (!user) {
      const existsElsewhere = await checkUserInOtherPortals(email, password, otp);
      if (existsElsewhere) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(user.role)) {
      const ok = otp ? isOtpValid(email, otp) : await bcrypt.compare(password, user.password);
      if (ok) {
        return res.status(403).json({ success: false, message: "you don't have authorization for this portal" });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (user.status === 'Inactive') return res.status(403).json({ success: false, message: 'Account deactivated' });

    if (otp) {
      if (!isValidLoginOtp(email, otp)) return res.status(401).json({ success: false, message: 'Invalid or expired OTP code' });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await user.update({ last_login: new Date(), availability_status: 'Available' });

    const AuditLog = models?.AuditLog || StaticAuditLog;
    await AuditLog.create({
      hospital_id: resolvedHospitalId || user.hospital_id,
      user_id: user.id,
      action: 'LOGIN',
      module: 'Auth',
      description: `Doctor ${user.name} logged in`,
      ip_address: req.ip,
    }).catch(console.error);

    const token = generateToken(user);
    const { password: _, ...userData } = user.toJSON();
    res.json({ success: true, token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/stats
const getDashboardStatsV2 = async (req, res) => {
  try {
    const { Appointment } = req.models;
    const doctorId = req.user.id;
    const hospitalId = req.hospitalId;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const [todayAppointments, totalPatients, completedToday, pendingQueue, followUps] = await Promise.all([
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId }, distinct: true, col: 'patient_id' }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Completed', date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: { [Op.in]: ['Pending','Confirmed','In-Progress'] }, date_time: { [Op.between]: [today, todayEnd] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, visit_type: 'Follow-Up', date_time: { [Op.between]: [today, todayEnd] } } }),
    ]);

    res.json({
      success: true,
      patientsInQueue: pendingQueue,
      todayConsultations: todayAppointments,
      completedToday: completedToday,
      followUps: followUps,
      data: {
        patientsInQueue: pendingQueue,
        todayConsultations: todayAppointments,
        completedToday: completedToday,
        followUps: followUps,
        todayAppointments,
        totalPatients,
        pendingQueue,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/schedule
const getDashboardSchedule = async (req, res) => {
  try {
    const { Appointment, Patient } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: {
        hospital_id: req.hospitalId,
        doctor_id: req.user.id,
        date_time: { [Op.between]: [today, todayEnd] }
      },
      include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
      order: [['date_time', 'ASC']],
    });

    const mapped = appointments.map(appt => {
      const dt = new Date(appt.date_time);
      let timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let status = 'waiting';
      if (appt.status === 'In-Progress') status = 'in_progress';
      else if (appt.status === 'Completed') status = 'completed';
      else if (appt.status === 'Confirmed' || appt.status === 'Pending') status = 'waiting';
      else status = appt.status.toLowerCase();

      return {
        _id: appt.id.toString(),
        time: timeStr,
        patientName: appt.patient?.full_name || 'Unknown Patient',
        visitType: appt.visit_type === 'Follow-Up' ? 'Follow-up' : 'Consultation',
        status: status
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/dashboard/chart
const getDashboardChart = async (req, res) => {
  try {
    const { Appointment } = req.models;
    const doctorId = req.user.id;
    const hospitalId = req.hospitalId;

    const [completed, pending, cancelled] = await Promise.all([
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Completed' } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress'] } } }),
      Appointment.count({ where: { hospital_id: hospitalId, doctor_id: doctorId, status: 'Cancelled' } }),
    ]);

    const total = completed + pending + cancelled;
    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
    const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    res.json({
      total,
      data: [
        { name: 'Completed', value: completed, percentage: completedPct, color: '#0F9D8A' },
        { name: 'Pending', value: pending, percentage: pendingPct, color: '#F59E0B' },
        { name: 'Cancelled', value: cancelled, percentage: cancelledPct, color: '#EF4444' }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/patients
const getPatients = async (req, res) => {
  try {
    const { Patient, Appointment } = req.models;

    // Fetch unique patient IDs from appointments scoped to this hospital
    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId },
      attributes: ['patient_id'],
      raw: true
    });
    const patientIdsFromAppointments = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

    let patientWhere;
    if (patientIdsFromAppointments.length > 0) {
      patientWhere = {
        [Op.or]: [
          { hospital_id: req.hospitalId },
          { id: { [Op.in]: patientIdsFromAppointments } }
        ]
      };
    } else {
      patientWhere = { hospital_id: req.hospitalId };
    }

    const patients = await Patient.findAll({
      where: patientWhere,
      order: [['full_name', 'ASC']],
    });

    const mapped = patients.map(p => {
      let age = null;
      if (p.dob) {
        const birthDate = new Date(p.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        _id: p.id,
        id: p.id,
        patientId: p.patient_id,
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        age: age,
        gender: p.gender?.toLowerCase(),
        bloodGroup: p.blood_group,
        status: p.status,
      };
    });

    res.json({ success: true, patients: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/queue
const getPatientQueue = async (req, res) => {
  try {
    const { Appointment, Patient, Vitals } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: {
        hospital_id: req.hospitalId,
        doctor_id: req.user.id,
        date_time: { [Op.between]: [today, todayEnd] },
        status: { [Op.in]: ['Pending', 'Confirmed', 'In-Progress', 'Completed'] },
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender', 'dob', 'blood_group'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
      order: [['token_number', 'ASC']],
    });

    const mapped = appointments.map(appt => {
      const json = appt.toJSON();
      json._id = json.id;
      json.tokenNumber = json.token_number;
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.name = json.patient.full_name;
      }
      return json;
    });

    res.json({ success: true, data: mapped, queue: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const { Patient, Appointment } = req.models;

    // Always scope by hospital_id to prevent cross-hospital patient lookup
    const patient = await Patient.findOne({ where: { id: req.params.id, hospital_id: req.hospitalId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/history
const getPatientHistoryV2 = async (req, res) => {
  try {
    const { Appointment, Prescription, Vitals, Report, User, PrescriptionMedicine } = req.models;
    const where = { patient_id: req.params.id, hospital_id: req.hospitalId };

    const [appointments, prescriptions, vitals, reports] = await Promise.all([
      Appointment.findAll({ where, include: [{ model: User, as: 'doctor', attributes: ['id', 'name'] }], order: [['date_time', 'DESC']] }),
      Prescription.findAll({ where, include: [{ model: PrescriptionMedicine, as: 'medicines' }, { model: User, as: 'doctor', attributes: ['id', 'name'] }], order: [['created_at', 'DESC']] }),
      Vitals.findAll({ where, order: [['recorded_at', 'DESC']], limit: 10 }),
      Report.findAll({ where: { ...where, is_deleted: false }, order: [['created_at', 'DESC']], limit: 10 }),
    ]);

    res.json({ success: true, data: { appointments, prescriptions, vitals, reports } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/consultations/:appointmentId
const getConsultationByAppointmentId = async (req, res) => {
  try {
    const { Consultation, Appointment, Patient, Vitals, Prescription, PrescriptionMedicine } = req.models;
    let consultation = await Consultation.findOne({
      where: { appointment_id: req.params.appointmentId, hospital_id: req.hospitalId },
      include: [
        { model: Prescription, as: 'prescription', include: [{ model: PrescriptionMedicine, as: 'medicines' }], required: false },
      ],
    });

    if (!consultation) {
      const appointment = await Appointment.findOne({
        where: { id: req.params.appointmentId, hospital_id: req.hospitalId },
        include: [{ model: Patient, as: 'patient' }, { model: Vitals, as: 'vitals', required: false }],
      });
      if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

      consultation = await Consultation.create({
        hospital_id: req.hospitalId,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: req.user.id,
        status: 'Pending',
      });
      const appointmentJson = appointment.toJSON();
      appointmentJson._id = appointmentJson.id;
      appointmentJson.tokenNumber = appointmentJson.token_number;
      if (appointmentJson.patient) {
        appointmentJson.patient._id = appointmentJson.patient.id;
        appointmentJson.patient.name = appointmentJson.patient.full_name;
      }
      consultation.dataValues.appointment = appointmentJson;
    }

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/start
const startConsultation = async (req, res) => {
  try {
    const { Consultation, Appointment } = req.models;
    const consultation = await Consultation.findOne({
      where: {
        hospital_id: req.hospitalId,
        [Op.or]: [
          { id: req.params.id },
          { appointment_id: req.params.id }
        ]
      }
    });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    await consultation.update({ status: 'In-Progress', started_at: new Date() });
    await Appointment.update({ status: 'In-Progress' }, { where: { id: consultation.appointment_id } });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('consultation_started', { consultationId: consultation.id, appointmentId: consultation.appointment_id });

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/notes
const saveConsultationNotes = async (req, res) => {
  try {
    const { Consultation } = req.models;
    const { symptoms, diagnosis, notes, follow_up_date, follow_up_notes } = req.body;
    const consultation = await Consultation.findOne({
      where: {
        hospital_id: req.hospitalId,
        [Op.or]: [
          { id: req.params.id },
          { appointment_id: req.params.id }
        ]
      }
    });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    await consultation.update({ symptoms, diagnosis, notes, follow_up_date, follow_up_notes });
    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/consultations/:id/prescription
const savePrescription = async (req, res) => {
  const t = await req.db.transaction();
  try {
    const { Consultation, Prescription, PrescriptionMedicine } = req.models;
    const consultation = await Consultation.findOne({
      where: {
        hospital_id: req.hospitalId,
        [Op.or]: [
          { id: req.params.id },
          { appointment_id: req.params.id }
        ]
      },
      transaction: t
    });
    if (!consultation) { await t.rollback(); return res.status(404).json({ success: false, message: 'Consultation not found' }); }

    const { diagnosis, instructions, medicines = [], valid_until } = req.body;

    // Upsert prescription
    let prescription = await Prescription.findOne({ where: { consultation_id: consultation.id }, transaction: t });
    if (prescription) {
      await prescription.update({ diagnosis, instructions, valid_until }, { transaction: t });
      await PrescriptionMedicine.destroy({ where: { prescription_id: prescription.id }, transaction: t });
    } else {
      prescription = await Prescription.create({
        hospital_id: req.hospitalId,
        consultation_id: consultation.id,
        appointment_id: consultation.appointment_id,
        patient_id: consultation.patient_id,
        doctor_id: req.user.id,
        diagnosis, instructions, valid_until,
        status: 'Active',
      }, { transaction: t });
    }

    // Insert medicines
    if (medicines.length > 0) {
      await PrescriptionMedicine.bulkCreate(
        medicines.map(m => ({ prescription_id: prescription.id, ...m })),
        { transaction: t }
      );
    }

    await t.commit();

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('prescription_created', { prescriptionId: prescription.id, patientId: consultation.patient_id });

    const result = await Prescription.findByPk(prescription.id, { include: [{ model: PrescriptionMedicine, as: 'medicines' }] });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/consultations/:id/complete
const completeConsultation = async (req, res) => {
  try {
    const { Consultation, Appointment, AuditLog, Prescription, PrescriptionMedicine, LabTest, PharmacyOrder } = req.models;
    const consultation = await Consultation.findOne({
      where: {
        hospital_id: req.hospitalId,
        [Op.or]: [
          { id: req.params.id },
          { appointment_id: req.params.id }
        ]
      }
    });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    const { diagnosis, doctorNotes, notes, symptoms, followUpDate, followUpNotes, labTests, medicines } = req.body;

    await consultation.update({
      status: 'Completed',
      completed_at: new Date(),
      diagnosis: diagnosis || consultation.diagnosis,
      notes: doctorNotes || notes || consultation.notes,
      symptoms: symptoms || consultation.symptoms,
      follow_up_date: followUpDate || consultation.follow_up_date,
      follow_up_notes: followUpNotes || consultation.follow_up_notes,
      lab_tests: labTests || consultation.lab_tests,
    });

    await Appointment.update({ status: 'Completed' }, { where: { id: consultation.appointment_id, hospital_id: req.hospitalId } });

    // Handle Prescriptions
    if (diagnosis || (medicines && medicines.length > 0)) {
      let prescription = await Prescription.findOne({ where: { consultation_id: consultation.id } });
      if (prescription) {
        await prescription.update({ diagnosis: diagnosis || '', instructions: req.body.instructions || '' });
        await PrescriptionMedicine.destroy({ where: { prescription_id: prescription.id } });
      } else {
        prescription = await Prescription.create({
          hospital_id: req.hospitalId,
          consultation_id: consultation.id,
          appointment_id: consultation.appointment_id,
          patient_id: consultation.patient_id,
          doctor_id: req.user.id,
          diagnosis: diagnosis || '',
          instructions: req.body.instructions || '',
          status: 'Active',
        });
      }

      if (medicines && medicines.length > 0) {
        await PrescriptionMedicine.bulkCreate(
          medicines.map(m => ({
            prescription_id: prescription.id,
            name: m.medicineName || m.name,
            generic_name: m.generic_name || m.genericName,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
            quantity: m.quantity || 1,
          }))
        );
      }

      // Automatically create a PharmacyOrder for the newly completed prescription
      let order = await PharmacyOrder.findOne({ where: { prescription_id: prescription.id, hospital_id: req.hospitalId } });
      if (!order) {
        const appointmentObj = await Appointment.findByPk(consultation.appointment_id);
        const tokenNumberStr = appointmentObj ? (appointmentObj.token_number ? `T-${appointmentObj.token_number}` : '') : '';
        await PharmacyOrder.create({
          hospital_id: req.hospitalId,
          prescription_id: prescription.id,
          patient_id: consultation.patient_id,
          status: 'Pending',
          total_amount: 0,
          payment_status: 'Unpaid',
          notes: tokenNumberStr || `T-${consultation.appointment_id}`
        });
      }
    }

    // Handle Lab Tests
    if (labTests && labTests.length > 0) {
      // First clear any existing lab tests for this consultation
      await LabTest.destroy({ where: { consultation_id: consultation.id, hospital_id: req.hospitalId } });
      
      for (const testName of labTests) {
        await LabTest.create({
          hospital_id: req.hospitalId,
          consultation_id: consultation.id,
          patient_id: consultation.patient_id,
          doctor_id: req.user.id,
          test_name: testName,
          status: 'Ordered',
        });
      }
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Consultations',
      table_name: 'consultations',
      record_id: consultation.id,
      description: `Consultation completed by Dr. ${req.user.name}`,
      ip_address: req.ip,
    });

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('consultation_completed', { consultationId: consultation.id, appointmentId: consultation.appointment_id });

    res.json({ success: true, data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctor/appointments — Book a follow-up appointment for a patient
const bookFollowUpAppointment = async (req, res) => {
  const t = await req.db.transaction();
  try {
    const { Appointment, Token, Patient } = req.models;
    const { patientId, department, date_time, reason, notes } = req.body;

    if (!patientId || !date_time) {
      return res.status(400).json({ success: false, message: 'patientId and date_time are required' });
    }

    // Verify patient belongs to this hospital (data isolation)
    const patient = await Patient.findOne({
      where: { id: patientId, hospital_id: req.hospitalId },
    });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found in this hospital' });

    const appointmentDateTime = new Date(date_time);
    const dayStart = new Date(appointmentDateTime); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(appointmentDateTime); dayEnd.setHours(23, 59, 59, 999);

    // Auto token number for this doctor on this day
    const tokenCount = await Appointment.count({
      where: { hospital_id: req.hospitalId, doctor_id: req.user.id, date_time: { [Op.between]: [dayStart, dayEnd] } },
      transaction: t,
    });
    const tokenNumber = tokenCount + 1;

    const appointment = await Appointment.create({
      hospital_id: req.hospitalId,
      patient_id: patientId,
      doctor_id: req.user.id,
      department: department || req.user.department || 'General Medicine',
      date_time: appointmentDateTime,
      token_number: tokenNumber,
      reason: reason || 'Follow-up Consultation',
      notes: notes || '',
      visit_type: 'Follow-Up',
      booked_by: 'DOCTOR',
      status: 'Confirmed',
    }, { transaction: t });

    await Token.create({
      hospital_id: req.hospitalId,
      appointment_id: appointment.id,
      patient_id: patientId,
      doctor_id: req.user.id,
      token_number: tokenNumber,
      token_date: appointmentDateTime.toISOString().split('T')[0],
      status: 'Waiting',
    }, { transaction: t });

    await t.commit();

    const io = req.app.get('io');
    if (io) io.to(`hospital_${req.hospitalId}`).emit('new_appointment', { appointmentId: appointment.id, tokenNumber, patientId, doctorId: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Follow-up appointment booked',
      data: { appointmentId: appointment.id, tokenNumber, patientName: patient.full_name },
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/appointments/today
const getTodayAppointments = async (req, res) => {
  try {
    const { Appointment, Patient, Vitals } = req.models;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const appointments = await Appointment.findAll({
      where: { hospital_id: req.hospitalId, doctor_id: req.user.id, date_time: { [Op.between]: [today, todayEnd] } },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id', 'phone', 'gender'] },
        { model: Vitals, as: 'vitals', required: false },
      ],
      order: [['token_number', 'ASC']],
    });

    const mapped = appointments.map(appt => {
      const json = appt.toJSON();
      json._id = json.id;
      json.tokenNumber = json.token_number;
      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.name = json.patient.full_name;
      }
      return json;
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/prescriptions
const getPrescriptions = async (req, res) => {
  try {
    const { Prescription, Patient, PrescriptionMedicine } = req.models;
    const { page = 1, limit = 20, status } = req.query;
    const where = { hospital_id: req.hospitalId, doctor_id: req.user.id };
    if (status) where.status = status;

    const { count, rows } = await Prescription.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'patient_id'] },
        { model: PrescriptionMedicine, as: 'medicines' },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/notifications
const getNotifications = async (req, res) => {
  try {
    const { Notification } = req.models;
    const notifications = await Notification.findAll({
      where: { hospital_id: req.hospitalId, [Op.or]: [{ user_id: req.user.id }, { user_id: null }] },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctor/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const { Notification } = req.models;
    // user_id scoping prevents one doctor from marking another's notification as read
    await Notification.update(
      { status: 'read', read_at: new Date() },
      { where: { id: req.params.id, hospital_id: req.hospitalId, user_id: req.user.id } }
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/patients/:id/reports
const getPatientReports = async (req, res) => {
  try {
    const { Report } = req.models;
    const reports = await Report.findAll({
      where: { patient_id: req.params.id, hospital_id: req.hospitalId, is_deleted: false },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/doctor/profile
const getDoctorProfile = async (req, res) => {
  try {
    const { User } = req.models;
    // hospital_id scope ensures doctor cannot retrieve a profile outside their tenant
    const doctor = await User.findOne({
      where: { id: req.user.id, hospital_id: req.hospitalId },
      attributes: { exclude: ['password'] },
    });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const doctorJson = doctor.toJSON();
    doctorJson.avatar = doctorJson.profile_image || '';
    doctorJson.profileImage = doctorJson.profile_image || '';
    res.json({ success: true, data: doctorJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctor/profile — update own profile (hospital_id guard added for isolation)
const updateDoctorProfile = async (req, res) => {
  try {
    const { User } = req.models;
    // Strip fields that must never be changed via this endpoint
    const { password, role, hospital_id, ...updates } = req.body;
    
    // Convert avatar or profileImage from req.body if sent, to profile_image
    if (updates.avatar) updates.profile_image = updates.avatar;
    if (updates.profileImage) updates.profile_image = updates.profileImage;

    // hospital_id in WHERE ensures a doctor can only update their own hospital-scoped record
    await User.update(updates, { where: { id: req.user.id, hospital_id: req.hospitalId } });
    const updated = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!updated) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const updatedJson = updated.toJSON();
    updatedJson.avatar = updatedJson.profile_image || '';
    updatedJson.profileImage = updatedJson.profile_image || '';
    res.json({ success: true, data: updatedJson, profile: updatedJson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/doctors/upload-avatar
const uploadDoctorAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { User } = req.models;
    const doctorId = req.user.id;
    const hospitalId = req.hospitalId;

    // Get file info
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `avatar-${doctorId}-${Date.now()}${ext}`;

    let imageUrl = '';

    // Check S3 config
    const s3Bucket = process.env.AWS_S3_BUCKET;
    const s3AccessKey = process.env.AWS_ACCESS_KEY_ID;
    const s3SecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const s3Region = process.env.AWS_REGION || 'ap-south-1';

    const hasS3Config = s3Bucket && s3AccessKey && s3SecretKey && 
                        s3AccessKey !== 'your_access_key' && 
                        s3SecretKey !== 'your_secret_key';

    if (hasS3Config) {
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({
          region: s3Region,
          credentials: {
            accessKeyId: s3AccessKey,
            secretAccessKey: s3SecretKey,
          },
        });

        const s3Key = `hospitals/${hospitalId}/doctors/${doctorId}/${fileName}`;

        await s3Client.send(new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));

        imageUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${s3Key}`;
        console.log(`Uploaded doctor avatar to S3: ${imageUrl}`);
      } catch (s3Err) {
        console.error('Failed to upload doctor avatar to S3, falling back to local storage:', s3Err);
        imageUrl = await saveFileLocally(req, fileName);
      }
    } else {
      console.log('AWS S3 not fully configured or contains placeholders, storing doctor avatar locally.');
      imageUrl = await saveFileLocally(req, fileName);
    }

    // Update user in DB
    await User.update({ profile_image: imageUrl }, { where: { id: doctorId, hospital_id: hospitalId } });

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Doctor avatar upload controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveFileLocally = async (req, fileName) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, fileName);
  await fs.promises.writeFile(filePath, req.file.buffer);
  
  // Use BACKEND_URL env var so stored URLs are always https:// pointing at the
  // real backend, never http://localhost (which causes Mixed Content on HTTPS pages).
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.RENDER_URL ||
    (() => {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const host  = req.get('x-forwarded-host')  || req.get('host');
      return `${proto}://${host}`;
    })();
  return `${backendUrl}/uploads/${fileName}`;
};

// PUT /api/doctors/change-password
const changeDoctorPassword = async (req, res) => {
  try {
    const { User } = req.models;
    const { currentPassword, newPassword } = req.body;

    const pwdError = getPasswordComplexityError(newPassword);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    // hospital_id scope prevents a doctor token from changing a user in another tenant
    const user = await User.findOne({ where: { id: req.user.id, hospital_id: req.hospitalId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    await user.update({ password: await bcrypt.hash(newPassword, salt) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/doctor/appointment/:id/call
const callPatient = async (req, res) => {
  try {
    const { Appointment, Consultation } = req.models;
    const appointmentId = req.params.id;
    const hospitalId = req.hospitalId;

    const appointment = await Appointment.findOne({ where: { id: appointmentId, hospital_id: hospitalId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Update appointment status to In-Progress
    await appointment.update({ status: 'In-Progress' });

    // Find or create Consultation for this appointment
    let consultation = await Consultation.findOne({ where: { appointment_id: appointmentId, hospital_id: hospitalId } });
    if (!consultation) {
      consultation = await Consultation.create({
        hospital_id: hospitalId,
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: req.user.id,
        status: 'In-Progress',
        started_at: new Date(),
      });
    } else {
      await consultation.update({ status: 'In-Progress', started_at: new Date() });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${hospitalId}`).emit('consultation_started', { consultationId: consultation.id, appointmentId });
      io.to(`hospital_${hospitalId}`).emit('appointment_status_updated', { appointmentId, status: 'In-Progress' });
    }

    res.json({ success: true, message: 'Patient called', data: consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  login,
  getDashboardStatsV2,
  getDashboardSchedule,
  getDashboardChart,
  getPatients,
  getPatientQueue,
  getPatientById,
  getPatientHistoryV2,
  getPatientReports,
  getConsultationByAppointmentId,
  startConsultation,
  saveConsultationNotes,
  savePrescription,
  completeConsultation,
  bookFollowUpAppointment,
  getTodayAppointments,
  getPrescriptions,
  getNotifications,
  markNotificationRead,
  getDoctorProfile,
  updateDoctorProfile,
  changeDoctorPassword,
  callPatient,
  uploadDoctorAvatar,
};
