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
      if (key === 'departments') {
        // Migration: Check if existing data needs update (fixing old codes)
        if (value && value.length > 0) {
            let needsUpdate = false;
            const updatedValue = value.map(dept => {
                // İdari birim olup kodu '39489614' olmayanları güncelle
                if (dept.category === 'İdari' && dept.code !== '39489614') {
                    needsUpdate = true;
                    return { ...dept, code: '39489614' };
                }
                return dept;
            });

            if (needsUpdate) {
                logger.info('[CONFIG_REPO] Auto-migrating department codes to 39489614');
                value = updatedValue;
                this.set('departments', value);
            }
        }

        // Initialize if empty
        if (!value || value.length === 0) {
            value = [
              // İdari
              { id: 1, name: 'Arşiv Birimi', code: '39489614', category: 'İdari' },
              { id: 2, name: 'Personel Birimi', code: '39489614', category: 'İdari' },
              { id: 3, name: 'İşçi Maaş Birimi', code: '39489614', category: 'İdari' },
              { id: 4, name: 'Mutemetlik Birimi', code: '39489614', category: 'İdari' },
              { id: 5, name: 'İstatistik Birimi', code: '39489614', category: 'İdari' },
              { id: 6, name: 'Disiplin Birimi', code: '39489614', category: 'İdari' },
              { id: 7, name: 'Ayniyat Birimi', code: '39489614', category: 'İdari' },
              { id: 8, name: 'Tıbbi Sarf Depo Birimi', code: '39489614', category: 'İdari' },
              { id: 9, name: 'Vezne Birimi', code: '39489614', category: 'İdari' },
              { id: 10, name: 'Gelir Tahakkuk Birimi', code: '39489614', category: 'İdari' },
              { id: 11, name: 'Gider Tahakkuk Birimi', code: '39489614', category: 'İdari' },
              { id: 12, name: 'Sivil Savunma Birimi', code: '39489614', category: 'İdari' },
              { id: 13, name: 'Eğitim Birimi', code: '39489614', category: 'İdari' },
              { id: 14, name: 'Satın Alma Birimi', code: '39489614', category: 'İdari' },
              { id: 15, name: 'Hasta Hakları Birimi', code: '39489614', category: 'İdari' },
              { id: 16, name: 'Evrak Kayıt Birimi', code: '39489614', category: 'İdari' },
              { id: 17, name: 'Bilgi İşlem Birimi', code: '39489614', category: 'İdari' },
              { id: 18, name: 'Kalite Birimi', code: '39489614', category: 'İdari' },
              { id: 19, name: 'Protez Birimi', code: '39489614', category: 'İdari' },
              { id: 20, name: 'Sterilizasyon Birimi', code: '39489614', category: 'İdari' },
              { id: 21, name: 'Biyomedikal Depo Birimi', code: '39489614', category: 'İdari' },
              { id: 22, name: 'Enfeksiyon Birimi', code: '39489614', category: 'İdari' },
              { id: 23, name: 'Taşınır Kayıt Kontrol Birimi', code: '39489614', category: 'İdari' },
              { id: 24, name: 'Evde Sağlık Birimi', code: '39489614', category: 'İdari' },
              { id: 25, name: 'Uzaktan Sağlık Hizmetleri', code: '39489614', category: 'İdari' },
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
