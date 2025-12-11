const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { strictLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', strictLimiter, (req, res) => authController.register(req, res));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and return JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', strictLimiter, (req, res) => authController.login(req, res));

// Protected routes
/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change current user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password format or wrong current password
 */
router.post('/change-password', verifyToken, (req, res) => authController.changePassword(req, res));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged in user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 */
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin User Management Routes

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', verifyToken, requireAdmin, (req, res) => authController.getUsers(req, res));

/**
 * @swagger
 * /auth/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, user, viewer]
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/users', verifyToken, requireAdmin, (req, res) => authController.createUser(req, res));

/**
 * @swagger
 * /auth/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', verifyToken, requireAdmin, (req, res) => authController.deleteUser(req, res));

/**
 * @swagger
 * /auth/users/{id}/password:
 *   put:
 *     summary: Admin reset user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/users/:id/password', verifyToken, requireAdmin, (req, res) => authController.adminUpdatePassword(req, res));

module.exports = router;
