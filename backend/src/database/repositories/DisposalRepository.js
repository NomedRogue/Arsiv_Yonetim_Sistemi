/**
 * Disposal Repository
 * Handles folder disposal (imha) operations
 */

const BaseRepository = require('./BaseRepository');
const logger = require('../../utils/logger');

class DisposalRepository extends BaseRepository {
  constructor() {
    super('disposals');
  }

  serialize(disposal) {
    return {
      id: disposal.id || `disposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: JSON.stringify({
        folderId: disposal.folderId,
        disposalDate: disposal.disposalDate || new Date().toISOString(),
        reason: disposal.reason || 'İmha süresi doldu',
        originalFolderData: disposal.originalFolderData || null
      })
    };
  }

  deserialize(row) {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      folderId: data.folderId,
      disposalDate: new Date(data.disposalDate),
      reason: data.reason,
      originalFolderData: data.originalFolderData || null
    };
  }

  /**
   * Get disposals for specific folder
   */
  getByFolderId(folderId) {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName}`).all();
      const disposals = rows.map(row => this.deserialize(row));
      return disposals.filter(d => d.folderId === folderId);
    } catch (error) {
      logger.error('[DISPOSAL_REPO] getByFolderId error:', { error, folderId });
      throw error;
    }
  }

  /**
   * Get disposals within date range
   */
  getByDateRange(startDate, endDate) {
    try {
      const allDisposals = this.getAll();
      return allDisposals.filter(d => {
        const disposalDate = new Date(d.disposalDate);
        return disposalDate >= startDate && disposalDate <= endDate;
      });
    } catch (error) {
      logger.error('[DISPOSAL_REPO] getByDateRange error:', { error });
      throw error;
    }
  }
}

module.exports = DisposalRepository;
