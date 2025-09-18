/**
 * UI Adapter - Connects YouTube Segments Engine to UI Components
 * Provides a bridge between the engine API and the existing UI components
 */

import { YouTubeSegmentsEngine } from '../engine/YouTubeSegmentsEngine.js';
import { UIController } from '../UIController.js';
import { devLog } from '../utils.js';

export class UIAdapter {
    constructor(options = {}) {
        this.engine = null;
        this.uiController = null;
        
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            playerId: options.playerId || 'player',
            enableStorage: options.enableStorage !== false,
            autoAdvance: options.autoAdvance !== false,
            ...options
        };
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the UI adapter
     */
    async init() {
        try {
            devLog('Initializing UI Adapter');
            
            // Initialize engine
            this.engine = new YouTubeSegmentsEngine(this.config);
            
            // Initialize UI controller
            this.uiController = new UIController();
            
            // Connect engine to UI
            this.connectEngineToUI();
            
            // Connect UI to engine
            this.connectUIToEngine();
            
            this.isInitialized = true;
            devLog('UI Adapter initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize UI adapter:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Connect engine events to UI updates
     */
    connectEngineToUI() {
        // Engine ready
        this.engine.on('engine:ready', () => {
            devLog('Engine ready - updating UI');
            this.updateUI();
        });

        // Player events
        this.engine.on('player:ready', () => {
            this.updateUI();
        });

        this.engine.on('player:stateChanged', (data) => {
            this.uiController.updateControlButtons({
                hasNext: this.engine.getStatus().hasNext,
                hasPrevious: this.engine.getStatus().hasPrevious,
                isPlaying: data.isPlaying
            });
        });

        this.engine.on('player:progress', (progressData) => {
            this.uiController.updateProgress(progressData);
        });

        this.engine.on('player:error', (data) => {
            this.uiController.showError(data.error);
        });

        this.engine.on('player:videoLoaded', (data) => {
            devLog('Video loaded:', data.video.title);
        });

        // Playlist events
        this.engine.on('playlist:changed', (data) => {
            this.uiController.updatePlaylist(data.playlist, data.currentIndex);
            this.uiController.updateSaveButtonState(data.length > 0);
        });

        this.engine.on('playlist:currentChanged', (data) => {
            this.uiController.highlightCurrentItem(data.index);
            this.uiController.updateCurrentInfo(data.video, data.index, data.totalVideos);
            this.uiController.updateControlButtons({
                hasNext: data.hasNext,
                hasPrevious: data.hasPrevious,
                isPlaying: this.engine.isPlaying()
            });
        });

        this.engine.on('playlist:loopToggled', (data) => {
            this.uiController.updateLoopStatus(data.loopEnabled);
        });

        this.engine.on('playlist:videoAdded', (data) => {
            this.uiController.showSuccess(data.message);
        });

        this.engine.on('playlist:videoUpdated', (data) => {
            this.uiController.showSuccess(data.message);
        });

        this.engine.on('playlist:videoRemoved', (data) => {
            this.uiController.showSuccess(data.message);
        });

        this.engine.on('playlist:imported', (data) => {
            this.uiController.showSuccess(data.message);
            this.updateUI();
        });

        this.engine.on('playlist:cleared', () => {
            this.uiController.updateCurrentInfo(null, 0, 0);
            this.uiController.updatePlaylist([], -1);
            this.uiController.updateSaveButtonState(false);
        });

        this.engine.on('playlist:ended', () => {
            this.uiController.showInfo('Playlist finished');
        });

        this.engine.on('playlist:autoAdvanced', (data) => {
            if (data.success) {
                devLog('Auto-advanced from', data.fromIndex, 'to', data.toIndex);
            }
        });

        this.engine.on('playlist:error', (data) => {
            this.uiController.showError(data.error);
        });

        // Engine events
        this.engine.on('engine:error', (data) => {
            this.uiController.showError(data.error);
        });

        devLog('Engine events connected to UI');
    }

    /**
     * Connect UI events to engine actions
     */
    connectUIToEngine() {
        // Video management
        this.uiController.onVideoAdd((videoData) => {
            this.engine.addVideo(videoData);
        });

        this.uiController.onVideoEdit((videoData, index) => {
            this.engine.updateVideo(index, videoData);
        });

        this.uiController.onVideoRemove((index) => {
            this.engine.removeVideo(index);
        });

        this.uiController.onVideoSelect((index) => {
            this.engine.setCurrentVideo(index);
        });

        // Player controls
        this.uiController.onPlayPause(() => {
            this.engine.togglePlayPause();
        });

        this.uiController.onNext(() => {
            this.engine.next();
        });

        this.uiController.onPrevious(() => {
            this.engine.previous();
        });

        this.uiController.onLoopToggle(() => {
            const loopEnabled = this.engine.toggleLoop();
            const message = loopEnabled ? 'Loop enabled' : 'Loop disabled';
            this.uiController.showInfo(message);
        });

        // Playlist management
        this.uiController.onLoadPlaylist((playlistData) => {
            const result = this.engine.importPlaylist(JSON.stringify(playlistData));
            
            if (result.success && playlistData.name) {
                this.uiController.setPlaylistName(playlistData.name);
            }
        });

        this.uiController.onSavePlaylist((playlistName) => {
            if (this.engine.isPlaylistEmpty()) {
                this.uiController.showError('Cannot save empty playlist');
                return;
            }
            
            try {
                // Get playlist data from engine
                const exportData = JSON.parse(this.engine.exportPlaylist());
                
                // Add playlist name and additional metadata
                const playlistData = {
                    ...exportData,
                    name: playlistName,
                    createdAt: new Date().toISOString(),
                    totalVideos: this.engine.getPlaylistLength()
                };
                
                // Generate filename
                const sanitizedName = playlistName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const timestamp = new Date().toISOString().slice(0, 10);
                const filename = `${sanitizedName}_${timestamp}.json`;
                
                // Export file using UIController
                this.uiController.exportPlaylistFile(playlistData, filename);
                
            } catch (error) {
                console.error('Failed to save playlist:', error);
                this.uiController.showError('Failed to save playlist');
            }
        });

        devLog('UI events connected to engine');
    }

    /* ==========================================================================
       UI Management
       ========================================================================== */

    /**
     * Update all UI components
     */
    updateUI() {
        const status = this.engine.getStatus();
        
        // Update current video info
        this.uiController.updateCurrentInfo(
            status.currentVideo, 
            status.currentIndex, 
            status.playlistLength
        );
        
        // Update playlist display
        this.uiController.updatePlaylist(
            this.engine.getPlaylist(), 
            status.currentIndex
        );
        
        // Update loop status
        this.uiController.updateLoopStatus(status.loopEnabled);
        
        // Update control buttons
        this.uiController.updateControlButtons({
            hasNext: status.hasNext,
            hasPrevious: status.hasPrevious,
            isPlaying: status.isPlaying
        });
        
        // Update save button state
        this.uiController.updateSaveButtonState(status.playlistLength > 0);
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        console.error('UI Adapter initialization failed:', error);
        
        // Try to show error in UI if possible
        try {
            if (this.uiController) {
                this.uiController.showError('Failed to initialize application');
            } else {
                // Fallback: show alert
                alert('Failed to initialize application. Please refresh the page.');
            }
        } catch (uiError) {
            console.error('Failed to show error message:', uiError);
        }
    }

    /* ==========================================================================
       Public API - Engine Access
       ========================================================================== */

    /**
     * Get engine instance for direct access
     * @returns {YouTubeSegmentsEngine} - Engine instance
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Get UI controller instance
     * @returns {UIController} - UI controller instance
     */
    getUIController() {
        return this.uiController;
    }

    /**
     * Get adapter status
     * @returns {Object} - Adapter status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            engine: this.engine?.getStatus(),
            config: this.getConfig()
        };
    }

    /**
     * Get current configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.engine) {
            this.engine.updateConfig(newConfig);
        }
    }

    /* ==========================================================================
       Convenience Methods
       ========================================================================== */

    /**
     * Add video to playlist
     * @param {Object} videoData - Video data
     * @returns {Object} - Result
     */
    addVideo(videoData) {
        return this.engine.addVideo(videoData);
    }

    /**
     * Get current video
     * @returns {Object|null} - Current video
     */
    getCurrentVideo() {
        return this.engine.getCurrentVideo();
    }

    /**
     * Get playlist
     * @returns {Array} - Playlist array
     */
    getPlaylist() {
        return this.engine.getPlaylist();
    }

    /**
     * Play current video
     */
    play() {
        return this.engine.play();
    }

    /**
     * Pause current video
     */
    pause() {
        return this.engine.pause();
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        return this.engine.togglePlayPause();
    }

    /**
     * Go to next video
     */
    next() {
        return this.engine.next();
    }

    /**
     * Go to previous video
     */
    previous() {
        return this.engine.previous();
    }

    /**
     * Export playlist
     * @returns {string} - JSON string
     */
    exportPlaylist() {
        return this.engine.exportPlaylist();
    }

    /**
     * Import playlist
     * @param {string} jsonString - JSON string
     * @returns {Object} - Result
     */
    importPlaylist(jsonString) {
        return this.engine.importPlaylist(jsonString);
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy adapter and clean up resources
     */
    destroy() {
        devLog('Destroying UI Adapter');
        
        if (this.engine) {
            this.engine.destroy();
        }
        
        if (this.uiController) {
            this.uiController.destroy();
        }
        
        this.engine = null;
        this.uiController = null;
        this.isInitialized = false;
    }
}
