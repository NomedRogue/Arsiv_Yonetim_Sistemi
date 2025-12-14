const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const net = require('net');
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

// ----------------------------------------------------------------
// BACKEND MANAGEMENT
// ----------------------------------------------------------------

// Helper to find a free port
function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port (or 0 for random if we want, but let's increment)
        // If startPort is 3001, try 0 (random) next to be quick
        findFreePort(0).then(resolve, reject);
      } else {
        reject(err);
      }
    });
  });
}

async function startBackendServer() {
  const backendPath = path.join(__dirname, 'backend', 'server.js');
  
  // Determine port before starting
  let targetPort = 3001;
  try {
    targetPort = await findFreePort(3001);
    logger.info(`[MAIN] Found free port for backend: ${targetPort}`);
  } catch (err) {
    logger.error(`[MAIN] Failed to find free port, defaulting to 3001. Error: ${err.message}`);
  }

  backendProcess = fork(backendPath, ['--subprocess'], {
    env: {
      ...process.env,
      PORT: targetPort,
      USER_DATA_PATH: userDataPath, // Explicitly pass userDataPath
      DB_PATH: dbPath
    }
  });

  backendProcess.on('message', (msg) => {
    if (msg === 'ready' || msg?.type === 'backend-ready') {
      if (msg.port) {
        backendPort = msg.port;
        logger.info(`[BACKEND] Server running on port: ${backendPort}`);
      } else {
        // Fallback if backend doesn't report port (shouldn't happen)
        backendPort = targetPort;
      }
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
    // Pass port to the frontend via query parameter
    // This allows the frontend to know which port the backend is running on
    const startUrl = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(startUrl, { search: `?port=${backendPort}` });
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
  // CSP (Content Security Policy)
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

// Provide backend port to renderer
ipcMain.handle('get-backend-port', () => {
    return backendPort;
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
