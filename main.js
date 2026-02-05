/**
 * MAIN PROCESS (main.js)
 * 
 * This is the main process of the Electron application. It manages the application lifecycle,
 * creates the browser window, and handles communication between the UI (renderer process) 
 * and the file system.
 * 
 * Key responsibilities:
 * - Creating and managing the application window
 * - Handling IPC (Inter-Process Communication) for data operations
 * - Managing file operations (reading/writing JSON files)
 * - Opening native file dialogs for image selection
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Set the application name that appears in the system
app.setName('Book Wall');

let mainWindow;

/**
 * Creates and configures the main application window
 * 
 * Window configuration:
 * - Fixed size: 360x438 pixels (compact desktop app)
 * - Security: nodeIntegration disabled, contextIsolation enabled
 * - Preload script: bridges renderer and main process securely
 */
const setupWindow = () => {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 438,
    minWidth: 360,
    minHeight: 438,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security: prevent direct Node.js access from renderer
      contextIsolation: true, // Security: isolate preload script context
    },
    title: 'Book Wall',
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the HTML file that contains the UI
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
};

/**
 * APPLICATION LIFECYCLE EVENTS
 */

// Initialize the app when Electron is ready
// In development mode, also opens DevTools for debugging
if (process.env.NODE_ENV !== 'production') {
  app.whenReady().then(() => {
    setupWindow();
    mainWindow.webContents.openDevTools(); // Development only: for debugging
  });
} else {
  app.whenReady().then(setupWindow);
}

// Quit when all windows are closed (except on macOS)
// On macOS, apps typically stay active until explicitly quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// On macOS, re-create window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) setupWindow();
});

/**
 * FILE DIALOG HANDLER
 * 
 * Opens the native OS file picker dialog allowing users to select an image file
 * for their book cover. Only allows image files (jpg, jpeg, png, gif, webp).
 * 
 * @returns {Object} - { success: boolean, filePath: string }
 */
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, filePath: result.filePaths[0] };
  }
  return { success: false };
});

/**
 * DATA FILE HELPERS
 * 
 * These functions manage the persistent storage of user data and book collection.
 * Data is stored in JSON files in the 'data' directory:
 * - user.json: stores user profile (username, theme preferences)
 * - books.json: stores the book collection with cover paths and metadata
 */

// Get the full path to the user profile JSON file
const getUserFilePath = () => path.join(__dirname, 'data', 'user.json');

// Get the full path to the books collection JSON file
const getBooksFilePath = () => path.join(__dirname, 'data', 'books.json');

/**
 * Reads and parses a JSON file from the file system
 * 
 * @param {string} filePath - Full path to the JSON file
 * @param {*} fallback - Default value to return if file doesn't exist or is invalid
 * @returns {Promise<*>} - Parsed JSON data or fallback value
 */
const readJsonFile = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // File doesn't exist or is corrupted, return fallback
    return fallback;
  }
};

/**
 * Writes data to a JSON file with pretty formatting
 * 
 * @param {string} filePath - Full path to the JSON file
 * @param {*} data - Data to write (will be JSON stringified)
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
const writeJsonFile = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * IPC (INTER-PROCESS COMMUNICATION) HANDLERS
 * 
 * These handlers respond to requests from the renderer process (UI).
 * They provide secure access to file system operations that the renderer
 * cannot perform directly due to Electron security restrictions.
 */

/**
 * Loads user profile data from user.json
 * Falls back to default values if file doesn't exist
 */
ipcMain.handle('load-user', async () => {
  return await readJsonFile(getUserFilePath(), { username: 'Reader', theme: 'light' });
});

/**
 * Saves user profile data to user.json
 * 
 * @param {Object} userData - User profile data to save
 */
ipcMain.handle('save-user', async (event, userData) => {
  return await writeJsonFile(getUserFilePath(), userData);
});

/**
 * Loads the entire book collection from books.json
 * Returns empty collection if file doesn't exist
 */
ipcMain.handle('load-books', async () => {
  return await readJsonFile(getBooksFilePath(), { collection: [] });
});

/**
 * Saves the entire book collection to books.json
 * 
 * @param {Object} booksData - Complete books collection data
 */
ipcMain.handle('save-books', async (event, booksData) => {
  return await writeJsonFile(getBooksFilePath(), booksData);
});

/**
 * Creates a new book entry and adds it to the collection
 * Generates a unique ID and timestamp for the new book
 * 
 * @param {Object} bookData - Book data (coverPath, title, etc.)
 * @returns {Object} - { success: boolean, book?: Object }
 */
ipcMain.handle('create-book', async (event, bookData) => {
  const data = await readJsonFile(getBooksFilePath(), { collection: [] });
  const newEntry = {
    id: `book_${Date.now()}`, // Unique ID based on timestamp
    ...bookData,
    createdAt: new Date().toISOString()
  };
  data.collection.push(newEntry);
  const result = await writeJsonFile(getBooksFilePath(), data);
  return result.success ? { success: true, book: newEntry } : result;
});

/**
 * Removes a book from the collection by its ID
 * 
 * @param {string} bookId - The unique ID of the book to remove
 */
ipcMain.handle('remove-book', async (event, bookId) => {
  const data = await readJsonFile(getBooksFilePath(), { collection: [] });
  data.collection = data.collection.filter(b => b.id !== bookId);
  return await writeJsonFile(getBooksFilePath(), data);
});