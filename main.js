// Electron ana modülleri
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./backend/src/utils/logger');

// Tek instance kilidi
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Global değişkenler
let mainWindow = null;
let backendProcess = null;
// isDev: app packaged değilse VE (defaultApp varsa VEYA electron path'i node_modules'dan geliyorsa) VE NODE_ENV production değilse
const isDev = !app.isPackaged && 
  process.env.NODE_ENV !== 'production' && 
  (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));
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
let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return;
  isQuitting = true;
  
  logger.info('[CLEANUP] Uygulama kapatılıyor, temizlik yapılıyor...');
  
  try {
    // Database bağlantısını kapat
    const { closeDb } = require('./backend/src/database/connection');
    closeDb();
    logger.info('[CLEANUP] Veritabanı bağlantısı kapatıldı');
  } catch (err) {
    logger.error('[CLEANUP] Veritabanı kapatılamadı', { error: err });
  }
  
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill();
      logger.info('[CLEANUP] Backend process sonlandırıldı');
    }
  } catch (err) {
    logger.error('[CLEANUP] Backend process sonlandırılamadı', { error: err });
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
  if (isDev) {
    logger.info('[BACKEND] Development modda - Backend ayrı process olarak başlatılacak (npm script tarafından)');
    return Promise.resolve(); // Development'ta backend npm script ile başlatılır
  }

  logger.info('[BACKEND] Production modu - Backend doğrudan başlatılıyor...');
  
  try {
    // Backend'i doğrudan require ile başlat (aynı process içinde)
    // Bu yaklaşım native modüllerle en uyumlu yöntemdir
    const { startServer } = require('./backend/server');
    
    return startServer().then((server) => {
      logger.info('[BACKEND] ✓ Backend başarıyla başlatıldı, port:', server.address().port);
      return server;
    }).catch((err) => {
      logger.error('[BACKEND] ✗ Backend başlatılamadı:', err);
      writeLog('[BACKEND] Backend başlatma hatası', err);
      
      const errorDetails = [
        'Backend sunucu başlatılamadı.',
        '',
        `Hata: ${err.message}`,
        '',
        'Detaylar:',
        `- DB Path: ${dbPath}`,
        `- User Data: ${userDataPath}`,
        '',
        'Lütfen uygulamayı yeniden başlatın.'
      ].join('\n');
      
      dialog.showErrorBox('Backend Hatası', errorDetails);
      throw err;
    });
    
  } catch (err) {
    logger.error('[BACKEND] ✗ Backend require hatası:', err);
    writeLog('[BACKEND] Backend require hatası', err);
    
    const errorDetails = [
      'Backend modülü yüklenemedi.',
      '',
      `Hata: ${err.message}`,
      '',
      'Detaylar:',
      `- DB Path: ${dbPath}`,
      `- User Data: ${userDataPath}`,
      '',
      'Lütfen uygulamayı yeniden başlatın.'
    ].join('\n');
    
    dialog.showErrorBox('Backend Hatası', errorDetails);
    return Promise.reject(err);
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
      sandbox: false, // IPC çağrıları için false olmalı
      webSecurity: true,
      allowRunningInsecureContent: false
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
    // Production'da dist klasörü doğrudan ana dizinde
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    logger.info(`[ELECTRON] Loading index from: ${indexPath}`);
    
    if (!fs.existsSync(indexPath)) {
      logger.error(`[ELECTRON] Index file not found: ${indexPath}`);
      writeLog(`[ELECTRON] Index file not found: ${indexPath}`);
      // Alternatif path dene
      const altPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
      if (fs.existsSync(altPath)) {
        logger.info(`[ELECTRON] Using alternative path: ${altPath}`);
        await mainWindow.loadFile(altPath);
      } else {
        throw new Error('Frontend dist klasörü bulunamadı');
      }
    } else {
      await mainWindow.loadFile(indexPath);
    }
  }

  logger.info('[ELECTRON] Sayfa yüklendi');
}

// Uygulama hazır olduğunda
app.whenReady().then(async () => {
  logger.info('[APP] Uygulama başlatılıyor...');
  prepareDatabase();
  
  try {
    await startBackendServer();
    logger.info('[APP] Backend başarıyla başlatıldı');
  } catch (err) {
    logger.error('[APP] Backend başlatılamadı:', err);
    // Uygulama yine de açılsın, hata dialog ile gösterildi
  }
  
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
    
    // Path validation - only allow files from PDFs, Excels, or Downloads directories
    const allowedDirs = [
      path.join(userDataPath, 'PDFs'),
      path.join(userDataPath, 'Excels'),
      app.getPath('downloads')
    ];
    
    const resolvedPath = path.resolve(filePath);
    const isAllowed = allowedDirs.some(dir => {
      const resolvedDir = path.resolve(dir);
      return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
    });
    
    if (!isAllowed) {
      logger.warn('[SECURITY] Unauthorized file access attempt:', filePath);
      return { success: false, error: 'Bu dosyaya erişim izni yok' };
    }
    
    await shell.openPath(filePath);
    return { success: true };
  } catch (e) {
    logger.error('[OPEN FILE ERROR]', { error: e.message, filePath });
    return { success: false, error: e.message };
  }
});

// PDF'i İndirilenler klasörüne kaydet ve aç
ipcMain.handle('pdf:saveToDownloads', async (event, fileName, base64Data) => {
  try {
    const downloadsPath = app.getPath('downloads');
    const filePath = path.join(downloadsPath, fileName);
    
    // Base64'ten buffer'a çevir ve kaydet
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    logger.info('[PDF] PDF kaydedildi:', filePath);
    
    // PDF'i otomatik aç
    await shell.openPath(filePath);
    
    return { success: true, filePath };
  } catch (e) {
    logger.error('[PDF ERROR]', { error: e.message, fileName });
    return { success: false, error: e.message };
  }
});
