const crypto = require('crypto');
const { getRepositories } = require('./src/database/repositories');
const { getBackupService } = require('./src/services/BackupService');
const logger = require('./src/utils/logger');
const { sseBroadcast } = require('./src/utils/sse');

function parseHHMM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str || '');
  if (!m) return { h: 3, m: 0 }; // default 03:00
  return { h: Math.min(23, Math.max(0, +m[1])), m: Math.min(59, Math.max(0, +m[2])) };
}

function clearAutoBackupState() {
  try {
    const repos = getRepositories();
    repos.config.set('autoBackupState', {});
    logger.info('[AUTO BACKUP] State cleared due to settings change or restore.');
  } catch (e) {
    logger.error('[AUTO BACKUP] Clear state error:', { error: e });
  }
}

/**
 * Checks if an automatic backup should be performed based on settings and the last run time.
 * This logic is now timezone-safe by using local time methods for all date comparisons.
 */
function shouldRunAutoBackup(settings, state, now) {
  const freq = settings?.backupFrequency || 'Kapalı';
  
  // Debug log
  logger.debug('[AUTO BACKUP CHECK]', {
    frequency: freq,
    backupTime: settings?.backupTime,
    folder: settings?.yedeklemeKlasoru ? 'SET' : 'NOT SET',
    currentTime: now.toLocaleString('tr-TR'),
    lastBackup: state?.lastAutoIso || 'never'
  });
  
  if (freq === 'Kapalı' || !settings?.yedeklemeKlasoru) {
    logger.debug('[AUTO BACKUP] Skipping: frequency=' + freq + ', folder=' + (settings?.yedeklemeKlasoru ? 'set' : 'not set'));
    return false;
  }

  const { h, m } = parseHHMM(settings.backupTime);
  const lastAuto = state?.lastAutoIso ? new Date(state.lastAutoIso) : new Date(0);

  // Construct today's scheduled time in local timezone components
  // scheduledToday saatini kullanıcının yerel saatine göre ayarla
  const scheduledToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

  // Debug log for time check
  logger.debug('[AUTO BACKUP] Time check:', {
    now: now.toLocaleString('tr-TR'),
    scheduledToday: scheduledToday.toLocaleString('tr-TR'),
    lastAuto: lastAuto.toLocaleString('tr-TR'),
    nowTime: now.getTime(),
    scheduledTime: scheduledToday.getTime(),
    isTimeReached: now >= scheduledToday,
    wasAlreadyDone: lastAuto.getTime() >= scheduledToday.getTime()
  });

  // Eğer backup zamanı henüz gelmediyse, backup çalıştırılmamalı
  if (now < scheduledToday) {
    logger.debug('[AUTO BACKUP] Skipping: scheduled time not yet reached');
    return false;
  }

  // Determine the most recent applicable scheduled time that has passed
  const lastScheduledTime = scheduledToday;

  // If the last backup was performed at or after the last applicable scheduled time, no need to run.
  if (lastAuto.getTime() >= lastScheduledTime.getTime()) {
    logger.debug('[AUTO BACKUP] Skipping: backup already done today');
    return false;
  }

  // A backup is due. Check frequency.
  if (freq === 'Günlük') {
    logger.info('[AUTO BACKUP] *** RUNNING: frequency is Günlük and conditions met ***');
    return true;
  }

  if (freq === 'Haftalık') {
    const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000;
    // Using getTime() compares UTC timestamps, which is fine here since we are just checking a duration.
    const shouldRun = (now.getTime() - lastAuto.getTime()) >= (oneWeekInMillis - 60000); // 1-minute buffer
    logger.debug('[AUTO BACKUP] Weekly check:', { shouldRun, timeDiff: now.getTime() - lastAuto.getTime() });
    return shouldRun;
  }

  logger.debug('[AUTO BACKUP] Skipping: unknown frequency=' + freq);
  return false;
}


let autoBackupRunning = false;
let backupSchedulerInterval = null;

function startAutoBackupScheduler() {
  logger.info('[AUTO BACKUP] Scheduler started');
  
  // Check every minute for more precise timing
  backupSchedulerInterval = setInterval(async () => {
    try {
      if (autoBackupRunning) return;

      const repos = getRepositories();
      const settings = repos.config.get('settings') || {};
      const state = repos.config.get('autoBackupState') || {};
      const now = new Date();

      // Her 5 dakikada bir durum logu
      if (now.getMinutes() % 5 === 0) {
        logger.info('[AUTO BACKUP] Status check:', {
          frequency: settings.backupFrequency || 'not set',
          time: settings.backupTime || 'not set',
          folder: settings.yedeklemeKlasoru ? 'set' : 'NOT SET',
          lastBackup: state.lastAutoIso || 'never',
          currentTime: now.toLocaleString('tr-TR')
        });
      }

      if (shouldRunAutoBackup(settings, state, now)) {
        autoBackupRunning = true;
        logger.info('[AUTO BACKUP] Starting...', {
          frequency: settings.backupFrequency,
          time: settings.backupTime,
          currentTime: now.toLocaleString(),
          lastAuto: state.lastAutoIso || 'never'
        });
        
        // NEW: Use BackupService instead of legacy backup.js
        const backupService = getBackupService();
        const result = await backupService.createBackup('Otomatik');
        
        const newState = {
          // Bir sonraki kontrol için bu anın zaman damgasını kaydet
          lastAutoIso: new Date().toISOString(),
        };
        repos.config.set('autoBackupState', newState);
        
        logger.info('[AUTO BACKUP] Completed:', { path: result.path, state: newState });
        
        // SSE ile frontend'e bildirim gönder
        sseBroadcast('backup_completed', {
          type: 'Otomatik',
          file: result.path,
          name: result.name,
          size: result.size,
          timestamp: new Date().toISOString()
        });
        
        autoBackupRunning = false;
      }
    } catch (e) {
      autoBackupRunning = false;
      logger.error('[AUTO BACKUP] Error:', { error: e });
      const repos = getRepositories();
      repos.log.addLog({ type: 'backup_error', details: `Otomatik yedekleme başarısız oldu: ${e.message}` });
    }
  }, 60 * 1000); // Check every 60 seconds
}

function initAutoBackupState() {
  try {
    const repos = getRepositories();
    const state = repos.config.get('autoBackupState') || {};
    const settings = repos.config.get('settings') || {};
    logger.info('[AUTO BACKUP] Current state:', {
      lastAutoIso: state.lastAutoIso,
      currentSettings: {
        frequency: settings.backupFrequency,
        time: settings.backupTime,
        folder: settings.yedeklemeKlasoru ? 'set' : 'not set'
      }
    });
  } catch (e) {
    logger.error('[AUTO BACKUP] Init state error:', { error: e });
  }
}

// Stop the backup scheduler (for graceful shutdown)
function stopAutoBackupScheduler() {
  if (backupSchedulerInterval) {
    clearInterval(backupSchedulerInterval);
    backupSchedulerInterval = null;
    logger.info('[AUTO BACKUP] Scheduler stopped');
  }
}

module.exports = { startAutoBackupScheduler, stopAutoBackupScheduler, initAutoBackupState, clearAutoBackupState, shouldRunAutoBackup };