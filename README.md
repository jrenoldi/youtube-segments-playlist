# YouTube Video Segments Playlist

A web application for creating custom playlists with specific start and end times for YouTube videos. Perfect for karaoke sessions, music practice, or any scenario where you need to play specific segments of videos.

## Features

- 🎵 Create playlists with custom start/end times for YouTube videos
- ▶️ Play segments automatically with seamless transitions
- 🔄 Loop playlists
- 💾 Save and load playlists as JSON files

## Prerequisites

- Node.js (version 14.0.0 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jrenoldi/youtube-segments-playlist
cd youtube-segments-playlist
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Option 1: Using Node.js Server (Recommended)
```bash
npm start
```
The application will be available at `http://localhost:3000`

### Option 2: Using Python Server
```bash
npm run serve
```
The application will be available at `http://localhost:8080`

## How to Use

1. **Add Video Segments**: Click "Add New Video Segment" and enter:
   - YouTube video URL or ID
   - Start time (in seconds or MM:SS format)
   - End time (in seconds or MM:SS format)
   - Optional title/description

2. **Play Controls**:
   - Use Previous/Next buttons to navigate between segments
   - Toggle loop mode for the entire playlist
   - Use Play/Pause to control playback

3. **Save/Load Playlists**:
   - Save your playlist as a JSON file
   - Load previously saved playlists

## Sample Playlist

A sample playlist (`sample-playlist.json`) is included to help you get started.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License
