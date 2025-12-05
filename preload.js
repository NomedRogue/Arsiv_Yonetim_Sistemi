const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: (filePath) => ipcRenderer.invoke('file:openExternal', filePath),
  savePdfToDownloads: (fileName, base64Data) => ipcRenderer.invoke('pdf:saveToDownloads', fileName, base64Data),
});
