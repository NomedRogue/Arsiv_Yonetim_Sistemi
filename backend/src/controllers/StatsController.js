/**
 * Stats Controller
 * Handles HTTP requests for statistics and analytics
 */

const { getStatsService } = require('../services/StatsService');
const logger = require('../utils/logger');

const statsService = getStatsService();

/**
 * Get dashboard statistics
 * GET /api/stats/dashboard?treemapFilter=all&yearFilter=last12
 */
async function getDashboardStats(req, res, next) {
  try {
    const filters = {
      treemapFilter: req.query.treemapFilter || 'all',
      yearFilter: req.query.yearFilter || 'last12'
    };
    
    const stats = await statsService.getDashboardStats(filters);
    res.json(stats);
  } catch (error) {
    logger.error('[STATS_CONTROLLER] getDashboardStats error:', { error, query: req.query });
    next(error);
  }
}

/**
 * Get folders for a specific disposal year
 * GET /api/stats/disposal-year/:year
 */
async function getDisposalYearFolders(req, res, next) {
  try {
    const { year } = req.params;
    const isOverdue = year === 'overdue';
    const targetYear = isOverdue ? null : parseInt(year, 10);
    
    const folders = statsService.getDisposalYearFolders(targetYear, isOverdue);
    res.json(folders);
  } catch (error) {
    logger.error('[STATS_CONTROLLER] getDisposalYearFolders error:', { error, year: req.params.year });
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getDisposalYearFolders
};
