/**
 * Checkout Service
 * Business logic for folder checkout and return operations
 */

const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

class CheckoutService {
  constructor() {
    this.repos = getRepositories();
  }

  /**
   * Create new checkout
   */
  async createCheckout(checkoutData) {
    try {
      // Validate folder exists and can be checked out
      const folder = this.repos.folder.getById(checkoutData.folderId);
      if (!folder) {
        throw new Error('Klasör bulunamadı');
      }

      if (folder.status === 'Çıkışta') {
        throw new Error('Bu klasör zaten çıkışta');
      }

      if (folder.status === 'İmha') {
        throw new Error('İmha edilmiş klasör çıkış verilemez');
      }

      // Create checkout
      const checkout = {
        ...checkoutData,
        id: checkoutData.id || `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        checkoutDate: new Date(),
        status: 'Çıkışta'
      };

      const created = this.repos.checkout.insert(checkout);

      // Update folder status
      await this.repos.folder.update(folder.id, {
        ...folder,
        status: 'Çıkışta',
        updatedAt: new Date()
      });

      // Log the action
      this.repos.log.addLog({
        type: 'checkout',
        details: `Klasör çıkış verildi: ${folder.fileCode} - ${folder.subject} (${checkout.personName} ${checkout.personSurname})`
      });

      logger.info('[CHECKOUT_SERVICE] Checkout created:', { id: created.id, folderId: folder.id });
      return created;
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Create checkout error:', { error, checkoutData });
      throw error;
    }
  }

  /**
   * Return folder from checkout
   */
  async returnCheckout(checkoutId) {
    try {
      const checkout = this.repos.checkout.getById(checkoutId);
      if (!checkout) {
        throw new Error('Çıkış kaydı bulunamadı');
      }

      if (checkout.status === 'İade Edildi') {
        throw new Error('Bu klasör zaten iade edildi');
      }

      const folder = this.repos.folder.getById(checkout.folderId);
      if (!folder) {
        throw new Error('Klasör bulunamadı');
      }

      // Update checkout
      const updated = this.repos.checkout.update(checkoutId, {
        ...checkout,
        status: 'İade Edildi',
        actualReturnDate: new Date()
      });

      // Update folder status
      await this.repos.folder.update(folder.id, {
        ...folder,
        status: 'Arşivde',
        updatedAt: new Date()
      });

      // Log the action
      this.repos.log.addLog({
        type: 'return',
        details: `Klasör iade edildi: ${folder.fileCode} - ${folder.subject}`
      });

      logger.info('[CHECKOUT_SERVICE] Checkout returned:', { id: checkoutId, folderId: folder.id });
      return updated;
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Return checkout error:', { error, checkoutId });
      throw error;
    }
  }

  /**
   * Update checkout information
   */
  async updateCheckout(checkoutId, updates) {
    try {
      const existing = this.repos.checkout.getById(checkoutId);
      if (!existing) {
        throw new Error('Çıkış kaydı bulunamadı');
      }

      const updated = {
        ...existing,
        ...updates,
        id: checkoutId // Ensure ID doesn't change
      };

      const result = this.repos.checkout.update(checkoutId, updated);

      logger.info('[CHECKOUT_SERVICE] Checkout updated:', { id: checkoutId });
      return result;
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Update checkout error:', { error, checkoutId });
      throw error;
    }
  }

  /**
   * Get all active checkouts with folder information
   */
  async getActiveCheckoutsWithFolders() {
    try {
      const checkouts = this.repos.checkout.getActiveCheckouts();
      
      return checkouts.map(checkout => {
        const folder = this.repos.folder.getById(checkout.folderId);
        return {
          ...checkout,
          folder
        };
      });
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Get active checkouts error:', { error });
      throw error;
    }
  }

  /**
   * Get all checkouts (with optional filters)
   */
  async getAllCheckouts(filters = {}) {
    try {
      let checkouts = this.repos.checkout.getAll();

      // Filter by status
      if (filters.status) {
        checkouts = checkouts.filter(c => c.status === filters.status);
      }

      // Filter by folder ID
      if (filters.folderId) {
        checkouts = checkouts.filter(c => c.folderId === filters.folderId);
      }

      return checkouts;
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Get all checkouts error:', { error, filters });
      throw error;
    }
  }

  /**
   * Get overdue checkouts
   */
  async getOverdueCheckouts() {
    try {
      return this.repos.checkout.getOverdueCheckouts();
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Get overdue checkouts error:', { error });
      throw error;
    }
  }

  /**
   * Get checkout by ID
   */
  async getCheckoutById(checkoutId) {
    try {
      return this.repos.checkout.getById(checkoutId);
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Get checkout error:', { error, checkoutId });
      throw error;
    }
  }

  /**
   * Check if folder has active checkout
   */
  hasActiveCheckout(folderId) {
    try {
      const checkouts = this.repos.checkout.getByFolderId(folderId);
      return checkouts.some(c => c.status === 'Çıkışta');
    } catch (error) {
      logger.error('[CHECKOUT_SERVICE] Check active checkout error:', { error, folderId });
      return false;
    }
  }
}

// Singleton instance
let instance = null;

function getCheckoutService() {
  if (!instance) {
    instance = new CheckoutService();
  }
  return instance;
}

module.exports = { CheckoutService, getCheckoutService };
