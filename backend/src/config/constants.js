/**
 * Application Constants
 * Centralized constant definitions for the entire backend
 */

const Category = {
  Tibbi: 'Tıbbi',
  Idari: 'İdari',
};

const IDARI_BIRIMLER = [
  { name: 'Memur Maaş Mutemetliği' }, { name: 'İşçi Maaş Mutemetliği' },
  { name: 'Gelir Tahakkuk Birimi' }, { name: 'Gider Tahakkuk Birimi' },
  { name: 'Kalite Birimi' }, { name: 'Eğitim Birimi' }, { name: 'Bilgi İşlem' },
  { name: 'Personel Birimi' }, { name: 'Arşiv Birimi' }, { name: 'Biomedikal Birimi' },
  { name: 'Ayniyat Birimi' }, { name: 'Tıbbi Sart Birimi' }, { name: 'Disiplin Birimi' },
  { name: 'Satın Alma Birimi' }, { name: 'İstatistik Birimi' }, { name: 'Temizlik Birimi' },
  { name: 'Protez Birimi' }, { name: 'Hasta Hakları Birimi' }, { name: 'Vezne' },
  { name: 'İş Sağlığı ve Güvenliği Birimi' }
];

const TIBBI_BIRIMLER = [
  { name: 'Evde Sağlık Birimi' }, { name: 'Ameliyathane' },
  { name: 'İlk Müdahale Polikliniği' }, { name: 'Klinikler' }
];

// Frontend ile uyumlu ID'li format
const ALL_DEPARTMENTS = [
  ...IDARI_BIRIMLER.map((birim, index) => ({ id: index + 1, ...birim, category: Category.Idari })),
  ...TIBBI_BIRIMLER.map((birim, index) => ({
    id: IDARI_BIRIMLER.length + index + 1,
    ...birim,
    category: Category.Tibbi
  }))
];

const RETENTION_CODES = [
  { code: 'A', description: 'Sürekli saklanacak' },
  { code: 'B', description: '30 yıl saklanacak' },
  { code: 'C', description: '10 yıl saklanacak' },
  { code: 'D', description: '5 yıl saklanacak' },
  { code: 'E', description: '3 yıl saklanacak' }
];

const DEFAULT_SETTINGS = {
  yedeklemeKlasoru: 'backups',
  pdfKayitKlasoru: 'PDFs',
  backupFrequency: 'Günlük',
  backupTime: '20:00',
  maxBackupCount: 5,
  theme: 'light',
  // Folder width settings (cm)
  darKlasorGenisligi: 3,
  genisKlasorGenisligi: 5,
  // Shelf width settings (cm)
  kompaktRafGenisligi: 100,
  standRafGenisligi: 120
};

// File upload limits
const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  MIN_DISK_SPACE_MB: 100,
  MIN_DISK_SPACE_BYTES: 100 * 1024 * 1024
};

// Rate limiting settings
const RATE_LIMIT_SETTINGS = {
  API_WINDOW_MS: 60 * 1000, // 1 minute
  API_MAX_REQUESTS: 100,
  UPLOAD_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  UPLOAD_MAX_REQUESTS: 50,
  STRICT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  STRICT_MAX_REQUESTS: 10
};

// Database settings
const DATABASE_SETTINGS = {
  BUSY_TIMEOUT_MS: 5000,
  WAL_CHECKPOINT_INTERVAL_MS: 30000
};

const INITIAL_STORAGE_STRUCTURE = {
  kompakt: Array.from({ length: 11 }, (_, i) => {
    const unit = i + 1;
    let faces = [];
    if (unit === 1) faces = [{ name: 'A Yüzü', sections: [] }];
    else if (unit === 11) faces = [{ name: 'A Yüzü', sections: [] }, { name: 'Gizli Yüzü', sections: [] }];
    else faces = [{ name: 'A Yüzü', sections: [] }, { name: 'B Yüzü', sections: [] }];

    faces.forEach(face => {
      face.sections = Array.from({ length: 3 }, (_, j) => ({
        section: j + 1,
        shelves: Array.from({ length: 5 }, (_, k) => k + 1)
      }));
    });

    return { unit, faces };
  }),
  stand: Array.from({ length: 4 }, (_, i) => ({
    stand: i + 1,
    shelves: Array.from({ length: 5 }, (_, j) => j + 1)
  }))
};

module.exports = { 
  ALL_DEPARTMENTS, 
  RETENTION_CODES, 
  DEFAULT_SETTINGS,
  INITIAL_STORAGE_STRUCTURE,
  Category,
  IDARI_BIRIMLER,
  TIBBI_BIRIMLER,
  FILE_UPLOAD_LIMITS,
  RATE_LIMIT_SETTINGS,
  DATABASE_SETTINGS
};
