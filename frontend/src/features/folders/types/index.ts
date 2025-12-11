/**
 * Folder Feature Types
 * Type definitions specific to the folders feature
 */

// Re-export from global types
export type {
  Folder,
  FolderStatus,
  FolderType,
  Location,
  Category,
  StorageType,
  Checkout,
  CheckoutStatus,
} from '@/types';

// Import for internal use
import type { Folder, Location } from '@/types';

/**
 * Form data structure for creating/editing folders
 * Excludes auto-generated fields (id, createdAt, updatedAt, status)
 */
export interface FolderFormData {
  category: string;
  departmentId: string;
  clinic?: string;
  unitCode?: string;
  fileCode: string;
  subject: string;
  specialInfo?: string;
  retentionPeriod: number;
  retentionCode: string;
  fileYear: number;
  fileCount: number;
  folderType: string;
  location: Partial<Location>;
  pdfPath?: string;
  excelPath?: string;
}

/**
 * Search and filter criteria for folder list
 */
export interface FolderFilters {
  /** General search query (searches in fileCode, subject, clinic, etc.) */
  searchQuery?: string;
  /** Filter by category (Tıbbi/İdari) */
  category?: string;
  /** Filter by department ID */
  departmentId?: number;
  /** Filter by folder status */
  status?: string;
  /** Filter by storage type (Kompakt/Stand) */
  storageType?: string;
  /** Filter by file year */
  fileYear?: number;
  /** Filter by clinic (for medical folders) */
  clinic?: string;
}

/**
 * State structure for folder list component
 */
export interface FolderListState {
  /** Current folders displayed in the list */
  folders: Folder[];
  /** Total number of folders matching current filters */
  totalItems: number;
  /** Current page number (1-based) */
  currentPage: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Loading state */
  loading: boolean;
  /** Current search/filter criteria */
  searchCriteria: FolderFilters;
}

/**
 * Props for FolderRow component
 */
export interface FolderRowProps {
  folder: Folder;
  departmentName: string;
  onEdit: () => void;
  onCheckout: () => void;
  onReturn: () => void;
  onDelete: () => void;
}

/**
 * Occupancy information for a location
 */
export interface LocationOccupancy {
  usedSpace: number;
  totalSpace: number;
  percentage: number;
  availableSpace: number;
}
