const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('paperArchive', {
  getLibrary: () => ipcRenderer.invoke('library:get'),
  selectLibrary: () => ipcRenderer.invoke('library:select'),
  listDirectory: (relativePath) => ipcRenderer.invoke('library:list', relativePath),
  readPdf: (relativePath) => ipcRenderer.invoke('library:read-pdf', relativePath),
  chooseExplanation: (originalRelativePath) =>
    ipcRenderer.invoke('library:choose-explanation', originalRelativePath),
});
