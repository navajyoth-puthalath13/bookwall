console.log('🔴 JAVASCRIPT STARTING...');

// Application state
let collectionData = { collection: [] };
let profileData = { username: 'Book Collector', theme: 'light', isFirstTime: true };
let currentSticker = null;
let newStickerData = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// DOM references
const addBtn = document.getElementById('addBtn');
const popupOverlay = document.getElementById('popupOverlay');
const uploadBtn = document.getElementById('uploadBtn');
const stickerOverlay = document.getElementById('stickerOverlay');
const changeStickerBtn = document.getElementById('changeStickerBtn');
const saveStickerBtn = document.getElementById('saveStickerBtn');
const previewImage = document.getElementById('previewImage');
const sizeSlider = document.getElementById('sizeSlider');
const rotationSlider = document.getElementById('rotationSlider');
const sizeValue = document.getElementById('sizeValue');
const rotationValue = document.getElementById('rotationValue');
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
        
        if (profileData.isFirstTime !== false) {
            showWelcomeScreen();
        } else {
            updateHeaderName();
        }
        
        displayBooks();
        initializeStickers();
        loadCustomStickers();
        console.log('App ready!');
    } catch (error) {
        console.error('Init error:', error);
    }
}

// Initialize default stickers
function initializeStickers() {
    const stickers = document.querySelectorAll('.sticker');
    
    stickers.forEach(sticker => {
        const stickerId = sticker.dataset.stickerId;
        
        // Load saved customization
        if (profileData.stickerCustomizations && profileData.stickerCustomizations[stickerId]) {
            const custom = profileData.stickerCustomizations[stickerId];
            if (custom.src) sticker.src = `../assets/stickers/${custom.src}`;
            if (custom.size) sticker.style.width = custom.size + 'px';
            if (custom.rotation) sticker.style.transform = `rotate(${custom.rotation}deg)`;
            if (custom.left) sticker.style.left = custom.left;
            if (custom.top) sticker.style.top = custom.top;
            if (custom.bottom) sticker.style.bottom = custom.bottom;
            if (custom.right) sticker.style.right = custom.right;
        }
        
        let clickTimer = null;
        
        // Handle clicks with delay to detect double-click
        sticker.addEventListener('click', (e) => {
            if (!isDragging) {
                if (clickTimer === null) {
                    clickTimer = setTimeout(() => {
                        // Single click
                        openStickerCustomization(sticker);
                        clickTimer = null;
                    }, 250);
                }
            }
        });
        
        // Double click to ADD NEW sticker
        sticker.addEventListener('dblclick', (e) => {
            e.preventDefault();
            clearTimeout(clickTimer);
            clickTimer = null;
            openAddNewSticker();
        });
        
        // Drag to move
        sticker.addEventListener('mousedown', (e) => startDrag(e, sticker));
    });
}

// Load custom added stickers
function loadCustomStickers() {
    if (!profileData.customStickers) profileData.customStickers = [];
    
    profileData.customStickers.forEach(stickerData => {
        createCustomStickerElement(stickerData);
    });
}

// Create custom sticker element
function createCustomStickerElement(data) {
    const stickerImg = document.createElement('img');
    stickerImg.className = 'sticker custom-added-sticker';
    stickerImg.src = `../assets/stickers/${data.src}`;
    stickerImg.style.position = 'absolute';
    stickerImg.style.left = data.left || '100px';
    stickerImg.style.top = data.top || '100px';
    stickerImg.style.width = data.size + 'px';
    stickerImg.style.height = 'auto';
    stickerImg.style.transform = `rotate(${data.rotation || 0}deg)`;
    stickerImg.dataset.customSticker = 'true';
    stickerImg.dataset.stickerData = JSON.stringify(data);
    
    // Double click to add another
    stickerImg.addEventListener('dblclick', (e) => {
        e.preventDefault();
        openAddNewSticker();
    });
    
    // Click to customize
    stickerImg.addEventListener('click', (e) => {
        if (!isDragging) {
            openCustomStickerEdit(stickerImg, data);
        }
    });
    
    // Drag to move
    stickerImg.addEventListener('mousedown', (e) => startDragCustom(e, stickerImg, data));
    
    document.body.appendChild(stickerImg);
}

// Open popup to add NEW sticker
function openAddNewSticker() {
    currentSticker = null;
    newStickerData = { size: 60, rotation: 0 };
    
    previewImage.src = '';
    previewImage.style.display = 'none';
    sizeSlider.value = 60;
    rotationSlider.value = 0;
    sizeValue.textContent = '60';
    rotationValue.textContent = '0';
    
    changeStickerBtn.textContent = 'UPLOAD IMAGE';
    saveStickerBtn.textContent = 'ADD STICKER';
    
    stickerOverlay.classList.add('active');
    body.classList.add('popup-active');
}

// Open customization popup for existing sticker
function openStickerCustomization(sticker) {
    currentSticker = sticker;
    newStickerData = null;
    const stickerId = sticker.dataset.stickerId;
    
    // Load current settings
    const custom = profileData.stickerCustomizations?.[stickerId] || {};
    const currentSize = parseInt(sticker.style.width) || 60;
    const currentRotation = custom.rotation || 0;
    
    previewImage.src = sticker.src;
    previewImage.style.display = 'block';
    sizeSlider.value = currentSize;
    rotationSlider.value = currentRotation;
    sizeValue.textContent = currentSize;
    rotationValue.textContent = currentRotation;
    
    changeStickerBtn.textContent = 'CHANGE IMAGE';
    saveStickerBtn.textContent = 'SAVE';
    
    stickerOverlay.classList.add('active');
    body.classList.add('popup-active');
}

// Open edit for custom added sticker
function openCustomStickerEdit(stickerImg, data) {
    currentSticker = stickerImg;
    newStickerData = null;
    
    previewImage.src = stickerImg.src;
    previewImage.style.display = 'block';
    sizeSlider.value = data.size;
    rotationSlider.value = data.rotation || 0;
    sizeValue.textContent = data.size;
    rotationValue.textContent = data.rotation || 0;
    
    changeStickerBtn.textContent = 'CHANGE IMAGE';
    saveStickerBtn.textContent = 'SAVE';
    
    stickerOverlay.classList.add('active');
    body.classList.add('popup-active');
}

// Change sticker image
if (changeStickerBtn) {
    changeStickerBtn.addEventListener('click', async () => {
        try {
            const result = await window.bookWallAPI.openStickerDialog();
            
            if (result.success) {
                previewImage.src = `../assets/stickers/${result.filePath}`;
                previewImage.style.display = 'block';
                
                if (newStickerData) {
                    newStickerData.src = result.filePath;
                } else if (currentSticker) {
                    currentSticker.dataset.newSrc = result.filePath;
                }
            }
        } catch (error) {
            console.error('Sticker upload error:', error);
        }
    });
}

// Size slider
if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
        sizeValue.textContent = e.target.value;
        previewImage.style.width = e.target.value + 'px';
    });
}

// Rotation slider
if (rotationSlider) {
    rotationSlider.addEventListener('input', (e) => {
        rotationValue.textContent = e.target.value;
        previewImage.style.transform = `rotate(${e.target.value}deg)`;
    });
}

// Save sticker
if (saveStickerBtn) {
    saveStickerBtn.addEventListener('click', async () => {
        // Adding NEW sticker
        if (newStickerData) {
            if (!newStickerData.src) {
                alert('Please upload an image first');
                return;
            }
            
            const newSticker = {
                src: newStickerData.src,
                size: parseInt(sizeSlider.value),
                rotation: parseInt(rotationSlider.value),
                left: '150px',
                top: '150px'
            };
            
            if (!profileData.customStickers) profileData.customStickers = [];
            profileData.customStickers.push(newSticker);
            await window.bookWallAPI.saveUserProfile(profileData);
            
            createCustomStickerElement(newSticker);
        }
        // Editing EXISTING sticker
        else if (currentSticker) {
            const newSize = parseInt(sizeSlider.value);
            const newRotation = parseInt(rotationSlider.value);
            const newSrc = currentSticker.dataset.newSrc;
            
            // Update display
            if (newSrc) {
                currentSticker.src = `../assets/stickers/${newSrc}`;
            }
            currentSticker.style.width = newSize + 'px';
            currentSticker.style.transform = `rotate(${newRotation}deg)`;
            
            // Save to profile
            if (currentSticker.dataset.customSticker) {
                // Custom added sticker
                const data = JSON.parse(currentSticker.dataset.stickerData);
                if (newSrc) data.src = newSrc;
                data.size = newSize;
                data.rotation = newRotation;
                currentSticker.dataset.stickerData = JSON.stringify(data);
                
                // Update in profile
                const index = profileData.customStickers.findIndex(s => 
                    s.src === data.src && s.left === data.left && s.top === data.top
                );
                if (index !== -1) {
                    profileData.customStickers[index] = data;
                }
            } else {
                // Default sticker
                const stickerId = currentSticker.dataset.stickerId;
                if (!profileData.stickerCustomizations) {
                    profileData.stickerCustomizations = {};
                }
                
                profileData.stickerCustomizations[stickerId] = {
                    src: newSrc || profileData.stickerCustomizations[stickerId]?.src,
                    size: newSize,
                    rotation: newRotation,
                    left: currentSticker.style.left,
                    top: currentSticker.style.top,
                    bottom: currentSticker.style.bottom,
                    right: currentSticker.style.right
                };
            }
            
            await window.bookWallAPI.saveUserProfile(profileData);
            currentSticker.dataset.newSrc = '';
        }
        
        // Close popup
        stickerOverlay.classList.remove('active');
        body.classList.remove('popup-active');
        currentSticker = null;
        newStickerData = null;
    });
}

// Close sticker popup
if (stickerOverlay) {
    stickerOverlay.addEventListener('click', (e) => {
        if (e.target === stickerOverlay) {
            stickerOverlay.classList.remove('active');
            body.classList.remove('popup-active');
            if (currentSticker) currentSticker.dataset.newSrc = '';
            currentSticker = null;
            newStickerData = null;
        }
    });
}

// Drag default sticker
function startDrag(e, sticker) {
    isDragging = false;
    const rect = sticker.getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    const onMove = (e) => {
        isDragging = true;
        sticker.style.left = (e.clientX - dragOffset.x) + 'px';
        sticker.style.top = (e.clientY - dragOffset.y) + 'px';
        sticker.style.bottom = 'auto';
        sticker.style.right = 'auto';
    };
    
    const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        if (isDragging) {
            await saveStickerPosition(sticker);
            setTimeout(() => { isDragging = false; }, 100);
        }
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

// Drag custom sticker
function startDragCustom(e, stickerImg, data) {
    isDragging = false;
    const rect = stickerImg.getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    const onMove = (e) => {
        isDragging = true;
        stickerImg.style.left = (e.clientX - dragOffset.x) + 'px';
        stickerImg.style.top = (e.clientY - dragOffset.y) + 'px';
    };
    
    const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        if (isDragging) {
            data.left = stickerImg.style.left;
            data.top = stickerImg.style.top;
            await window.bookWallAPI.saveUserProfile(profileData);
            setTimeout(() => { isDragging = false; }, 100);
        }
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

// Save sticker position
async function saveStickerPosition(sticker) {
    const stickerId = sticker.dataset.stickerId;
    if (!profileData.stickerCustomizations) {
        profileData.stickerCustomizations = {};
    }
    if (!profileData.stickerCustomizations[stickerId]) {
        profileData.stickerCustomizations[stickerId] = {};
    }
    
    profileData.stickerCustomizations[stickerId].left = sticker.style.left;
    profileData.stickerCustomizations[stickerId].top = sticker.style.top;
    
    await window.bookWallAPI.saveUserProfile(profileData);
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
    nameInput.addEventListener('keypress', (e) => {
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

// Show popup
if (addBtn) {
    addBtn.addEventListener('click', () => {
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

// Start
initializeApp();
console.log('✅ Ready!');