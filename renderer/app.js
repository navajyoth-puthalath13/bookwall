console.log('🔴 JAVASCRIPT STARTING...');

// Application state
let collectionData = { collection: [] };
let profileData = { username: 'Book Collector', theme: 'light' };

// DOM references
const addBtn = document.getElementById('addBtn');
const popupOverlay = document.getElementById('popupOverlay');
const uploadBtn = document.getElementById('uploadBtn');
const body = document.body;
const shelf1Books = document.getElementById('shelf1-books');
const shelf2Books = document.getElementById('shelf2-books');

console.log('Elements:', { addBtn, popupOverlay, uploadBtn, shelf1Books, shelf2Books });

// Initialize application
async function initializeApp() {
    console.log('Initializing...');
    try {
        profileData = await window.bookWallAPI.loadUserProfile();
        collectionData = await window.bookWallAPI.loadBookCollection();
        displayBooks();
        console.log('App ready!');
    } catch (error) {
        console.error('Init error:', error);
    }
}

// Display books on shelves
async function displayBooks() {
  // Clear existing books
  shelf1Books.innerHTML = '';
  shelf2Books.innerHTML = '';

  console.log(`Displaying ${collectionData.collection.length} books`);

  // Distribute books across shelves (6 per shelf, max 12 books total)
  const booksPerShelf = 6;
  
  for (let index = 0; index < collectionData.collection.length; index++) {
    const book = collectionData.collection[index];
    const bookElement = await createBookElement(book);
    
    if (index < booksPerShelf) {
      // First shelf
      shelf1Books.appendChild(bookElement);
    } else if (index < booksPerShelf * 2) {
      // Second shelf
      shelf2Books.appendChild(bookElement);
    }
  }
}

// Create book element with exact size and shadow
async function createBookElement(book) {
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book';
    
    // Helper to set default/fallback styling
    const setDefaultStyling = () => {
        bookDiv.style.backgroundColor = '#4a90e2';
        bookDiv.innerHTML = '📖';
    };
    
    if (book.coverPath) {
        // Load image via IPC from userData directory
        const dataUrl = await window.bookWallAPI.getBookCover(book.coverPath);
        if (dataUrl) {
            bookDiv.style.backgroundImage = `url('${dataUrl}')`;
            bookDiv.style.backgroundColor = '#1a1a1a';
            console.log('Book with image:', book.coverPath);
        } else {
            // Fallback if image can't be loaded
            setDefaultStyling();
        }
    } else {
        // Default placeholder
        setDefaultStyling();
    }
    
    return bookDiv;
}

// Show popup
if (addBtn) {
    addBtn.addEventListener('click', () => {
        console.log('Opening popup');
        popupOverlay.classList.add('active');
        body.classList.add('popup-active');
    });
}

// Close popup on outside click
if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.classList.remove('active');
            body.classList.remove('popup-active');
        }
    });
}

// Upload button - select file from computer
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        console.log('Upload clicked');
        try {
            const result = await window.bookWallAPI.openFileDialog();
            console.log('File result:', result);
            
            if (result.success) {
                console.log('Selected:', result.filePath);
                
                // Create new book
                const newBook = {
                    coverPath: result.filePath,
                    title: 'Book ' + (collectionData.collection.length + 1),
                    addedAt: new Date().toISOString()
                };
                
                collectionData.collection.push(newBook);
                await window.bookWallAPI.saveBookCollection(collectionData);
                
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



// Start
initializeApp();
console.log('✅ Ready!');