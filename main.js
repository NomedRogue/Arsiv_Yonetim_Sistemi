const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
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
let backendPort = 3001; // Default port

const isDev = !app.isPackaged && 
  process.env.NODE_ENV !== 'production' && 
  (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'arsiv.db');

// Set Env for Backend
process.env.DB_PATH = dbPath;
process.env.USER_DATA_PATH = userDataPath;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// Ensure JWT_SECRET is set for production
if (!process.env.JWT_SECRET) {
  // In a desktop app context, we can use a fixed internal secret or generate one.
  // Using a fixed one ensures tokens remain valid across restarts if they persist.
  process.env.JWT_SECRET = 'arsiv-yonetim-sistemi-s3cr3t-k3y-2024-v1';
  logger.info('[MAIN] JWT_SECRET not found, using default internal secret.');
}

// ----------------------------------------------------------------
// BACKEND MANAGEMENT
// ----------------------------------------------------------------
async function startBackendServer() {
  try {
    logger.info('[MAIN] Starting backend in-process...');
    
    // Dynamically require to avoid top-level await issues if any
    const { startServer } = require('./backend/server');
    
    // Start the server
    const server = await startServer();
    const address = server.address();
    backendPort = address.port;
    logger.info(`[MAIN] Backend Server started on port ${backendPort}`);
    
    createWindow();
  } catch (err) {
    logger.error(`[MAIN] Failed to start backend: ${err.message}`);
    const { dialog } = require('electron');
    dialog.showErrorBox('Başlatma Hatası', 'Sunucu başlatılamadı:\n' + err.message);
    app.quit();
  }
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
    backgroundColor: '#111827', // Set dark background to prevent white flash
    frame: false, // Use custom title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "Arşiv Yönetim Sistemi"
  });

  // Remove menu bar
  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Pass port to frontend via query param if needed (though backend hardcoded to 3001 mostly)
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { search: `?port=${backendPort}` });
  }

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
        return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  });
}

// ----------------------------------------------------------------
// APP LIFECYCLE
// ----------------------------------------------------------------
app.whenReady().then(() => {
  // CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self' http://localhost:* ws://localhost:*"
        ]
      }
    });
  });

  setupIpcHandlers();
  createSplashWindow();
  
  if (!isDev) {
      startBackendServer();
  } else {
      logger.info('[MAIN] Dev mod: Backend harici başlatıldı, internal server atlanıyor.');
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

// Provide backend port to renderer
ipcMain.handle('get-backend-port', () => {
    return backendPort;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Database and server cleanup is handled by process exit
});

// Second Instance Focus
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
