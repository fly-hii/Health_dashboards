'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initConnections, sharedSaasDb } = require('./services/databaseResolver');
const { createModels } = require('./services/modelFactory');

(async () => {
  try {
    console.log('🔄 Initializing database connections...');
    await initConnections();
    console.log('✅ Connected.');

    const models = createModels(sharedSaasDb);
    const { Hospital, LabTest, Payment, Patient, User } = models;

    // 1. Query hospitals in tenant DB to find the correct hospital_id
    console.log('\n--- Querying Hospitals in Tenant DB ---');
    const hospitals = await Hospital.findAll();
    if (hospitals.length === 0) {
      console.log('❌ No hospitals found in the tenant DB. Creating a default hospital record...');
      const defaultHospital = await Hospital.create({
        name: 'CarePlus Main Hospital',
        code: 'SAI001',
        email: 'sai@gmail.com',
        phone: '1234567890',
        plan: 'premium',
        status: 'active'
      });
      console.log(`✅ Default hospital created with ID: ${defaultHospital.id}`);
      hospitals.push(defaultHospital);
    } else {
      console.log(`Found ${hospitals.length} hospitals:`);
      console.table(hospitals.map(h => ({ id: h.id, name: h.name, code: h.code })));
    }

    const targetHospitalId = hospitals[0].id;
    console.log(`Using hospital_id: ${targetHospitalId} for seeding...`);

    // 2. Check/Create Lab Technician
    let technician = await User.findOne({
      where: { hospital_id: targetHospitalId, role: 'LAB_TECHNICIAN' }
    });

    if (!technician) {
      console.log('Seeding Lab Technician...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      technician = await User.create({
        hospital_id: targetHospitalId,
        name: 'Alex Martinez',
        email: 'alex.lab@careplus.com',
        password: passwordHash,
        role: 'LAB_TECHNICIAN',
        status: 'Active',
        phone: '9876543201',
        department: 'LABORATORY',
        availability_status: 'Available'
      });
      console.log(`✅ Lab Technician created: ${technician.name}`);
    } else {
      console.log(`ℹ️ Lab Technician exists: ${technician.name}`);
    }

    // 3. Check/Create Patient
    let patient = await Patient.findOne({
      where: { hospital_id: targetHospitalId, patient_id: 'PAT-SAI-01' }
    });

    if (!patient) {
      console.log('Seeding Patient...');
      patient = await Patient.create({
        hospital_id: targetHospitalId,
        patient_id: 'PAT-SAI-01',
        full_name: 'David Miller',
        email: 'david.miller@example.com',
        phone: '9988776655',
        dob: '1988-11-23',
        gender: 'Male',
        blood_group: 'A+',
        status: 'active'
      });
      console.log(`✅ Patient created: ${patient.full_name}`);
    } else {
      console.log(`ℹ️ Patient exists: ${patient.full_name}`);
    }

    // 4. Check/Create Lab Test
    let labTest = await LabTest.findOne({
      where: { hospital_id: targetHospitalId, patient_id: patient.id }
    });

    if (!labTest) {
      console.log('Seeding Lab Test...');
      labTest = await LabTest.create({
        hospital_id: targetHospitalId,
        patient_id: patient.id,
        doctor_id: technician.id,
        test_name: 'Lipid Panel Test',
        test_code: 'LIPID-01',
        category: 'Biochemistry',
        priority: 'Routine',
        status: 'Ordered',
        notes: 'Fast for 12 hours before sample collection'
      });
      console.log(`✅ Lab Test created: ${labTest.test_name}`);
    } else {
      console.log(`ℹ️ Lab Test exists: ${labTest.test_name}`);
    }

    // 5. Check/Create Invoice (Payment)
    let payment = await Payment.findOne({
      where: { hospital_id: targetHospitalId, patient_id: patient.id }
    });

    if (!payment) {
      console.log('Seeding Invoice...');
      const meta = {
        items: [
          { description: 'Lipid Panel Diagnostic', amount: 85.00 },
          { description: 'General Practitioner Consultation', amount: 50.00 }
        ],
        subTotal: 135.00,
        discount: 10,
        tax: 5,
        amountPaid: 0,
        insurance: { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 }
      };

      const totalAmount = 127.58;

      payment = await Payment.create({
        hospital_id: targetHospitalId,
        patient_id: patient.id,
        amount: totalAmount,
        currency: 'USD',
        status: 'Pending',
        payment_method: 'Cash',
        invoice_number: 'INV-773129',
        paid_at: null,
        description: JSON.stringify(meta)
      });
      console.log(`✅ Invoice created: ${payment.invoice_number} (Amount: $${totalAmount})`);
    } else {
      console.log(`ℹ️ Invoice exists: ${payment.invoice_number}`);
    }

    console.log('\n--- Verifying LabTest Query ---');
    const tests = await LabTest.findAll({
      where: { hospital_id: targetHospitalId },
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'phone', 'dob', 'gender'] },
        { model: User, as: 'technician', attributes: ['id', 'name'] }
      ]
    });
    console.log(`Found ${tests.length} tests.`);
    tests.forEach(t => {
      const json = t.toJSON();
      console.log(`- Test: ${json.test_name}, Patient: ${json.patient?.full_name}, Tech: ${json.technician?.name}, Status: ${json.status}`);
    });

    console.log('\n--- Verifying Payment Query ---');
    const payments = await Payment.findAll({
      where: { hospital_id: targetHospitalId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name', 'phone', 'email'] }]
    });
    console.log(`Found ${payments.length} payments.`);
    payments.forEach(p => {
      const json = p.toJSON();
      console.log(`- Invoice: ${json.invoice_number}, Patient: ${json.patient?.full_name}, Amount: ${json.amount}, Status: ${json.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
})();
