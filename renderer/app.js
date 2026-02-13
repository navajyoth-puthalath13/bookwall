console.log('🔴 JAVASCRIPT STARTING...');

// Application state
let collectionData = { collection: [] };
let profileData = { username: 'Book Collector', theme: 'light', isFirstTime: true, customStickers: [] };
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// DOM references
const addBtn = document.getElementById('addBtn');
const popupOverlay = document.getElementById('popupOverlay');
const uploadBtn = document.getElementById('uploadBtn');
const welcomeOverlay = document.getElementById('welcomeOverlay');
const nameInput = document.getElementById('nameInput');
const nextBtn = document.getElementById('nextBtn');
const body = document.body;
const shelf1Books = document.getElementById('shelf1-books');
const shelf2Books = document.getElementById('shelf2-books');

// Initialize application
async function initializeApp() {
    console.log('Initializing...');
    try {
        profileData = await window.bookWallAPI.loadUserProfile();
        collectionData = await window.bookWallAPI.loadBookCollection();
        
        if (!profileData.customStickers) {
            profileData.customStickers = [];
        }
        
        if (profileData.isFirstTime !== false) {
            showWelcomeScreen();
        } else {
            updateHeaderName();
        }
        
        displayBooks();
        setupDefaultStickers();
        loadCustomStickers();
        console.log('App ready!');
    } catch (error) {
        console.error('Init error:', error);
    }
}

// Setup default stickers (s1, s2, etc.)
function setupDefaultStickers() {
    // Try multiple ways to find stickers
    let stickers = document.querySelectorAll('[data-default-sticker]');
    
    if (stickers.length === 0) {
        console.warn('No stickers found with data-default-sticker, trying .sticker class');
        stickers = document.querySelectorAll('.sticker:not(.custom-sticker)');
    }
    
    console.log('📌 Found', stickers.length, 'default stickers');
    
    stickers.forEach((sticker, index) => {
        console.log('Setting up sticker', index);
        
        // Make sure sticker is interactive
        sticker.style.pointerEvents = 'auto';
        sticker.style.cursor = 'pointer';
        sticker.draggable = false;
        
        // Remove any existing listeners
        const newSticker = sticker.cloneNode(true);
        sticker.parentNode.replaceChild(newSticker, sticker);
        
        // Add double-click listener
        newSticker.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 DOUBLE CLICK DETECTED on sticker!');
            addNewSticker();
        });
        
        // Visual feedback on hover
        newSticker.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        newSticker.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Load saved custom stickers
function loadCustomStickers() {
    profileData.customStickers.forEach(data => {
        createCustomSticker(data);
    });
}

// Add new sticker - open file picker directly
async function addNewSticker() {
    console.log('🎨 Opening file picker for new sticker...');
    
    try {
        const result = await window.bookWallAPI.openStickerDialog();
        console.log('File selection result:', result);
        
        if (result.success) {
            console.log('✅ File selected:', result.filePath);
            
            const position = getRandomPosition();
            console.log('📍 Random position:', position);
            
            const newSticker = {
                src: result.filePath,
                size: 60,
                left: position.left,
                top: position.top
            };
            
            profileData.customStickers.push(newSticker);
            await window.bookWallAPI.saveUserProfile(profileData);
            
            createCustomSticker(newSticker);
            console.log('✅ Sticker added successfully!');
        } else {
            console.log('❌ File selection cancelled');
        }
    } catch (error) {
        console.error('❌ Error adding sticker:', error);
        alert('Error adding sticker: ' + error.message);
    }
}

// Get random position avoiding center area
function getRandomPosition() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let x, y;
    let attempts = 0;
    
    do {
        x = Math.random() * (width - 100) + 10;
        y = Math.random() * (height - 100) + 10;
        attempts++;
        
        const inBookArea = (x > 20 && x < 320) && (y > 150 && y < 360);
        
        if (!inBookArea || attempts > 10) break;
    } while (attempts < 10);
    
    return {
        left: Math.round(x) + 'px',
        top: Math.round(y) + 'px'
    };
}

// Create custom sticker element
async function createCustomSticker(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-sticker';
    wrapper.style.left = data.left;
    wrapper.style.top = data.top;
    wrapper.style.width = (data.size || 60) + 'px';
    
    const img = document.createElement('img');
    img.draggable = false;
    
    // Load sticker from userData via IPC
    if (data.src) {
        try {
            const result = await window.bookWallAPI.getSticker(data.src);
            if (result.success) {
                img.src = result.data;
            } else {
                console.error('Failed to load sticker:', result.error);
            }
        } catch (error) {
            console.error('Error loading sticker:', error);
        }
    }
    
    wrapper.appendChild(img);
    wrapper._data = data;
    
    // Double-click to add another sticker
    wrapper.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            addNewSticker();
        }
    });
    
    // Right-click to delete
    wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm('Delete this sticker?')) {
            deleteSticker(wrapper);
        }
    });
    
    // Drag to move
    wrapper.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            startDrag(e, wrapper);
        }
    });
    
    document.body.appendChild(wrapper);
}

// Delete sticker
async function deleteSticker(wrapper) {
    const data = wrapper._data;
    wrapper.remove();
    
    const index = profileData.customStickers.indexOf(data);
    if (index > -1) {
        profileData.customStickers.splice(index, 1);
        await window.bookWallAPI.saveUserProfile(profileData);
    }
}

// Drag sticker
function startDrag(e, wrapper) {
    isDragging = false;
    e.preventDefault();
    
    const rect = wrapper.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    const onMove = (e) => {
        isDragging = true;
        wrapper.style.left = (e.clientX - dragOffset.x) + 'px';
        wrapper.style.top = (e.clientY - dragOffset.y) + 'px';
    };
    
    const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        if (isDragging) {
            wrapper._data.left = wrapper.style.left;
            wrapper._data.top = wrapper.style.top;
            await window.bookWallAPI.saveUserProfile(profileData);
        }
        
        setTimeout(() => { isDragging = false; }, 100);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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
            
            updateHeaderName();
            welcomeOverlay.classList.remove('active');
            body.classList.remove('popup-active');
        } else {
            nameInput.focus();
        }
    });
}

// Allow Enter key to submit name
if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            nextBtn.click();
        }
    });
}

// Display books on shelves
function displayBooks() {
  shelf1Books.innerHTML = '';
  shelf2Books.innerHTML = '';

  console.log(`Displaying ${collectionData.collection.length} books`);

  const booksPerShelf = 6;
  
  collectionData.collection.forEach((book, index) => {
    if (index < booksPerShelf) {
      shelf1Books.appendChild(createBookElement(book));
    } else if (index < booksPerShelf * 2) {
      shelf2Books.appendChild(createBookElement(book));
    }
  });
}

// Create book element
function createBookElement(book) {
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book';
    
    if (book.coverPath) {
        bookDiv.style.backgroundImage = `url('../assets/book-covers/${book.coverPath}')`;
        bookDiv.style.backgroundColor = '#1a1a1a';
    } else {
        bookDiv.style.backgroundColor = '#4a90e2';
        bookDiv.innerHTML = '📖';
    }
    
    return bookDiv;
}

// Show book upload popup
if (addBtn) {
    addBtn.addEventListener('click', () => {
        popupOverlay.classList.add('active');
        body.classList.add('popup-active');
    });
}

// Close book popup on outside click
if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.classList.remove('active');
            body.classList.remove('popup-active');
        }
    });
}

// Upload book cover
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        try {
            const result = await window.bookWallAPI.openFileDialog();
            
            if (result.success) {
                const newBook = {
                    coverPath: result.filePath,
                    title: 'Book ' + (collectionData.collection.length + 1),
                    addedAt: new Date().toISOString()
                };
                
                collectionData.collection.push(newBook);
                await window.bookWallAPI.saveBookCollection(collectionData);
                
                displayBooks();
                
                popupOverlay.classList.remove('active');
                body.classList.remove('popup-active');
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    });
}

// Test function - add at the end of the file

// Start
initializeApp();
console.log('✅ Ready!');