// Electron ana modülleri
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./backend/src/utils/logger');
const { autoUpdater } = require('electron-updater');

// Load environment variables from .env file
require('dotenv').config();

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

// Generate JWT secret if not exists (for first-time setup)
if (!process.env.JWT_SECRET) {
  const crypto = require('crypto');
  
  // Generate a secure random secret
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  
  // Save to .env file in user data directory
  const envPath = path.join(userDataPath, '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  if (!envContent.includes('JWT_SECRET=')) {
    envContent += `\nJWT_SECRET=${jwtSecret}\n`;
    fs.writeFileSync(envPath, envContent);
    logger.info('[SECURITY] Generated new JWT_SECRET and saved to .env');
  }
  
  // Set the environment variable for current process
  process.env.JWT_SECRET = jwtSecret;
}

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

  logger.info('[BACKEND] Production modu - Backend Child Process olarak başlatılıyor...');
  
  return new Promise((resolve, reject) => {
    try {
      const backendScript = path.join(__dirname, 'backend', 'server.js');
      
      // Fork backend process with dedicated environment
      const { fork } = require('child_process');
      backendProcess = fork(backendScript, ['--subprocess'], {
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          USER_DATA_PATH: userDataPath,
          DB_PATH: dbPath
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });

      // Redirect stdout/stderr to main logger
      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          const str = data.toString().trim();
          if (str) logger.info(`[BACKEND] ${str}`);
        });
      }
      
      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          const str = data.toString().trim();
          if (str) logger.error(`[BACKEND-ERR] ${str}`);
        });
      }

      // Listen for port message from backend
      backendProcess.on('message', (msg) => {
        if (msg && msg.type === 'backend-ready') {
          logger.info(`[BACKEND] Backend servisi hazır. Port: ${msg.port}`);
          global.backendPort = msg.port;
          resolve(msg.port);
        }
      });

      backendProcess.on('error', (err) => {
        logger.error('[BACKEND] Process başlatma hatası:', err);
        reject(err);
      });

      backendProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          logger.error(`[BACKEND] Process beklenmedik şekilde kapandı. Kod: ${code}, Sinyal: ${signal}`);
          // Eğer uygulama kapanmıyorsa reject et
          if (!isQuitting) reject(new Error(`Backend exited with code ${code}`));
        }
      });

    } catch (err) {
      logger.error('[BACKEND] Fork hatası:', err);
      reject(err);
    }
  });
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
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 720,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    frame: false, // Frameless window - özel title bar için
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // IPC çağrıları için false olmalı
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f8fafc', // Light theme background
    center: true // Ekranın ortasında aç
  });

  mainWindow.once('ready-to-show', () => {
    // Start maximized handled in app-ready
    // mainWindow.maximize();
    // DO NOT show immediately. Wait for 'app-ready' signal from React.
    // mainWindow.show(); 
    logger.info('[ELECTRON] Ana pencere render edildi (gizli)');
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
    
    // Inject port via query params if available
    const loadOptions = global.backendPort ? { search: `?port=${global.backendPort}` } : {};

    if (!fs.existsSync(indexPath)) {
      logger.error(`[ELECTRON] Index file not found: ${indexPath}`);
      writeLog(`[ELECTRON] Index file not found: ${indexPath}`);
      // Alternatif path dene
      const altPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
      if (fs.existsSync(altPath)) {
        logger.info(`[ELECTRON] Using alternative path: ${altPath}`);
        await mainWindow.loadFile(altPath, loadOptions);
      } else {
        throw new Error('Frontend dist klasörü bulunamadı');
      }
    } else {
      await mainWindow.loadFile(indexPath, loadOptions);
    }
    // Debugging for production: Open dev tools
    // mainWindow.webContents.openDevTools();
  }

  logger.info('[ELECTRON] Sayfa yüklendi');
}

// Splash penceresi global
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// App Ready Handler
// App Ready Handler
// App Ready Handler
ipcMain.on('app-ready', () => {
  logger.info('[APP] Frontend hazır sinyali alındı. Hızlı geçiş yapılıyor...');
  
  // Önce ana pencereyi hazırla ve göster
  if (mainWindow) {
    if (!mainWindow.isMaximized()) mainWindow.maximize();
    mainWindow.show(); // Pencereyi göster (Splash'in arkasında kalabilir alwaysOnTop yüzünden)
    mainWindow.focus();
  }

  // Çok kısa bir süre sonra Splash'i yok et
  // Bu küçük gecikme (100-200ms), ana pencerenin render edilmesi için güvenli bir aralıktır
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close(); // Splash kapanınca arkadaki hazır pencere görünür
    }
    // Son bir odaklama garantisi
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
    }
  }, 200);
});

// Uygulama hazır olduğunda
app.whenReady().then(async () => {
  logger.info('[APP] Uygulama başlatılıyor...');
  
  // 1. Splash ekranını göster
  createSplashWindow();
  
  // 2. Veritabanı ve klasörleri hazırla
  prepareDatabase();
  
  // 3. Backend'i başlat (Splash görünürken arka planda)
  // setImmediate kullanarak event loop'un splash'i render etmesine izin ver
  await new Promise(resolve => setTimeout(resolve, 100)); // Kısa bir nefes al
  
  try {
    await startBackendServer();
    logger.info('[APP] Backend başarıyla başlatıldı');
  } catch (err) {
    logger.error('[APP] Backend başlatılamadı:', err);
    // Hata durumunda bile devam et
  }
  
  // 4. Ana pencereyi oluştur (yüklenmesi zaman alabilir)
  await createWindow();
  
  // Not: Artık mainWindow show ve splash close işlemleri 'app-ready' sinyali ile yapılıyor.
  
  logger.info('[APP] Uygulama başlatıldı (pencere gizli)');
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
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = userDataPath;
});

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
    
    // In development mode, also allow backend/PDFs and backend/Excels
    if (isDev) {
      allowedDirs.push(
        path.join(__dirname, 'backend', 'PDFs'),
        path.join(__dirname, 'backend', 'Excels')
      );
    }
    
    const resolvedPath = path.resolve(filePath);
    const isAllowed = allowedDirs.some(dir => {
      const resolvedDir = path.resolve(dir);
      return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
    });
    
    if (!isAllowed) {
      logger.warn('[SECURITY] Unauthorized file access attempt:', filePath);
      logger.warn('[SECURITY] Allowed directories:', allowedDirs);
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

// Window control IPC handlers (for custom title bar)
ipcMain.handle('window:minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.handle('window:isMaximized', () => {
  const win = BrowserWindow.getFocusedWindow();
  return win ? win.isMaximized() : false;
});

// Resize window for main app (after login)
ipcMain.handle('window:resizeForApp', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setSize(1400, 900);
    win.center();
  }
});

// =============================================
// AUTO-UPDATER AYARLARI
// =============================================

// Auto-updater ayarları
autoUpdater.autoDownload = false; // Kullanıcı onayı ile indir
autoUpdater.autoInstallOnAppQuit = true; // Kapanışta otomatik kur
autoUpdater.logger = logger;

// Güncelleme için token ayarla
function configureUpdaterToken() {
  try {
    const { getRepositories } = require('./backend/src/database/repositories');
    const repos = getRepositories();
    const settings = repos.config.get('settings');
    
    if (settings && settings.githubToken) {
      process.env.GH_TOKEN = settings.githubToken;
      // Header olarak da ekle - Private repo'lar için kritik
      autoUpdater.requestHeaders = {
        'Authorization': `token ${settings.githubToken}`,
        'Accept': 'application/octet-stream' // İndirme işlemleri için gerekli olabilir
      };
      logger.info(`[UPDATER] GitHub Token yapılandırıldı. (İlk 4 hane: ${settings.githubToken.substring(0, 4)}***)`);
    } else {
      logger.warn('[UPDATER] GitHub Token bulunamadı! Özel repolardan güncelleme yapılamaz.');
    }
  } catch (err) {
    logger.error('[UPDATER] Token yapılandırma hatası:', err);
  }
}

// Güncelleme kontrolü başlat (sadece production'da)
function checkForUpdates() {
  if (isDev) {
    logger.info('[UPDATER] Development modda - güncelleme kontrolü atlanıyor');
    return;
  }
  
  configureUpdaterToken();
  
  logger.info('[UPDATER] Güncelleme kontrol ediliyor...');
  // Cache'i devre dışı bırakmak için channel dosyasını yeniden çekmeye zorla (opsiyonel)
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error('[UPDATER] Güncelleme kontrolü başarısız:', err);
  });
}

// Güncelleme olayları
autoUpdater.on('checking-for-update', () => {
  logger.info('[UPDATER] Güncelleme kontrol ediliyor...');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  logger.info('[UPDATER] Yeni güncelleme mevcut:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'available', 
      version: info.version,
      releaseNotes: info.releaseNotes 
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  logger.info('[UPDATER] Uygulama güncel:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'not-available' });
  }
});

autoUpdater.on('download-progress', (progress) => {
  logger.info(`[UPDATER] İndirme: ${progress.percent.toFixed(1)}%`);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'downloading', 
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info('[UPDATER] Güncelleme indirildi:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'downloaded', 
      version: info.version 
    });
  }
});

autoUpdater.on('error', (err) => {
  logger.error('[UPDATER] Güncelleme hatası:', err);
  
  // Check for 404 / no published versions error
  const is404 = err.message && (err.message.includes('404') || err.message.includes('Unable to find latest version') || err.message.includes('no published versions'));

  if (mainWindow) {
    if (is404) {
      // 404 HATASINI GİZLEME - Kullanıcıya bildir
      logger.warn('[UPDATER] 404 Hatası: Release bulunamadı veya erişim reddedildi.');
      mainWindow.webContents.send('update-status', { 
        status: 'error', 
        message: 'Güncelleme sunucusuna erişilemedi (404). Lütfen GitHub Release\'in "Published" olduğundan ve Token\'ın doğru olduğundan emin olun.' 
      });
    } else {
      mainWindow.webContents.send('update-status', { 
        status: 'error', 
        message: err.message 
      });
    }
  }
});

// IPC handlers - Güncelleme komutları
ipcMain.handle('updater:check', async () => {
  try {
    if (isDev) {
      logger.info('[UPDATER] Development modda güncelleme kontrolü simüle ediliyor');
      return { 
        success: false, 
        error: 'Geliştirici modunda güncelleme kontrolü yapılamaz.',
        isDev: true 
      };
    }
    configureUpdaterToken();
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err) {
    const is404 = err.message && (err.message.includes('404') || err.message.includes('Unable to find latest version'));
    return { 
      success: false, 
      error: is404 ? 'Yayınlanmış güncelleme bulunamadı.' : err.message,
      is404: is404
    };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    logger.info('[UPDATER] İndirme işlemi başlatılıyor...');
    configureUpdaterToken(); // İndirme öncesi token'ı tekrar garantiye al

    const downloadPromise = autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    logger.error('[UPDATER] İndirme başlatma hatası:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Database Control Handlers (for Backup/Restore)
ipcMain.handle('db:close', async () => {
  try {
    const { closeDb } = require('./backend/src/database/connection');
    logger.info('[MAIN] Closing DB connection manually (requested by renderer)...');
    closeDb();
    return { success: true };
  } catch (err) {
    logger.error('[MAIN] Close DB error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:reconnect', async () => {
  try {
    const { reconnectDb } = require('./backend/src/database/connection');
    logger.info('[MAIN] Reconnecting DB connection manually...');
    reconnectDb();
    return { success: true };
  } catch (err) {
    logger.error('[MAIN] Reconnect DB error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:getVersion', () => {
  return app.getVersion();
});

// Uygulama başladıktan 5 saniye sonra güncelleme kontrolü
app.whenReady().then(() => {
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
});
