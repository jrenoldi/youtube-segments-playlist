/**
 * YouTube Video Segments Playlist - Main Application
 * Entry point that uses the new engine architecture with UI adapter
 */

import { UIAdapter } from './adapters/UIAdapter.js';
import { devLog } from './utils.js';

class YouTubeSegmentsApp {
    constructor() {
        this.adapter = null;
        this.isInitialized = false;
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the application
     */
    async init() {
        try {
            devLog('Initializing YouTube Segments App');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize UI adapter (which handles engine and UI initialization)
            this.adapter = new UIAdapter({
                playerId: 'player',
                enableStorage: true,
                autoAdvance: true
            });
            
            this.isInitialized = true;
            devLog('App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    /* ==========================================================================
       Public API - Delegates to Adapter
       ========================================================================== */

    /**
     * Get application status
     * @returns {Object} - Application status information
     */
    getStatus() {
        return this.adapter?.getStatus() || { initialized: false };
    }

    /**
     * Export playlist
     * @returns {string} - JSON string of playlist
     */
    exportPlaylist() {
        if (!this.adapter) {
            throw new Error('Adapter not initialized');
        }
        return this.adapter.exportPlaylist();
    }

    /**
     * Import playlist
     * @param {string} jsonString - JSON string to import
     * @returns {Object} - Import result
     */
    importPlaylist(jsonString) {
        if (!this.adapter) {
            throw new Error('Adapter not initialized');
        }
        return this.adapter.importPlaylist(jsonString);
    }

    /**
     * Get engine instance for advanced usage
     * @returns {YouTubeSegmentsEngine} - Engine instance
     */
    getEngine() {
        return this.adapter?.getEngine();
    }

    /**
     * Get UI controller instance
     * @returns {UIController} - UI controller instance
     */
    getUIController() {
        return this.adapter?.getUIController();
    }

    /* ==========================================================================
       Error Handling
       ========================================================================== */

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('App initialization failed:', error);
        
        // Try to show error in UI if possible
        try {
            if (this.adapter?.getUIController()) {
                this.adapter.getUIController().showError('Failed to initialize application');
            } else {
                // Fallback: show alert
                alert('Failed to initialize application. Please refresh the page.');
            }
        } catch (uiError) {
            console.error('Failed to show error message:', uiError);
        }
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy application and clean up resources
     */
    destroy() {
        devLog('Destroying YouTube Segments App');
        
        if (this.adapter) {
            this.adapter.destroy();
        }
        
        this.adapter = null;
        this.isInitialized = false;
    }
}

/* ==========================================================================
   Global YouTube API Callback
   ========================================================================== */

// YouTube API requires a global callback function
window.onYouTubeIframeAPIReady = function() {
    devLog('YouTube IFrame API ready');
    // The PlayerManager will handle the API initialization
};

/* ==========================================================================
   Application Startup
   ========================================================================== */

// Initialize app when script loads
const app = new YouTubeSegmentsApp();

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.YouTubeSegmentsApp = app;
}

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

export default YouTubeSegmentsApp;
