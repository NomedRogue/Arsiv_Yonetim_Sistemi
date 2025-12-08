
export enum Category {
  Tibbi = 'Tıbbi',
  Idari = 'İdari',
}

export enum FolderType {
  Dar = 'Dar',
  Genis = 'Geniş',
}

export enum StorageType {
  Kompakt = 'Kompakt',
  Stand = 'Stand',
}

export enum FolderStatus {
  Arsivde = 'Arşivde',
  Cikista = 'Çıkışta',
  Imha = 'İmha',
}

export enum CheckoutType {
  Tam = 'Tam',
  Kismi = 'Kismi',
}

export enum CheckoutStatus {
  Cikista = 'Çıkışta',
  IadeEdildi = 'İade Edildi',
}

export interface Department {
  id: number;
  name: string;
  code: string;
  category: Category;
}

export interface Location {
  storageType: StorageType;
  unit?: number;
  face?: string;
  section?: number;
  shelf?: number;
  stand?: number;
}

export interface Folder {
  id: string; // String ID for consistency with database
  category: Category;
  departmentId: number;
  departmentName?: string;
  clinic?: string;
  unitCode?: string;
  fileCode: string;
  subject: string;
  specialInfo?: string;
  retentionPeriod: number;
  retentionCode: string;
  fileYear: number;
  fileCount: number;
  folderType: FolderType;
  pdfPath?: string;
  excelPath?: string;
  location: Location;
  status: FolderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Checkout {
  id: string; // String ID for consistency
  folderId: string; // Foreign key to Folder
  checkoutType: CheckoutType;
  documentDescription?: string;
  personName: string;
  personSurname: string;
  personPhone?: string;
  reason?: string;
  checkoutDate: Date;
  plannedReturnDate: Date;
  actualReturnDate?: Date;
  status: CheckoutStatus;
}

export interface Disposal {
  id: string; // Backend'te TEXT olarak tanımlı
  folderId: string; // Foreign key to Folder
  disposalDate: string; // ISO string olarak
  reason?: string;
  originalFolderData: Folder;
}

export interface Log {
  id: string; // String ID for consistency
  timestamp: Date;
  type: string;
  folderId?: number;
  details: string;
}

// Automatic backup frequency type
export type BackupFrequency = 'Kapalı' | 'Günlük' | 'Haftalık';

export interface Settings {
  kompaktRafGenisligi: number;
  standRafGenisligi: number;
  darKlasorGenisligi: number;
  genisKlasorGenisligi: number;
  pdfBoyutLimiti: number;
  logSaklamaSuresi: number;
  yedeklemeKlasoru: string;
  pdfKayitKlasoru: string;
  excelKayitKlasoru: string;
  iadeUyarisiGun: number;

  // NEW: automatic backup config
  backupFrequency: BackupFrequency; // Kapalı | Günlük | Haftalık
  backupTime: string;               // HH:MM
  backupRetention: number;          // keep last N backups
  githubToken?: string;             // Private Repo Token
}

export interface OccupancyInfo {
  total: number;
  used: number;
  percentage: number;
  folders: Folder[];
}

export interface DetailedOccupancyItem {
  name: string;
  occupancy: number;
  faceName?: string;
  sectionId?: number;
}

// Props for pages that can edit or checkout folders
export interface FolderActionProps {
  onEditFolder: (folderId: number) => void;
}

// --- Dynamic Storage Structure Types ---
export interface KompaktSection {
  section: number;
  shelves: number[];
}

export interface KompaktFace {
  name: string;
  sections: KompaktSection[];
}

export interface KompaktUnit {
  unit: number;
  faces: KompaktFace[];
}

export interface StandUnit {
  stand: number;
  shelves: number[];
}

export interface StorageStructure {
  kompakt: KompaktUnit[];
  stand: StandUnit[];
}

export interface KompaktUnitConfig {
  hasFaceA: boolean;
  hasFaceB: boolean;
  hasFaceGizli: boolean;
  sectionsPerFace: number;
  shelvesPerSection: number;
}

// ============ SSE EVENT TYPES ============
export interface BackupEvent {
  ts: Date;
  reason?: string;
  path?: string;
  filename?: string;
}

export interface RestoreEvent {
  ts: Date;
  source: string;
  filename?: string;
}

export interface BackupCleanupEvent {
  ts: Date;
  count?: number;
  deleted?: string[];
}

// --- State Management Types ---

export interface ArchiveState {
  folders: Folder[];
  departments: Department[];
  checkouts: Checkout[];
  disposals: Disposal[];
  logs: Log[];
  settings: Settings;
  storageStructure: StorageStructure;
  loading: boolean;
  error: string | null;
  sseConnected: boolean;
  lastBackupEvent: BackupEvent | null;
  lastRestoreEvent: RestoreEvent | null;
  lastBackupCleanupEvent: BackupCleanupEvent | null;
  initialBackupLog: Log | null;
  initialRestoreLog: Log | null;
  initialCleanupLog: Log | null;
}

export type BackupPayload = {
  settings: Settings;
  departments: Department[];
  storageStructure: StorageStructure;
  folders: Folder[];
  checkouts: Checkout[];
  disposals: Disposal[];
  logs: Log[];
};

export type ArchiveAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ALL_DATA'; payload: Partial<ArchiveState> }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_DEPARTMENTS'; payload: Department[] }
  | { type: 'SET_STORAGE_STRUCTURE'; payload: StorageStructure }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'SET_CHECKOUTS'; payload: Checkout[] }
  | { type: 'SET_DISPOSALS'; payload: Disposal[] }
  | { type: 'SET_LOGS'; payload: Log[] }
  | { type: 'SET_SSE_CONNECTED'; payload: boolean }
  | { type: 'SET_LAST_BACKUP_EVENT'; payload: BackupEvent }
  | { type: 'SET_LAST_RESTORE_EVENT'; payload: RestoreEvent }
  | { type: 'SET_LAST_BACKUP_CLEANUP_EVENT'; payload: BackupCleanupEvent };

export interface ArchiveContextType extends ArchiveState {
  refresh: () => Promise<void>;
  getDepartmentName: (id: number) => string;
  getFolderById: (id: number) => Folder | undefined;
  getOccupancy: (location: Location) => OccupancyInfo;
  getLocationOccupancySummary: () => {
    kompakt: Record<string, number>;
    stand: Record<string, number>;
  };
  getDetailedOccupancy: (type: StorageType, id: number) => DetailedOccupancyItem[];
  getShelfDetailsForSection: (unitId: number, faceName: string, sectionId: number) => DetailedOccupancyItem[];
  getCheckoutsForFolder: (folderId: number) => Checkout[];
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (folderId: number) => void;
  addCheckout: (checkout: Omit<Checkout, 'id' | 'status' | 'checkoutDate'>) => void;
  updateCheckout: (checkout: Checkout) => void;
  returnCheckout: (checkoutId: number) => void;
  disposeFolders: (folderIds: number[]) => void;
  updateSettings: (newSettings: Settings) => void;
  addLog: (log: Omit<Log, 'id' | 'timestamp'>) => void;
  addDepartment: (department: Omit<Department, 'id'>) => void;
  updateDepartment: (department: Department) => void;
  deleteDepartment: (departmentId: number) => void;
  addStorageUnit: (type: StorageType, config?: KompaktUnitConfig) => void;
  deleteStorageUnit: (type: StorageType, id: number) => void;
  updateStorageUnitShelves: (type: StorageType, id: number, newShelfCount: number) => Promise<boolean>;
  isUnitDeletable: (type: StorageType, id: number) => boolean;
  restoreFromBackup: (data: BackupPayload) => void;
  setFolders: (folders: Folder[]) => void;
}

// Dashboard Stats Interface
export interface DashboardStats {
  totalFolders: number;
  tibbiCount: number;
  idariCount: number;
  arsivDisindaCount: number;
  iadeGecikenCount: number;
  buYilImhaEdilenecekCount: number;
  gelecekYilImhaEdilenecekCount: number;
  imhaSuresiGecenCount: number;
  imhaEdilenCount: number;
  overallOccupancy: number;
  treemapData: any[];
  clinicDistributionData: any[];
  monthlyData: any[];
  availableYears: number[];
  disposalSchedule: { year: number; count: number; isCurrentYear: boolean; isOverdue: boolean; label?: string }[];
}
