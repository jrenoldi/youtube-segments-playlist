#!/usr/bin/env node

/**
 * Simple development server for YouTube Segments Playlist
 * Resolves CORS issues with ES6 modules and provides hot reload
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files with proper MIME types FIRST
app.use(express.static('.', {
    setHeaders: (res, path) => {
        // Set proper MIME type for JavaScript modules
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
        // Set proper MIME type for CSS files
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
        // Set proper MIME type for audio files
        if (path.endsWith('.wav') || path.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    }
}));

// Handle specific JavaScript module requests
app.get('/js/app.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/app.js'));
});

app.get('/js/utils.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/utils.js'));
});

app.get('/js/adapters/UIAdapter.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/adapters/UIAdapter.js'));
});

app.get('/js/engine/YouTubeSegmentsEngine.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/engine/YouTubeSegmentsEngine.js'));
});

app.get('/js/UIController.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/UIController.js'));
});

app.get('/js/PlayerManager.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/PlayerManager.js'));
});

app.get('/js/PlaylistManager.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/PlaylistManager.js'));
});

app.get('/js/AudioManager.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/AudioManager.js'));
});

app.get('/js/VideoSegmentModal.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/VideoSegmentModal.js'));
});

app.get('/js/TransitionScreen.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'js/TransitionScreen.js'));
});

// Catch-all for any other JavaScript files
app.get('/js/*.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, req.path));
});

// Handle root route - serve Karaokenator as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'examples/karaokenator.html'));
});

// Handle SPA routing - serve index.html for other routes
app.get('*', (req, res) => {
    // Don't serve index.html for API calls
    if (req.path.startsWith('/api/')) {
        return res.status(404).send('Not found');
    }
    
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎬 YouTube Segments Playlist Server`);
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`⏹️  Press Ctrl+C to stop the server`);
    console.log('');
    console.log('📖 Open http://localhost:' + PORT + ' in your browser to start using the app!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});
