// Re-export types from @/types that are used in excel-search feature
export type { Folder, Category, FolderStatus, FolderType, Location, StorageType } from '@/types';

// Excel search-specific types
export interface ExcelSearchResult {
  matchedDosyaNo?: string[];
  matchedHastaAdi?: string[];
  totalRecords?: number;
}

// SearchResult includes all Folder properties plus excel-specific fields
export interface SearchResult {
  id: number;
  category: string;
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
  folderType: string;
  pdfPath?: string;
  excelPath?: string;
  location: {
    storageType: string;
    unit?: number;
    face?: string;
    section?: number;
    shelf?: number;
    stand?: number;
  };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  matchedDosyaNo?: string[];
  matchedHastaAdi?: string[];
  totalRecords?: number;
}
