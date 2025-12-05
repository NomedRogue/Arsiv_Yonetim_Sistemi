// Main Settings component
export { Settings as default } from './Settings';

// Types
export type {
  BackupRow,
  AccordionSections,
  ItemToDelete,
  EditingLocation,
} from './types';

// Re-export shared types that Settings uses
export type { Settings, Department, KompaktUnitConfig } from './types';
export { Category, StorageType } from './types';

// Components
export { SettingInput, FilePathInput, AccordionSection } from './components';

// Hooks
export {
  useBackupManagement,
  useDepartmentManagement,
  useStorageManagement,
  useAccordionState,
} from './hooks';

// Utilities
export {
  getBackupFrequency,
  getBackupTime,
  getBackupRetention,
  formatFileSize,
  isBackupActive,
} from './utils';
