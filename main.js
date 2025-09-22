const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('./backend/logger'); // Use the new logger

const isDev = !app.isPackaged;

// Security: Disable node integration in renderer and enable context isolation
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');

// Backend server process
let backendProcess = null;

// --- Backend Server Başlatma ---
function startBackendServer() {
  try {
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    
    // Debug mesajını console'a ve renderer'a gönder
    function logToRenderer(message) {
      console.log(message);
      if (win && win.webContents) {
        win.webContents.executeJavaScript(`console.log("${message.replace(/"/g, '\\"')}")`).catch(() => {});
      }
    }
    
    if (fs.existsSync(serverPath)) {
      logToRenderer('[BACKEND] Starting backend server...');
      logToRenderer('[BACKEND] Server path: ' + serverPath);
      logToRenderer('[BACKEND] Working directory: ' + __dirname);
      logToRenderer('[BACKEND] Is development: ' + isDev);
      
      // Backend server'ı main process içinde çalıştır (spawn yerine require)
      if (isDev) {
        // Development'ta spawn kullan
        let nodeExecutable = 'node';
        logToRenderer('[BACKEND] Using Node executable (dev): ' + nodeExecutable);
        
        backendProcess = spawn(nodeExecutable, [serverPath], {
          env: {
            ...process.env,
            DB_PATH: dbPath,
            USER_DATA_PATH: userDataPath,
            NODE_ENV: 'development',
            PORT: '3001'
          },
          cwd: __dirname,
          stdio: 'inherit'
        });

        backendProcess.on('error', (error) => {
          logger.error('[BACKEND ERROR]', { error });
          logToRenderer('[BACKEND ERROR] ' + error.message);
        });

        backendProcess.on('exit', (code, signal) => {
          logger.info('[BACKEND] Backend process exited:', { code, signal });
          logToRenderer('[BACKEND] Backend process exited with code: ' + code + ', signal: ' + signal);
          backendProcess = null;
        });
      } else {
        // Production'da in-process çalıştır
        logToRenderer('[BACKEND] Starting backend in-process (production)');
        logToRenderer('[BACKEND] DB Path: ' + dbPath);
        logToRenderer('[BACKEND] User Data Path: ' + userDataPath);
        
        // Environment variables'ı ayarla
        process.env.DB_PATH = dbPath;
        process.env.USER_DATA_PATH = userDataPath;
        process.env.NODE_ENV = 'production';
        process.env.PORT = '3001';
        
        try {
          logToRenderer('[BACKEND] About to require server.js...');
          // Backend server'ı require et
          require(serverPath);
          logger.info('[BACKEND] Backend server started in-process');
          logToRenderer('[BACKEND] Backend server started in-process on port 3001');
        } catch (error) {
          logger.error('[BACKEND IN-PROCESS ERROR]', { error });
          logToRenderer('[BACKEND IN-PROCESS ERROR] ' + error.message);
          logToRenderer('[BACKEND ERROR STACK] ' + error.stack);
        }
      }

      // 3 saniye bekle ki backend ayağa kalksın
      setTimeout(() => {
        if (isDev) {
          if (backendProcess && !backendProcess.killed) {
            logger.info('[BACKEND] Backend server should be running on port 3001');
            logToRenderer('[BACKEND] Backend server should be running on port 3001');
          } else {
            logger.error('[BACKEND] Backend process appears to have died');
            logToRenderer('[BACKEND] Backend process appears to have died');
          }
        } else {
          logger.info('[BACKEND] Backend server should be running in-process on port 3001');
          logToRenderer('[BACKEND] Backend server should be running in-process on port 3001');
          
          // Port'un gerçekten dinlenip dinlenmediğini test et
          const net = require('net');
          const testSocket = new net.Socket();
          
          testSocket.setTimeout(2000);
          testSocket.on('connect', () => {
            logToRenderer('[PORT TEST] Port 3001 is LISTENING - Backend is working!');
            testSocket.destroy();
          });
          
          testSocket.on('error', (err) => {
            logToRenderer('[PORT TEST] Port 3001 is NOT LISTENING - Backend failed! Error: ' + err.code);
          });
          
          testSocket.on('timeout', () => {
            logToRenderer('[PORT TEST] Port 3001 test TIMEOUT - Backend not responding');
            testSocket.destroy();
          });
          
          testSocket.connect(3001, '127.0.0.1');
        }
      }, 3000);

    } else {
      logger.error('[BACKEND] Server file not found:', serverPath);
      logToRenderer('[BACKEND] Server file not found: ' + serverPath);
    }
  } catch (error) {
    logger.error('[BACKEND STARTUP ERROR]', { error });
    logToRenderer('[BACKEND STARTUP ERROR] ' + error.message);
  }
}

// --- DB YOLU (backend artık ayrı process'te çalışacak) ---
let userDataPath;
let dbPath;

try {
  userDataPath = app.getPath('userData');
  
  // Development'ta backend/arsiv.db, production'da userData/arsiv.db
  if (isDev) {
    dbPath = path.join(__dirname, 'backend', 'arsiv.db');
  } else {
    dbPath = path.join(userDataPath, 'arsiv.db');
    
    // Production'da backend'deki arsiv.db'yi userData'ya kopyala (varsa)
    const sourceDbPath = path.join(__dirname, 'backend', 'arsiv.db');
    if (fs.existsSync(sourceDbPath) && !fs.existsSync(dbPath)) {
      try {
        fs.mkdirSync(userDataPath, { recursive: true });
        fs.copyFileSync(sourceDbPath, dbPath);
        logger.info('[DB SETUP] Database copied from backend to userData');
      } catch (copyError) {
        logger.warn('[DB SETUP] Could not copy database, will create new one', { error: copyError });
      }
    }
  }
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

// Backend için ortam değişkenleri (backend/server.js kullanacak)
process.env.DB_PATH = dbPath;
process.env.USER_DATA_PATH = userDataPath;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// --- Electron Window Management ---
let win;
async function createWindow() {
  logger.info('[ELECTRON] Creating main window...');

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
    autoHideMenuBar: false, // DevTools için menu göster
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      devTools: true, // DevTools'u zorla aç
      webSecurity: isDev ? false : true, // Dev'de false, prod'da true
      allowRunningInsecureContent: isDev ? true : false,
      experimentalFeatures: false
    },
  });

  // Production'da da DevTools aç (debug için)
  win.webContents.openDevTools({ mode: 'detach' });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    try {
      // Production'da index.html'i doğru yoldan yükle
      const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
      
      console.log('[DEBUG] __dirname:', __dirname);
      console.log('[DEBUG] indexPath:', indexPath);
      console.log('[DEBUG] indexPath exists:', fs.existsSync(indexPath));
      
      if (fs.existsSync(indexPath)) {
        win.loadFile(indexPath).catch(err => {
          console.error('[LOAD FILE ERROR]', err);
          logger.error('[LOAD FILE ERROR]', { error: err });
        });
      } else {
        console.log('[ERROR] Frontend dosyaları bulunamadı:', indexPath);
        logger.error('[FRONTEND FILES NOT FOUND]', { path: indexPath });
        
        // Fallback HTML
        win.loadURL(`data:text/html;charset=utf-8,
          <!DOCTYPE html>
          <html>
          <head><title>Arşiv Yönetim Sistemi</title></head>
          <body>
            <div id="root" style="padding: 20px;">
              <h1>Arşiv Yönetim Sistemi</h1>
              <p>Frontend dosyaları yüklenemiyor. Uygulama yeniden kurulmalı.</p>
              <p>Beklenen path: ${indexPath}</p>
            </div>
          </body>
          </html>
        `);
      }
    } catch (e) {
      console.error('[LOAD FILE EXCEPTION]', e);
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
  console.log('[MAIN] App is ready, starting setup...');
  
  // Backend server'ı sadece production'da başlat (development'ta npm script'i hallediyor)
  if (!isDev) {
    console.log('[MAIN] Calling startBackendServer...');
    startBackendServer();
  } else {
    console.log('[MAIN] Development mode - backend started by npm script');
  }
  
  // Window'u oluştur
  console.log('[MAIN] Calling createWindow...');
  createWindow().then(() => {
    console.log('[MAIN] Window created successfully');
    // Birkaç saniye sonra debug mesajı gönder
    setTimeout(() => {
      if (win && win.webContents) {
        win.webContents.executeJavaScript(`console.log("[MAIN] App initialization completed")`).catch(() => {});
      }
    }, 1000);
  }).catch(err => {
    console.error('[MAIN] Window creation failed:', err);
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Backend process'i kapat (sadece development'ta spawn kullanıldığında)
  if (backendProcess && isDev) {
    logger.info('[BACKEND] Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Backend process'i kapat (sadece development'ta spawn kullanıldığında)
  if (backendProcess && isDev) {
    logger.info('[BACKEND] Stopping backend server before quit...');
    backendProcess.kill();
    backendProcess = null;
  }
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