/**
 * YouTube Segments Engine - Core Functionality API
 * Provides a clean API for YouTube video segment playlist management
 * Separated from UI concerns for maximum reusability
 */

import { PlayerManager } from '../PlayerManager.js';
import { PlaylistManager } from '../PlaylistManager.js';
import { AudioManager } from '../AudioManager.js';
import { TransitionScreen } from '../TransitionScreen.js';
import { 
    extractVideoId, 
    YOUTUBE_PLAYER_STATES,
    devLog 
} from '../utils.js';

export class YouTubeSegmentsEngine {
    constructor(options = {}) {
        this.playerManager = null;
        this.playlistManager = null;
        this.audioManager = null;
        this.transitionScreen = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
        this.isHandlingVideoEnd = false;
        
        // Configuration
        this.config = {
            playerId: options.playerId || 'player',
            autoAdvance: options.autoAdvance !== false, // Default true
            enableStorage: options.enableStorage !== false, // Default true
            enableAudioEffects: options.enableAudioEffects !== false, // Default true
            enableTransitionScreen: options.enableTransitionScreen !== false, // Default true
            enableVolumeFade: options.enableVolumeFade !== false, // Default true
            audioVolume: options.audioVolume || 0.7, // Default volume for audio effects
            transitionDuration: options.transitionDuration || 21, // Default transition duration in seconds (matches audio)
            fadeInDuration: options.fadeInDuration || 2, // Default fade-in duration in seconds
            fadeOutDuration: options.fadeOutDuration || 2, // Default fade-out duration in seconds
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
        this.playerManager = new PlayerManager(this.config.playerId, {
            fadeInDuration: this.config.fadeInDuration,
            fadeOutDuration: this.config.fadeOutDuration,
            targetVolume: 100, // Default target volume
            enableVolumeFade: this.config.enableVolumeFade
        });
        
        // Initialize Audio Manager if audio effects are enabled
        if (this.config.enableAudioEffects) {
            this.audioManager = new AudioManager({
                volume: this.config.audioVolume
            });
        }
        
        // Initialize Transition Screen if enabled
        if (this.config.enableTransitionScreen) {
            this.transitionScreen = new TransitionScreen({
                emphasisThreshold: 5 // Last 5 seconds get emphasis
            });
        }
        
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
    async handlePlayerStateChange(event) {
        const state = event.data;
        
        this.emit('player:stateChanged', { 
            state, 
            isPlaying: state === YOUTUBE_PLAYER_STATES.PLAYING 
        });
        
        // Handle ENDED state to advance to next video
        if (state === YOUTUBE_PLAYER_STATES.ENDED && !this.isHandlingVideoEnd && this.config.autoAdvance) {
            devLog('🎬 Engine handling ENDED state - advancing to next video');
            await this.handleVideoEnd();
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
    async handleVideoEnd() {
        if (this.isHandlingVideoEnd) {
            devLog('🚫 Already handling video end, ignoring duplicate call');
            return;
        }
        
        this.isHandlingVideoEnd = true;
        
        const currentIndex = this.playlistManager.getCurrentIndex();
        const currentVideo = this.playlistManager.getCurrentVideo();
        const nextVideo = this.playlistManager.getNextVideo();
        
        // Determine transition duration based on audio length or default
        let transitionDuration = this.config.transitionDuration;
        
        // If we have audio effects enabled, use actual audio duration
        if (this.config.enableAudioEffects && this.audioManager) {
            // Use actual crowd cheers audio duration (21 seconds)
            transitionDuration = 21; // Actual audio duration
        }
        
        // Determine if we should show transition screen
        const shouldShowTransition = this.config.enableTransitionScreen && this.transitionScreen;
        const hasNextOrLoop = this.playlistManager.hasNext();
        
        // Get the next video (considering loop)
        let actualNextVideo = nextVideo;
        if (!nextVideo && this.playlistManager.isLoopEnabled() && this.playlistManager.getLength() > 0) {
            // If we're at the end and loop is enabled, next video is the first one
            actualNextVideo = this.playlistManager.getVideo(0);
        }
        
        // Show transition screen if enabled and we have a next video
        if (shouldShowTransition && actualNextVideo) {
            try {
                devLog('🎬 Showing transition screen...');
                
                // Show transition screen and start countdown
                const transitionPromise = this.transitionScreen.showTransition(actualNextVideo, transitionDuration);
                
                // Play crowd cheers audio during transition if enabled
                let audioPromise = Promise.resolve();
                if (this.config.enableAudioEffects && this.audioManager) {
                    devLog('🎉 Playing crowd cheers audio during transition...');
                    audioPromise = this.audioManager.playCrowdCheers();
                }
                
                // Wait for both transition screen and audio to complete
                await Promise.all([transitionPromise, audioPromise]);
                
                // Ensure transition screen is hidden
                await this.transitionScreen.hideTransition();
                
                devLog('🎬 Transition screen completed and hidden');
                
            } catch (error) {
                console.error('Error during transition:', error);
                // Continue with segment transition even if transition fails
            }
        } else if (this.config.enableAudioEffects && this.audioManager) {
            // If no transition screen but audio is enabled, just play audio
            try {
                devLog('🎉 Playing crowd cheers audio...');
                await this.audioManager.playCrowdCheers();
                devLog('🎉 Crowd cheers audio finished');
            } catch (error) {
                console.error('Failed to play crowd cheers audio:', error);
            }
        }
        
        // Advance to next video
        if (hasNextOrLoop) {
            devLog('Advancing to next video...');
            const success = this.playlistManager.next();
            this.emit('playlist:autoAdvanced', { 
                success, 
                fromIndex: currentIndex,
                toIndex: this.playlistManager.getCurrentIndex(),
                video: currentVideo,
                nextVideo: actualNextVideo,
                isLoopTransition: !nextVideo && this.playlistManager.isLoopEnabled()
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
        
        // Ensure transition screen is hidden when loading new video
        if (this.transitionScreen && this.transitionScreen.isTransitionVisible()) {
            devLog('Hiding transition screen before loading video');
            this.transitionScreen.hideTransition();
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
            isPlaying: this.playerManager?.isPlaying() || false,
            audioEffectsEnabled: this.config.enableAudioEffects,
            audioManagerReady: this.audioManager?.isReady() || false,
            transitionScreenEnabled: this.config.enableTransitionScreen,
            transitionScreenVisible: this.transitionScreen?.isTransitionVisible() || false,
            volumeFadeEnabled: this.config.enableVolumeFade,
            fadeInDuration: this.config.fadeInDuration,
            fadeOutDuration: this.config.fadeOutDuration,
            isVolumeFading: this.playerManager?.isVolumeFading() || false
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
        return this.playlistManager?.isEmpty() ?? true;
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
        
        // Update audio manager volume if it changed
        if (this.audioManager && newConfig.audioVolume !== undefined) {
            this.audioManager.setVolume(newConfig.audioVolume);
        }
        
        this.emit('engine:configUpdated', { config: this.config });
    }

    /**
     * Enable or disable audio effects
     * @param {boolean} enabled - Whether to enable audio effects
     */
    setAudioEffectsEnabled(enabled) {
        this.config.enableAudioEffects = enabled;
        
        if (enabled && !this.audioManager) {
            this.audioManager = new AudioManager({
                volume: this.config.audioVolume
            });
        } else if (!enabled && this.audioManager) {
            this.audioManager.destroy();
            this.audioManager = null;
        }
        
        this.emit('engine:audioEffectsToggled', { enabled });
    }

    /**
     * Set audio volume
     * @param {number} volume - Volume level (0-1)
     */
    setAudioVolume(volume) {
        this.config.audioVolume = Math.max(0, Math.min(1, volume));
        
        if (this.audioManager) {
            this.audioManager.setVolume(volume);
        }
        
        this.emit('engine:audioVolumeChanged', { volume });
    }

    /**
     * Enable or disable transition screen
     * @param {boolean} enabled - Whether to enable transition screen
     */
    setTransitionScreenEnabled(enabled) {
        this.config.enableTransitionScreen = enabled;
        
        if (enabled && !this.transitionScreen) {
            this.transitionScreen = new TransitionScreen({
                emphasisThreshold: 5
            });
        } else if (!enabled && this.transitionScreen) {
            this.transitionScreen.destroy();
            this.transitionScreen = null;
        }
        
        this.emit('engine:transitionScreenToggled', { enabled });
    }

    /**
     * Set transition duration
     * @param {number} duration - Duration in seconds
     */
    setTransitionDuration(duration) {
        this.config.transitionDuration = Math.max(1, Math.min(10, duration));
        this.emit('engine:transitionDurationChanged', { duration });
    }

    /**
     * Enable or disable volume fade effects
     * @param {boolean} enabled - Whether to enable volume fade effects
     */
    setVolumeFadeEnabled(enabled) {
        this.config.enableVolumeFade = enabled;
        
        // Update player manager if it exists
        if (this.playerManager) {
            this.playerManager.enableVolumeFade = enabled;
        }
        
        this.emit('engine:volumeFadeToggled', { enabled });
    }

    /**
     * Set fade-in duration
     * @param {number} duration - Duration in seconds
     */
    setFadeInDuration(duration) {
        this.config.fadeInDuration = Math.max(0.5, Math.min(10, duration));
        
        // Update player manager if it exists
        if (this.playerManager) {
            this.playerManager.fadeInDuration = this.config.fadeInDuration;
        }
        
        this.emit('engine:fadeInDurationChanged', { duration });
    }

    /**
     * Set fade-out duration
     * @param {number} duration - Duration in seconds
     */
    setFadeOutDuration(duration) {
        this.config.fadeOutDuration = Math.max(0.5, Math.min(10, duration));
        
        // Update player manager if it exists
        if (this.playerManager) {
            this.playerManager.fadeOutDuration = this.config.fadeOutDuration;
        }
        
        this.emit('engine:fadeOutDurationChanged', { duration });
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
        
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        
        if (this.transitionScreen) {
            this.transitionScreen.destroy();
        }
        
        this.playerManager = null;
        this.playlistManager = null;
        this.audioManager = null;
        this.transitionScreen = null;
        
        this.isInitialized = false;
        this.isPlayerReady = false;
        
        // Clear event listeners
        this.eventListeners.clear();
        
        this.emit('engine:destroyed');
    }
}
