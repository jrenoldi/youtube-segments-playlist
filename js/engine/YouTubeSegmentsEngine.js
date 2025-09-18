/**
 * YouTube Segments Engine - Core Functionality API
 * Provides a clean API for YouTube video segment playlist management
 * Separated from UI concerns for maximum reusability
 */

import { PlayerManager } from '../PlayerManager.js';
import { PlaylistManager } from '../PlaylistManager.js';
import { 
    extractVideoId, 
    YOUTUBE_PLAYER_STATES,
    devLog 
} from '../utils.js';

export class YouTubeSegmentsEngine {
    constructor(options = {}) {
        this.playerManager = null;
        this.playlistManager = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
        this.isHandlingVideoEnd = false;
        
        // Configuration
        this.config = {
            playerId: options.playerId || 'player',
            autoAdvance: options.autoAdvance !== false, // Default true
            enableStorage: options.enableStorage !== false, // Default true
            ...options
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
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
     * Initialize the engine
     */
    async init() {
        try {
            devLog('Initializing YouTube Segments Engine');
            
            // Initialize components
            await this.initializeComponents();
            this.connectComponents();
            
            this.isInitialized = true;
            this.emit('engine:ready');
            devLog('Engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize engine:', error);
            this.emit('engine:error', { error: error.message });
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Initialize Playlist Manager
        this.playlistManager = new PlaylistManager();
        
        // Initialize Player Manager (will wait for YouTube API)
        this.playerManager = new PlayerManager(this.config.playerId);
        
        devLog('All engine components initialized');
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
            this.emit('playlist:changed', { 
                playlist: this.playlistManager.getPlaylist(),
                currentIndex: this.playlistManager.getCurrentIndex(),
                length: this.playlistManager.getLength()
            });
        });
        
        this.playlistManager.onCurrentIndexChange((index, video) => {
            this.emit('playlist:currentChanged', { 
                index, 
                video, 
                totalVideos: this.playlistManager.getLength(),
                hasNext: this.playlistManager.hasNext(),
                hasPrevious: this.playlistManager.hasPrevious()
            });
            
            // Load new video if player is ready
            if (this.isPlayerReady && video) {
                this.loadCurrentVideo();
            }
        });
        
        this.playlistManager.onLoopToggle((loopEnabled) => {
            this.emit('playlist:loopToggled', { loopEnabled });
        });
        
        devLog('Engine components connected');
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
        
        this.emit('player:ready');
    }

    /**
     * Handle player state changes
     */
    handlePlayerStateChange(event) {
        const state = event.data;
        
        this.emit('player:stateChanged', { 
            state, 
            isPlaying: state === YOUTUBE_PLAYER_STATES.PLAYING 
        });
        
        // Handle ENDED state to advance to next video
        if (state === YOUTUBE_PLAYER_STATES.ENDED && !this.isHandlingVideoEnd && this.config.autoAdvance) {
            devLog('🎬 Engine handling ENDED state - advancing to next video');
            this.handleVideoEnd();
        }
    }

    /**
     * Handle player errors
     */
    handlePlayerError(event, errorMessage) {
        console.error('Player error:', errorMessage);
        this.emit('player:error', { error: errorMessage });
        
        // Skip to next video on error if auto-advance is enabled
        if (this.config.autoAdvance) {
            setTimeout(() => {
                if (this.playlistManager.hasNext()) {
                    this.next();
                }
            }, 2000);
        }
    }

    /**
     * Handle player progress updates
     */
    handlePlayerProgress(progressData) {
        this.emit('player:progress', progressData);
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
        
        if (this.playlistManager.hasNext()) {
            devLog('Advancing to next video...');
            const success = this.playlistManager.next();
            this.emit('playlist:autoAdvanced', { 
                success, 
                fromIndex: currentIndex,
                toIndex: this.playlistManager.getCurrentIndex(),
                video: currentVideo
            });
        } else {
            devLog('End of playlist reached');
            this.emit('playlist:ended');
        }
        
        // Reset flag after a short delay
        setTimeout(() => {
            this.isHandlingVideoEnd = false;
        }, 1000);
    }

    /* ==========================================================================
       Playlist Management API
       ========================================================================== */

    /**
     * Add video to playlist
     * @param {Object} videoData - Video data object
     * @returns {Object} - Result with success status and message
     */
    addVideo(videoData) {
        const result = this.playlistManager.addVideo(videoData);
        
        if (result.success) {
            this.emit('playlist:videoAdded', { 
                video: result.video, 
                index: this.playlistManager.getLength() - 1,
                message: result.message
            });
            
            // If this is the first video and player is ready, start playing
            if (this.playlistManager.getLength() === 1 && this.isPlayerReady) {
                this.loadCurrentVideo();
            }
        } else {
            this.emit('playlist:error', { error: result.message });
        }
        
        return result;
    }

    /**
     * Update video in playlist
     * @param {number} index - Index of video to update
     * @param {Object} videoData - Updated video data
     * @returns {Object} - Result with success status and message
     */
    updateVideo(index, videoData) {
        const result = this.playlistManager.updateVideo(index, videoData);
        
        if (result.success) {
            this.emit('playlist:videoUpdated', { 
                index, 
                video: this.playlistManager.getVideo(index),
                message: result.message
            });
            
            // If we're updating the current video and player is ready, reload it
            if (index === this.playlistManager.getCurrentIndex() && this.isPlayerReady) {
                this.loadCurrentVideo();
            }
        } else {
            this.emit('playlist:error', { error: result.message });
        }
        
        return result;
    }

    /**
     * Remove video from playlist
     * @param {number} index - Index of video to remove
     * @returns {boolean} - Success status
     */
    removeVideo(index) {
        const video = this.playlistManager.getVideo(index);
        if (!video) return false;
        
        const success = this.playlistManager.removeVideo(index);
        if (success) {
            this.emit('playlist:videoRemoved', { 
                index, 
                video, 
                message: `Removed "${video.title}" from playlist`
            });
            
            // If no videos left, clear player
            if (this.playlistManager.isEmpty()) {
                this.playerManager.stop();
                this.emit('playlist:cleared');
            }
        } else {
            this.emit('playlist:error', { error: 'Failed to remove video' });
        }
        
        return success;
    }

    /**
     * Set current video index
     * @param {number} index - New current index
     * @returns {boolean} - Success status
     */
    setCurrentVideo(index) {
        const success = this.playlistManager.setCurrentIndex(index);
        if (success && this.isPlayerReady) {
            this.loadCurrentVideo();
        }
        return success;
    }

    /**
     * Go to next video
     * @returns {boolean} - Success status
     */
    next() {
        const success = this.playlistManager.next();
        if (!success) {
            this.emit('playlist:error', { error: 'No next video available' });
        }
        return success;
    }

    /**
     * Go to previous video
     * @returns {boolean} - Success status
     */
    previous() {
        const success = this.playlistManager.previous();
        if (!success) {
            this.emit('playlist:error', { error: 'No previous video available' });
        }
        return success;
    }

    /**
     * Toggle loop mode
     * @returns {boolean} - New loop status
     */
    toggleLoop() {
        const loopEnabled = this.playlistManager.toggleLoop();
        this.emit('playlist:loopToggled', { loopEnabled });
        return loopEnabled;
    }

    /**
     * Clear entire playlist
     */
    clearPlaylist() {
        this.playlistManager.clearPlaylist();
        this.playerManager.stop();
        this.emit('playlist:cleared');
    }

    /* ==========================================================================
       Player Control API
       ========================================================================== */

    /**
     * Play the current video
     */
    play() {
        if (!this.isPlayerReady) {
            this.emit('player:error', { error: 'Player not ready' });
            return false;
        }
        
        this.playerManager.play();
        return true;
    }

    /**
     * Pause the current video
     */
    pause() {
        if (!this.isPlayerReady) {
            this.emit('player:error', { error: 'Player not ready' });
            return false;
        }
        
        this.playerManager.pause();
        return true;
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.isPlayerReady) {
            this.emit('player:error', { error: 'Player not ready' });
            return false;
        }
        
        this.playerManager.togglePlayPause();
        return true;
    }

    /**
     * Stop the current video
     */
    stop() {
        if (this.isPlayerReady) {
            this.playerManager.stop();
        }
    }

    /**
     * Seek to specific time
     * @param {number} seconds - Time in seconds
     */
    seekTo(seconds) {
        if (this.isPlayerReady) {
            this.playerManager.seekTo(seconds);
        }
    }

    /**
     * Set volume (0-100)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        if (this.isPlayerReady) {
            this.playerManager.setVolume(volume);
        }
    }

    /* ==========================================================================
       Playlist Import/Export API
       ========================================================================== */

    /**
     * Import playlist from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {Object} - Import result
     */
    importPlaylist(jsonString) {
        const result = this.playlistManager.importPlaylist(jsonString);
        
        if (result.success) {
            this.emit('playlist:imported', { 
                imported: result.imported,
                errors: result.errors,
                message: result.message
            });
            
            // Load first video if player is ready
            if (this.isPlayerReady && this.playlistManager.getLength() > 0) {
                this.playlistManager.setCurrentIndex(0);
                this.loadCurrentVideo();
            }
        } else {
            this.emit('playlist:error', { error: result.message });
        }
        
        return result;
    }

    /**
     * Export playlist as JSON
     * @returns {string} - JSON string of playlist
     */
    exportPlaylist() {
        return this.playlistManager.exportPlaylist();
    }

    /**
     * Load playlist from storage
     * @returns {boolean} - Success status
     */
    loadFromStorage() {
        const success = this.playlistManager.loadPlaylistFromStorage();
        if (success) {
            this.emit('playlist:loadedFromStorage', { 
                length: this.playlistManager.getLength()
            });
        }
        return success;
    }

    /**
     * Save playlist to storage
     */
    saveToStorage() {
        this.playlistManager.saveToStorage();
        this.emit('playlist:savedToStorage');
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
            return false;
        }
        
        const currentVideo = this.playlistManager.getCurrentVideo();
        if (!currentVideo) {
            devLog('No current video to load');
            return false;
        }
        
        // Prepare video data for player
        const videoData = {
            ...currentVideo,
            videoId: extractVideoId(currentVideo.url)
        };
        
        if (!videoData.videoId) {
            this.emit('player:error', { error: 'Invalid video ID' });
            return false;
        }
        
        devLog('Loading video:', videoData);
        const success = this.playerManager.loadVideo(videoData);
        
        if (!success) {
            this.emit('player:error', { error: 'Failed to load video' });
        } else {
            this.emit('player:videoLoaded', { video: videoData });
        }
        
        return success;
    }

    /* ==========================================================================
       Getters and Status
       ========================================================================== */

    /**
     * Get engine status
     * @returns {Object} - Engine status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            playerReady: this.isPlayerReady,
            currentVideo: this.playlistManager?.getCurrentVideo(),
            playlistLength: this.playlistManager?.getLength() || 0,
            loopEnabled: this.playlistManager?.isLoopEnabled() || false,
            currentIndex: this.playlistManager?.getCurrentIndex() || 0,
            hasNext: this.playlistManager?.hasNext() || false,
            hasPrevious: this.playlistManager?.hasPrevious() || false,
            isPlaying: this.playerManager?.isPlaying() || false
        };
    }

    /**
     * Get current video
     * @returns {Object|null} - Current video object
     */
    getCurrentVideo() {
        return this.playlistManager?.getCurrentVideo() || null;
    }

    /**
     * Get playlist
     * @returns {Array} - Playlist array
     */
    getPlaylist() {
        return this.playlistManager?.getPlaylist() || [];
    }

    /**
     * Get playlist length
     * @returns {number} - Number of videos in playlist
     */
    getPlaylistLength() {
        return this.playlistManager?.getLength() || 0;
    }

    /**
     * Get current index
     * @returns {number} - Current video index
     */
    getCurrentIndex() {
        return this.playlistManager?.getCurrentIndex() || 0;
    }

    /**
     * Check if playlist is empty
     * @returns {boolean} - True if empty
     */
    isPlaylistEmpty() {
        return this.playlistManager?.isEmpty() || true;
    }

    /**
     * Check if player is playing
     * @returns {boolean} - True if playing
     */
    isPlaying() {
        return this.playerManager?.isPlaying() || false;
    }

    /**
     * Get player info
     * @returns {Object} - Player information
     */
    getPlayerInfo() {
        return this.playerManager?.getPlayerInfo() || { ready: false };
    }

    /* ==========================================================================
       Event System
       ========================================================================== */

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /* ==========================================================================
       Configuration
       ========================================================================== */

    /**
     * Update engine configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('engine:configUpdated', { config: this.config });
    }

    /**
     * Get current configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy engine and clean up resources
     */
    destroy() {
        devLog('Destroying YouTube Segments Engine');
        
        if (this.playerManager) {
            this.playerManager.destroy();
        }
        
        this.playerManager = null;
        this.playlistManager = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
        
        // Clear event listeners
        this.eventListeners.clear();
        
        this.emit('engine:destroyed');
    }
}
