/**
 * Config Repository
 * Handles configuration key-value storage
 */

const { getDbInstance } = require('../connection');
const logger = require('../../utils/logger');

class ConfigRepository {
  constructor() {
    this.tableName = 'configs';
    this.db = getDbInstance();
  }

  getDb() {
    if (!this.db || !this.db.open) {
      this.db = getDbInstance();
    }
    return this.db;
  }

  get(key) {
    try {
      const db = this.getDb();
      const row = db.prepare('SELECT value FROM configs WHERE key = ?').get(key);
      let value = row ? JSON.parse(row.value) : null;
      
      // Provide defaults for settings if paths are missing
      if (key === 'settings') {
        if (!value) value = {}; // Initialize if null
        
        // Use USER_DATA_PATH env var which is set in main.js
        const userDataPath = process.env.USER_DATA_PATH || process.cwd();
        const path = require('path');

        if (!value.yedeklemeKlasoru || value.yedeklemeKlasoru.trim() === '') value.yedeklemeKlasoru = path.join(userDataPath, 'Backups');
        if (!value.pdfKayitKlasoru || value.pdfKayitKlasoru.trim() === '') value.pdfKayitKlasoru = path.join(userDataPath, 'PDFs');
        if (!value.excelKayitKlasoru || value.excelKayitKlasoru.trim() === '') value.excelKayitKlasoru = path.join(userDataPath, 'Excels');
      }

      // Default Departments
      if (key === 'departments' && (!value || value.length === 0)) {
        // If departments are not set or empty (first run), return default list
        // Note: Check if implicit init is okay. Usually yes for first run.
        if (!row) {
             value = [
              // İdari
              { id: 1, name: 'Arşiv Birimi', code: '39489614', category: 'İdari' },
              { id: 2, name: 'Personel Birimi', code: 'PER', category: 'İdari' },
              { id: 3, name: 'İşçi Maaş Birimi', code: 'IMB', category: 'İdari' },
              { id: 4, name: 'Mutemetlik Birimi', code: 'MUT', category: 'İdari' },
              { id: 5, name: 'İstatistik Birimi', code: 'IST', category: 'İdari' },
              { id: 6, name: 'Disiplin Birimi', code: 'DIS', category: 'İdari' },
              { id: 7, name: 'Ayniyat Birimi', code: 'AYN', category: 'İdari' },
              { id: 8, name: 'Tıbbi Sarf Depo Birimi', code: 'TSD', category: 'İdari' },
              { id: 9, name: 'Vezne Birimi', code: 'VEZ', category: 'İdari' },
              { id: 10, name: 'Gelir Tahakkuk Birimi', code: 'GEL', category: 'İdari' },
              { id: 11, name: 'Gider Tahakkuk Birimi', code: 'GID', category: 'İdari' },
              { id: 12, name: 'Sivil Savunma Birimi', code: 'SIV', category: 'İdari' },
              { id: 13, name: 'Eğitim Birimi', code: 'EGT', category: 'İdari' },
              { id: 14, name: 'Satın Alma Birimi', code: 'SAT', category: 'İdari' },
              { id: 15, name: 'Hasta Hakları Birimi', code: 'HAS', category: 'İdari' },
              { id: 16, name: 'Evrak Kayıt Birimi', code: 'EVR', category: 'İdari' },
              { id: 17, name: 'Bilgi İşlem Birimi', code: 'BIL', category: 'İdari' },
              { id: 18, name: 'Kalite Birimi', code: 'KAL', category: 'İdari' },
              { id: 19, name: 'Protez Birimi', code: 'PRT', category: 'İdari' },
              { id: 20, name: 'Sterilizasyon Birimi', code: 'STE', category: 'İdari' },
              { id: 21, name: 'Biyomedikal Depo Birimi', code: 'BIO', category: 'İdari' },
              { id: 22, name: 'Enfeksiyon Birimi', code: 'ENF', category: 'İdari' },
              { id: 23, name: 'Taşınır Kayıt Kontrol Birimi', code: 'TKK', category: 'İdari' },
              { id: 24, name: 'Evde Sağlık Birimi', code: 'EVD', category: 'İdari' },
              { id: 25, name: 'Uzaktan Sağlık Hizmetleri', code: 'UZK', category: 'İdari' },
              // Tıbbi
              { id: 26, name: 'Genel Diş Entegre', code: '39489614', category: 'Tıbbi' },
              { id: 27, name: 'Pedodonti', code: '39489614', category: 'Tıbbi' },
              { id: 28, name: 'Endodonti', code: '39489614', category: 'Tıbbi' },
              { id: 29, name: 'Ortodonti', code: '39489614', category: 'Tıbbi' },
              { id: 30, name: 'Protetik Diş Tedavisi', code: '39489614', category: 'Tıbbi' },
              { id: 31, name: 'Ağız Diş ve Çene Cerrahisi', code: '39489614', category: 'Tıbbi' },
              { id: 32, name: 'Genel Anestezi Birimi', code: '39489614', category: 'Tıbbi' },
              { id: 33, name: 'Periodontoloji', code: '39489614', category: 'Tıbbi' },
              { id: 34, name: 'Restoratif Diş Tedavisi', code: '39489614', category: 'Tıbbi' }
            ];
            // Optionally save these defaults to DB so next time it is not 'missing'
            // this.set('departments', value); 
            // Better to return it and let the controller handle saving if needed, 
            // or just serve defaults dynamically if DB is empty.
            // For stability, let's just return it.
        }
      }
      
      return value;
    } catch (error) {
      logger.error('[CONFIG_REPO] get error:', { error, key });
      return null;
    }
  }

  set(key, value) {
    try {
      const db = this.getDb();
      const jsonValue = JSON.stringify(value);
      db.prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)').run(key, jsonValue);
      return true;
    } catch (error) {
      logger.error('[CONFIG_REPO] set error:', { error, key });
      throw error;
    }
  }

  getAll() {
    try {
      const db = this.getDb();
      const rows = db.prepare('SELECT key, value FROM configs').all();
      const configs = {};
      rows.forEach(row => {
        configs[row.key] = JSON.parse(row.value);
      });
      return configs;
    } catch (error) {
      logger.error('[CONFIG_REPO] getAll error:', { error });
      return {};
    }
  }
}

module.exports = ConfigRepository;
