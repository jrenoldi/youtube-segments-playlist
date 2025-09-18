# YouTube Video Segments Playlist

A modern, modular web application for creating custom playlists with specific start and end times for YouTube videos. Perfect for creating karaoke playlists, music compilations, or any scenario where you need precise video segment control.

## Features

- 🎬 **Custom Video Segments**: Define precise start and end times for each video
- 📋 **Playlist Management**: Add, remove, reorder, and manage your video segments
- ⏯️ **Seamless Playback**: Automatic progression through your playlist
- 🔁 **Loop Mode**: Continuous playback of your entire playlist
- ⌨️ **Keyboard Shortcuts**: Quick controls for power users
- 💾 **Auto-Save**: Your playlists are automatically saved to local storage
- 📱 **Responsive Design**: Works great on desktop, tablet, and mobile
- 🎯 **Accessibility**: Full keyboard navigation and screen reader support

## Project Structure

The application has been completely refactored from a monolithic HTML file into a clean, modular architecture:

```
karaoke-playlist/
├── index.html              # Main HTML structure
├── styles/
│   └── main.css            # Complete stylesheet with organized sections
├── js/
│   ├── app.js              # Main application orchestrator
│   ├── PlayerManager.js    # YouTube player management
│   ├── PlaylistManager.js  # Playlist operations and storage
│   ├── UIController.js     # DOM manipulation and events
│   └── utils.js            # Helper functions and utilities
└── README.md               # This documentation
```

## Architecture Overview

### Core Classes

#### **PlayerManager** (`js/PlayerManager.js`)
- Manages YouTube IFrame API integration
- Handles video loading, playback control, and state management
- Provides progress tracking and segment end detection
- Implements error handling and recovery

#### **PlaylistManager** (`js/PlaylistManager.js`)
- Manages playlist data structure and operations
- Handles video validation and storage
- Provides navigation (next/previous) and loop functionality
- Implements localStorage persistence and import/export

#### **UIController** (`js/UIController.js`)
- Manages all DOM manipulation and user interactions
- Handles form validation and submission
- Provides visual feedback and notifications
- Implements keyboard shortcuts and accessibility features

#### **Utils** (`js/utils.js`)
- Contains helper functions and constants
- Provides YouTube URL parsing and validation
- Includes time formatting and DOM utilities
- Offers storage and debugging utilities

#### **App** (`js/app.js`)
- Main application orchestrator
- Connects all components and manages application state
- Handles initialization and error recovery
- Provides public API for external integration

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support
- Internet connection (for YouTube IFrame API)
- Local development server (due to CORS restrictions with ES6 modules)

### Installation & Running

Due to CORS restrictions with ES6 modules, you cannot simply open `index.html` directly in a browser. You need to serve the application through a local server.

#### Option 1: Automatic Setup (Recommended)
```bash
# Clone or download this repository
cd karaoke-playlist

# Run the automatic start script
./start.sh
```

The start script will automatically:
- Detect available servers (Node.js, Python)
- Install dependencies if needed
- Find an available port
- Launch the application

#### Option 2: Node.js Server (Recommended)
```bash
# Install dependencies
npm install

# Start the development server
npm start
# or
npm run dev

# Open http://localhost:3000 in your browser
```

#### Option 3: Python Server
```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# Open http://localhost:8080 in your browser
```

#### Option 4: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

#### Option 5: Other Development Servers
Any local development server will work:
- `npx serve .`
- `npx http-server .`
- PHP: `php -S localhost:8000`
- Ruby: `ruby -run -e httpd . -p 8000`

### Quick Start
1. Choose any serving method above
2. Open the application in your browser
3. Start adding your video segments!

### Usage

#### Adding Videos

1. **Enter YouTube URL or Video ID**: Paste a full YouTube URL or just the 11-character video ID
2. **Set Start Time**: Specify when the segment should begin (in seconds)
3. **Set End Time**: Optionally specify when the segment should end (leave empty for full video)
4. **Add Title**: Give your segment a custom name (optional)
5. **Click "Add to Playlist"**

#### Playback Controls

- **⏮ Previous**: Go to previous video segment
- **⏯ Play/Pause**: Toggle playback
- **⏭ Next**: Go to next video segment
- **🔁 Loop**: Toggle playlist loop mode

#### Keyboard Shortcuts

- `Space`: Play/Pause
- `←` (Left Arrow): Previous video
- `→` (Right Arrow): Next video
- `L`: Toggle loop mode

## Technical Details

### Modern JavaScript Features

- **ES6 Modules**: Clean import/export system
- **Classes**: Object-oriented architecture
- **Async/Await**: Modern asynchronous programming
- **Arrow Functions**: Concise function syntax
- **Template Literals**: Clean string interpolation
- **Destructuring**: Elegant data extraction

### Performance Optimizations

- **Event Delegation**: Efficient event handling
- **Throttled Updates**: Smooth progress tracking
- **Memory Management**: Proper cleanup and resource disposal
- **Lazy Loading**: Components initialize only when needed
- **Caching**: DOM elements cached for performance

### Accessibility Features

- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling
- **Semantic HTML**: Meaningful document structure
- **High Contrast**: Readable color schemes

### Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- **ES6 Modules**: Native module support required
- **YouTube API**: Requires JavaScript enabled

## API Reference

### YouTubeSegmentsApp

The main application class provides these public methods:

```javascript
// Get application status
app.getStatus()

// Export playlist as JSON
const jsonData = app.exportPlaylist()

// Import playlist from JSON
const result = app.importPlaylist(jsonString)

// Clean up resources
app.destroy()
```

### Playlist Data Format

Videos in the playlist follow this structure:

```javascript
{
  id: "unique-id",           // Unique identifier
  url: "video-url",          // Original YouTube URL
  videoId: "video-id",       // Extracted 11-character ID
  startTime: 60,             // Start time in seconds
  endTime: 120,              // End time in seconds (optional)
  title: "Custom Title",     // Display title
  dateAdded: "2023-..."      // ISO timestamp
}
```

## Development

### Code Organization

The codebase follows these principles:

- **Single Responsibility**: Each class has a focused purpose
- **Separation of Concerns**: UI, data, and player logic are separate
- **Dependency Injection**: Components are loosely coupled
- **Event-Driven**: Communication through callbacks and events

### Adding Features

To add new features:

1. **Identify the appropriate class** (UI, Player, Playlist, or Utils)
2. **Add methods following existing patterns**
3. **Update the main App class** to orchestrate new functionality
4. **Add corresponding UI elements** and event handlers
5. **Update this documentation**

### Debugging

The application includes comprehensive logging:

```javascript
// Enable debug logging (development mode)
// Logs automatically appear in localhost environments

// Access the app instance
const app = window.YouTubeSegmentsApp;
console.log(app.getStatus());
```

## Browser Storage

The application uses localStorage to persist:

- **Playlist data**: All video segments and metadata
- **Current position**: Last played video index
- **Settings**: Loop mode and other preferences

Data is automatically saved when changes are made.

## Troubleshooting

### Common Issues

**CORS Error / Modules not loading**
- **Problem**: ES6 modules cannot be loaded from `file://` protocol
- **Solution**: Use any of the serving methods described in "Installation & Running"
- **Quick fix**: Use VS Code Live Server extension or run `python3 -m http.server 8080`

**Video won't load**
- Check if the YouTube URL is valid
- Ensure the video is not private or restricted
- Try using the 11-character video ID directly

**Player not responding**
- Refresh the page to reload the YouTube API
- Check browser console for JavaScript errors
- Ensure internet connection is stable

**Segments not ending correctly**
- YouTube's segment ending can be imprecise
- Try adjusting end times by a few seconds
- Some videos may not support precise segment control

**Server won't start**
- Check if the port is already in use
- Try a different port: `PORT=3001 npm start`
- Ensure Node.js and npm are installed correctly

### Error Messages

The application provides helpful error messages for:
- Invalid YouTube URLs
- Network connectivity issues
- YouTube API errors
- Invalid time ranges

## Contributing

This project welcomes contributions! Areas for improvement:

- Additional keyboard shortcuts
- Drag-and-drop playlist reordering
- Playlist sharing capabilities
- Advanced search and filtering
- Theme customization
- Mobile app wrapper

## License

This project is open source and available under the MIT License.

## Acknowledgments

- YouTube IFrame API for video playback
- Modern web standards for the architecture
- The karaoke community for inspiration
