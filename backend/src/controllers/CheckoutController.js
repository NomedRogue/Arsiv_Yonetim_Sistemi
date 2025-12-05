/**
 * Checkout Controller
 * Handles HTTP requests for checkout/return operations
 */

const { getCheckoutService } = require('../services/CheckoutService');
const logger = require('../utils/logger');

const checkoutService = getCheckoutService();

/**
 * Get all checkouts
 * GET /api/checkouts
 */
async function getAllCheckouts(req, res, next) {
  try {
    const filters = {
      status: req.query.status,
      folderId: req.query.folderId
    };

    const checkouts = await checkoutService.getAllCheckouts(filters);
    res.json(checkouts);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] getAllCheckouts error:', { error });
    next(error);
  }
}

/**
 * Get active checkouts with folder information
 * GET /api/checkouts/active
 */
async function getActiveCheckouts(req, res, next) {
  try {
    const checkouts = await checkoutService.getActiveCheckoutsWithFolders();
    res.json(checkouts);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] getActiveCheckouts error:', { error });
    next(error);
  }
}

/**
 * Get overdue checkouts
 * GET /api/checkouts/overdue
 */
async function getOverdueCheckouts(req, res, next) {
  try {
    const checkouts = await checkoutService.getOverdueCheckouts();
    res.json(checkouts);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] getOverdueCheckouts error:', { error });
    next(error);
  }
}

/**
 * Create new checkout
 * POST /api/checkouts
 */
async function createCheckout(req, res, next) {
  try {
    const checkout = await checkoutService.createCheckout(req.body);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('checkout_created', { ...checkout, ts: new Date() });

    res.status(201).json(checkout);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] createCheckout error:', { error });
    next(error);
  }
}

/**
 * Return checkout
 * POST /api/checkouts/:id/return
 */
async function returnCheckout(req, res, next) {
  try {
    const checkout = await checkoutService.returnCheckout(req.params.id);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('checkout_returned', { ...checkout, ts: new Date() });

    res.json(checkout);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] returnCheckout error:', { error, id: req.params.id });
    next(error);
  }
}

/**
 * Update checkout
 * PUT /api/checkouts/:id
 */
async function updateCheckout(req, res, next) {
  try {
    const checkout = await checkoutService.updateCheckout(req.params.id, req.body);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('checkout_updated', { ...checkout, ts: new Date() });

    res.json(checkout);
  } catch (error) {
    logger.error('[CHECKOUT_CONTROLLER] updateCheckout error:', { error, id: req.params.id });
    next(error);
  }
}

module.exports = {
  getAllCheckouts,
  getActiveCheckouts,
  getOverdueCheckouts,
  createCheckout,
  returnCheckout,
  updateCheckout
};
