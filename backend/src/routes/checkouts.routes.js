/**
 * Checkout Routes
 * RESTful endpoints for checkout/return operations
 */

const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/CheckoutController');

/**
 * @swagger
 * tags:
 *   name: Checkouts
 *   description: Folder checkout and return management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Checkout:
 *       type: object
 *       required:
 *         - folderId
 *         - checkoutType
 *         - personName
 *         - personSurname
 *         - checkoutDate
 *         - plannedReturnDate
 *       properties:
 *         id:
 *           type: string
 *         folderId:
 *           type: string
 *           description: ID of the folder being checked out
 *         checkoutType:
 *           type: string
 *           enum: [Tam, Kismi]
 *         documentDescription:
 *           type: string
 *           description: Required if checkoutType is Kismi
 *         personName:
 *           type: string
 *         personSurname:
 *           type: string
 *         personPhone:
 *           type: string
 *         reason:
 *           type: string
 *         checkoutDate:
 *           type: string
 *           format: date-time
 *         plannedReturnDate:
 *           type: string
 *           format: date-time
 *         actualReturnDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [Çıkışta, İade Edildi]
 */

/**
 * @swagger
 * /checkouts:
 *   get:
 *     summary: Get all checkouts
 *     tags: [Checkouts]
 *     responses:
 *       200:
 *         description: List of checkouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Checkout'
 */
router.get('/', checkoutController.getAllCheckouts);

/**
 * @swagger
 * /checkouts/active:
 *   get:
 *     summary: Get active (not returned) checkouts
 *     tags: [Checkouts]
 *     responses:
 *       200:
 *         description: List of active checkouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Checkout'
 */
router.get('/active', checkoutController.getActiveCheckouts);

/**
 * @swagger
 * /checkouts/overdue:
 *   get:
 *     summary: Get overdue checkouts
 *     tags: [Checkouts]
 *     responses:
 *       200:
 *         description: List of overdue checkouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Checkout'
 */
router.get('/overdue', checkoutController.getOverdueCheckouts);

/**
 * @swagger
 * /checkouts:
 *   post:
 *     summary: Create a new checkout
 *     tags: [Checkouts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Checkout'
 *     responses:
 *       200:
 *         description: Checkout created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Checkout'
 *       400:
 *         description: Validation error or Folder not available
 */
router.post('/', checkoutController.createCheckout);

/**
 * @swagger
 * /checkouts/{id}/return:
 *   post:
 *     summary: Return a checkout
 *     tags: [Checkouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout returned successfully
 *       404:
 *         description: Checkout not found
 */
router.post('/:id/return', checkoutController.returnCheckout);

/**
 * @swagger
 * /checkouts/{id}:
 *   put:
 *     summary: Update checkout information
 *     tags: [Checkouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Checkout'
 *     responses:
 *       200:
 *         description: Checkout updated
 *       404:
 *         description: Checkout not found
 */
router.put('/:id', checkoutController.updateCheckout);

module.exports = router;
