'use strict';

const { broadcastEvent } = require('../sockets/socket');

// DB → Frontend status map
const DB_TO_FRONTEND_STATUS = { Pending: 'Unpaid', Paid: 'Paid', Failed: 'Failed', Refunded: 'Refunded' };
// Frontend → DB status map
const FRONTEND_TO_DB_STATUS = { Unpaid: 'Pending', Paid: 'Paid', Failed: 'Failed', Refunded: 'Refunded' };
// Valid DB ENUM values
const VALID_DB_STATUSES = Object.keys(DB_TO_FRONTEND_STATUS);

const mapDbStatusToFrontend = (status) => DB_TO_FRONTEND_STATUS[status] || status;

const mapFrontendStatusToDb = (status) => {
  const mapped = FRONTEND_TO_DB_STATUS[status];
  if (!mapped) throw new Error(`Invalid payment status '${status}'. Allowed: ${Object.keys(FRONTEND_TO_DB_STATUS).join(', ')}`);
  return mapped;
};

// Helper to map payment method to DB ENUM
const mapPaymentMethodToDb = (method) => {
  const allowed = ['Cash', 'Card', 'UPI', 'Insurance', 'Online', 'Other'];
  if (allowed.includes(method)) return method;
  if (method === 'NetBanking') return 'Online';
  return 'Other';
};

const getInvoices = async (req, res) => {
  try {
    const { Payment, Patient } = req.models;
    const { paymentStatus, page = 1, limit = 20 } = req.query;

    const where = { hospital_id: req.hospitalId };
    if (paymentStatus) {
      try {
        where.status = mapFrontendStatusToDb(paymentStatus);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    const mapped = rows.map(inv => {
      const json = inv.toJSON();
      json._id = json.id;
      json.invoiceNumber = json.invoice_number;
      json.transactionDate = json.created_at || json.createdAt;
      json.paymentMethod = json.payment_method;
      json.paymentStatus = mapDbStatusToFrontend(json.status);
      json.totalAmount = parseFloat(json.amount);

      // Parse JSON from description if possible
      let meta = {};
      if (json.description) {
        try {
          meta = JSON.parse(json.description);
        } catch (e) {
          // Plain text description fallback
          meta = {
            items: [{ description: json.description, amount: json.totalAmount }],
            subTotal: json.totalAmount,
            discount: 0,
            tax: 0,
            amountPaid: json.status === 'Paid' ? json.totalAmount : 0,
            insurance: { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 }
          };
        }
      }

      // Merge meta fields
      json.items = meta.items || [{ description: 'Medical Service', amount: json.totalAmount }];
      json.subTotal = meta.subTotal !== undefined ? parseFloat(meta.subTotal) : json.totalAmount;
      json.discount = meta.discount !== undefined ? parseFloat(meta.discount) : 0;
      json.tax = meta.tax !== undefined ? parseFloat(meta.tax) : 0;
      json.amountPaid = meta.amountPaid !== undefined ? parseFloat(meta.amountPaid) : (json.status === 'Paid' ? json.totalAmount : 0);
      json.insurance = meta.insurance || { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 };

      if (json.patient) {
        json.patient._id = json.patient.id;
        json.patient.name = json.patient.full_name;
      }

      return json;
    });

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (error) {
    console.error('Error in getInvoices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createInvoice = async (req, res) => {
  const { patientId, appointmentId, items, discount, tax, paymentMethod, insurance } = req.body;
  try {
    const { Payment, Patient, AuditLog } = req.models;

    const patient = await Patient.findOne({
      where: { id: patientId, hospital_id: req.hospitalId }
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subTotal * (tax / 100 || 0);
    const discountAmount = subTotal * (discount / 100 || 0);
    const totalAmount = subTotal + taxAmount - discountAmount;

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const meta = {
      items,
      subTotal,
      discount,
      tax,
      amountPaid: paymentMethod === 'Insurance' ? 0 : totalAmount,
      insurance: insurance || { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 }
    };

    const invoice = await Payment.create({
      hospital_id: req.hospitalId,
      patient_id: patientId,
      appointment_id: appointmentId || null,
      amount: totalAmount,
      currency: 'INR',
      status: paymentMethod === 'Insurance' ? 'Pending' : 'Paid',
      payment_method: mapPaymentMethodToDb(paymentMethod),
      invoice_number: invoiceNumber,
      paid_at: paymentMethod === 'Insurance' ? null : new Date(),
      description: JSON.stringify(meta)
    });

    const populated = await Payment.findOne({
      where: { id: invoice.id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email']
        }
      ]
    });

    const json = populated.toJSON();
    json._id = json.id;
    json.invoiceNumber = json.invoice_number;
    json.transactionDate = json.created_at || json.createdAt;
    json.paymentMethod = json.payment_method;
    json.paymentStatus = mapDbStatusToFrontend(json.status);
    json.totalAmount = parseFloat(json.amount);
    
    // Merge meta fields
    json.items = meta.items;
    json.subTotal = meta.subTotal;
    json.discount = meta.discount;
    json.tax = meta.tax;
    json.amountPaid = meta.amountPaid;
    json.insurance = meta.insurance;

    if (json.patient) {
      json.patient._id = json.patient.id;
      json.patient.name = json.patient.full_name;
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'CREATE',
      module: 'Billing',
      description: `Generated invoice ${invoiceNumber} for patient ${patient.full_name} totaling $${totalAmount}`,
      ip_address: req.ip
    });

    broadcastEvent('payment_update', json);

    res.status(201).json({ success: true, data: json });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateInvoiceStatus = async (req, res) => {
  const { paymentStatus, amountPaid, paymentMethod, insurance } = req.body;
  try {
    const { Payment, Patient, AuditLog } = req.models;
    const invoice = await Payment.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'full_name']
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (paymentStatus) {
      invoice.status = mapFrontendStatusToDb(paymentStatus);
      if (invoice.status === 'Paid') {
        invoice.paid_at = new Date();
      }
    }
    if (paymentMethod) {
      invoice.payment_method = mapPaymentMethodToDb(paymentMethod);
    }

    // Parse existing meta
    let meta = {};
    if (invoice.description) {
      try {
        meta = JSON.parse(invoice.description);
      } catch (e) {
        meta = {
          items: [{ description: invoice.description, amount: parseFloat(invoice.amount) }],
          subTotal: parseFloat(invoice.amount),
          discount: 0,
          tax: 0,
          amountPaid: invoice.status === 'Paid' ? parseFloat(invoice.amount) : 0,
          insurance: { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 }
        };
      }
    }

    if (amountPaid !== undefined) {
      meta.amountPaid = parseFloat(amountPaid);
    }
    if (insurance) {
      meta.insurance = { ...meta.insurance, ...insurance };
    }

    // Save updated meta
    invoice.description = JSON.stringify(meta);

    await invoice.save();

    const json = invoice.toJSON();
    json._id = json.id;
    json.invoiceNumber = json.invoice_number;
    json.transactionDate = json.created_at || json.createdAt;
    json.paymentMethod = json.payment_method;
    json.paymentStatus = mapDbStatusToFrontend(json.status);
    json.totalAmount = parseFloat(json.amount);

    // Merge meta fields
    json.items = meta.items;
    json.subTotal = meta.subTotal;
    json.discount = meta.discount;
    json.tax = meta.tax;
    json.amountPaid = meta.amountPaid;
    json.insurance = meta.insurance;

    if (json.patient) {
      json.patient._id = json.patient.id;
      json.patient.name = json.patient.full_name;
    }

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user.id,
      action: 'UPDATE',
      module: 'Billing',
      description: `Updated status for invoice ${invoice.invoice_number} to ${json.paymentStatus}`,
      ip_address: req.ip
    });

    broadcastEvent('payment_update', json);

    res.json({ success: true, data: json });
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  updateInvoiceStatus
};
