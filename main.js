const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

app.setName('Book Wall');

let windowInstance;

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

app.whenReady().then(setupWindow);

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
    const destPath = path.join(__dirname, 'assets', 'book-covers', fileName);
    
    try {
      // Copy file to assets/covers
      await fs.copyFile(sourcePath, destPath);
      return { success: true, filePath: fileName }; // Return only filename, not full path
    } catch (error) {
      console.error('Failed to copy file:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

// Sticker dialog handler
ipcMain.handle('open-sticker-dialog', async () => {
  const result = await dialog.showOpenDialog(windowInstance, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath);
    
    // Disallow SVG files for security reasons (SVG can contain active content)
    if (ext && ext.toLowerCase() === '.svg') {
      return { success: false, error: 'SVG stickers are not allowed.' };
    }
    
    const fileName = `sticker_${Date.now()}${ext}`;
    const stickersDir = path.join(app.getPath('userData'), 'stickers');
    const destPath = path.join(stickersDir, fileName);
    
    try {
      // Ensure stickers directory exists
      await fs.mkdir(stickersDir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      return { success: true, filePath: fileName };
    } catch (error) {
      console.error('Failed to copy sticker:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false };
});

// Handler to serve sticker files from userData
ipcMain.handle('get-sticker', async (event, fileName) => {
  try {
    const stickersDir = path.join(app.getPath('userData'), 'stickers');
    const stickerPath = path.join(stickersDir, fileName);
    const data = await fs.readFile(stickerPath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    return { success: true, data: `data:${mimeType};base64,${data.toString('base64')}` };
  } catch (error) {
    console.error('Failed to load sticker:', error);
    return { success: false, error: error.message };
  }
});

// Data file helpers
const getUserFilePath = () => path.join(__dirname, 'data', 'user.json');
const getBooksFilePath = () => path.join(__dirname, 'data', 'books.json');

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