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
  
  backendProcess = fork(backendPath, [], {
    env: { ...process.env, PORT: 3001 },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });

  backendProcess.on('message', (msg) => {
    if (msg === 'ready') {
      logger.info('[BACKEND] Server Ready');
      createWindow();
    }
  });

  backendProcess.stderr.on('data', (data) => logger.error(`[BACKEND ERROR] ${data}`));
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

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist', 'index.html')}`;

  mainWindow.loadURL(startUrl);

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
  setupIpcHandlers(); // Initialize IPC Handlers
  createSplashWindow();
  startBackendServer();
  
  // Setup Updater (Wait a bit for window)
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
