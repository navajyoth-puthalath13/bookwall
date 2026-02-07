const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bookWallAPI', {
  loadUserProfile: () => ipcRenderer.invoke('load-user'),
  saveUserProfile: (data) => ipcRenderer.invoke('save-user', data),
  loadBookCollection: () => ipcRenderer.invoke('load-books'),
  saveBookCollection: (data) => ipcRenderer.invoke('save-books', data),
  createNewBook: (book) => ipcRenderer.invoke('create-book', book),
  removeBookById: (id) => ipcRenderer.invoke('remove-book', id),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  getBookCover: (fileName) => ipcRenderer.invoke('get-book-cover', fileName),
});