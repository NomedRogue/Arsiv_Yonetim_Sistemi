const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const logger = require('./logger');
const dbManager = require('./db');
const { getUserDataPath, ensureDirExists } = require('./fileHelper');
const { ALL_DEPARTMENTS } = require('./constants');

/**
 * Excel Search Service
 * Excel dosyalarından SAYI (Hasta Dosya No) ve AÇIKLAMALAR (Hasta Adı Soyadı) kolonlarını okur
 */

// Excel klasör yolunu çöz (settings'ten veya default AppData)
async function resolveExcelFolder() {
  let folderPath = '';
  const settings = await dbManager.getConfig('settings');
  if (
    settings &&
    settings.excelKayitKlasoru &&
    typeof settings.excelKayitKlasoru === 'string'
  ) {
    folderPath = settings.excelKayitKlasoru.trim();
  }

  if (!folderPath) {
    folderPath = getUserDataPath('Excels');
  }
  
  logger.info('[EXCEL SEARCH] Resolved Excel folder:', folderPath);
  ensureDirExists(folderPath);
  return folderPath;
}

// Excel içeriğini parse et ve SAYI, AÇIKLAMALAR kolonlarını çıkar
async function parseExcelContent(excelPath) {
  try {
    const workbook = xlsx.readFile(excelPath);
    
    // Tüm sheet'leri dene, SAYI ve AÇIKLAMALAR kolonları olan ilkini kullan
    let data = null;
    let usedSheetName = null;
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Bu sheet'te SAYI ve AÇIKLAMALAR var mı kontrol et
      const hasRequiredColumns = sheetData.some(row => {
        if (!row || row.length === 0) return false;
        
        const hasSayi = row.some(cell => {
          if (!cell) return false;
          const normalized = cell.toString().toUpperCase()
            .replace(/İ/g, 'I')
            .replace(/Ş/g, 'S')
            .replace(/Ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/Ö/g, 'O')
            .replace(/Ç/g, 'C');
          return normalized === 'SAYI' || 
                 (normalized.includes('SAYI') && 
                  !normalized.includes('SAYFA') && 
                  !normalized.includes('SAYISI'));
        });
        
        const hasAciklamalar = row.some(cell => {
          if (!cell) return false;
          const normalized = cell.toString().toUpperCase()
            .replace(/İ/g, 'I')
            .replace(/Ş/g, 'S')
            .replace(/Ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/Ö/g, 'O')
            .replace(/Ç/g, 'C');
          return normalized.includes('ACIKLAMA');
        });
        
        return hasSayi && hasAciklamalar;
      });
      
      if (hasRequiredColumns) {
        // Başlıklar var, ama veri de var mı kontrol et
        const nonEmptyRowCount = sheetData.filter(row => row && row.length > 0 && row.some(cell => cell)).length;
        
        if (nonEmptyRowCount > 3) { // En az 3 satır olmalı (başlıklar + veri)
          data = sheetData;
          usedSheetName = sheetName;
          break;
        } else {
          logger.info('[EXCEL PARSE] Sheet başlıkları var ama veri yok, sonraki sheet deneniyor', {
            sheetName,
            nonEmptyRowCount
          });
        }
      }
    }
    
    if (!data || data.length === 0) {
      logger.warn('[EXCEL PARSE] Excel boş veya uygun sheet bulunamadı', { excelPath });
      return { dosyaNoList: [], hastaAdiList: [] };
    }
    
    // İlk 20 satırda başlık satırını bul (genellikle ilk satırlar birleştirilmiş başlıklar olabilir)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Bu satırda SAYI ve AÇIKLAMALAR var mı kontrol et
      const hasSayi = row.some(cell => {
        if (!cell) return false;
        const normalized = cell.toString().toUpperCase()
          .replace(/İ/g, 'I')
          .replace(/Ş/g, 'S')
          .replace(/Ğ/g, 'G')
          .replace(/Ü/g, 'U')
          .replace(/Ö/g, 'O')
          .replace(/Ç/g, 'C');
        return normalized === 'SAYI' || 
               (normalized.includes('SAYI') && 
                !normalized.includes('SAYFA') && 
                !normalized.includes('SAYISI'));
      });
      
      const hasAciklamalar = row.some(cell => {
        if (!cell) return false;
        const normalized = cell.toString().toUpperCase()
          .replace(/İ/g, 'I')
          .replace(/Ş/g, 'S')
          .replace(/Ğ/g, 'G')
          .replace(/Ü/g, 'U')
          .replace(/Ö/g, 'O')
          .replace(/Ç/g, 'C');
        return normalized.includes('ACIKLAMA');
      });
      
      if (hasSayi && hasAciklamalar) {
        headerRowIndex = i;
        headers = row;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      logger.warn('[EXCEL PARSE] Başlık satırı bulunamadı (SAYI ve AÇIKLAMALAR içeren satır)', { 
        excelPath: path.basename(excelPath),
        firstRows: data.slice(0, 5).map(r => r.slice(0, 5))
      });
      return { dosyaNoList: [], hastaAdiList: [] };
    }
    
    logger.info('[EXCEL PARSE] Başlık satırı bulundu', {
      excelPath: path.basename(excelPath),
      sheetName: usedSheetName,
      headerRowIndex,
      headers: headers.slice(0, 10)
    });
    
    // Türkçe karakterleri normalize et
    const normalizeText = (text) => {
      if (!text) return '';
      return text.toString()
        .toUpperCase()
        .replace(/İ/g, 'I')
        .replace(/I/g, 'I')
        .replace(/Ş/g, 'S')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C');
    };
    
    // SAYI kolonunu bul (Sayfa Sayısı değil, sadece SAYI)
    const sayiColIndex = headers.findIndex(h => {
      const normalized = normalizeText(h);
      // Tam eşleşme veya "SAYI" içeren ama "SAYFA" veya "SAYISI" içermeyen
      return normalized === 'SAYI' || 
             (normalized.includes('SAYI') && 
              !normalized.includes('SAYFA') && 
              !normalized.includes('SAYISI'));
    });
    
    // AÇIKLAMALAR kolonunu bul
    const aciklamalarColIndex = headers.findIndex(h => {
      const normalized = normalizeText(h);
      return normalized.includes('ACIKLAMA');
    });
    
    if (sayiColIndex === -1 || aciklamalarColIndex === -1) {
      logger.warn('[EXCEL PARSE] SAYI veya AÇIKLAMALAR kolonu bulunamadı', { 
        excelPath, 
        headers 
      });
      return { dosyaNoList: [], hastaAdiList: [] };
    }
    
    // Veri satırlarını oku (başlık satırından sonra)
    const dosyaNoList = [];
    const hastaAdiList = [];
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const dosyaNo = row[sayiColIndex];
      const hastaAdi = row[aciklamalarColIndex];
      
      if (dosyaNo) {
        dosyaNoList.push(dosyaNo.toString().trim());
      }
      if (hastaAdi) {
        hastaAdiList.push(hastaAdi.toString().trim());
      }
    }
    
    logger.info('[EXCEL PARSE] Excel parsed', { 
      excelPath: path.basename(excelPath),
      rows: data.length - 1,
      dosyaNoCount: dosyaNoList.length,
      hastaAdiCount: hastaAdiList.length
    });
    
    return { dosyaNoList, hastaAdiList };
  } catch (error) {
    logger.error('[EXCEL PARSE ERROR]', { excelPath, error: error.message });
    return { dosyaNoList: [], hastaAdiList: [] };
  }
}

// Tüm Excelleri index'le (ilk kurulum veya yeniden index için)
async function indexAllExcels() {
  const db = dbManager.getDbInstance();
  
  // Excel klasör yolunu çöz
  const excelFolderPath = await resolveExcelFolder();
  
  // Excel metadata tablosu oluştur
  db.exec(`
    CREATE TABLE IF NOT EXISTS excel_metadata (
      excel_path TEXT PRIMARY KEY,
      dosya_no_list TEXT,
      hasta_adi_list TEXT,
      indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Index oluştur (arama performansı için)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_excel_metadata_content ON excel_metadata(dosya_no_list, hasta_adi_list);
  `);
  
  const files = fs.readdirSync(excelFolderPath).filter(f => 
    f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
  );
  logger.info(`[EXCEL INDEX] ${files.length} Excel dosyası bulundu. İndexleme başlıyor...`);
  
  let indexed = 0;
  let failed = 0;
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO excel_metadata (excel_path, dosya_no_list, hasta_adi_list)
    VALUES (?, ?, ?)
  `);
  
  for (const file of files) {
    try {
      const fullPath = path.join(excelFolderPath, file);
      const { dosyaNoList, hastaAdiList } = await parseExcelContent(fullPath);
      
      insertStmt.run(
        file,
        dosyaNoList.join('|'), // | ile ayır
        hastaAdiList.join('|')
      );
      indexed++;
      
      if (indexed % 10 === 0) {
        logger.info(`[EXCEL INDEX] ${indexed}/${files.length} Excel işlendi`);
      }
    } catch (error) {
      failed++;
      logger.error('[EXCEL INDEX ERROR]', { file, error: error.message });
    }
  }
  
  logger.info(`[EXCEL INDEX] Tamamlandı. ${indexed} başarılı, ${failed} hatalı`);
  return { indexed, failed, total: files.length };
}

// Tek bir Excel'i index'le (yeni upload edildiğinde)
async function indexSingleExcel(excelPath, excelFilename) {
  const db = dbManager.getDbInstance();
  
  try {
    // Önce tablo var mı kontrol et, yoksa oluştur
    db.exec(`
      CREATE TABLE IF NOT EXISTS excel_metadata (
        excel_path TEXT PRIMARY KEY,
        dosya_no_list TEXT,
        hasta_adi_list TEXT,
        indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_excel_metadata_content ON excel_metadata(dosya_no_list, hasta_adi_list);
    `);
    
    const { dosyaNoList, hastaAdiList } = await parseExcelContent(excelPath);
    
    db.prepare(`
      INSERT OR REPLACE INTO excel_metadata (excel_path, dosya_no_list, hasta_adi_list)
      VALUES (?, ?, ?)
    `).run(
      excelFilename,
      dosyaNoList.join('|'),
      hastaAdiList.join('|')
    );
    
    logger.info('[EXCEL INDEX] Excel indexed', { 
      filename: excelFilename,
      records: dosyaNoList.length
    });
    return { success: true, records: dosyaNoList.length };
  } catch (error) {
    logger.error('[EXCEL INDEX ERROR]', { filename: excelFilename, error: error.message });
    return { success: false, error: error.message };
  }
}

// Excel silindiğinde index'ten kaldır
function removeFromIndex(excelFilename) {
  const db = dbManager.getDbInstance();
  
  try {
    db.prepare('DELETE FROM excel_metadata WHERE excel_path = ?').run(excelFilename);
    logger.info('[EXCEL INDEX] Excel removed from index', { filename: excelFilename });
  } catch (error) {
    logger.error('[EXCEL INDEX REMOVE ERROR]', { filename: excelFilename, error: error.message });
  }
}

// Hasta Dosya Numarası veya Hasta Adı ile arama yap
function searchExcels(searchTerm) {
  const db = dbManager.getDbInstance();
  
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  
  // Türkçe karakterleri normalize et
  const normalizeSearchTerm = (text) => {
    return text
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/I/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C');
  };
  
  const normalizedTerm = normalizeSearchTerm(searchTerm.trim());
  const term = `%${searchTerm.trim()}%`;
  
  try {
    // Önce tablo var mı kontrol et
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='excel_metadata'
    `).get();
    
    if (!tableExists) {
      logger.warn('[EXCEL SEARCH] excel_metadata tablosu bulunamadı');
      return [];
    }
    // Excel metadata ile klasör bilgilerini JOIN et
    const results = db.prepare(`
      SELECT 
        f.id,
        f.fileCode,
        f.subject,
        f.category,
        f.departmentId,
        f.unitCode,
        f.status,
        f.excelPath,
        f.fileYear,
        f.fileCount,
        f.retentionPeriod,
        f.retentionCode,
        f.folderType,
        f.clinic,
        f.specialInfo,
        f.locationStorageType,
        f.locationUnit,
        f.locationFace,
        f.locationSection,
        f.locationShelf,
        f.locationStand,
        em.dosya_no_list,
        em.hasta_adi_list
      FROM excel_metadata em
      INNER JOIN folders f ON f.excelPath = em.excel_path
      WHERE em.dosya_no_list LIKE ? OR em.hasta_adi_list LIKE ?
      ORDER BY f.createdAt DESC
    `).all(term, term);
    
    // Departments bilgisini al
    const departments = dbManager.getConfig('departments') || ALL_DEPARTMENTS;
    const departmentMap = new Map(departments.map(d => [d.id, d]));
    
    // location nesnesini oluştur ve listeleri işle
    return results.map(row => {
      // Department name bul
      const department = departmentMap.get(row.departmentId);
      const departmentName = department ? department.name : null;
      
      // Tüm dosya no ve hasta adlarını al
      const dosyaNoList = row.dosya_no_list ? row.dosya_no_list.split('|').filter(d => d.trim()) : [];
      const hastaAdiList = row.hasta_adi_list ? row.hasta_adi_list.split('|').filter(h => h.trim()) : [];
      
      // Aranan kelimeyi içeren kayıtları bul
      const matchedDosyaNoIndices = [];
      const matchedHastaAdiIndices = [];
      
      dosyaNoList.forEach((d, index) => {
        const normalizedData = normalizeSearchTerm(d);
        if (normalizedData.includes(normalizedTerm) || 
            d.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchedDosyaNoIndices.push(index);
        }
      });
      
      hastaAdiList.forEach((h, index) => {
        const normalizedData = normalizeSearchTerm(h);
        if (normalizedData.includes(normalizedTerm) || 
            h.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchedHastaAdiIndices.push(index);
        }
      });
      
      // Eşleşen indexleri birleştir (unique)
      const allMatchedIndices = [...new Set([...matchedDosyaNoIndices, ...matchedHastaAdiIndices])];
      
      // Her iki durumda da hem dosya no hem hasta adını göster
      // Eşleşen indexlerdeki kayıtları al
      const matchedDosyaNo = allMatchedIndices.map(i => dosyaNoList[i]).filter(Boolean);
      const matchedHastaAdi = allMatchedIndices.map(i => hastaAdiList[i]).filter(Boolean);
      
      return {
        id: row.id,
        fileCode: row.fileCode,
        subject: row.subject,
        category: row.category,
        departmentId: row.departmentId,
        departmentName: departmentName,
        unitCode: row.unitCode,
        status: row.status,
        excelPath: row.excelPath,
        fileYear: row.fileYear,
        fileCount: row.fileCount,
        retentionPeriod: row.retentionPeriod,
        retentionCode: row.retentionCode,
        folderType: row.folderType,
        clinic: row.clinic,
        specialInfo: row.specialInfo,
        location: {
          storageType: row.locationStorageType,
          unit: row.locationUnit,
          face: row.locationFace,
          section: row.locationSection,
          shelf: row.locationShelf,
          stand: row.locationStand,
        },
        matchedDosyaNo,
        matchedHastaAdi,
        totalRecords: dosyaNoList.length
      };
    });
  } catch (error) {
    logger.error('[EXCEL SEARCH ERROR]', { searchTerm, error: error.message });
    return [];
  }
}

// Index durumunu kontrol et
function getIndexStats() {
  const db = dbManager.getDbInstance();
  
  try {
    // Tablo var mı kontrol et
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='excel_metadata'
    `).get();
    
    if (!tableExists) {
      return { indexed: 0, total: 0, needsIndex: true };
    }
    
    const indexed = db.prepare('SELECT COUNT(*) as count FROM excel_metadata').get().count;
    
    return { indexed, needsIndex: false };
  } catch (error) {
    logger.error('[EXCEL INDEX STATS ERROR]', { error: error.message });
    return { indexed: 0, needsIndex: true };
  }
}

module.exports = {
  indexAllExcels,
  indexSingleExcel,
  removeFromIndex,
  searchExcels,
  getIndexStats,
  parseExcelContent, // Test için export
};
