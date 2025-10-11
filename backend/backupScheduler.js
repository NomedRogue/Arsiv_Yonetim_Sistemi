const crypto = require('crypto');
const dbManager = require('./db');
const { performBackupToFolder } = require('./backup');
const logger = require('./logger');
const { sseBroadcast } = require('./sse');

function parseHHMM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str || '');
  if (!m) return { h: 3, m: 0 }; // default 03:00
  return { h: Math.min(23, Math.max(0, +m[1])), m: Math.min(59, Math.max(0, +m[2])) };
}

function clearAutoBackupState() {
  try {
    dbManager.setConfig('autoBackupState', {});
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
  if (freq === 'Kapalı' || !settings?.yedeklemeKlasoru) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG BACKUP] Skipping: frequency=' + freq + ', folder=' + (settings?.yedeklemeKlasoru ? 'set' : 'not set'));
    }
    return false;
  }

  const { h, m } = parseHHMM(settings.backupTime);
  const lastAuto = state?.lastAutoIso ? new Date(state.lastAutoIso) : new Date(0);

  // Construct today's scheduled time in local timezone components
  // scheduledToday saatini kullanıcının yerel saatine göre ayarla
  const scheduledToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

  if (process.env.NODE_ENV === 'development') {
    logger.info('[DEBUG BACKUP] Debug values:', {
      now: now.toLocaleString(),
      scheduledToday: scheduledToday.toLocaleString(),
      lastAuto: lastAuto.toLocaleString(),
      nowTime: now.getTime(),
      scheduledTime: scheduledToday.getTime(),
      lastAutoTime: lastAuto.getTime()
    });
  }

  // Eğer backup zamanı henüz gelmediyse, backup çalıştırılmamalı
  if (now < scheduledToday) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG BACKUP] Skipping: scheduled time not yet reached');
    }
    return false;
  }

  // Determine the most recent applicable scheduled time that has passed
  const lastScheduledTime = scheduledToday;

  // If the last backup was performed at or after the last applicable scheduled time, no need to run.
  if (lastAuto.getTime() >= lastScheduledTime.getTime()) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG BACKUP] Skipping: backup already done today (lastAuto >= scheduled)');
    }
    return false;
  }

  // A backup is due. Check frequency.
  if (freq === 'Günlük') {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG BACKUP] Running backup: frequency is Günlük and conditions met');
    }
    return true;
  }

  if (freq === 'Haftalık') {
    const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000;
    // Using getTime() compares UTC timestamps, which is fine here since we are just checking a duration.
    const shouldRun = (now.getTime() - lastAuto.getTime()) >= (oneWeekInMillis - 60000); // 1-minute buffer
    if (process.env.NODE_ENV === 'development') {
      logger.info('[DEBUG BACKUP] Weekly check:', { shouldRun, timeDiff: now.getTime() - lastAuto.getTime() });
    }
    return shouldRun;
  }

  if (process.env.NODE_ENV === 'development') {
    logger.info('[DEBUG BACKUP] Skipping: unknown frequency=' + freq);
  }
  return false;
}


let autoBackupRunning = false;
function startAutoBackupScheduler() {
  logger.info('[AUTO BACKUP] Scheduler started');
  
  // Check every minute for more precise timing
  setInterval(async () => {
    try {
      if (autoBackupRunning) return;

      const settings = dbManager.getConfig('settings') || {};
      const state = dbManager.getConfig('autoBackupState') || {};
      const now = new Date();

      if (shouldRunAutoBackup(settings, state, now)) {
        autoBackupRunning = true;
        logger.info('[AUTO BACKUP] Starting...', {
          frequency: settings.backupFrequency,
          time: settings.backupTime,
          currentTime: now.toLocaleString(),
          lastAuto: state.lastAutoIso || 'never'
        });
        
        const dest = await performBackupToFolder('auto');
        
        const newState = {
          // Bir sonraki kontrol için bu anın zaman damgasını kaydet
          lastAutoIso: new Date().toISOString(),
        };
        dbManager.setConfig('autoBackupState', newState);
        
        logger.info('[AUTO BACKUP] Completed:', { dest, state: newState });
        
        // SSE ile frontend'e bildirim gönder
        sseBroadcast('backup_completed', {
          type: 'Otomatik',
          file: dest,
          timestamp: new Date().toISOString()
        });
        
        autoBackupRunning = false;
      }
    } catch (e) {
      autoBackupRunning = false;
      logger.error('[AUTO BACKUP] Error:', { error: e });
      dbManager.addLog({ type: 'backup_error', details: `Otomatik yedekleme başarısız oldu: ${e.message}` });
    }
  }, 60 * 1000); // Check every 60 seconds
}

function initAutoBackupState() {
  try {
    const state = dbManager.getConfig('autoBackupState') || {};
    const settings = dbManager.getConfig('settings') || {};
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

module.exports = { startAutoBackupScheduler, initAutoBackupState, clearAutoBackupState, shouldRunAutoBackup };