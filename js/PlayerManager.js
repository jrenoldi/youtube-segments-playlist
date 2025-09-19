/**
 * YouTube Video Segments Playlist - Player Manager
 * Handles YouTube IFrame API integration and player controls
 */

import { 
    YOUTUBE_PLAYER_STATES, 
    DEFAULT_PLAYER_CONFIG, 
    devLog,
    throttle 
} from './utils.js';

export class PlayerManager {
    constructor(playerId, options = {}) {
        this.playerId = playerId;
        this.player = null;
        this.isReady = false;
        this.currentVideoData = null;
        this.progressInterval = null;
        this.config = { ...DEFAULT_PLAYER_CONFIG, ...options };
        
        // Event callbacks
        this.onReadyCallback = null;
        this.onStateChangeCallback = null;
        this.onErrorCallback = null;
        this.onProgressCallback = null;
        
        // Segment end tracking to prevent race conditions
        this.hasSegmentEnded = false;
        
        // Volume fade management
        this.fadeInDuration = options.fadeInDuration || 2; // Default 2 seconds
        this.fadeOutDuration = options.fadeOutDuration || 2; // Default 2 seconds
        this.targetVolume = options.targetVolume || 100; // Default volume
        this.enableVolumeFade = options.enableVolumeFade !== false; // Default true
        this.isFading = false;
        this.fadeInterval = null;
        
        // Throttled progress update
        this.throttledProgressUpdate = throttle(() => {
            this.updateProgress();
        }, 100);
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the YouTube player
     */
    init() {
        devLog('Initializing PlayerManager');
        
        if (typeof YT === 'undefined' || !YT.Player) {
            devLog('YouTube API not ready, waiting...');
            this.waitForYouTubeAPI();
        } else {
            this.createPlayer();
        }
    }

    /**
     * Wait for YouTube API to be ready
     */
    waitForYouTubeAPI() {
        const checkAPI = () => {
            if (typeof YT !== 'undefined' && YT.Player) {
                this.createPlayer();
            } else {
                setTimeout(checkAPI, 100);
            }
        };
        checkAPI();
    }

    /**
     * Create the YouTube player instance
     */
    createPlayer() {
        try {
            this.player = new YT.Player(this.playerId, {
                ...this.config,
                events: {
                    onReady: (event) => this.handlePlayerReady(event),
                    onStateChange: (event) => this.handleStateChange(event),
                    onError: (event) => this.handleError(event)
                }
            });
            devLog('YouTube player created');
        } catch (error) {
            console.error('Failed to create YouTube player:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error);
            }
        }
    }

    /* ==========================================================================
       Event Handlers
       ========================================================================== */

    /**
     * Handle player ready event
     */
    handlePlayerReady(event) {
        devLog('Player ready');
        this.isReady = true;
        
        if (this.onReadyCallback) {
            this.onReadyCallback(event);
        }
    }

    /**
     * Handle player state changes
     */
    handleStateChange(event) {
        const state = event.data;
        const stateNames = {
            [-1]: 'UNSTARTED',
            [0]: 'ENDED',
            [1]: 'PLAYING', 
            [2]: 'PAUSED',
            [3]: 'BUFFERING',
            [5]: 'CUED'
        };
        
        // Only log important state changes
        if (state === YOUTUBE_PLAYER_STATES.PLAYING || state === YOUTUBE_PLAYER_STATES.ENDED) {
            devLog('Player state changed:', state, `(${stateNames[state] || 'UNKNOWN'})`);
        }
        
        switch (state) {
            case YOUTUBE_PLAYER_STATES.PLAYING:
                this.startProgressTracking();
                break;
            case YOUTUBE_PLAYER_STATES.PAUSED:
            case YOUTUBE_PLAYER_STATES.ENDED:
            case YOUTUBE_PLAYER_STATES.BUFFERING:
                this.stopProgressTracking();
                break;
        }
        
        // NEW APPROACH: Only handle ENDED state, let checkSegmentEnd handle everything else
        if (state === YOUTUBE_PLAYER_STATES.ENDED) {
            devLog('Video ended - delegating to segment end handler');
            this.handleVideoEnd();
        }
        
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(event);
        }
    }

    /**
     * Handle player errors
     */
    handleError(event) {
        console.error('YouTube player error:', event.data);
        
        const errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not allowed to be played in embedded players',
            150: 'Video not allowed to be played in embedded players'
        };
        
        const errorMessage = errorMessages[event.data] || 'Unknown player error';
        devLog('Player error:', errorMessage);
        
        if (this.onErrorCallback) {
            this.onErrorCallback(event, errorMessage);
        }
    }

    /**
     * Handle video end - check if segment should end early
     */
    handleVideoEnd() {
        devLog('Video ended');
        this.stopProgressTracking();
    }

    /* ==========================================================================
       Player Control Methods
       ========================================================================== */

    /**
     * Load and play a video segment - SIMPLIFIED APPROACH
     * @param {Object} videoData - Video data with url, startTime, endTime, title
     */
    loadVideo(videoData) {
        if (!this.isReady || !videoData) {
            devLog('Player not ready or invalid video data');
            return false;
        }

        this.currentVideoData = videoData;
        // Reset segment end flag for new video
        this.hasSegmentEnded = false;
        
        try {
            const loadOptions = {
                videoId: videoData.videoId,
                startSeconds: videoData.startTime || 0
            };
            
            // Only set endSeconds if it's specified and valid
            if (videoData.endTime && videoData.endTime > (videoData.startTime || 0)) {
                loadOptions.endSeconds = videoData.endTime;
            }
            
            devLog('🎬 Loading video:', videoData.title);
            
            // Handle volume based on fade settings (per-segment or global)
            const segmentFadeEnabled = videoData.enableFade !== undefined ? videoData.enableFade : this.enableVolumeFade;
            
            
            if (segmentFadeEnabled) {
                // Start with volume 0 for fade-in effect
                this.player.setVolume(0);
                this.player.loadVideoById(loadOptions);
                
                // Start fade-in after a short delay to ensure video is loading
                setTimeout(() => {
                    this.fadeIn();
                }, 500);
            } else {
                // Set volume to target level immediately
                this.player.setVolume(this.targetVolume);
                this.player.loadVideoById(loadOptions);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load video:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error, 'Failed to load video');
            }
            return false;
        }
    }

    /**
     * Play the current video
     */
    play() {
        if (this.isReady && this.player.playVideo) {
            this.player.playVideo();
        }
    }

    /**
     * Pause the current video
     */
    pause() {
        if (this.isReady && this.player.pauseVideo) {
            this.player.pauseVideo();
        }
    }

    /**
     * Stop the current video
     */
    stop() {
        if (this.isReady && this.player.stopVideo) {
            this.player.stopVideo();
            this.stopProgressTracking();
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.isReady) return;
        
        const state = this.getPlayerState();
        if (state === YOUTUBE_PLAYER_STATES.PLAYING) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek to specific time
     * @param {number} seconds - Time in seconds
     */
    seekTo(seconds) {
        if (this.isReady && this.player.seekTo) {
            this.player.seekTo(seconds, true);
        }
    }

    /**
     * Set volume (0-100)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        if (this.isReady && this.player.setVolume) {
            this.player.setVolume(Math.max(0, Math.min(100, volume)));
        }
    }

    /**
     * Fade volume from current level to target level
     * @param {number} targetVolume - Target volume level (0-100)
     * @param {number} duration - Fade duration in seconds
     * @returns {Promise} - Resolves when fade completes
     */
    fadeVolume(targetVolume, duration) {
        return new Promise((resolve) => {
            if (!this.isReady || !this.player.setVolume) {
                resolve();
                return;
            }

            // Stop any existing fade
            this.stopFade();

            const startVolume = this.getVolume();
            const volumeDifference = targetVolume - startVolume;
            const steps = Math.max(1, Math.floor(duration * 10)); // 10 updates per second
            const volumeStep = volumeDifference / steps;
            const stepDuration = duration * 1000 / steps; // Convert to milliseconds

            this.isFading = true;
            let currentStep = 0;

            this.fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = startVolume + (volumeStep * currentStep);
                const clampedVolume = Math.max(0, Math.min(100, newVolume));
                
                this.player.setVolume(clampedVolume);

                if (currentStep >= steps) {
                    this.stopFade();
                    resolve();
                }
            }, stepDuration);
        });
    }

    /**
     * Fade in volume from 0 to target volume
     * @param {number} duration - Fade duration in seconds
     * @returns {Promise} - Resolves when fade completes
     */
    fadeIn(duration = this.fadeInDuration) {
        devLog(`🎵 Fading in volume over ${duration} seconds`);
        return this.fadeVolume(this.targetVolume, duration);
    }

    /**
     * Fade out volume to 0
     * @param {number} duration - Fade duration in seconds
     * @returns {Promise} - Resolves when fade completes
     */
    fadeOut(duration = this.fadeOutDuration) {
        devLog(`🎵 Fading out volume over ${duration} seconds`);
        return this.fadeVolume(0, duration);
    }

    /**
     * Stop any active volume fade
     */
    stopFade() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        this.isFading = false;
    }

    /**
     * Check if volume is currently fading
     * @returns {boolean} - True if fading
     */
    isVolumeFading() {
        return this.isFading;
    }

    /* ==========================================================================
       Player State Methods
       ========================================================================== */

    /**
     * Get current player state
     * @returns {number} - Player state
     */
    getPlayerState() {
        return this.isReady && this.player.getPlayerState ? 
            this.player.getPlayerState() : 
            YOUTUBE_PLAYER_STATES.UNSTARTED;
    }

    /**
     * Get current playback time
     * @returns {number} - Current time in seconds
     */
    getCurrentTime() {
        return this.isReady && this.player.getCurrentTime ? 
            this.player.getCurrentTime() : 0;
    }

    /**
     * Get video duration
     * @returns {number} - Duration in seconds
     */
    getDuration() {
        return this.isReady && this.player.getDuration ? 
            this.player.getDuration() : 0;
    }

    /**
     * Get current volume
     * @returns {number} - Volume level (0-100)
     */
    getVolume() {
        return this.isReady && this.player.getVolume ? 
            this.player.getVolume() : 50;
    }

    /**
     * Check if player is playing
     * @returns {boolean} - True if playing
     */
    isPlaying() {
        return this.getPlayerState() === YOUTUBE_PLAYER_STATES.PLAYING;
    }

    /**
     * Check if player is paused
     * @returns {boolean} - True if paused
     */
    isPaused() {
        return this.getPlayerState() === YOUTUBE_PLAYER_STATES.PAUSED;
    }

    /**
     * Check if video has ended
     * @returns {boolean} - True if ended
     */
    hasEnded() {
        return this.getPlayerState() === YOUTUBE_PLAYER_STATES.ENDED;
    }

    /* ==========================================================================
       Progress Tracking
       ========================================================================== */

    /**
     * Start tracking playback progress
     */
    startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => {
            this.throttledProgressUpdate();
            this.checkSegmentEnd();
        }, 100);
    }

    /**
     * Stop tracking playback progress
     */
    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Update progress and notify callback
     */
    updateProgress() {
        if (!this.currentVideoData || !this.onProgressCallback) return;
        
        const currentTime = this.getCurrentTime();
        const startTime = this.currentVideoData.startTime || 0;
        const endTime = this.currentVideoData.endTime || this.getDuration();
        
        const segmentDuration = endTime - startTime;
        const segmentProgress = Math.max(0, currentTime - startTime);
        const progressPercent = segmentDuration > 0 ? 
            Math.min(100, (segmentProgress / segmentDuration) * 100) : 0;
        
        this.onProgressCallback({
            currentTime,
            startTime,
            endTime,
            segmentProgress,
            progressPercent,
            totalDuration: this.getDuration()
        });
    }

    /**
     * Check if segment should end - NEW SIMPLIFIED APPROACH
     */
    checkSegmentEnd() {
        if (!this.currentVideoData || !this.currentVideoData.endTime || this.hasSegmentEnded) {
            return;
        }
        
        const currentTime = this.getCurrentTime();
        const endTime = this.currentVideoData.endTime;
        
        // Check if we should start fade-out (per-segment or global)
        const segmentFadeEnabled = this.currentVideoData.enableFade !== undefined ? this.currentVideoData.enableFade : this.enableVolumeFade;
        
        if (segmentFadeEnabled) {
            const fadeOutStartTime = endTime - this.fadeOutDuration;
            if (currentTime >= fadeOutStartTime && !this.hasSegmentEnded && !this.isVolumeFading()) {
                devLog('🎵 Starting fade-out for segment end');
                this.fadeOut();
            }
        }
        
        // End segment if we've reached or passed the end time
        if (currentTime >= endTime) {
            devLog('🎯 SEGMENT END DETECTED:', {
                currentTime: currentTime.toFixed(2),
                endTime,
                videoTitle: this.currentVideoData.title
            });
            
            this.hasSegmentEnded = true;
            this.stopProgressTracking();
            
            // CRITICAL FIX: Don't call stopVideo() - let it end naturally
            // Just trigger the app's video end handler via callback
            if (this.onStateChangeCallback) {
                devLog('🚀 Triggering app video end handler...');
                this.onStateChangeCallback({ data: YOUTUBE_PLAYER_STATES.ENDED });
            }
        }
    }

    /* ==========================================================================
       Event Registration
       ========================================================================== */

    /**
     * Set callback for player ready event
     * @param {Function} callback - Callback function
     */
    onReady(callback) {
        this.onReadyCallback = callback;
    }

    /**
     * Set callback for state change events
     * @param {Function} callback - Callback function
     */
    onStateChange(callback) {
        this.onStateChangeCallback = callback;
    }

    /**
     * Set callback for error events
     * @param {Function} callback - Callback function
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Set callback for progress updates
     * @param {Function} callback - Callback function
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy the player and clean up resources
     */
    destroy() {
        devLog('Destroying PlayerManager');
        
        this.stopProgressTracking();
        this.stopFade();
        
        if (this.player && this.player.destroy) {
            try {
                this.player.destroy();
            } catch (error) {
                console.error('Error destroying player:', error);
            }
        }
        
        this.player = null;
        this.isReady = false;
        this.currentVideoData = null;
        this.hasSegmentEnded = false;
        this.isFading = false;
        this.onReadyCallback = null;
        this.onStateChangeCallback = null;
        this.onErrorCallback = null;
        this.onProgressCallback = null;
    }

    /* ==========================================================================
       Utility Methods
       ========================================================================== */

    /**
     * Check if current segment has ended
     * @returns {boolean} - True if segment has ended
     */
    getHasSegmentEnded() {
        return this.hasSegmentEnded;
    }

    /**
     * Get player info for debugging
     * @returns {Object} - Player information
     */
    getPlayerInfo() {
        if (!this.isReady) {
            return { ready: false };
        }
        
        return {
            ready: true,
            state: this.getPlayerState(),
            currentTime: this.getCurrentTime(),
            duration: this.getDuration(),
            volume: this.getVolume(),
            currentVideo: this.currentVideoData,
            hasSegmentEnded: this.hasSegmentEnded
        };
    }
}
