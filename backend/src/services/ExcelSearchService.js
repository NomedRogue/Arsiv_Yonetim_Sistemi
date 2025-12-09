/**
 * Excel Search Service
 * Business logic for searching patient records in Excel files
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const xlsx = require('xlsx');
const { getRepositories } = require('../database/repositories');
const { getUserDataPath, ensureDirExists } = require('../utils/fileHelper');
const { ALL_DEPARTMENTS } = require('../config/constants');
const logger = require('../utils/logger');

class ExcelSearchService {
  constructor() {
    this.repos = getRepositories();
  }

  /**
   * Resolve Excel folder from settings or default
   */
  resolveExcelFolder() {
    let folderPath = '';
    const settings = this.repos.config.get('settings');
    
    if (settings?.excelKayitKlasoru && typeof settings.excelKayitKlasoru === 'string') {
      folderPath = settings.excelKayitKlasoru.trim();
    }

    if (!folderPath) {
      folderPath = getUserDataPath('Excels');
    }
    
    logger.info('[EXCEL_SEARCH_SERVICE] Resolved folder:', folderPath);
    ensureDirExists(folderPath);
    return folderPath;
  }

  /**
   * Parse Excel file and extract SAYI and AÇIKLAMALAR columns
   * Priority: Look for sheet named "DOSYA MUHTEVİYATI DÖKÜM FORMU" first
   */
  parseExcelContent(excelPath) {
    try {
      const workbook = xlsx.readFile(excelPath);
      let data = null;
      let usedSheetName = null;
      
      // Target sheet name (case-insensitive matching)
      const targetSheetName = 'DOSYA MUHTEVİYATI DÖKÜM FORMU';
      const normalizeSheetName = (name) => name.toString().toUpperCase()
        .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/\s+/g, ' ').trim();
      
      const normalizedTarget = normalizeSheetName(targetSheetName);
      
      // Reorder sheets: target sheet first, then others
      const orderedSheets = [...workbook.SheetNames].sort((a, b) => {
        const aMatch = normalizeSheetName(a) === normalizedTarget;
        const bMatch = normalizeSheetName(b) === normalizedTarget;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
      
      logger.info('[EXCEL_SEARCH_SERVICE] Sheet order:', {
        file: path.basename(excelPath),
        sheets: orderedSheets,
        targetSheet: targetSheetName
      });
      
      // Find sheet with SAYI and AÇIKLAMALAR columns
      for (const sheetName of orderedSheets) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find header row index
        let headerRowIndex = -1;
        let siraColIndex = -1;
        let sayiColIndex = -1;
        let aciklamalarColIndex = -1;
        
        for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
          const row = sheetData[i];
          if (!row || row.length === 0) continue;
          
          let foundSira = -1;
          let foundSayi = -1;
          let foundAciklama = -1;
          
          for (let j = 0; j < row.length; j++) {
            if (!row[j]) continue;
            const normalized = row[j].toString().toUpperCase()
              .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
              .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
            
            if (normalized === 'SIRA') {
              foundSira = j;
            }
            
            if (normalized === 'SAYI' || 
                (normalized.includes('SAYI') && 
                 !normalized.includes('SAYFA') && 
                 !normalized.includes('SAYISI'))) {
              foundSayi = j;
            }
            
            if (normalized.includes('ACIKLAMA')) {
              foundAciklama = j;
            }
          }
          
          if (foundSayi >= 0 && foundAciklama >= 0) {
            headerRowIndex = i;
            siraColIndex = foundSira;
            sayiColIndex = foundSayi;
            aciklamalarColIndex = foundAciklama;
            break;
          }
        }
        
        if (headerRowIndex >= 0) {
          // Convert raw data to objects with proper columns
          data = [];
          for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row || row.length === 0) continue;
            
            const sira = siraColIndex >= 0 ? row[siraColIndex] : null;
            const sayi = row[sayiColIndex];
            const aciklamalar = row[aciklamalarColIndex];
            
            // Skip empty rows
            if (!sayi && !aciklamalar) continue;
            
            data.push({
              SIRA: sira,
              SAYI: sayi,
              AÇIKLAMALAR: aciklamalar,
              _rowIndex: i,
              _rawRow: row
            });
          }
          
          usedSheetName = sheetName;
          break;
        }
      }
      
      if (!data) {
        logger.warn('[EXCEL_SEARCH_SERVICE] No SAYI/AÇIKLAMALAR columns found:', excelPath);
        return [];
      }
      
      logger.info('[EXCEL_SEARCH_SERVICE] Parsed sheet:', {
        sheet: usedSheetName,
        rows: data.length,
        file: path.basename(excelPath)
      });
      
      return data;
    } catch (error) {
      logger.error('[EXCEL_SEARCH_SERVICE] Parse error:', { error, file: excelPath });
      return [];
    }
  }

  /**
   * Search in Excel files by patient file number or name
   */
  async searchInExcel(query) {
    try {
      const excelFolder = this.resolveExcelFolder();
      
      if (!fs.existsSync(excelFolder)) {
        logger.warn('[EXCEL_SEARCH_SERVICE] Folder not found:', excelFolder);
        return [];
      }

      const files = (await fsPromises.readdir(excelFolder)) // ASYNC
        .filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));

      logger.info('[EXCEL_SEARCH_SERVICE] Searching in files:', {
        count: files.length,
        query
      });

      const results = [];
      const normalizedQuery = query.toString().toLowerCase()
        .replace(/i̇/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');

      for (const file of files) {
        const filePath = path.join(excelFolder, file);
        const data = this.parseExcelContent(filePath);
        
        for (const row of data) {
          // Find SAYI column (case insensitive)
          let sira = null;
          let dosyaNo = null;
          let aciklamalar = null;
          
          for (const key in row) {
            const normalizedKey = key.toString().toUpperCase()
              .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
              .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
            
            if (normalizedKey === 'SIRA') {
              sira = row[key];
            }
            
            if (normalizedKey === 'SAYI' || 
                (normalizedKey.includes('SAYI') && 
                 !normalizedKey.includes('SAYFA') && 
                 !normalizedKey.includes('SAYISI'))) {
              dosyaNo = row[key]?.toString().trim();
            }
            
            if (normalizedKey.includes('ACIKLAMA')) {
              aciklamalar = row[key]?.toString().trim();
            }
          }
          
          if (!dosyaNo && !aciklamalar) continue;
          
          // Match against query
          const dosyaNoNormalized = (dosyaNo || '').toLowerCase()
            .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
          
          const aciklamalarNormalized = (aciklamalar || '').toLowerCase()
            .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
            .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
          
          if (dosyaNoNormalized.includes(normalizedQuery) || 
              aciklamalarNormalized.includes(normalizedQuery)) {
            results.push({
              sira,
              dosyaNo,
              hastaAdi: aciklamalar,
              kaynak: file,
              tip: 'Excel'
            });
          }
        }
      }
      
      logger.info('[EXCEL_SEARCH_SERVICE] Search results:', {
        query,
        count: results.length
      });
      
      return results;
    } catch (error) {
      logger.error('[EXCEL_SEARCH_SERVICE] Search error:', { error, query });
      throw error;
    }
  }

  /**
   * List all Excel files
   */
  async listExcelFiles() {
    try {
      const excelFolder = this.resolveExcelFolder();
      
      if (!fs.existsSync(excelFolder)) {
        return [];
      }

      const fileNames = await fsPromises.readdir(excelFolder); // ASYNC
      const files = await Promise.all(
        fileNames
          .filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'))
          .map(async (f) => {
            const filePath = path.join(excelFolder, f);
            const stat = await fsPromises.stat(filePath); // ASYNC
            return {
              name: f,
              path: filePath,
              size: stat.size,
              modified: stat.mtime
            };
          })
      );

      return files.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      logger.error('[EXCEL_SEARCH_SERVICE] List files error:', { error });
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getExcelSearchService() {
  if (!instance) {
    instance = new ExcelSearchService();
  }
  return instance;
}

module.exports = { ExcelSearchService, getExcelSearchService };
