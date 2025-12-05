// Re-export types from @/types that are used in disposal feature
export type { Folder } from '@/types';
export { Category, FolderStatus } from '@/types';

// Disposal-specific types
export interface DisposalStatus {
  text: string;
  color: 'red' | 'orange' | 'yellow' | 'gray';
}

export interface DisposalRecord {
  id: string;
  folderId: number;
  disposalDate: string;
  originalFolderData: Folder;
}

export type DisposalViewType = 'thisYear' | 'nextYear' | 'overdue';
export type DisposalTabType = 'disposable' | 'disposed';
