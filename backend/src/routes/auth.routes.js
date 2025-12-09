const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { strictLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/login', strictLimiter, (req, res) => authController.login(req, res));

// Protected routes
router.post('/change-password', verifyToken, (req, res) => authController.changePassword(req, res));
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin User Management Routes
router.get('/users', verifyToken, requireAdmin, (req, res) => authController.getUsers(req, res));
router.post('/users', verifyToken, requireAdmin, (req, res) => authController.createUser(req, res));
router.delete('/users/:id', verifyToken, requireAdmin, (req, res) => authController.deleteUser(req, res));
router.put('/users/:id/password', verifyToken, requireAdmin, (req, res) => authController.adminUpdatePassword(req, res));

module.exports = router;
