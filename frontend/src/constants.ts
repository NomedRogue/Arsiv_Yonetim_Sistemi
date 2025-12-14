import { Department, Category, StorageStructure, Settings } from './types';

// Electron'dan mı yoksa browser'dan mı çalıştığını kontrol et
const isElectron = typeof window !== 'undefined' && 
  (window.location.protocol === 'file:' || navigator.userAgent.includes('Electron'));

// Port determination helper
let dynamicPort = '3001';

// Initial fetch of port (async but we need a sync value for initial const)
// We rely on Main process providing it if available, or fetch it early.
// In our architecture, `window.electronAPI.getBackendPort` is available if isElectron.
// But we can't await it in a top-level const.
// Solution: We will use a getter function for API_BASE_URL in the app, or rely on localhost:3001 as fallback
// and update it if we can.
// BETTER: The app should load config before making requests.
// HOWEVER: For this refactor, we will try to fetch it synchronously if possible (not possible with invoke)
// OR assume the frontend is reloaded/redirected with ?port=X if needed.
// Main process can load the window with `?port=X` query param!

const getPort = () => {
  if (typeof window === 'undefined') return '3001';
  const params = new URLSearchParams(window.location.search);
  if (params.get('port')) return params.get('port')!;

  // Fallback: If we are in Electron but no port in URL, we might want to check
  // if we can get it from sessionStorage (if we stored it previously)
  // or default to 3001.
  return '3001';
};

// API URL - Production (Electron) veya Development için
// Note: This is now a getter or a base variable.
// Ideally, we should use a function `getApiBaseUrl()` instead of a constant.
export const API_BASE_URL_PREFIX = isElectron
  ? `http://localhost:${getPort()}`
  : '';

export const API_BASE_URL = `${API_BASE_URL_PREFIX}/api`;

// Timeout and interval settings
export const TIMEOUTS = {
  SEARCH_DEBOUNCE_MS: 300,           // Search debounce süresi
  TOAST_DURATION_MS: 5000,           // Toast görünme süresi
  HEALTH_CHECK_INTERVAL_MS: 1000,    // Backend health check interval
  HEALTH_CHECK_MAX_ATTEMPTS: 30,     // Max health check denemeleri
} as const;

// These are used to build the initial default department list.
export const IDARI_BIRIMLER: Omit<Department, 'id' | 'category'>[] = [
  { name: 'Memur Maaş Mutemetliği', code: '39489614' }, { name: 'İşçi Maaş Mutemetliği', code: '39489614' },
  { name: 'Gelir Tahakkuk Birimi', code: '39489614' }, { name: 'Gider Tahakkuk Birimi', code: '39489614' },
  { name: 'Kalite Birimi', code: '39489614' }, { name: 'Eğitim Birimi', code: '39489614' }, { name: 'Bilgi İşlem', code: '39489614' },
  { name: 'Personel Birimi', code: '39489614' }, { name: 'Arşiv Birimi', code: '39489614' }, { name: 'Biomedikal Birimi', code: '39489614' },
  { name: 'Ayniyat Birimi', code: '39489614' }, { name: 'Tıbbi Sart Birimi', code: '39489614' }, { name: 'Disiplin Birimi', code: '39489614' },
  { name: 'Satın Alma Birimi', code: '39489614' }, { name: 'İstatistik Birimi', code: '39489614' }, { name: 'Temizlik Birimi', code: '39489614' },
  { name: 'Protez Birimi', code: '39489614' }, { name: 'Hasta Hakları Birimi', code: '39489614' }, { name: 'Vezne', code: '39489614' },
  { name: 'İş Sağlığı ve Güvenliği Birimi', code: '39489614' }
];

export const TIBBI_BIRIMLER: Omit<Department, 'id' | 'category'>[] = [
  { name: 'Evde Sağlık Birimi', code: 'ESB' }, { name: 'Ameliyathane', code: 'AML' },
  { name: 'İlk Müdahale Polikliniği', code: 'IMP' }, { name: 'Klinikler', code: 'KLN' }
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
  backupRetention: 7,         // keep last N backups
  githubToken: ''
};