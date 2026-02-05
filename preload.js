/**
 * PRELOAD SCRIPT (preload.js)
 * 
 * This script runs in a privileged context and serves as a secure bridge between
 * the renderer process (UI) and the main process (Node.js/Electron).
 * 
 * Security Architecture:
 * - The renderer process has NO direct access to Node.js or Electron APIs
 * - This preload script uses contextBridge to safely expose specific functions
 * - Only the functions defined here can be called from the renderer
 * 
 * Why this matters:
 * - Prevents malicious code in the UI from accessing the file system
 * - Follows Electron security best practices
 * - Creates a controlled, auditable API surface
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose the bookWallAPI to the renderer process
 * 
 * This API is available in the renderer as: window.bookWallAPI
 * Each function here uses ipcRenderer.invoke() to communicate with the main process
 * via the IPC (Inter-Process Communication) handlers defined in main.js
 */
contextBridge.exposeInMainWorld('bookWallAPI', {
  // USER PROFILE OPERATIONS
  
  /**
   * Load user profile from storage
   * @returns {Promise<Object>} User profile data { username, theme }
   */
  loadUserProfile: () => ipcRenderer.invoke('load-user'),
  
  /**
   * Save user profile to storage
   * @param {Object} data - User profile data to save
   * @returns {Promise<Object>} Operation result { success: boolean }
   */
  saveUserProfile: (data) => ipcRenderer.invoke('save-user', data),
  
  // BOOK COLLECTION OPERATIONS
  
  /**
   * Load all books from storage
   * @returns {Promise<Object>} Books data { collection: Array }
   */
  loadBookCollection: () => ipcRenderer.invoke('load-books'),
  
  /**
   * Save all books to storage
   * @param {Object} data - Complete books collection data
   * @returns {Promise<Object>} Operation result { success: boolean }
   */
  saveBookCollection: (data) => ipcRenderer.invoke('save-books', data),
  
  /**
   * Create and add a new book to the collection
   * @param {Object} book - Book data (coverPath, title, etc.)
   * @returns {Promise<Object>} Result { success: boolean, book?: Object }
   */
  createNewBook: (book) => ipcRenderer.invoke('create-book', book),
  
  /**
   * Remove a book from the collection by ID
   * @param {string} id - Unique book ID
   * @returns {Promise<Object>} Operation result { success: boolean }
   */
  removeBookById: (id) => ipcRenderer.invoke('remove-book', id),
  
  // FILE OPERATIONS
  
  /**
   * Open native file picker dialog to select an image
   * @returns {Promise<Object>} Result { success: boolean, filePath?: string }
   */
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});