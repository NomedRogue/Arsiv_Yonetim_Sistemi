const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const logger = require('./logger');
const dbManager = require('./db');
const { getUserDataPath, ensureDirExists } = require('./fileHelper');

/**
 * PDF Search Service
 * PDFlerin içeriğinden SAYI (Hasta Dosya No) ve AÇIKLAMALAR (Hasta Adı Soyadı) alanlarında arama yapar
 */

// PDF klasör yolunu çöz (settings'ten veya default AppData)
async function resolvePdfFolder() {
  let folderPath = '';
  const settings = await dbManager.getConfig('settings');
  if (
    settings &&
    settings.pdfKayitKlasoru &&
    typeof settings.pdfKayitKlasoru === 'string'
  ) {
    folderPath = settings.pdfKayitKlasoru.trim();
  }

  if (!folderPath) {
    folderPath = getUserDataPath('PDFs');
  }
  
  logger.info('[PDF SEARCH] Resolved PDF folder:', folderPath);
  ensureDirExists(folderPath);
  return folderPath;
}

// PDF içeriğini parse et ve SAYI, AÇIKLAMALAR alanlarını çıkar
async function parsePdfContent(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    const text = data.text || '';
    
    // Eğer PDF boşsa veya çok az text varsa (resim/taranmış PDF olabilir)
    if (text.trim().length < 50) {
      logger.warn('[PDF PARSE] PDF text içeriği çok az veya yok (muhtemelen resim-tabanlı PDF)', { pdfPath });
      return { dosyaNo: null, hastaAdi: null, fullText: null };
    }
    
    // Yöntem 1: Tablo formatı - Her satırda SIRA_NO, TARİH, DOSYA_NO, KONU, HASTA_ADI
    // Örnek: "122 EVRAK 26.05.2025 1172685 DIŞ ÇEKİMİ... 1 YUSUF ÇELİK"
    const tableRows = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 6-7 haneli sayı ara (dosya no)
      const dosyaNoMatch = line.match(/\b(\d{6,7})\b/);
      if (dosyaNoMatch) {
        // Aynı satırda veya sonraki satırda büyük harfli isim ara
        const combinedText = line + ' ' + (lines[i + 1] || '');
        const nameMatch = combinedText.match(/\b([A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,}){1,2})\b/);
        
        if (nameMatch) {
          const name = nameMatch[1];
          // Başlık kelimelerini filtrele
          if (!name.includes('KLASÖR') && 
              !name.includes('SIRA') && 
              !name.includes('SAYFA') &&
              !name.includes('TARIH') &&
              !name.includes('SAYI') &&
              !name.includes('KONU') &&
              !name.includes('AÇIKLAMA') &&
              !name.includes('EVRAK') &&
              !name.includes('TABİP') &&
              name.length > 5) {
            tableRows.push({
              dosyaNo: dosyaNoMatch[1],
              hastaAdi: name.trim()
            });
          }
        }
      }
    }
    
    // Tüm dosya no ve hasta adlarını birleştir
    const allDosyaNo = [...new Set(tableRows.map(r => r.dosyaNo))];
    const allHastaAdi = [...new Set(tableRows.map(r => r.hastaAdi))];
    
    const dosyaNo = allDosyaNo.length > 0 ? allDosyaNo.join(', ') : null;
    const hastaAdi = allHastaAdi.length > 0 ? allHastaAdi.join(', ') : null;
    
    logger.info('[PDF PARSE] PDF parsed', { 
      pdfPath: path.basename(pdfPath), 
      foundRecords: tableRows.length,
      dosyaNoCount: allDosyaNo.length,
      hastaAdiCount: allHastaAdi.length
    });
    
    return {
      dosyaNo,
      hastaAdi,
      fullText: text.substring(0, 2000), // İlk 2000 karakter (debug için)
    };
  } catch (error) {
    logger.error('[PDF PARSE ERROR]', { pdfPath, error: error.message });
    return { dosyaNo: null, hastaAdi: null, fullText: null };
  }
}

// Tüm PDFleri index'le (ilk kurulum veya yeniden index için)
async function indexAllPdfs() {
  const db = dbManager.getDbInstance();
  
  // PDF klasör yolunu çöz
  const pdfFolderPath = await resolvePdfFolder();
  
  // PDF metadata tablosu oluştur
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_metadata (
      pdf_path TEXT PRIMARY KEY,
      dosya_no TEXT,
      hasta_adi TEXT,
      indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Index oluştur (arama performansı için)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dosya_no ON pdf_metadata(dosya_no);
    CREATE INDEX IF NOT EXISTS idx_hasta_adi ON pdf_metadata(hasta_adi);
  `);
  
  const files = fs.readdirSync(pdfFolderPath).filter(f => f.toLowerCase().endsWith('.pdf'));
  logger.info(`[PDF INDEX] ${files.length} PDF dosyası bulundu. İndexleme başlıyor...`);
  
  let indexed = 0;
  let failed = 0;
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO pdf_metadata (pdf_path, dosya_no, hasta_adi)
    VALUES (?, ?, ?)
  `);
  
  for (const file of files) {
    try {
      const fullPath = path.join(pdfFolderPath, file);
      const { dosyaNo, hastaAdi } = await parsePdfContent(fullPath);
      
      insertStmt.run(file, dosyaNo, hastaAdi);
      indexed++;
      
      if (indexed % 10 === 0) {
        logger.info(`[PDF INDEX] ${indexed}/${files.length} PDF işlendi`);
      }
    } catch (error) {
      failed++;
      logger.error('[PDF INDEX ERROR]', { file, error: error.message });
    }
  }
  
  logger.info(`[PDF INDEX] Tamamlandı. ${indexed} başarılı, ${failed} hatalı`);
  return { indexed, failed, total: files.length };
}

// Tek bir PDF'i index'le (yeni upload edildiğinde)
async function indexSinglePdf(pdfPath, pdfFilename) {
  const db = dbManager.getDbInstance();
  
  try {
    const { dosyaNo, hastaAdi } = await parsePdfContent(pdfPath);
    
    db.prepare(`
      INSERT OR REPLACE INTO pdf_metadata (pdf_path, dosya_no, hasta_adi)
      VALUES (?, ?, ?)
    `).run(pdfFilename, dosyaNo, hastaAdi);
    
    logger.info('[PDF INDEX] PDF indexed', { filename: pdfFilename, dosyaNo, hastaAdi });
    return { success: true, dosyaNo, hastaAdi };
  } catch (error) {
    logger.error('[PDF INDEX ERROR]', { filename: pdfFilename, error: error.message });
    return { success: false, error: error.message };
  }
}

// PDF silindiğinde index'ten kaldır
function removeFromIndex(pdfFilename) {
  const db = dbManager.getDbInstance();
  
  try {
    db.prepare('DELETE FROM pdf_metadata WHERE pdf_path = ?').run(pdfFilename);
    logger.info('[PDF INDEX] PDF removed from index', { filename: pdfFilename });
  } catch (error) {
    logger.error('[PDF INDEX REMOVE ERROR]', { filename: pdfFilename, error: error.message });
  }
}

// Hasta Dosya Numarası veya Hasta Adı ile arama yap
function searchPdfs(searchTerm) {
  const db = dbManager.getDbInstance();
  
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  
  const term = `%${searchTerm.trim()}%`;
  
  try {
    // PDF metadata ile klasör bilgilerini JOIN et
    const results = dbManager.getDbInstance().prepare(`
      SELECT 
        f.id,
        f.fileCode,
        f.subject,
        f.category,
        f.departmentId,
        f.status,
        f.pdfPath,
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
        pm.dosya_no,
        pm.hasta_adi
      FROM pdf_metadata pm
      INNER JOIN folders f ON f.pdfPath = pm.pdf_path
      WHERE pm.dosya_no LIKE ? OR pm.hasta_adi LIKE ?
      ORDER BY f.createdAt DESC
    `).all(term, term);
    
    // location nesnesini oluştur
    return results.map(row => ({
      id: row.id,
      fileCode: row.fileCode,
      subject: row.subject,
      category: row.category,
      departmentId: row.departmentId,
      status: row.status,
      pdfPath: row.pdfPath,
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
      dosya_no: row.dosya_no,
      hasta_adi: row.hasta_adi,
    }));
  } catch (error) {
    logger.error('[PDF SEARCH ERROR]', { searchTerm, error: error.message });
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
      WHERE type='table' AND name='pdf_metadata'
    `).get();
    
    if (!tableExists) {
      return { indexed: 0, total: 0, needsIndex: true };
    }
    
    const indexed = db.prepare('SELECT COUNT(*) as count FROM pdf_metadata').get().count;
    
    return { indexed, needsIndex: false };
  } catch (error) {
    logger.error('[PDF INDEX STATS ERROR]', { error: error.message });
    return { indexed: 0, needsIndex: true };
  }
}

module.exports = {
  indexAllPdfs,
  indexSinglePdf,
  removeFromIndex,
  searchPdfs,
  getIndexStats,
  parsePdfContent, // Test için export
};
