const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const { broadcastEvent } = require('../sockets/socket');

const getInvoices = async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    let query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const invoices = await Payment.find(query)
      .populate('patient', 'name phone email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createInvoice = async (req, res) => {
  const { patientId, appointmentId, items, discount, tax, paymentMethod, insurance } = req.body;
  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subTotal * (tax / 100 || 0);
    const discountAmount = subTotal * (discount / 100 || 0);
    const totalAmount = subTotal + taxAmount - discountAmount;

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const invoice = await Payment.create({
      invoiceNumber,
      patient: patientId,
      appointment: appointmentId || null,
      items,
      subTotal,
      discount,
      tax,
      totalAmount,
      amountPaid: paymentMethod === 'Insurance' ? 0 : totalAmount, 
      paymentMethod,
      paymentStatus: paymentMethod === 'Insurance' ? 'Unpaid' : 'Paid',
      insurance: insurance || { provider: '', policyNumber: '', claimStatus: 'None', approvedAmount: 0 }
    });

    const populated = await Payment.findById(invoice._id).populate('patient', 'name');

    await AuditLog.create({
      user: req.user._id,
      action: 'Invoice Generation',
      module: 'Billing',
      description: `Generated invoice ${invoiceNumber} for patient ${patient.name} totaling $${totalAmount}`,
      ipAddress: req.ip
    });

    broadcastEvent('payment_update', populated);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateInvoiceStatus = async (req, res) => {
  const { paymentStatus, amountPaid, paymentMethod, insurance } = req.body;
  try {
    const invoice = await Payment.findById(req.params.id).populate('patient', 'name');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (amountPaid !== undefined) invoice.amountPaid = amountPaid;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (insurance) {
      invoice.insurance = { ...invoice.insurance, ...insurance };
    }

    await invoice.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'Invoice Status Update',
      module: 'Billing',
      description: `Updated status for invoice ${invoice.invoiceNumber} to ${invoice.paymentStatus}`,
      ipAddress: req.ip
    });

    broadcastEvent('payment_update', invoice);

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  updateInvoiceStatus
};
