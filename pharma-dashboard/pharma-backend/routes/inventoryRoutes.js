const express = require('express');
const router = express.Router();
const {
  getInventory,
  updateStock,
  addInventoryItem
} = require('../controllers/inventoryController');

router.route('/')
  .get(getInventory)
  .post(addInventoryItem);

router.route('/:id')
  .put(updateStock);

module.exports = router;
