const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const dbManager = require('./dbAdapter'); // Legacy compatibility
const { sseBroadcast } = require('./src/utils/sse');
const { getUserDataPath, ensureDirExists } = require('./src/utils/fileHelper');
const logger = require('./src/utils/logger');

function resolveBackupFolder() {
  let folderPath = '';
  // NOTE: Her çağrıldığında ayarları yeniden oku. Bu, ayarlar değiştiğinde
  // sunucunun eski bilgiyi kullanmasını engeller.
  const settings = dbManager.getConfig('settings');
  if (
    settings &&
    settings.yedeklemeKlasoru &&
    typeof settings.yedeklemeKlasoru === 'string'
  ) {
    folderPath = settings.yedeklemeKlasoru.trim();
  }

  if (!folderPath) {
    folderPath = getUserDataPath('Backups');
  }

  ensureDirExists(folderPath);
  return folderPath;
}

async function cleanupOldBackups(folder, keepN) {
  try {
    if (!fs.existsSync(folder)) return;
    logger.info(`[BACKUP CLEANUP] ${folder} klasöründe temizlik başlıyor. Son ${keepN} yedek tutulacak.`);

    const filenames = await fsPromises.readdir(folder);
    const backupFiles = filenames.filter((f) => f.toLowerCase().endsWith('.zip') || f.toLowerCase().endsWith('.db'));

    if (backupFiles.length <= keepN) {
      logger.info(`[BACKUP CLEANUP] Temizlenecek yedek yok (${backupFiles.length} <= ${keepN}).`);
      return;
    }

    const filesWithStats = await Promise.all(
      backupFiles.map(async (f) => {
        const full = path.join(folder, f);
        try {
          const stat = await fsPromises.stat(full);
          return { name: f, full, mtimeMs: stat.mtimeMs };
        } catch (e) {
          logger.warn(`[BACKUP CLEANUP] Stat alınamadı: ${full}`, { error: e });
          return null; // Stat alınamayan dosyaları yoksay
        }
      })
    );

    const sortedFiles = filesWithStats
      .filter(f => f !== null)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (keepN && keepN > 0 && sortedFiles.length > keepN) {
      const toDelete = sortedFiles.slice(keepN);
      logger.info(`[BACKUP CLEANUP] Silinecek dosyalar:`, { files: toDelete.map(f => f.name) });

      await Promise.all(toDelete.map(async (f) => {
        try {
          await fsPromises.unlink(f.full);
        } catch (e) {
          logger.warn('[BACKUP CLEANUP] Silme hatası', { file: f.full, error: e.message });
        }
      }));

      if (toDelete.length) {
        const deletedNames = toDelete.map((x) => x.name);
        dbManager.addLog({ type: 'backup_cleanup', details: `Eski yedekler silindi: ${toDelete.length} adet (${deletedNames.join(', ')})` });
        sseBroadcast('backup_cleanup', { 
          deleted: deletedNames,
          count: toDelete.length,
          ts: new Date()
        });
      }
    }
  } catch (e) {
    logger.error('[BACKUP CLEANUP] Temizleme sırasında kritik hata:', { error: e });
  }
}

async function performBackupToFolder(reason = 'manual') {
  const folder = resolveBackupFolder();
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 15);
  const zipDest = path.join(folder, `arsiv_${stamp}.zip`);
  const tempDbPath = path.join(folder, `temp_${stamp}.db`);

  try {
    // 1. Veritabanını geçici bir yere yedekle
    await dbManager.getDbInstance().backup(tempDbPath);
    logger.info(`[BACKUP] Veritabanı geçici olarak yedeklendi: ${tempDbPath}`);

    // 2. ZIP arşivi oluştur
    const output = fs.createWriteStream(zipDest);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          logger.warn('[BACKUP] Dosya bulunamadı uyarısı:', { error: err });
        } else {
          reject(err);
        }
      });

      archive.pipe(output);

      // Veritabanını ekle
      archive.file(tempDbPath, { name: 'arsiv.db' });

      // PDF ve Excel klasörlerini ekle (varsa)
      const pdfsPath = getUserDataPath('PDFs');
      const excelsPath = getUserDataPath('Excels');

      if (fs.existsSync(pdfsPath)) {
        const pdfFiles = fs.readdirSync(pdfsPath);
        if (pdfFiles.length > 0) {
          archive.directory(pdfsPath, 'PDFs');
          logger.info(`[BACKUP] PDF klasörü eklendi: ${pdfFiles.length} dosya`);
        }
      }

      if (fs.existsSync(excelsPath)) {
        const excelFiles = fs.readdirSync(excelsPath);
        if (excelFiles.length > 0) {
          archive.directory(excelsPath, 'Excels');
          logger.info(`[BACKUP] Excel klasörü eklendi: ${excelFiles.length} dosya`);
        }
      }

      archive.finalize();
    });

    // 3. Geçici DB dosyasını sil
    await fsPromises.unlink(tempDbPath);
    logger.info(`[BACKUP SUCCESS] Tam yedek oluşturuldu: ${zipDest}`);

    const stats = fs.statSync(zipDest);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    dbManager.addLog({ 
      type: 'backup', 
      details: `Tam yedek alındı: ${path.basename(zipDest)} (${sizeMB} MB, ${reason})` 
    });
    
    sseBroadcast('backup', { 
      reason,
      path: zipDest,
      filename: path.basename(zipDest),
      size: stats.size,
      ts: new Date()
    });

    const settings = dbManager.getConfig('settings');
    const retentionCount = settings?.backupRetention;
    if (retentionCount && retentionCount > 0) {
      try {
        await cleanupOldBackups(folder, retentionCount);
      } catch (cleanupError) {
        logger.error('[BACKUP] Yedekleme sonrası temizlik başarısız oldu.', { error: cleanupError });
      }
    }

    return zipDest;
  } catch (e) {
    // Hata durumunda geçici dosyaları temizle
    try {
      if (fs.existsSync(tempDbPath)) await fsPromises.unlink(tempDbPath);
      if (fs.existsSync(zipDest)) await fsPromises.unlink(zipDest);
    } catch (cleanupErr) {
      logger.warn('[BACKUP] Geçici dosya temizleme hatası:', { error: cleanupErr });
    }
    
    logger.error('[BACKUP ERROR]', { error: e });
    throw new Error('Yedekleme başarısız: ' + e.message);
  }
}

function getDbInfo() {
  return new Promise((resolve, reject) => {
    try {
      const db = dbManager.getDbInstance();
      const stat = fs.statSync(dbManager.DB_FILE);
      const info = {
        path: dbManager.DB_FILE,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        counts: {
          configs:   db.prepare('SELECT COUNT(*) AS c FROM configs').get().c,
          folders:   db.prepare('SELECT COUNT(*) AS c FROM folders').get().c,
          checkouts: db.prepare('SELECT COUNT(*) AS c FROM checkouts').get().c,
          disposals: db.prepare('SELECT COUNT(*) AS c FROM disposals').get().c,
          logs:      db.prepare('SELECT COUNT(*) AS c FROM logs').get().c,
        },
      };
      const h = crypto.createHash('sha256');
      const s = fs.createReadStream(dbManager.DB_FILE);
      s.on('data', (chunk) => h.update(chunk));
      s.on('end', () => {
        info.sha256 = h.digest('hex');
        resolve(info);
      });
      s.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  resolveBackupFolder,
  cleanupOldBackups,
  performBackupToFolder,
  getDbInfo,
};