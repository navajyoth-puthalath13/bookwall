const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bookWallAPI', {
    loadUserProfile: () => ipcRenderer.invoke('load-user'),
    saveUserProfile: (data) => ipcRenderer.invoke('save-user', data),
    loadBookCollection: () => ipcRenderer.invoke('load-books'),
    saveBookCollection: (data) => ipcRenderer.invoke('save-books', data),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    openStickerDialog: () => ipcRenderer.invoke('open-sticker-dialog'),
    getSticker: (fileName) => ipcRenderer.invoke('get-sticker', fileName)
});