// Electron ana modülleri
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./backend/logger');

// Tek instance kilidi
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Global değişkenler
let mainWindow = null;
let backendProcess = null;
const isDev = !app.isPackaged && (
  process.env.NODE_ENV !== 'production' || 
  process.defaultApp || 
  /node_modules[\\/]electron[\\/]/.test(process.execPath)
);
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'arsiv.db');
const logFilePath = path.join(userDataPath, 'app-log.txt');

// Log fonksiyonu
function writeLog(message, error = null) {
  const timestamp = new Date().toISOString();
  const logMessage = error 
    ? `[${timestamp}] ${message}: ${error.message}\n${error.stack}\n`
    : `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (err) {
    console.error('[LOG ERROR]', err);
  }
}

// İkinci instance açılmaya çalışıldığında
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Process cleanup
app.on('before-quit', () => {
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill();
    }
  } catch (err) {
    if (logger) logger.error('[CLEANUP] Backend process sonlandırılamadı', err);
  }
});

// Ortam değişkenleri
process.env.DB_PATH = dbPath;
process.env.USER_DATA_PATH = userDataPath;
process.env.NODE_ENV = isDev ? 'development' : 'production';

logger.info(`[PATH DEBUG] userDataPath: ${userDataPath}`);
logger.info(`[PATH DEBUG] dbPath: ${dbPath}`);

// Backend başlatma
function startBackendServer() {
  if (!isDev) {
    logger.info('[BACKEND] Production modda backend main process içinde çalışacak');
    try {
      // Backend'e userData path'ini ilet
      process.env.USER_DATA_PATH = userDataPath;
      logger.info(`[BACKEND] USER_DATA_PATH set edildi: ${userDataPath}`);
      
      require('./backend/server.js');
      logger.info('[BACKEND] Backend server başlatıldı');
    } catch (err) {
      logger.error('[BACKEND] Backend başlatılamadı', { error: err });
      writeLog('[BACKEND] Backend başlatılamadı', err);
    }
  }
}

// Veritabanı hazırlama
function prepareDatabase() {
  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
      logger.info(`[DB INIT] UserData klasörü oluşturuldu: ${userDataPath}`);
    }

    // Veritabanı dosyasını backend oluşturacak, burada sadece klasör kontrolü yapıyoruz
    logger.info(`[DB INIT] Veritabanı path hazır: ${dbPath}`);
  } catch (error) {
    logger.error('[DB INIT] Veritabanı hazırlanamadı', { error });
    writeLog('[DB INIT] Veritabanı hazırlanamadı', error);
  }
}

// Ana pencere oluşturma
async function createWindow() {
  logger.info('[ELECTRON] Ana pencere oluşturuluyor...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger.info('[ELECTRON] Ana pencere gösterildi');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  logger.info('[ELECTRON] Sayfa yüklendi');
}

// Uygulama hazır olduğunda
app.whenReady().then(async () => {
  logger.info('[APP] Uygulama başlatılıyor...');
  prepareDatabase();
  startBackendServer();
  await createWindow();
  logger.info('[APP] Uygulama başlatıldı');
});

// MacOS için aktivasyon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Tüm pencereler kapatıldığında
app.on('window-all-closed', () => {
  if (backendProcess && isDev) {
    logger.info('[BACKEND] Backend process durduruluyor...');
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('dialog:openDirectory', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  } catch (e) {
    logger.error('[DIALOG ERROR]', { error: e });
    return null;
  }
});

// Excel/PDF dosyasını sistem varsayılan uygulamasıyla aç
ipcMain.handle('file:openExternal', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      logger.error('[OPEN FILE ERROR] File not found:', filePath);
      return { success: false, error: 'Dosya bulunamadı' };
    }
    
    await shell.openPath(filePath);
    return { success: true };
  } catch (e) {
    logger.error('[OPEN FILE ERROR]', { error: e.message, filePath });
    return { success: false, error: e.message };
  }
});
