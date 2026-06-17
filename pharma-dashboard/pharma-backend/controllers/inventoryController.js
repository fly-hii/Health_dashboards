const { Op } = require('sequelize');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Public
const getInventory = async (req, res) => {
  try {
    const { MedicineInventory } = req.models;
    const items = await MedicineInventory.findAll({
      where: { hospital_id: req.hospitalId },
      order: [['quantity_in_stock', 'ASC']]
    });

    // Map to old MongoDB format for frontend compatibility
    const mapped = items.map(item => {
      const json = item.toJSON();
      return {
        _id: json.id,
        id: json.id,
        medicineName: json.name,
        currentStock: json.quantity_in_stock,
        unit: json.unit || 'Tablets',
        reorderLevel: json.reorder_level,
        status: json.status,
        description: json.description,
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update inventory stock
// @route   PUT /api/inventory/:id
// @access  Public
const updateStock = async (req, res) => {
  try {
    const { MedicineInventory, Notification } = req.models;
    const { currentStock, status } = req.body;
    const item = await MedicineInventory.findOne({
      where: { id: req.params.id, hospital_id: req.hospitalId }
    });

    if (item) {
      if (currentStock !== undefined) {
        item.quantity_in_stock = currentStock;
        
        // Auto status calculation
        if (currentStock <= 0) {
          item.status = 'Out of Stock';
        } else if (currentStock <= item.reorder_level) {
          item.status = 'Low Stock';
        } else {
          item.status = 'In Stock';
        }
      }
      if (status !== undefined) {
        item.status = status;
      }
      
      await item.save();
      
      const mappedItem = {
        _id: item.id,
        id: item.id,
        medicineName: item.name,
        currentStock: item.quantity_in_stock,
        unit: item.unit || 'Tablets',
        reorderLevel: item.reorder_level,
        status: item.status,
      };

      // If low stock, emit notification
      if (item.status === 'Low Stock' || item.status === 'Out of Stock') {
        if (req.io) req.io.to(`hospital_${req.hospitalId}`).emit('lowStockAlert', mappedItem);
        try {
          const notification = await Notification.create({
            hospital_id: req.hospitalId,
            title: `${item.status} Alert`,
            message: `${item.name} is running low (${item.quantity_in_stock} ${item.unit} remaining).`,
            type: 'system',
            priority: 'high',
            status: 'unread',
            metadata: { inventoryId: item.id },
          });
          
          const mappedNotification = {
            _id: notification.id,
            id: notification.id,
            title: notification.title,
            message: notification.message,
            isRead: false,
          };
          if (req.io) req.io.to(`hospital_${req.hospitalId}`).emit('newNotification', mappedNotification);
        } catch (err) {
          console.error('Failed to create low stock notification:', err.message);
        }
      }
      
      res.json(mappedItem);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Public
const addInventoryItem = async (req, res) => {
  try {
    const { MedicineInventory } = req.models;
    const { medicineName, currentStock, unit, reorderLevel } = req.body;
    
    const itemExists = await MedicineInventory.findOne({
      where: { name: medicineName, hospital_id: req.hospitalId }
    });
    if (itemExists) {
      return res.status(400).json({ message: 'Item already exists' });
    }

    let status = 'In Stock';
    if (currentStock <= 0) status = 'Out of Stock';
    else if (currentStock <= reorderLevel) status = 'Low Stock';

    const item = await MedicineInventory.create({
      hospital_id: req.hospitalId,
      name: medicineName,
      quantity_in_stock: currentStock,
      unit: unit || 'Tablets',
      reorder_level: reorderLevel || 10,
      status: status,
    });

    const mapped = {
      _id: item.id,
      id: item.id,
      medicineName: item.name,
      currentStock: item.quantity_in_stock,
      unit: item.unit,
      reorderLevel: item.reorder_level,
      status: item.status,
    };

    res.status(201).json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInventory,
  updateStock,
  addInventoryItem
};
