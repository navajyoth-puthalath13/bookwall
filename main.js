const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;

app.setName('Book Wall');

// Register custom protocol as privileged before app is ready
if (!app.isReady()) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'bookwall', privileges: { secure: true, supportFetchAPI: true, corsEnabled: true } }
  ]);
}

let windowInstance;

// Get user data directory for writable storage
const getCoversDir = () => path.join(app.getPath('userData'), 'book-covers');
const getDataDir = () => path.join(app.getPath('userData'), 'data');

const setupWindow = () => {
  windowInstance = new BrowserWindow({
    width: 360,
    height: 438,
    minWidth: 360,
    minHeight: 438,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Book Wall',
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  windowInstance.loadFile(path.join(__dirname, 'renderer', 'index.html'));
};

app.whenReady().then(() => {
  // Register custom protocol to serve book covers from userData
  protocol.registerFileProtocol('bookwall', (request, callback) => {
    const url = request.url.replace('bookwall://', '');
    const filePath = path.join(getCoversDir(), url);
    callback({ path: filePath });
  });
  
  setupWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) setupWindow();
});

// File dialog handler with copy functionality
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(windowInstance, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath);
    const fileName = `book_${Date.now()}${ext}`;
    const destPath = path.join(getCoversDir(), fileName);
    
    try {
      // Ensure destination directory exists before copying
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      // Copy file to userData/book-covers
      await fs.copyFile(sourcePath, destPath);
      return { success: true, filePath: fileName }; // Return only filename, not full path
    } catch (error) {
      console.error('Failed to copy file:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

// Data file helpers
const getUserFilePath = () => path.join(getDataDir(), 'user.json');
const getBooksFilePath = () => path.join(getDataDir(), 'books.json');

const readJsonFile = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return fallback;
  }
};

const writeJsonFile = async (filePath, data) => {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// IPC Handlers
ipcMain.handle('load-user', async () => {
  return await readJsonFile(getUserFilePath(), { username: 'Reader', theme: 'light', isFirstTime: true });
});

ipcMain.handle('save-user', async (event, userData) => {
  return await writeJsonFile(getUserFilePath(), userData);
});

ipcMain.handle('load-books', async () => {
  return await readJsonFile(getBooksFilePath(), { collection: [] });
});

ipcMain.handle('save-books', async (event, booksData) => {
  return await writeJsonFile(getBooksFilePath(), booksData);
});

ipcMain.handle('create-book', async (event, bookData) => {
  const data = await readJsonFile(getBooksFilePath(), { collection: [] });
  const newEntry = {
    id: `book_${Date.now()}`,
    ...bookData,
    createdAt: new Date().toISOString()
  };
  data.collection.push(newEntry);
  const result = await writeJsonFile(getBooksFilePath(), data);
  return result.success ? { success: true, book: newEntry } : result;
});

ipcMain.handle('remove-book', async (event, bookId) => {
  const data = await readJsonFile(getBooksFilePath(), { collection: [] });
  data.collection = data.collection.filter(b => b.id !== bookId);
  return await writeJsonFile(getBooksFilePath(), data);
});