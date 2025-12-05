// Re-export types from @/types that are used in settings feature
export type { Settings, Department, KompaktUnitConfig } from '@/types';
export { Category, StorageType } from '@/types';

// Settings-specific types
export interface BackupRow {
  filename: string;
  size: number;
  mtimeMs: number;
  iso: string;
  type?: 'full' | 'database';
}

export interface AccordionSections {
  measurements: boolean;
  system: boolean;
  departments: boolean;
  storage: boolean;
  backup: boolean;
}

export interface ItemToDelete {
  type: 'department' | 'location';
  data: any;
}

export interface EditingLocation {
  type: StorageType;
  id: number;
  shelfCount: number;
}
