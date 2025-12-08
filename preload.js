const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filePath) => ipcRenderer.invoke('file:openExternal', filePath),
  savePdfToDownloads: (fileName, base64Data) => ipcRenderer.invoke('pdf:saveToDownloads', fileName, base64Data),
  
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
  
  // System Params
  paths: {
    userData: ipcRenderer.sendSync('get-user-data-path') 
  },
  
  // App Ready Signal
  signalAppReady: () => ipcRenderer.send('app-ready')
});
