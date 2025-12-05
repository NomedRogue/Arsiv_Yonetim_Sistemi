/**
 * Checkout Routes
 * RESTful endpoints for checkout/return operations
 */

const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/CheckoutController');

// GET /api/checkouts - Get all checkouts (with optional filters)
router.get('/', checkoutController.getAllCheckouts);

// GET /api/checkouts/active - Get active checkouts with folder info
router.get('/active', checkoutController.getActiveCheckouts);

// GET /api/checkouts/overdue - Get overdue checkouts
router.get('/overdue', checkoutController.getOverdueCheckouts);

// POST /api/checkouts - Create new checkout
router.post('/', checkoutController.createCheckout);

// POST /api/checkouts/:id/return - Return checkout
router.post('/:id/return', checkoutController.returnCheckout);

// PUT /api/checkouts/:id - Update checkout information
router.put('/:id', checkoutController.updateCheckout);

module.exports = router;
