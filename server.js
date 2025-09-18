#!/usr/bin/env node

/**
 * Simple development server for YouTube Segments Playlist
 * Resolves CORS issues with ES6 modules and provides hot reload
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files with proper MIME types
app.use('/js', express.static(path.join(__dirname, 'js'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

app.use('/styles', express.static(path.join(__dirname, 'styles'), {
    setHeaders: (res, path) => {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

app.use('/examples', express.static(path.join(__dirname, 'examples'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

// Serve other static files
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));


// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
    // Don't serve index.html for API calls or static assets
    if (req.path.startsWith('/api/') || 
        req.path.includes('.') || 
        req.path.startsWith('/js/') || 
        req.path.startsWith('/styles/') ||
        req.path.startsWith('/examples/')) {
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
