const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const dbManager = require('./backend/db');
const logger = require('./backend/logger'); // Use the new logger

const isDev = !app.isPackaged;

// --- DB YOLU (dev: backend/arsiv.db, prod: userData/arsiv.db) ---
let userDataPath;
let dbPath;

try {
  userDataPath = app.getPath('userData');
  dbPath = isDev
    ? path.join(__dirname, 'backend', 'arsiv.db')
    : path.join(userDataPath, 'arsiv.db');
} catch (e) {
  logger.error('[PATH ERROR]', { error: e });
  userDataPath = __dirname; // fallback
  dbPath = path.join(userDataPath, 'arsiv.db');
}

// Production'da userData klasörünü oluştur ve database'i hazırla
if (!isDev) {
  try {
    // UserData klasörünü oluştur
    fs.mkdirSync(userDataPath, { recursive: true });
    
    // Eğer veritabanı yoksa, resources'tan kopyalamaya çalış
    if (!fs.existsSync(dbPath)) {
      const packagedDbPath = path.join(process.resourcesPath, 'arsiv.db');
      if (fs.existsSync(packagedDbPath)) {
        fs.copyFileSync(packagedDbPath, dbPath);
        logger.info('[DB COPY] Veritabanı resources\'tan kopyalandı');
      } else {
        // Resources'ta yoksa, boş dosya oluştur (db.js initialize edecek)
        logger.info('[DB INIT] Veritabanı resources\'ta bulunamadı, yeni oluşturulacak');
      }
    }
  } catch (e) {
    logger.error('[DB COPY ERROR]', { error: e });
  }
}

// Backend için ortam değişkenleri
process.env.DB_PATH = dbPath;
process.env.USER_DATA_PATH = userDataPath;
process.env.NODE_ENV = isDev ? 'development' : 'production'; // For logger and other modules

// --- Backend'i başlat ---
try {
  require('./backend/server.js');
  logger.info('[BACKEND] server.js loaded');
} catch (e) {
  logger.error('[BACKEND LOAD ERROR]', { error: e });
}

let win;
function createWindow() {
  let iconPath;
  try {
    iconPath = path.join(__dirname, 'assets', 'icon.ico');
  } catch (e) {
    iconPath = undefined;
    logger.error('[ICON PATH ERROR]', { error: e });
  }

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    autoHideMenuBar: !isDev,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Prod'da menüyü tamamen kaldır (Alt ile de gelmesin)
  if (!isDev) {
    try {
      Menu.setApplicationMenu(null);
    } catch (e) {
      logger.error('[MENU REMOVE ERROR]', { error: e });
    }
    win.setMenuBarVisibility(false);
  }

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    try {
      const indexHtml = path.join(__dirname, 'frontend', 'dist', 'index.html');
      win.loadFile(indexHtml).catch(err => logger.error('[LOAD FILE ERROR]', { error: err }));
    } catch (e) {
      logger.error('[LOAD FILE ERROR]', { error: e });
    }
  }

  // prod’da beyaz ekran teşhisi
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    logger.error('[did-fail-load]', { code, desc, url });
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    logger.error('[render-process-gone]', { details });
  });
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    logger.info('[RENDERER]', { level, message, line, sourceId });
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// UYGULAMA KAPANMADAN ÖNCE VERİTABANINI GÜVENLE KAPAT
// Bu, veri kaybı sorunlarını çözmek için kritiktir.
app.on('before-quit', () => {
  dbManager.closeDb();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC ----
ipcMain.handle('dialog:openDirectory', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  } catch (e) {
    logger.error('[DIALOG ERROR]', { error: e });
  }
});