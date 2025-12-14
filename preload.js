const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filePath) => ipcRenderer.invoke('file:openExternal', filePath),
  savePdfToDownloads: (fileName, base64Data) => ipcRenderer.invoke('pdf:saveToDownloads', fileName, base64Data),
  
  // Window Control API (for custom title bar)
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    resizeForApp: () => ipcRenderer.invoke('window:resizeForApp')
  },
  
  // Auto-Updater API
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onUpdateStatus: (callback) => {
      ipcRenderer.on('update-status', (_, data) => callback(data));
      // Cleanup function
      return () => ipcRenderer.removeAllListeners('update-status');
    }
  },
  
  // Database Control
  db: {
    close: () => ipcRenderer.invoke('db:close'),
    reconnect: () => ipcRenderer.invoke('db:reconnect'),
    saveGithubToken: (token) => ipcRenderer.invoke('db:save-token', token)
  },
  
  // System Params
  paths: {
    userData: ipcRenderer.sendSync('get-user-data-path') 
  },
  
  // Backend Info
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),

  // App Ready Signal
  signalAppReady: () => ipcRenderer.send('app-ready')
});
