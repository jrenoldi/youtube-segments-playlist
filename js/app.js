/**
 * YouTube Video Segments Playlist - Main Application
 * Entry point that orchestrates all components and manages application state
 */

import { PlayerManager } from './PlayerManager.js';
import { PlaylistManager } from './PlaylistManager.js';
import { UIController } from './UIController.js';
import { 
    extractVideoId, 
    YOUTUBE_PLAYER_STATES,
    devLog 
} from './utils.js';

class YouTubeSegmentsApp {
    constructor() {
        this.playerManager = null;
        this.playlistManager = null;
        this.uiController = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
        this.isHandlingVideoEnd = false; // Prevent duplicate video end handling
        
        // Bind methods to maintain context
        this.handlePlayerReady = this.handlePlayerReady.bind(this);
        this.handlePlayerStateChange = this.handlePlayerStateChange.bind(this);
        this.handlePlayerError = this.handlePlayerError.bind(this);
        this.handlePlayerProgress = this.handlePlayerProgress.bind(this);
        
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
            
            // Initialize components
            await this.initializeComponents();
            this.connectComponents();
            
            this.isInitialized = true;
            devLog('App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Initialize UI Controller first
        this.uiController = new UIController();
        
        // Initialize Playlist Manager
        this.playlistManager = new PlaylistManager();
        
        // Initialize Player Manager (will wait for YouTube API)
        this.playerManager = new PlayerManager('player');
        
        devLog('All components initialized');
    }

    /**
     * Connect components with event handlers
     */
    connectComponents() {
        // Connect Player Manager events
        this.playerManager.onReady(this.handlePlayerReady);
        this.playerManager.onStateChange(this.handlePlayerStateChange);
        this.playerManager.onError(this.handlePlayerError);
        this.playerManager.onProgress(this.handlePlayerProgress);
        
        // Connect Playlist Manager events
        this.playlistManager.onPlaylistChange((playlist) => {
            this.uiController.updatePlaylist(playlist, this.playlistManager.getCurrentIndex());
            this.updateControlButtons();
            this.uiController.updateSaveButtonState(playlist.length > 0);
        });
        
        this.playlistManager.onCurrentIndexChange((index, video) => {
            this.uiController.highlightCurrentItem(index);
            this.uiController.updateCurrentInfo(video, index, this.playlistManager.getLength());
            this.updateControlButtons();
            
            // Load new video if player is ready
            if (this.isPlayerReady && video) {
                this.loadCurrentVideo();
            }
        });
        
        this.playlistManager.onLoopToggle((loopEnabled) => {
            this.uiController.updateLoopStatus(loopEnabled);
            this.updateControlButtons();
        });
        
        // Connect UI Controller events
        this.uiController.onVideoAdd((videoData) => {
            this.handleVideoAdd(videoData);
        });
        
        this.uiController.onVideoEdit((videoData, index) => {
            this.handleVideoEdit(videoData, index);
        });
        
        this.uiController.onVideoRemove((index) => {
            this.handleVideoRemove(index);
        });
        
        this.uiController.onVideoSelect((index) => {
            this.handleVideoSelect(index);
        });
        
        this.uiController.onPlayPause(() => {
            this.handlePlayPause();
        });
        
        this.uiController.onNext(() => {
            this.handleNext();
        });
        
        this.uiController.onPrevious(() => {
            this.handlePrevious();
        });
        
        this.uiController.onLoopToggle(() => {
            this.handleLoopToggle();
        });
        
        this.uiController.onLoadPlaylist((playlistData) => {
            this.handlePlaylistLoad(playlistData);
        });
        
        this.uiController.onSavePlaylist((playlistName) => {
            this.handlePlaylistSave(playlistName);
        });
        
        devLog('Components connected');
    }

    /* ==========================================================================
       Player Event Handlers
       ========================================================================== */

    /**
     * Handle player ready event
     */
    handlePlayerReady() {
        devLog('Player is ready');
        this.isPlayerReady = true;
        
        // Load current video if playlist has items
        const currentVideo = this.playlistManager.getCurrentVideo();
        if (currentVideo) {
            this.loadCurrentVideo();
        }
        
        this.updateUI();
    }

    /**
     * Handle player state changes - SIMPLIFIED
     */
    handlePlayerStateChange(event) {
        const state = event.data;
        
        // Update UI based on player state
        const isPlaying = state === YOUTUBE_PLAYER_STATES.PLAYING;
        this.uiController.updateControlButtons({
            hasNext: this.playlistManager.hasNext(),
            hasPrevious: this.playlistManager.hasPrevious(),
            isPlaying: isPlaying
        });
        
        // Handle ENDED state to advance to next video - but prevent duplicates
        if (state === YOUTUBE_PLAYER_STATES.ENDED && !this.isHandlingVideoEnd) {
            devLog('🎬 App handling ENDED state - advancing to next video');
            this.handleVideoEnd();
        } else if (state === YOUTUBE_PLAYER_STATES.ENDED && this.isHandlingVideoEnd) {
            devLog('🚫 Ignoring duplicate ENDED state');
        }
    }

    /**
     * Handle player errors
     */
    handlePlayerError(event, errorMessage) {
        console.error('Player error:', errorMessage);
        this.uiController.showError(`Player error: ${errorMessage}`);
        
        // Skip to next video on error
        setTimeout(() => {
            if (this.playlistManager.hasNext()) {
                this.handleNext();
            }
        }, 2000);
    }

    /**
     * Handle player progress updates
     */
    handlePlayerProgress(progressData) {
        this.uiController.updateProgress(progressData);
    }

    /**
     * Handle video end
     */
    handleVideoEnd() {
        if (this.isHandlingVideoEnd) {
            devLog('🚫 Already handling video end, ignoring duplicate call');
            return;
        }
        
        this.isHandlingVideoEnd = true;
        
        const currentIndex = this.playlistManager.getCurrentIndex();
        const currentVideo = this.playlistManager.getCurrentVideo();
        devLog('=== VIDEO END HANDLER ===');
        devLog('Current index:', currentIndex);
        devLog('Current video title:', currentVideo?.title);
        devLog('Has next:', this.playlistManager.hasNext());
        
        if (this.playlistManager.hasNext()) {
            devLog('Advancing to next video...');
            const success = this.playlistManager.next();
            const newIndex = this.playlistManager.getCurrentIndex();
            const newVideo = this.playlistManager.getCurrentVideo();
            devLog('Next() success:', success);
            devLog('New index:', newIndex);
            devLog('New video title:', newVideo?.title);
        } else {
            devLog('End of playlist reached');
            this.uiController.showInfo('Playlist finished');
        }
        
        // Reset flag after a short delay to allow for new video loading
        setTimeout(() => {
            this.isHandlingVideoEnd = false;
        }, 1000);
        
        devLog('=== END VIDEO END HANDLER ===');
    }

    /* ==========================================================================
       UI Event Handlers
       ========================================================================== */

    /**
     * Handle video addition
     */
    handleVideoAdd(videoData) {
        const result = this.playlistManager.addVideo(videoData);
        
        if (result.success) {
            this.uiController.showSuccess(result.message);
            
            // If this is the first video and player is ready, start playing
            if (this.playlistManager.getLength() === 1 && this.isPlayerReady) {
                this.loadCurrentVideo();
            }
        } else {
            this.uiController.showError(result.message);
        }
    }

    /**
     * Handle video editing
     * @param {Object} videoData - Updated video data
     * @param {number} index - Index of video being edited
     */
    handleVideoEdit(videoData, index) {
        const result = this.playlistManager.updateVideo(index, videoData);
        
        if (result.success) {
            this.uiController.showSuccess(result.message);
            
            // If we're editing the current video and player is ready, reload it
            if (index === this.playlistManager.getCurrentIndex() && this.isPlayerReady) {
                this.loadCurrentVideo();
            }
        } else {
            this.uiController.showError(result.message);
        }
    }

    /**
     * Handle video removal
     */
    handleVideoRemove(index) {
        const video = this.playlistManager.getVideo(index);
        if (!video) return;
        
        const success = this.playlistManager.removeVideo(index);
        if (success) {
            this.uiController.showSuccess(`Removed "${video.title}" from playlist`);
            
            // If no videos left, clear player
            if (this.playlistManager.isEmpty()) {
                this.playerManager.stop();
                this.uiController.updateCurrentInfo(null, 0, 0);
            }
        } else {
            this.uiController.showError('Failed to remove video');
        }
    }

    /**
     * Handle video selection
     */
    handleVideoSelect(index) {
        const success = this.playlistManager.setCurrentIndex(index);
        if (success && this.isPlayerReady) {
            this.loadCurrentVideo();
        }
    }

    /**
     * Handle play/pause toggle
     */
    handlePlayPause() {
        if (!this.isPlayerReady) {
            this.uiController.showError('Player not ready');
            return;
        }
        
        this.playerManager.togglePlayPause();
    }

    /**
     * Handle next video
     */
    handleNext() {
        const success = this.playlistManager.next();
        if (!success) {
            this.uiController.showInfo('No next video available');
        }
    }

    /**
     * Handle previous video
     */
    handlePrevious() {
        const success = this.playlistManager.previous();
        if (!success) {
            this.uiController.showInfo('No previous video available');
        }
    }

    /**
     * Handle loop toggle
     */
    handleLoopToggle() {
        const loopEnabled = this.playlistManager.toggleLoop();
        const message = loopEnabled ? 'Loop enabled' : 'Loop disabled';
        this.uiController.showInfo(message);
    }

    /**
     * Handle playlist loading from file
     * @param {Object} playlistData - Imported playlist data
     */
    handlePlaylistLoad(playlistData) {
        const result = this.playlistManager.importPlaylist(JSON.stringify(playlistData));
        
        if (result.success) {
            this.uiController.showSuccess(result.message);
            
            // Update playlist name if available
            if (playlistData.name) {
                this.uiController.setPlaylistName(playlistData.name);
            }
            
            // Update UI
            this.updateUI();
            
            // Load first video if player is ready
            if (this.isPlayerReady && this.playlistManager.getLength() > 0) {
                this.playlistManager.setCurrentIndex(0);
                this.loadCurrentVideo();
            }
        } else {
            this.uiController.showError(result.message);
        }
    }

    /**
     * Handle playlist saving to file
     * @param {string} playlistName - Name for the playlist
     */
    handlePlaylistSave(playlistName) {
        if (this.playlistManager.isEmpty()) {
            this.uiController.showError('Cannot save empty playlist');
            return;
        }
        
        try {
            // Get playlist data from PlaylistManager
            const exportData = JSON.parse(this.playlistManager.exportPlaylist());
            
            // Add playlist name and additional metadata
            const playlistData = {
                ...exportData,
                name: playlistName,
                createdAt: new Date().toISOString(),
                totalVideos: this.playlistManager.getLength()
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
    }

    /* ==========================================================================
       Core Functionality
       ========================================================================== */

    /**
     * Load current video into player
     */
    loadCurrentVideo() {
        if (!this.isPlayerReady) {
            devLog('Player not ready, cannot load video');
            return;
        }
        
        const currentVideo = this.playlistManager.getCurrentVideo();
        if (!currentVideo) {
            devLog('No current video to load');
            return;
        }
        
        // Prepare video data for player
        const videoData = {
            ...currentVideo,
            videoId: extractVideoId(currentVideo.url)
        };
        
        if (!videoData.videoId) {
            this.uiController.showError('Invalid video ID');
            return;
        }
        
        devLog('Loading video:', videoData);
        const success = this.playerManager.loadVideo(videoData);
        
        if (!success) {
            this.uiController.showError('Failed to load video');
        }
    }

    /**
     * Update UI components
     */
    updateUI() {
        const currentVideo = this.playlistManager.getCurrentVideo();
        const currentIndex = this.playlistManager.getCurrentIndex();
        const totalVideos = this.playlistManager.getLength();
        
        // Update current video info
        this.uiController.updateCurrentInfo(currentVideo, currentIndex, totalVideos);
        
        // Update playlist display
        this.uiController.updatePlaylist(this.playlistManager.getPlaylist(), currentIndex);
        
        // Update loop status
        this.uiController.updateLoopStatus(this.playlistManager.isLoopEnabled());
        
        // Update control buttons
        this.updateControlButtons();
        
        // Update save button state
        this.uiController.updateSaveButtonState(totalVideos > 0);
    }

    /**
     * Update control buttons state
     */
    updateControlButtons() {
        const isPlaying = this.playerManager?.isPlaying() || false;
        
        this.uiController.updateControlButtons({
            hasNext: this.playlistManager.hasNext(),
            hasPrevious: this.playlistManager.hasPrevious(),
            isPlaying: isPlaying
        });
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
       Public API
       ========================================================================== */

    /**
     * Get application status
     * @returns {Object} - Application status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            playerReady: this.isPlayerReady,
            currentVideo: this.playlistManager?.getCurrentVideo(),
            playlistLength: this.playlistManager?.getLength() || 0,
            loopEnabled: this.playlistManager?.isLoopEnabled() || false
        };
    }

    /**
     * Export playlist
     * @returns {string} - JSON string of playlist
     */
    exportPlaylist() {
        if (!this.playlistManager) {
            throw new Error('Playlist manager not initialized');
        }
        return this.playlistManager.exportPlaylist();
    }

    /**
     * Import playlist
     * @param {string} jsonString - JSON string to import
     * @returns {Object} - Import result
     */
    importPlaylist(jsonString) {
        if (!this.playlistManager) {
            throw new Error('Playlist manager not initialized');
        }
        
        const result = this.playlistManager.importPlaylist(jsonString);
        
        if (result.success) {
            this.uiController.showSuccess(result.message);
            this.updateUI();
            
            // Load first video if player is ready
            if (this.isPlayerReady) {
                this.loadCurrentVideo();
            }
        } else {
            this.uiController.showError(result.message);
        }
        
        return result;
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy application and clean up resources
     */
    destroy() {
        devLog('Destroying YouTube Segments App');
        
        if (this.playerManager) {
            this.playerManager.destroy();
        }
        
        if (this.uiController) {
            this.uiController.destroy();
        }
        
        this.playerManager = null;
        this.playlistManager = null;
        this.uiController = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
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
