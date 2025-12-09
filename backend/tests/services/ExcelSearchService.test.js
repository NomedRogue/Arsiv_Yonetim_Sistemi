
// Mock definition must be before require
const mockFindByExcelNames = jest.fn();

jest.mock('../../src/database/repositories', () => {
  return {
    getRepositories: () => ({
      folder: {
        findByExcelNames: mockFindByExcelNames
      },
      config: { 
        get: () => ({ excelKayitKlasoru: 'test/data' }) 
      }
    })
  };
});

jest.mock('../../src/utils/fileHelper', () => ({
  getUserDataPath: () => 'test/data',
  ensureDirExists: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: () => true,
  promises: {
    readdir: () => Promise.resolve(['test.xlsx'])
  }
}));

const { ExcelSearchService } = require('../../src/services/ExcelSearchService');

describe('ExcelSearchService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExcelSearchService();
  });

  describe('searchAndMatch', () => {
    it('should match excel results with folders correctly', async () => {
      // 1. Mock searchInExcel results
      const mockExcelResults = [
        { kaynak: 'test.xlsx', dosyaNo: '100', hastaAdi: 'Ahmet Yilmaz', sira: 1 },
        { kaynak: 'other.xlsx', dosyaNo: '101', hastaAdi: 'Ayse Demir', sira: 2 }
      ];
      
      // Spy on the internal method
      jest.spyOn(service, 'searchInExcel').mockResolvedValue(mockExcelResults);

      // 2. Mock folder repository response
      const mockFolders = [
        { id: 'f1', excelPath: 'test.xlsx', fileCode: 'F100' }
      ];
      mockFindByExcelNames.mockReturnValue(mockFolders);

      // 3. Execute
      const results = await service.searchAndMatch('ahmet');

      // 4. Assertions
      expect(service.searchInExcel).toHaveBeenCalledWith('ahmet');
      expect(mockFindByExcelNames).toHaveBeenCalledWith(['test.xlsx', 'other.xlsx']);
      
      expect(results).toHaveLength(1);
      const match = results[0];
      expect(match.id).toEqual('f1');
      expect(match.matchedDosyaNo).toHaveLength(1);
      expect(match.matchedDosyaNo[0].value).toEqual('100');
    });

    it('should return empty array if no excel results found', async () => {
      jest.spyOn(service, 'searchInExcel').mockResolvedValue([]);
      
      const results = await service.searchAndMatch('unknown');
      
      expect(results).toEqual([]);
      expect(mockFindByExcelNames).not.toHaveBeenCalled();
    });
  });
});
