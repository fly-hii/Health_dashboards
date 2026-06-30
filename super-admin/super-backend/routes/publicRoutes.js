'use strict';

const express = require('express');
const router  = express.Router();
const { getPublicPlans } = require('../controllers/planController');

// Public, unauthenticated endpoints consumed by the marketing website.
router.get('/plans', getPublicPlans);

module.exports = router;
