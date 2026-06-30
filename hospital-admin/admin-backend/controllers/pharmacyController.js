'use strict';

const { Op } = require('sequelize');

const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { PharmacyOrder, Patient, User } = req.models;
    
    const where = { hospital_id: req.hospitalId };
    if (status) where.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const { count, rows } = await PharmacyOrder.findAndCountAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'phone'] },
        { model: User, as: 'pharmacist', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    const formattedOrders = rows.map(order => {
      const data = order.toJSON();
      if (data.patient) {
        data.patient.name = data.patient.full_name;
      }
      return data;
    });

    res.json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders,
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, paymentStatus } = req.body;
  try {
    const { PharmacyOrder, Patient, AuditLog } = req.models;

    const order = await PharmacyOrder.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId },
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'full_name'] }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pharmacy order not found' });
    }

    const updateFields = {};
    if (status) updateFields.status = status;
    if (paymentStatus) updateFields.payment_status = paymentStatus;
    if (req.user) updateFields.pharmacist_id = req.user.id;

    await order.update(updateFields);

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Pharmacy',
      table_name: 'pharmacy_orders',
      record_id: order.id,
      description: `Updated pharmacy order status to ${order.status} and payment status to ${order.payment_status} for patient ${order.patient ? order.patient.full_name : 'Unknown'}`,
      ip_address: req.ip
    });

    // Emit event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${req.hospitalId}`).emit('pharmacy_order_update', order);
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInventory = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { MedicineInventory } = req.models;

    const where = { hospital_id: req.hospitalId };
    if (status && status !== 'all') where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { generic_name: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { manufacturer: { [Op.like]: `%${search}%` } },
      ];
    }

    const inventory = await MedicineInventory.findAll({
      where,
      order: [['name', 'ASC']]
    });

    // Map DB fields back to mongoose keys for frontend compatibility
    const formattedInventory = inventory.map(item => {
      const data = item.toJSON();
      return {
        id: data.id,
        _id: data.id, // compatibility
        medicineName: data.name,
        category: data.category,
        quantity: data.quantity_in_stock,
        unit: data.unit,
        price: parseFloat(data.unit_price),
        minStockLevel: data.reorder_level,
        supplier: data.manufacturer,
        expiryDate: data.expiry_date,
        batchNumber: data.batch_number,
        status: data.status,
        description: data.description,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    });

    res.json({ success: true, count: formattedInventory.length, data: formattedInventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addInventoryItem = async (req, res) => {
  try {
    const { MedicineInventory, AuditLog, Notification } = req.models;
    const { medicineName, category, quantity, unit, price, minStockLevel, supplier, expiryDate, batchNumber, description } = req.body;

    const item = await MedicineInventory.create({
      hospital_id: req.hospitalId,
      name: medicineName,
      category,
      quantity_in_stock: Number(quantity) || 0,
      unit,
      unit_price: Number(price) || 0,
      reorder_level: Number(minStockLevel) || 20,
      manufacturer: supplier,
      expiry_date: expiryDate ? new Date(expiryDate) : null,
      batch_number: batchNumber,
      description,
      status: (Number(quantity) === 0) ? 'Out of Stock' : (Number(quantity) <= (Number(minStockLevel) || 20)) ? 'Low Stock' : 'In Stock'
    });

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'CREATE',
      module: 'Pharmacy',
      table_name: 'medicine_inventory',
      record_id: item.id,
      description: `Added medicine ${item.name} with quantity ${item.quantity_in_stock} to stock`,
      ip_address: req.ip
    });

    if (item.quantity_in_stock <= item.reorder_level) {
      const alert = await Notification.create({
        hospital_id: req.hospitalId,
        title: 'Low Stock Alert',
        message: `Medicine '${item.name}' is low on stock (${item.quantity_in_stock} units remaining).`,
        type: 'system',
        priority: 'high'
      });
      const io = req.app.get('io');
      if (io) io.to(`hospital_${req.hospitalId}`).emit('notification', alert);
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateInventoryItem = async (req, res) => {
  try {
    const { MedicineInventory, AuditLog, Notification } = req.models;
    const item = await MedicineInventory.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const oldQty = item.quantity_in_stock;
    const { medicineName, category, quantity, unit, price, minStockLevel, supplier, expiryDate, batchNumber, description } = req.body;

    const updateFields = {};
    if (medicineName !== undefined) updateFields.name = medicineName;
    if (category !== undefined) updateFields.category = category;
    if (quantity !== undefined) updateFields.quantity_in_stock = Number(quantity);
    if (unit !== undefined) updateFields.unit = unit;
    if (price !== undefined) updateFields.unit_price = Number(price);
    if (minStockLevel !== undefined) updateFields.reorder_level = Number(minStockLevel);
    if (supplier !== undefined) updateFields.manufacturer = supplier;
    if (expiryDate !== undefined) updateFields.expiry_date = expiryDate ? new Date(expiryDate) : null;
    if (batchNumber !== undefined) updateFields.batch_number = batchNumber;
    if (description !== undefined) updateFields.description = description;

    // Recalculate status based on new quantity if updated
    const finalQty = quantity !== undefined ? Number(quantity) : oldQty;
    const finalMin = minStockLevel !== undefined ? Number(minStockLevel) : item.reorder_level;
    updateFields.status = (finalQty === 0) ? 'Out of Stock' : (finalQty <= finalMin) ? 'Low Stock' : 'In Stock';

    await item.update(updateFields);

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'UPDATE',
      module: 'Pharmacy',
      table_name: 'medicine_inventory',
      record_id: item.id,
      description: `Updated medicine ${item.name} stock from ${oldQty} to ${item.quantity_in_stock}`,
      ip_address: req.ip
    });

    if (item.quantity_in_stock <= item.reorder_level) {
      const alert = await Notification.create({
        hospital_id: req.hospitalId,
        title: 'Low Stock Alert',
        message: `Medicine '${item.name}' is low on stock (${item.quantity_in_stock} units remaining).`,
        type: 'system',
        priority: 'high'
      });
      const io = req.app.get('io');
      if (io) io.to(`hospital_${req.hospitalId}`).emit('notification', alert);
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteInventoryItem = async (req, res) => {
  try {
    const { MedicineInventory, AuditLog } = req.models;
    const item = await MedicineInventory.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const medicineName = item.name;
    await item.destroy();

    await AuditLog.create({
      hospital_id: req.hospitalId,
      user_id: req.user?.id,
      action: 'DELETE',
      module: 'Pharmacy',
      table_name: 'medicine_inventory',
      record_id: req.params.id,
      description: `Deleted medicine ${medicineName} from inventory`,
      ip_address: req.ip
    });

    res.json({ success: true, message: 'Medicine removed from inventory' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOrders,
  updateOrderStatus,
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
};
