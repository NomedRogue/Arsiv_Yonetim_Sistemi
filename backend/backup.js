const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const dbManager = require('./db');
const { sseBroadcast } = require('./sse');
const { getUserDataPath, ensureDirExists } = require('./fileHelper');
const logger = require('./logger');

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
    const dbFiles = filenames.filter((f) => f.toLowerCase().endsWith('.db'));

    if (dbFiles.length <= keepN) {
      logger.info(`[BACKUP CLEANUP] Temizlenecek yedek yok (${dbFiles.length} <= ${keepN}).`);
      return;
    }

    const filesWithStats = await Promise.all(
      dbFiles.map(async (f) => {
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
  const dest = path.join(folder, `arsiv_${stamp}.db`);

  try {
    await dbManager.getDbInstance().backup(dest);
    logger.info(`[BACKUP SUCCESS] ${dest}`);
    
    dbManager.addLog({ type: 'backup', details: `Yedek alındı: ${path.basename(dest)} (${reason})` });
    
    sseBroadcast('backup', { 
      reason,
      path: dest,
      filename: path.basename(dest),
      ts: new Date()
    });

    const settings = dbManager.getConfig('settings');
    const retentionCount = settings?.backupRetention;
    if (retentionCount && retentionCount > 0) {
      // Temizliği yedeklemeden hemen sonra çalıştır.
      // Hata olsa bile ana yedekleme işlemini etkilememesi için try-catch içinde.
      try {
        await cleanupOldBackups(folder, retentionCount);
      } catch (cleanupError) {
        logger.error('[BACKUP] Yedekleme sonrası temizlik başarısız oldu.', { error: cleanupError });
      }
    }

    return dest;
  } catch (e) {
    logger.error('[BACKUP ERROR]', { error: e });
    throw new Error('Veritabanı yedeklenemedi: ' + e.message);
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