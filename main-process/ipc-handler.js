const { ipcMain, dialog, shell, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../backend/src/utils/logger');

function setupIpcHandlers() {
    // ----------------------------------------------------------------
    // DIALOGS
    // ----------------------------------------------------------------
    ipcMain.handle('dialog:openDirectory', async () => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            });
            return canceled ? null : filePaths[0];
        } catch (e) {
            logger.error('[IPC] Dialog error:', e);
            return null;
        }
    });

    // ----------------------------------------------------------------
    // FILE OPERATIONS
    // ----------------------------------------------------------------
    ipcMain.handle('file:openExternal', async (event, filePath) => {
        try {
            if (!filePath || !fs.existsSync(filePath)) {
                return { success: false, error: 'Dosya bulunamadı' };
            }
            await shell.openPath(filePath);
            return { success: true };
        } catch (e) {
            logger.error('[IPC] Open file error:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('pdf:saveToDownloads', async (event, fileName, base64Data) => {
        try {
            const downloadsPath = app.getPath('downloads');
            const filePath = path.join(downloadsPath, fileName);
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            await shell.openPath(filePath);
            return { success: true, filePath };
        } catch (e) {
            logger.error('[IPC] PDF save error:', e);
            return { success: false, error: e.message };
        }
    });

    // ----------------------------------------------------------------
    // WINDOW OPERATIONS
    // ----------------------------------------------------------------
    ipcMain.handle('window:isMaximized', () => {
        const win = BrowserWindow.getFocusedWindow();
        return win ? win.isMaximized() : false;
    });

    ipcMain.handle('window:resizeForApp', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setSize(1400, 900);
            win.center();
        }
    });
    
    // ----------------------------------------------------------------
    // DB CONTROL (For Restore Operations)
    // ----------------------------------------------------------------
    ipcMain.handle('db:close', async () => {
        try {
            // Require dynamically to avoid holding the lock
            const { closeDb } = require('../backend/src/database/connection');
            logger.info('[IPC] Closing DB connection...');
            closeDb();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('db:reconnect', async () => {
        try {
            const { reconnectDb } = require('../backend/src/database/connection');
            logger.info('[IPC] Reconnecting DB connection...');
            reconnectDb();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.on('get-user-data-path', (event) => {
        event.returnValue = app.getPath('userData');
    });
}

module.exports = { setupIpcHandlers };
