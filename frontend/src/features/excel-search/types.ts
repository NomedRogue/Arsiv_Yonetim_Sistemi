export type MatchedItem = {
  sira: number | null;
  value: string;
};

export interface SearchResult {
  id: number;
  fileCode: string;
  fileYear: string;
  fileCount: string;
  category: string;
  subject: string;
  retentionPeriod: string;
  retentionCode: string;
  status: string;
  folderType: string;
  clinic?: string;
  specialInfo?: string;
  departmentId: number;
  departmentName?: string;
  location: {
    storageType: string;
    unit: string;
    face: string;
    section: string;
    shelf: string;
    stand?: string;
  };
  excelPath?: string;
  matchedDosyaNo: (string | MatchedItem)[];
  matchedHastaAdi: (string | MatchedItem)[];
}
