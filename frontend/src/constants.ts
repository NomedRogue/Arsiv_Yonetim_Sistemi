import { Department, Category, StorageStructure, Settings } from './types';

// Electron'dan mı yoksa browser'dan mı çalıştığını kontrol et
const isElectron = typeof window !== 'undefined' && 
  (window.location.protocol === 'file:' || navigator.userAgent.includes('Electron'));

// API URL - Production (Electron) veya Development için
export const API_BASE_URL: string = isElectron
  ? 'http://localhost:3001/api'  // Electron'dan çalışıyorsa direkt backend'e bağlan
  : '/api';  // Browser'dan çalışıyorsa Vite proxy kullan

// Timeout and interval settings
export const TIMEOUTS = {
  SEARCH_DEBOUNCE_MS: 300,           // Search debounce süresi
  TOAST_DURATION_MS: 5000,           // Toast görünme süresi
  HEALTH_CHECK_INTERVAL_MS: 1000,    // Backend health check interval
  HEALTH_CHECK_MAX_ATTEMPTS: 30,     // Max health check denemeleri
} as const;

// These are used to build the initial default department list.
export const IDARI_BIRIMLER: Omit<Department, 'id' | 'category'>[] = [
  { name: 'Memur Maaş Mutemetliği' }, { name: 'İşçi Maaş Mutemetliği' },
  { name: 'Gelir Tahakkuk Birimi' }, { name: 'Gider Tahakkuk Birimi' },
  { name: 'Kalite Birimi' }, { name: 'Eğitim Birimi' }, { name: 'Bilgi İşlem' },
  { name: 'Personel Birimi' }, { name: 'Arşiv Birimi' }, { name: 'Biomedikal Birimi' },
  { name: 'Ayniyat Birimi' }, { name: 'Tıbbi Sart Birimi' }, { name: 'Disiplin Birimi' },
  { name: 'Satın Alma Birimi' }, { name: 'İstatistik Birimi' }, { name: 'Temizlik Birimi' },
  { name: 'Protez Birimi' }, { name: 'Hasta Hakları Birimi' }, { name: 'Vezne' },
  { name: 'İş Sağlığı ve Güvenliği Birimi' }
];

export const TIBBI_BIRIMLER: Omit<Department, 'id' | 'category'>[] = [
  { name: 'Evde Sağlık Birimi' }, { name: 'Ameliyathane' },
  { name: 'İlk Müdahale Polikliniği' }, { name: 'Klinikler' }
];

// This list is used as the initial default if no departments are found in the database.
export const ALL_DEPARTMENTS: Department[] = [
  ...IDARI_BIRIMLER.map((birim, index) => ({ id: index + 1, ...birim, category: Category.Idari })),
  ...TIBBI_BIRIMLER.map((birim, index) => ({
    id: IDARI_BIRIMLER.length + index + 1,
    ...birim,
    category: Category.Tibbi
  }))
];

// This structure is used as the initial default if no structure is found in the database.
export const INITIAL_STORAGE_STRUCTURE: StorageStructure = {
  kompakt: Array.from({ length: 11 }, (_, i) => {
    const unit = i + 1;
    let faces: { name: string; sections: { section: number; shelves: number[] }[] }[] = [];
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

// This is a static list of options for forms.
export const RETENTION_CODES = ['A', 'A1', 'A2', 'A3', 'B', 'C', 'D'];

// These settings are used as the initial default if no settings are found in the database.
export const DEFAULT_SETTINGS: Settings = {
  kompaktRafGenisligi: 100,
  standRafGenisligi: 120,
  darKlasorGenisligi: 3,
  genisKlasorGenisligi: 5,
  pdfBoyutLimiti: 10,
  logSaklamaSuresi: 2,
  // NOTE: Empty strings will be resolved to a safe default path in USER_DATA_PATH on the backend
  yedeklemeKlasoru: '',
  pdfKayitKlasoru: '',
  excelKayitKlasoru: '',
  iadeUyarisiGun: 3,

  // NEW: automatic backup config
  backupFrequency: 'Kapalı', // 'Kapalı' | 'Günlük' | 'Haftalık'
  backupTime: '03:00',       // HH:MM (24h)
  backupRetention: 7         // keep last N backups
};