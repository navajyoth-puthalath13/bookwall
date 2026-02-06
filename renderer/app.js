console.log('🔴 JAVASCRIPT STARTING...');

// Application state
let collectionData = { collection: [] };
let profileData = { username: 'Book Collector', theme: 'light', isFirstTime: true };

// DOM references
const addBtn = document.getElementById('addBtn');
const popupOverlay = document.getElementById('popupOverlay');
const uploadBtn = document.getElementById('uploadBtn');
const welcomeOverlay = document.getElementById('welcomeOverlay');
const nameInput = document.getElementById('nameInput');
const nextBtn = document.getElementById('nextBtn');
const subtitleText = document.querySelector('.subtitle');
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
        
        // Show welcome screen on first launch
        if (profileData.isFirstTime !== false) {
            showWelcomeScreen();
        } else {
            updateHeaderName();
        }
        
        displayBooks();
        console.log('App ready!');
    } catch (error) {
        console.error('Init error:', error);
    }
}

// Show welcome screen
function showWelcomeScreen() {
    welcomeOverlay.classList.add('active');
    body.classList.add('popup-active');
    nameInput.focus();
}

// Update header with user's name
function updateHeaderName() {
    const titleText = document.querySelector('.title');
    if (titleText && profileData.username) {
        titleText.textContent = `${profileData.username}'s Books Bar`;
    }
}

// Handle welcome next button
if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
        const userName = nameInput.value.trim();
        if (userName) {
            profileData.username = userName;
            profileData.isFirstTime = false;
            await window.bookWallAPI.saveUserProfile(profileData);
            
            // Update header
            updateHeaderName();
            
            // Close welcome screen
            welcomeOverlay.classList.remove('active');
            body.classList.remove('popup-active');
        } else {
            nameInput.focus();
        }
    });
}

// Allow Enter key to submit name
if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            nextBtn.click();
        }
    });
}

// Display books on shelves
function displayBooks() {
  // Clear existing books
  shelf1Books.innerHTML = '';
  shelf2Books.innerHTML = '';

  console.log(`Displaying ${collectionData.collection.length} books`);

  // Distribute books across shelves (6 per shelf, max 12 books total)
  const booksPerShelf = 6;
  
  collectionData.collection.forEach((book, index) => {
    if (index < booksPerShelf) {
      // First shelf
      shelf1Books.appendChild(createBookElement(book));
    } else if (index < booksPerShelf * 2) {
      // Second shelf
      shelf2Books.appendChild(createBookElement(book));
    }
  });
}

// Create book element with exact size and shadow
function createBookElement(book) {
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book';
    
    if (book.coverPath) {
        // Use uploaded image
        const imagePath = book.coverPath.replace(/\\/g, '/');
        bookDiv.style.backgroundImage = `url('file://${imagePath}')`;
        bookDiv.style.backgroundColor = '#1a1a1a';
        console.log('Book with image:', imagePath);
    } else {
        // Default placeholder
        bookDiv.style.backgroundColor = '#4a90e2';
        bookDiv.innerHTML = '📖';
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