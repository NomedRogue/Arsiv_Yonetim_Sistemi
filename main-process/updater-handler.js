const { autoUpdater } = require('electron-updater');
const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../backend/src/utils/logger');

let checkInterval = null;

function setupAutoUpdater(mainWindow) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = logger;

    // Initial Config
    configureUpdaterToken();

    // --- EVENTS ---
    autoUpdater.on('checking-for-update', () => {
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
        logger.info('[UPDATER] Update available:', info.version);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
        logger.info('[UPDATER] Up to date.');
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available' });
    });

    autoUpdater.on('error', (err) => {
        const is404 = err.message && (err.message.includes('404') || err.message.includes('published versions'));
        logger.error('[UPDATER] Error:', err);
        if (mainWindow) {
            mainWindow.webContents.send('update-status', { 
                status: 'error', 
                message: is404 ? 'Yayınlanmış güncelleme bulunamadı (404).' : err.message,
                is404
            });
        }
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj });
    });

    autoUpdater.on('update-downloaded', (info) => {
        logger.info('[UPDATER] Downloaded');
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', version: info.version });
    });

    // --- IPC HANDLERS ---
    // (Only add if not already added - electron throws if duplicate handlers)
    // We assume this runs in main.js once.
    
    ipcMain.handle('updater:check', () => {
        configureUpdaterToken();
        return autoUpdater.checkForUpdates();
    });

    ipcMain.handle('updater:download', () => {
        configureUpdaterToken();
        return autoUpdater.downloadUpdate();
    });

    ipcMain.handle('updater:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('updater:getVersion', () => app.getVersion());

    ipcMain.handle('db:save-token', async (event, token) => {
        return saveToken(token);
    });

    // Auto-check logic (5 sec after launch)
    setTimeout(() => {
        if (!process.env.skipUpdateCheck) {
            configureUpdaterToken();
            autoUpdater.checkForUpdates().catch(e => logger.error('[UPDATER] Check failed:', e));
        }
    }, 5000);
}

function configureUpdaterToken() {
    try {
        const configPath = path.join(app.getPath('userData'), 'updater-config.json');
        let token = process.env.GH_TOKEN;

        // Try reading from JSON config
        if (!token && fs.existsSync(configPath)) {
            try {
                const data = fs.readFileSync(configPath, 'utf8');
                const parsed = JSON.parse(data);
                if (parsed.githubToken) token = parsed.githubToken;
            } catch(e) {
                logger.error('[UPDATER] Config read error:', e);
            }
        }

        if (token) {
            process.env.GH_TOKEN = token;
            autoUpdater.requestHeaders = { 
                'Authorization': `token ${token}`,
                'Accept': 'application/octet-stream' 
            };
            logger.info('[UPDATER] Token configured.');
        } else {
            logger.warn('[UPDATER] No token found.');
        }
    } catch (err) {
        logger.error('[UPDATER] Token config error:', err);
    }
}

function saveToken(token) {
    try {
        const configPath = path.join(app.getPath('userData'), 'updater-config.json');
        fs.writeFileSync(configPath, JSON.stringify({ githubToken: token }, null, 2));
        configureUpdaterToken();
        return true;
    } catch (e) {
        logger.error('[UPDATER] Token save error:', e);
        return false;
    }
}

module.exports = { setupAutoUpdater };
