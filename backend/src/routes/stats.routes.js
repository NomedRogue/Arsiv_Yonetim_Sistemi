/**
 * Stats Routes
 * RESTful endpoints for statistics and analytics
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/StatsController');

// GET /api/stats/dashboard - Get dashboard statistics
router.get('/dashboard', statsController.getDashboardStats);

// GET /api/stats/disposal-year/:year - Get folders for specific disposal year
router.get('/disposal-year/:year', statsController.getDisposalYearFolders);

module.exports = router;
