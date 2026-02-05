# Book Wall

A simple desktop app to display your book collection.

## Download

[⬇️ Download for Mac (.dmg)](https://github.com/navajyoth-puthalath13/bookwall/releases/latest/download/Book.Wall-1.0.0-arm64.dmg)

[⬇️ Download for Windows (.exe)](https://github.com/navajyoth-puthalath13/bookwall/releases/latest/download/Book.Wall.Setup.1.0.0.exe)

Or visit the [Releases page](https://github.com/navajyoth-puthalath13/bookwall/releases)

## How It Works

Book Wall is an Electron-based desktop application that creates a beautiful visual display of your book collection on virtual wooden shelves.

### Architecture

The application follows Electron's multi-process architecture with three main components:

#### 1. **Main Process** (`main.js`)
The main process is the heart of the application that runs in Node.js. It handles:
- **Window Management**: Creates and manages the application window (360x438px)
- **File System Operations**: Reads and writes JSON files to store book data
- **IPC Handlers**: Processes requests from the UI for data operations
- **Native Dialogs**: Opens system file pickers for image selection
- **Data Storage**: Manages two JSON files:
  - `data/user.json` - User profile (username, theme preferences)
  - `data/books.json` - Book collection with cover images and metadata

#### 2. **Preload Script** (`preload.js`)
A security bridge that connects the UI to the main process:
- **Context Isolation**: Runs in a privileged context with access to Node.js APIs
- **Secure Bridge**: Uses `contextBridge` to expose only specific safe functions to the UI
- **API Surface**: Provides the `bookWallAPI` with methods for:
  - Loading/saving user profiles
  - Loading/saving book collections
  - Creating and removing books
  - Opening file dialogs

#### 3. **Renderer Process** (`renderer/app.js`)
The UI layer that runs in a browser context:
- **Visual Display**: Renders books on two wooden shelves (6 books per shelf, 12 max)
- **User Interactions**: Handles clicks on Add button, upload button, and book elements
- **Data Management**: Maintains application state and syncs with persistent storage
- **Book Rendering**: Displays custom cover images or default placeholders

### How Books Are Displayed

1. **Layout System**:
   - Two horizontal wooden shelves
   - Maximum 6 books per shelf (12 total)
   - Books have overlapping effect (margin-left: -15px)
   - Each book is 60px × 90px (2:3 aspect ratio)

2. **Book Covers**:
   - Users can upload custom images (jpg, png, gif, webp)
   - Images are stored by file path reference
   - Default: Blue placeholder with 📖 emoji

3. **Visual Effects**:
   - Shadow effects for 3D depth
   - Hover animation: Books lift up slightly
   - Z-index stacking for overlap effect

### Adding a Book

1. Click the **"Add"** button in the header
2. Upload popup appears with blurred glass effect
3. Click **"UPLOAD"** to open native file picker
4. Select an image file for the book cover
5. Book is added to collection and saved to `books.json`
6. UI updates to show the new book on the shelf

### Data Persistence

All data is stored locally in JSON files:
- **User Profile** (`data/user.json`):
  ```json
  {
    "username": "Reader",
    "theme": "light"
  }
  ```

- **Book Collection** (`data/books.json`):
  ```json
  {
    "collection": [
      {
        "id": "book_1234567890",
        "coverPath": "/path/to/image.jpg",
        "title": "Book 1",
        "addedAt": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### Security Features

Book Wall follows Electron security best practices:
- **No Node Integration**: Renderer process cannot directly access Node.js
- **Context Isolation**: Preload script runs in isolated context
- **Controlled API**: Only approved functions exposed via contextBridge
- **Content Security Policy**: Restricts resource loading in the UI

### Technology Stack

- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime for file operations
- **Vanilla JavaScript**: No frontend frameworks, keeping it lightweight
- **CSS**: Custom styling for bookshelf aesthetic
- **HTML5**: Semantic markup for UI structure

### Development

Run the app in development mode:
```bash
npm start
```

Build for production:
```bash
npm run build        # All platforms
npm run build:mac    # macOS only
npm run build:win    # Windows only
```