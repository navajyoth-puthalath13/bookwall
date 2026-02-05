/**
 * RENDERER PROCESS - UI LOGIC (app.js)
 * 
 * This script runs in the browser context and handles all UI interactions.
 * It manages the visual book shelf, user interactions, and communicates with
 * the main process via the bookWallAPI (defined in preload.js).
 * 
 * Key Features:
 * - Displays books on two shelves (max 6 books per shelf, 12 total)
 * - Allows users to add book covers by uploading images
 * - Stores book collection persistently using Electron IPC
 * - Visual design mimics a physical bookshelf with wood shelves and stickers
 */

console.log('🔴 JAVASCRIPT STARTING...');

/**
 * APPLICATION STATE
 * 
 * These objects hold the current state of the application in memory.
 * They are loaded from storage on startup and saved when modified.
 */
let collectionData = { collection: [] }; // All books in the collection
let profileData = { username: 'Book Collector', theme: 'light' }; // User settings

/**
 * DOM REFERENCES
 * 
 * Cache references to frequently accessed DOM elements for better performance
 */
const addBtn = document.getElementById('addBtn'); // "Add" button in header
const popupOverlay = document.getElementById('popupOverlay'); // Upload popup overlay
const uploadBtn = document.getElementById('uploadBtn'); // "UPLOAD" button in popup
const body = document.body;
const shelf1Books = document.getElementById('shelf1-books'); // First shelf container
const shelf2Books = document.getElementById('shelf2-books'); // Second shelf container

console.log('Elements:', { addBtn, popupOverlay, uploadBtn, shelf1Books, shelf2Books });

/**
 * INITIALIZE APPLICATION
 * 
 * Called when the page loads. Performs the following steps:
 * 1. Loads user profile from storage (username, theme preferences)
 * 2. Loads book collection from storage (all saved books)
 * 3. Renders the books on the shelves
 * 
 * This function is async because it needs to wait for data from the main process
 */
async function initializeApp() {
    console.log('Initializing...');
    try {
        // Load data from storage via IPC
        profileData = await window.bookWallAPI.loadUserProfile();
        collectionData = await window.bookWallAPI.loadBookCollection();
        
        // Render books on the shelves
        displayBooks();
        
        console.log('App ready!');
    } catch (error) {
        console.error('Init error:', error);
    }
}

/**
 * DISPLAY BOOKS ON SHELVES
 * 
 * Renders all books from the collection onto the two shelves.
 * 
 * Layout rules:
 * - Books 1-6 go on the first shelf (top)
 * - Books 7-12 go on the second shelf (bottom)
 * - Maximum 12 books total can be displayed
 * - Books are rendered with overlapping effect (margin-left: -15px)
 * 
 * Each book shows either:
 * - The uploaded cover image (if provided)
 * - A default blue placeholder with book emoji (if no cover)
 */
function displayBooks() {
  // Clear existing books from both shelves
  shelf1Books.innerHTML = '';
  shelf2Books.innerHTML = '';

  console.log(`Displaying ${collectionData.collection.length} books`);

  // Distribute books across the two shelves
  const booksPerShelf = 6; // Maximum 6 books per shelf
  
  collectionData.collection.forEach((book, index) => {
    if (index < booksPerShelf) {
      // Books 0-5: First shelf (top)
      shelf1Books.appendChild(createBookElement(book));
    } else if (index < booksPerShelf * 2) {
      // Books 6-11: Second shelf (bottom)
      shelf2Books.appendChild(createBookElement(book));
    }
    // Books beyond index 11 are not displayed (12 book limit)
  });
}

/**
 * CREATE BOOK ELEMENT
 * 
 * Creates a DOM element representing a single book on the shelf.
 * 
 * @param {Object} book - Book data object
 * @param {string} book.coverPath - File path to the book cover image (optional)
 * @returns {HTMLElement} - A div element styled as a book
 * 
 * Book appearance:
 * - Size: 60px wide × 90px tall (2:3 aspect ratio, like a real book)
 * - If cover image exists: displays the image as background
 * - If no cover: shows blue placeholder with book emoji 📖
 * - Shadow effect for 3D appearance
 * - Hover effect: lifts the book slightly
 */
function createBookElement(book) {
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book';
    
    if (book.coverPath) {
        // Use uploaded image as book cover
        // Replace backslashes with forward slashes for file:// URLs
        const imagePath = book.coverPath.replace(/\\/g, '/');
        bookDiv.style.backgroundImage = `url('file://${imagePath}')`;
        bookDiv.style.backgroundColor = '#1a1a1a'; // Dark fallback if image fails
        console.log('Book with image:', imagePath);
    } else {
        // Default placeholder: blue background with book emoji
        bookDiv.style.backgroundColor = '#4a90e2';
        bookDiv.innerHTML = '📖';
    }
    
    return bookDiv;
}

/**
 * EVENT LISTENERS
 */

/**
 * SHOW POPUP - "Add" Button Click
 * 
 * When the user clicks the "Add" button in the header:
 * 1. Shows the upload popup overlay
 * 2. Changes background to gray (via 'popup-active' class)
 */
if (addBtn) {
    addBtn.addEventListener('click', () => {
        console.log('Opening popup');
        popupOverlay.classList.add('active');
        body.classList.add('popup-active');
    });
}

/**
 * CLOSE POPUP - Click Outside
 * 
 * Allows users to close the popup by clicking on the overlay background
 * (but not when clicking on the popup content itself)
 */
if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.classList.remove('active');
            body.classList.remove('popup-active');
        }
    });
}

/**
 * UPLOAD BUTTON - Add Book with Cover Image
 * 
 * Complete workflow when user clicks "UPLOAD":
 * 
 * 1. Opens native OS file picker (via main process)
 * 2. User selects an image file (jpg, png, gif, webp)
 * 3. Creates a new book object with the selected image path
 * 4. Adds the book to the collection in memory
 * 5. Saves the updated collection to storage (books.json)
 * 6. Re-renders the shelves to show the new book
 * 7. Closes the popup
 * 
 * Error handling: Shows alert if file selection fails
 */
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        console.log('Upload clicked');
        try {
            // Request file selection from main process
            const result = await window.bookWallAPI.openFileDialog();
            console.log('File result:', result);
            
            if (result.success) {
                console.log('Selected:', result.filePath);
                
                // Create new book object
                const newBook = {
                    coverPath: result.filePath, // Path to selected image
                    title: 'Book ' + (collectionData.collection.length + 1), // Auto-generated title
                    addedAt: new Date().toISOString() // When user added this book (UI-side timestamp)
                };
                
                // Add to collection and save
                collectionData.collection.push(newBook);
                await window.bookWallAPI.saveBookCollection(collectionData);
                
                // Update UI
                displayBooks();
                
                // Close popup
                popupOverlay.classList.remove('active');
                body.classList.remove('popup-active');
                
                console.log('Book added successfully!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error: ' + error.message);
        }
    });
}

/**
 * APPLICATION STARTUP
 * 
 * Initialize the application when the page loads.
 * This loads saved data and renders the initial UI state.
 */
initializeApp();
console.log('✅ Ready!');