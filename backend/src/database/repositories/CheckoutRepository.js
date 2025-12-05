/**
 * Checkout Repository
 * Handles folder checkout/return operations
 */

const BaseRepository = require('./BaseRepository');
const logger = require('../../utils/logger');

class CheckoutRepository extends BaseRepository {
  constructor() {
    super('checkouts');
  }

  serialize(checkout) {
    return {
      id: checkout.id || `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: JSON.stringify({
        folderId: checkout.folderId,
        checkoutType: checkout.checkoutType,
        documentDescription: checkout.documentDescription,
        personName: checkout.personName,
        personSurname: checkout.personSurname,
        personPhone: checkout.personPhone,
        reason: checkout.reason,
        checkoutDate: checkout.checkoutDate || new Date().toISOString(),
        plannedReturnDate: checkout.plannedReturnDate,
        actualReturnDate: checkout.actualReturnDate || null,
        status: checkout.status
      })
    };
  }

  deserialize(row) {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      folderId: data.folderId,
      checkoutType: data.checkoutType,
      documentDescription: data.documentDescription,
      personName: data.personName,
      personSurname: data.personSurname,
      personPhone: data.personPhone,
      reason: data.reason,
      checkoutDate: new Date(data.checkoutDate),
      plannedReturnDate: new Date(data.plannedReturnDate),
      actualReturnDate: data.actualReturnDate ? new Date(data.actualReturnDate) : null,
      status: data.status
    };
  }

  /**
   * Get active checkouts (status = 'Çıkışta')
   */
  getActiveCheckouts() {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName}`).all();
      const checkouts = rows.map(row => this.deserialize(row));
      return checkouts.filter(c => c.status === 'Çıkışta');
    } catch (error) {
      logger.error('[CHECKOUT_REPO] getActiveCheckouts error:', { error });
      throw error;
    }
  }

  /**
   * Get checkouts for specific folder
   */
  getByFolderId(folderId) {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName}`).all();
      const checkouts = rows.map(row => this.deserialize(row));
      return checkouts.filter(c => c.folderId === folderId);
    } catch (error) {
      logger.error('[CHECKOUT_REPO] getByFolderId error:', { error, folderId });
      throw error;
    }
  }

  /**
   * Get overdue checkouts
   */
  getOverdueCheckouts() {
    try {
      const now = new Date();
      const active = this.getActiveCheckouts();
      return active.filter(c => new Date(c.plannedReturnDate) < now);
    } catch (error) {
      logger.error('[CHECKOUT_REPO] getOverdueCheckouts error:', { error });
      throw error;
    }
  }
}

module.exports = CheckoutRepository;
