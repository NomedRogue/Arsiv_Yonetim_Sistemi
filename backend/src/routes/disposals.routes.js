/**
 * Disposal Routes
 * RESTful endpoints for disposal operations
 */

const express = require('express');
const router = express.Router();
const disposalController = require('../controllers/DisposalController');

// GET /api/disposals - Get all disposals
router.get('/', disposalController.getAllDisposals);

// POST /api/disposals - Create new disposal
router.post('/', disposalController.createDisposal);

module.exports = router;
