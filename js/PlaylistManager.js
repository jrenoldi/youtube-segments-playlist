/**
 * YouTube Video Segments Playlist - Playlist Manager
 * Handles playlist operations, storage, and data management
 */

import { 
    extractVideoId, 
    validateVideoData, 
    generateId,
    setStorageItem,
    getStorageItem,
    devLog,
    DEFAULT_VIDEOS
} from './utils.js';

export class PlaylistManager {
    constructor() {
        this.playlist = [];
        this.currentIndex = 0;
        this.loopEnabled = false;
        this.storageKey = 'youtube-segments-playlist';
        
        // Event callbacks
        this.onPlaylistChangeCallback = null;
        this.onCurrentIndexChangeCallback = null;
        this.onLoopToggleCallback = null;
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the playlist manager
     */
    init() {
        devLog('Initializing PlaylistManager');
        // Note: Removed automatic loading from storage and default playlist
        // The playlist will start empty and users can add videos or load playlists manually
        devLog('Playlist initialized empty');
    }

    /**
     * Load default playlist
     */
    loadDefaultPlaylist() {
        devLog('Loading default playlist');
        
        const defaultVideos = DEFAULT_VIDEOS.map(video => ({
            ...video,
            id: generateId(),
            videoId: extractVideoId(video.url),
            dateAdded: new Date().toISOString()
        }));
        
        this.playlist = defaultVideos;
        this.currentIndex = 0;
        this.saveToStorage();
        this.notifyPlaylistChange();
    }

    /**
     * Manually load playlist from storage (optional)
     * @returns {boolean} - True if playlist was loaded
     */
    loadPlaylistFromStorage() {
        const data = getStorageItem(this.storageKey);
        
        if (data && Array.isArray(data.playlist) && data.playlist.length > 0) {
            this.playlist = data.playlist;
            this.currentIndex = Math.max(0, Math.min(data.currentIndex || 0, this.playlist.length - 1));
            this.loopEnabled = data.loopEnabled || false;
            
            this.notifyPlaylistChange();
            this.notifyCurrentIndexChange();
            this.notifyLoopToggle();
            
            devLog('Playlist loaded from storage:', this.playlist.length, 'videos');
            return true;
        }
        
        return false;
    }

    /* ==========================================================================
       Playlist Management
       ========================================================================== */

    /**
     * Add video to playlist
     * @param {Object} videoData - Video data object
     * @returns {Object} - Result with success status and message
     */
    addVideo(videoData) {
        const validation = validateVideoData(videoData);
        
        if (!validation.isValid) {
            return {
                success: false,
                message: validation.errors.join(', ')
            };
        }
        
        const videoId = extractVideoId(videoData.url);
        if (!videoId) {
            return {
                success: false,
                message: 'Invalid YouTube URL or video ID'
            };
        }
        
        // Create video object
        const video = {
            id: generateId(),
            url: videoData.url,
            videoId: videoId,
            startTime: videoData.startTime || 0,
            endTime: videoData.endTime || null,
            title: videoData.title || `Video ${this.playlist.length + 1}`,
            dateAdded: new Date().toISOString()
        };
        
        // Check for duplicates (same video ID and time range)
        const duplicate = this.playlist.find(item => 
            item.videoId === video.videoId &&
            item.startTime === video.startTime &&
            item.endTime === video.endTime
        );
        
        if (duplicate) {
            return {
                success: false,
                message: 'This video segment is already in the playlist'
            };
        }
        
        this.playlist.push(video);
        this.saveToStorage();
        this.notifyPlaylistChange();
        
        devLog('Added video to playlist:', video);
        
        return {
            success: true,
            message: 'Video added to playlist',
            video: video
        };
    }

    /**
     * Remove video from playlist
     * @param {number} index - Index of video to remove
     * @returns {boolean} - Success status
     */
    removeVideo(index) {
        if (index < 0 || index >= this.playlist.length) {
            return false;
        }
        
        const removedVideo = this.playlist.splice(index, 1)[0];
        
        // Adjust current index if necessary
        if (index < this.currentIndex) {
            this.currentIndex--;
        } else if (index === this.currentIndex && this.currentIndex >= this.playlist.length) {
            this.currentIndex = Math.max(0, this.playlist.length - 1);
        }
        
        this.saveToStorage();
        this.notifyPlaylistChange();
        this.notifyCurrentIndexChange();
        
        devLog('Removed video from playlist:', removedVideo);
        return true;
    }

    /**
     * Update video in playlist
     * @param {number} index - Index of video to update
     * @param {Object} videoData - Updated video data
     * @returns {Object} - Result with success status and message
     */
    updateVideo(index, videoData) {
        if (index < 0 || index >= this.playlist.length) {
            return {
                success: false,
                message: 'Invalid video index'
            };
        }
        
        const validation = validateVideoData(videoData);
        
        if (!validation.isValid) {
            return {
                success: false,
                message: validation.errors.join(', ')
            };
        }
        
        const videoId = extractVideoId(videoData.url);
        if (!videoId) {
            return {
                success: false,
                message: 'Invalid YouTube URL or video ID'
            };
        }
        
        // Get existing video to preserve ID and dateAdded
        const existingVideo = this.playlist[index];
        
        // Create updated video object
        const updatedVideo = {
            ...existingVideo,
            url: videoData.url,
            videoId: videoId,
            startTime: videoData.startTime || 0,
            endTime: videoData.endTime || null,
            title: videoData.title || existingVideo.title,
            dateModified: new Date().toISOString()
        };
        
        // Check for duplicates (same video ID and time range) excluding current video
        const duplicate = this.playlist.find((item, idx) => 
            idx !== index &&
            item.videoId === updatedVideo.videoId &&
            item.startTime === updatedVideo.startTime &&
            item.endTime === updatedVideo.endTime
        );
        
        if (duplicate) {
            return {
                success: false,
                message: 'A video with the same URL and time range already exists in the playlist'
            };
        }
        
        // Update the video
        this.playlist[index] = updatedVideo;
        
        // Save to storage
        this.saveToStorage();
        
        // Notify listeners
        this.notifyPlaylistChange();
        
        devLog('Video updated:', updatedVideo.title);
        
        return {
            success: true,
            message: `Updated "${updatedVideo.title}"`
        };
    }

    /**
     * Move video to new position
     * @param {number} fromIndex - Current index
     * @param {number} toIndex - Target index
     * @returns {boolean} - Success status
     */
    moveVideo(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.playlist.length ||
            toIndex < 0 || toIndex >= this.playlist.length ||
            fromIndex === toIndex) {
            return false;
        }
        
        const video = this.playlist.splice(fromIndex, 1)[0];
        this.playlist.splice(toIndex, 0, video);
        
        // Adjust current index
        if (fromIndex === this.currentIndex) {
            this.currentIndex = toIndex;
        } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
            this.currentIndex--;
        } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
            this.currentIndex++;
        }
        
        this.saveToStorage();
        this.notifyPlaylistChange();
        this.notifyCurrentIndexChange();
        
        devLog('Moved video from', fromIndex, 'to', toIndex);
        return true;
    }

    /**
     * Clear entire playlist
     */
    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = 0;
        this.saveToStorage();
        this.notifyPlaylistChange();
        this.notifyCurrentIndexChange();
        
        devLog('Playlist cleared');
    }

    /**
     * Duplicate a video segment
     * @param {number} index - Index of video to duplicate
     * @returns {boolean} - Success status
     */
    duplicateVideo(index) {
        if (index < 0 || index >= this.playlist.length) {
            return false;
        }
        
        const originalVideo = this.playlist[index];
        const duplicatedVideo = {
            ...originalVideo,
            id: generateId(),
            title: `${originalVideo.title} (Copy)`,
            dateAdded: new Date().toISOString()
        };
        
        this.playlist.splice(index + 1, 0, duplicatedVideo);
        this.saveToStorage();
        this.notifyPlaylistChange();
        
        devLog('Duplicated video:', duplicatedVideo);
        return true;
    }

    /* ==========================================================================
       Navigation
       ========================================================================== */

    /**
     * Set current video index
     * @param {number} index - New current index
     * @returns {boolean} - Success status
     */
    setCurrentIndex(index) {
        if (index < 0 || index >= this.playlist.length) {
            return false;
        }
        
        this.currentIndex = index;
        this.notifyCurrentIndexChange();
        
        devLog('Current index set to:', index);
        return true;
    }

    /**
     * Go to next video
     * @returns {boolean} - Success status
     */
    next() {
        if (this.playlist.length === 0) {
            return false;
        }
        
        if (this.currentIndex < this.playlist.length - 1) {
            this.currentIndex++;
            devLog('Advanced to index:', this.currentIndex);
            this.notifyCurrentIndexChange();
            return true;
        } else if (this.loopEnabled) {
            this.currentIndex = 0;
            devLog('Looped to index:', this.currentIndex);
            this.notifyCurrentIndexChange();
            return true;
        }
        
        return false;
    }

    /**
     * Go to previous video
     * @returns {boolean} - Success status
     */
    previous() {
        if (this.playlist.length === 0) {
            return false;
        }
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.notifyCurrentIndexChange();
            return true;
        } else if (this.loopEnabled) {
            this.currentIndex = this.playlist.length - 1;
            this.notifyCurrentIndexChange();
            return true;
        }
        
        return false;
    }

    /**
     * Toggle loop mode
     * @returns {boolean} - New loop status
     */
    toggleLoop() {
        this.loopEnabled = !this.loopEnabled;
        this.saveToStorage();
        this.notifyLoopToggle();
        
        devLog('Loop toggled:', this.loopEnabled);
        return this.loopEnabled;
    }

    /* ==========================================================================
       Getters
       ========================================================================== */

    /**
     * Get current video
     * @returns {Object|null} - Current video object
     */
    getCurrentVideo() {
        return this.playlist[this.currentIndex] || null;
    }

    /**
     * Get video by index
     * @param {number} index - Video index
     * @returns {Object|null} - Video object
     */
    getVideo(index) {
        return this.playlist[index] || null;
    }

    /**
     * Get next video in playlist
     * @returns {Object|null} - Next video object
     */
    getNextVideo() {
        if (this.hasNext()) {
            return this.playlist[this.currentIndex + 1] || null;
        }
        return null;
    }

    /**
     * Get entire playlist
     * @returns {Array} - Playlist array
     */
    getPlaylist() {
        return [...this.playlist];
    }

    /**
     * Get playlist length
     * @returns {number} - Number of videos in playlist
     */
    getLength() {
        return this.playlist.length;
    }

    /**
     * Get current index
     * @returns {number} - Current video index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * Get loop status
     * @returns {boolean} - Loop enabled status
     */
    isLoopEnabled() {
        return this.loopEnabled;
    }

    /**
     * Check if playlist is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return this.playlist.length === 0;
    }

    /**
     * Check if current video is first
     * @returns {boolean} - True if first
     */
    isFirst() {
        return this.currentIndex === 0;
    }

    /**
     * Check if current video is last
     * @returns {boolean} - True if last
     */
    isLast() {
        return this.currentIndex === this.playlist.length - 1;
    }

    /**
     * Check if there's a next video available
     * @returns {boolean} - True if next is available
     */
    hasNext() {
        return this.currentIndex < this.playlist.length - 1 || this.loopEnabled;
    }

    /**
     * Check if there's a previous video available
     * @returns {boolean} - True if previous is available
     */
    hasPrevious() {
        return this.currentIndex > 0 || this.loopEnabled;
    }

    /* ==========================================================================
       Search and Filter
       ========================================================================== */

    /**
     * Search videos by title
     * @param {string} query - Search query
     * @returns {Array} - Matching videos with indices
     */
    searchByTitle(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }
        
        const lowerQuery = query.toLowerCase();
        return this.playlist
            .map((video, index) => ({ video, index }))
            .filter(({ video }) => 
                video.title.toLowerCase().includes(lowerQuery)
            );
    }

    /**
     * Filter videos by duration
     * @param {number} minDuration - Minimum duration in seconds
     * @param {number} maxDuration - Maximum duration in seconds
     * @returns {Array} - Matching videos with indices
     */
    filterByDuration(minDuration = 0, maxDuration = Infinity) {
        return this.playlist
            .map((video, index) => ({ video, index }))
            .filter(({ video }) => {
                const duration = video.endTime ? 
                    video.endTime - video.startTime : 
                    Infinity;
                return duration >= minDuration && duration <= maxDuration;
            });
    }

    /**
     * Get playlist statistics
     * @returns {Object} - Playlist statistics
     */
    getStatistics() {
        if (this.playlist.length === 0) {
            return {
                totalVideos: 0,
                totalDuration: 0,
                averageDuration: 0,
                uniqueVideos: 0
            };
        }
        
        let totalDuration = 0;
        const uniqueVideoIds = new Set();
        
        this.playlist.forEach(video => {
            uniqueVideoIds.add(video.videoId);
            
            if (video.endTime) {
                totalDuration += video.endTime - video.startTime;
            }
        });
        
        return {
            totalVideos: this.playlist.length,
            totalDuration: totalDuration,
            averageDuration: totalDuration / this.playlist.length,
            uniqueVideos: uniqueVideoIds.size
        };
    }

    /* ==========================================================================
       Storage
       ========================================================================== */

    /**
     * Save playlist to localStorage
     */
    saveToStorage() {
        const data = {
            playlist: this.playlist,
            currentIndex: this.currentIndex,
            loopEnabled: this.loopEnabled,
            lastSaved: new Date().toISOString()
        };
        
        setStorageItem(this.storageKey, data);
        devLog('Playlist saved to storage');
    }

    /**
     * Load playlist from localStorage
     */
    loadFromStorage() {
        const data = getStorageItem(this.storageKey);
        
        if (data && Array.isArray(data.playlist)) {
            this.playlist = data.playlist;
            this.currentIndex = Math.max(0, Math.min(data.currentIndex || 0, this.playlist.length - 1));
            this.loopEnabled = data.loopEnabled || false;
            
            devLog('Playlist loaded from storage:', this.playlist.length, 'videos');
        }
    }

    /**
     * Export playlist as JSON
     * @returns {string} - JSON string of playlist
     */
    exportPlaylist() {
        const exportData = {
            playlist: this.playlist,
            loopEnabled: this.loopEnabled,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import playlist from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {Object} - Import result
     */
    importPlaylist(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.playlist || !Array.isArray(data.playlist)) {
                return {
                    success: false,
                    message: 'Invalid playlist format'
                };
            }
            
            // Validate all videos
            const validVideos = [];
            const errors = [];
            
            data.playlist.forEach((video, index) => {
                const validation = validateVideoData(video);
                if (validation.isValid) {
                    validVideos.push({
                        ...video,
                        id: video.id || generateId(),
                        videoId: extractVideoId(video.url),
                        dateAdded: video.dateAdded || new Date().toISOString()
                    });
                } else {
                    errors.push(`Video ${index + 1}: ${validation.errors.join(', ')}`);
                }
            });
            
            if (validVideos.length === 0) {
                return {
                    success: false,
                    message: 'No valid videos found in import data'
                };
            }
            
            this.playlist = validVideos;
            this.currentIndex = 0;
            this.loopEnabled = data.loopEnabled || false;
            
            this.saveToStorage();
            this.notifyPlaylistChange();
            this.notifyCurrentIndexChange();
            
            return {
                success: true,
                message: `Imported ${validVideos.length} videos`,
                imported: validVideos.length,
                errors: errors
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to parse JSON: ' + error.message
            };
        }
    }

    /* ==========================================================================
       Event Callbacks
       ========================================================================== */

    /**
     * Set callback for playlist changes
     * @param {Function} callback - Callback function
     */
    onPlaylistChange(callback) {
        this.onPlaylistChangeCallback = callback;
    }

    /**
     * Set callback for current index changes
     * @param {Function} callback - Callback function
     */
    onCurrentIndexChange(callback) {
        this.onCurrentIndexChangeCallback = callback;
    }

    /**
     * Set callback for loop toggle
     * @param {Function} callback - Callback function
     */
    onLoopToggle(callback) {
        this.onLoopToggleCallback = callback;
    }

    /**
     * Notify playlist change
     */
    notifyPlaylistChange() {
        if (this.onPlaylistChangeCallback) {
            this.onPlaylistChangeCallback(this.getPlaylist());
        }
    }

    /**
     * Notify current index change
     */
    notifyCurrentIndexChange() {
        if (this.onCurrentIndexChangeCallback) {
            this.onCurrentIndexChangeCallback(this.currentIndex, this.getCurrentVideo());
        }
    }

    /**
     * Notify loop toggle
     */
    notifyLoopToggle() {
        if (this.onLoopToggleCallback) {
            this.onLoopToggleCallback(this.loopEnabled);
        }
    }
}
