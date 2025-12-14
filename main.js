const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const logger = require('./backend/src/utils/logger');
const { setupAutoUpdater } = require('./main-process/updater-handler');
const { setupIpcHandlers } = require('./main-process/ipc-handler');

// Load environment variables
require('dotenv').config();

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Global References
let mainWindow = null;
let splashWindow = null;
let backendProcess = null;

const isDev = !app.isPackaged && 
  process.env.NODE_ENV !== 'production' && 
  (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'arsiv.db');

// Set Env for Backend
process.env.DB_PATH = dbPath;
process.env.USER_DATA_PATH = userDataPath;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// ----------------------------------------------------------------
// BACKEND MANAGEMENT
// ----------------------------------------------------------------
function startBackendServer() {
  const backendPath = path.join(__dirname, 'backend', 'server.js');
  
  // Basitleştirilmiş Fork
  backendProcess = fork(backendPath, [], {
    env: { ...process.env, PORT: 3001 }
  });

  backendProcess.on('message', (msg) => {
    if (msg === 'ready' || msg?.type === 'backend-ready') {
      logger.info('[BACKEND] Server Ready');
      createWindow();
    }
  });

  backendProcess.on('error', (err) => logger.error(`[BACKEND ERROR] ${err}`));
}

// ----------------------------------------------------------------
// WINDOW MANAGEMENT
// ----------------------------------------------------------------
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500, height: 350,
    transparent: true, frame: false, alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.loadFile('splash.html');
}

function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    show: false, // Wait for ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "Arşiv Yönetim Sistemi"
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWidth('https:')) {
        shell.openExternal(url);
        return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// ----------------------------------------------------------------
// APP LIFECYCLE
// ----------------------------------------------------------------
app.whenReady().then(() => {
  setupIpcHandlers();
  createSplashWindow();
  
  // Geliştirme modunda backend'i 'npm run dev' başlatır.
  // Production'da ise biz başlatırız.
  if (!isDev) {
      startBackendServer();
      
      // Fallback: Eğer backend 5 saniye içinde 'ready' demezse pencereyi aç
      // Fallback: Eğer backend 3 saniye içinde 'ready' demezse
      setTimeout(() => {
        logger.warn('[MAIN] Backend signal timeout. Forcing UI...');
        
        if (!mainWindow) createWindow();
        
        if (mainWindow) {
            mainWindow.show();
            mainWindow.maximize();
            if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        }
      }, 3000);
  } else {
      logger.info('[MAIN] Dev mod: Backend harici başlatıldı, internal server atlanıyor.');
      // Backend 'ready' sinyali göndermeyeceği için pencereyi manuel aç
      setTimeout(() => createWindow(), 1000);
  }
  
  setTimeout(() => {
      if (mainWindow) setupAutoUpdater(mainWindow);
  }, 5000);
});

// Splash -> Main Transition
ipcMain.on('app-ready', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.maximize();
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});

// Second Instance Focus
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
