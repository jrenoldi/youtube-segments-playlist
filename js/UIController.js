/**
 * YouTube Video Segments Playlist - UI Controller
 * Handles DOM manipulation, user interactions, and UI updates
 */

import { 
    getElementById,
    querySelector,
    createElement,
    preventDefault,
    formatTime,
    extractVideoId,
    KEYBOARD_SHORTCUTS,
    devLog
} from './utils.js';
import { VideoSegmentModal } from './VideoSegmentModal.js';

export class UIController {
    constructor() {
        this.elements = {};
        this.eventListeners = [];
        this.videoSegmentModal = null;
        
        // Callbacks
        this.onVideoAddCallback = null;
        this.onVideoEditCallback = null;
        this.onVideoRemoveCallback = null;
        this.onVideoSelectCallback = null;
        this.onPlayPauseCallback = null;
        this.onNextCallback = null;
        this.onPreviousCallback = null;
        this.onLoopToggleCallback = null;
        this.onLoadPlaylistCallback = null;
        this.onSavePlaylistCallback = null;
        this.onTransitionToggleCallback = null;
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize UI controller
     */
    init() {
        devLog('Initializing UIController');
        this.cacheElements();
        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.initializeVideoSegmentModal();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Player elements
            player: getElementById('player'),
            prevBtn: getElementById('prev-btn'),
            playPauseBtn: getElementById('play-pause-btn'),
            nextBtn: getElementById('next-btn'),
            loopBtn: getElementById('loop-btn'),
            loopStatus: getElementById('loop-status'),
            transitionsBtn: getElementById('transitions-btn'),
            transitionsStatus: getElementById('transitions-status'),
            
            // Status elements
            currentInfo: getElementById('current-info'),
            progressFill: getElementById('progress-fill'),
            
            // Add video button
            addVideoBtn: getElementById('add-video-btn'),
            
            // Playlist elements
            playlist: getElementById('playlist'),
            playlistName: getElementById('playlist-name'),
            loadPlaylistBtn: getElementById('load-playlist-btn'),
            savePlaylistBtn: getElementById('save-playlist-btn'),
            playlistFileInput: getElementById('playlist-file-input')
        };
        
        // Validate required elements
        const requiredElements = ['playPauseBtn', 'nextBtn', 'prevBtn', 'playlist', 'addVideoBtn'];
        requiredElements.forEach(elementKey => {
            if (!this.elements[elementKey]) {
                console.error(`Required element not found: ${elementKey}`);
            }
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Control buttons
        this.addEventListenerSafe(this.elements.prevBtn, 'click', () => {
            if (this.onPreviousCallback) this.onPreviousCallback();
        });
        
        this.addEventListenerSafe(this.elements.playPauseBtn, 'click', () => {
            if (this.onPlayPauseCallback) this.onPlayPauseCallback();
        });
        
        this.addEventListenerSafe(this.elements.nextBtn, 'click', () => {
            if (this.onNextCallback) this.onNextCallback();
        });
        
        this.addEventListenerSafe(this.elements.loopBtn, 'click', () => {
            if (this.onLoopToggleCallback) this.onLoopToggleCallback();
        });
        
        // Add video button
        this.addEventListenerSafe(this.elements.addVideoBtn, 'click', () => {
            this.openAddVideoModal();
        });
        
        // Playlist management events
        this.addEventListenerSafe(this.elements.loadPlaylistBtn, 'click', () => {
            this.handleLoadPlaylist();
        });
        
        this.addEventListenerSafe(this.elements.savePlaylistBtn, 'click', () => {
            this.handleSavePlaylist();
        });
        
        this.addEventListenerSafe(this.elements.playlistFileInput, 'change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Transition settings
        this.addEventListenerSafe(this.elements.transitionsBtn, 'click', () => {
            if (this.onTransitionToggleCallback) {
                const currentState = this.getTransitionEnabled();
                const newState = !currentState;
                
                console.log('Transition button clicked:', { currentState, newState });
                console.log('transitionsStatus element:', this.elements.transitionsStatus);
                console.log('transitionsStatus textContent:', this.elements.transitionsStatus?.textContent);
                
                // Update UI button text immediately
                this.setTransitionEnabled(newState);
                
                console.log('After setTransitionEnabled:', this.elements.transitionsStatus?.textContent);
                
                // Notify engine of the change
                this.onTransitionToggleCallback(newState);
            }
        });
        
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.addEventListenerSafe(document, 'keydown', (event) => {
            // Don't handle shortcuts when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key) {
                case KEYBOARD_SHORTCUTS.SPACE:
                    preventDefault(event);
                    if (this.onPlayPauseCallback) this.onPlayPauseCallback();
                    break;
                    
                case KEYBOARD_SHORTCUTS.ARROW_RIGHT:
                    preventDefault(event);
                    if (this.onNextCallback) this.onNextCallback();
                    break;
                    
                case KEYBOARD_SHORTCUTS.ARROW_LEFT:
                    preventDefault(event);
                    if (this.onPreviousCallback) this.onPreviousCallback();
                    break;
                    
                case KEYBOARD_SHORTCUTS.LOOP_TOGGLE:
                    preventDefault(event);
                    if (this.onLoopToggleCallback) this.onLoopToggleCallback();
                    break;
                    
                case KEYBOARD_SHORTCUTS.ESCAPE:
                    // Close modal if open
                    if (this.videoSegmentModal && this.videoSegmentModal.isOpen()) {
                        preventDefault(event);
                        this.videoSegmentModal.closeModal();
                    }
                    break;
            }
        });
    }

    /**
     * Safely add event listener with cleanup tracking
     */
    addEventListenerSafe(element, event, handler, options = {}) {
        if (!element) return;
        
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Initialize the video segment modal
     */
    initializeVideoSegmentModal() {
        this.videoSegmentModal = new VideoSegmentModal('modal-container');
        
        // Set up modal callbacks
        this.videoSegmentModal.onVideoAdd((videoData) => {
            if (this.onVideoAddCallback) {
                this.onVideoAddCallback(videoData);
            }
        });
        
        this.videoSegmentModal.onVideoEdit((videoData, index) => {
            if (this.onVideoEditCallback) {
                this.onVideoEditCallback(videoData, index);
            }
        });
        
        this.videoSegmentModal.onModalClose(() => {
            // Modal closed callback if needed
        });
        
        devLog('VideoSegmentModal initialized');
    }

    /**
     * Open the add video modal
     */
    openAddVideoModal() {
        if (this.videoSegmentModal) {
            this.videoSegmentModal.openAddMode();
        }
    }

    /**
     * Open the edit video modal
     * @param {Object} videoData - Video data to edit
     * @param {number} index - Index of the video being edited
     */
    openEditVideoModal(videoData, index) {
        if (this.videoSegmentModal) {
            this.videoSegmentModal.openEditMode(videoData, index);
        }
    }



    /* ==========================================================================
       Playlist Management
       ========================================================================== */

    /**
     * Handle load playlist button click
     */
    handleLoadPlaylist() {
        if (this.elements.playlistFileInput) {
            this.elements.playlistFileInput.click();
        }
    }

    /**
     * Handle save playlist button click
     */
    handleSavePlaylist() {
        const playlistName = this.getPlaylistName();
        
        if (this.onSavePlaylistCallback) {
            this.onSavePlaylistCallback(playlistName);
        }
    }

    /**
     * Handle file selection for playlist loading
     * @param {Event} event - File input change event
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            this.showError('Please select a valid JSON file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const playlistData = JSON.parse(e.target.result);
                
                if (this.onLoadPlaylistCallback) {
                    this.onLoadPlaylistCallback(playlistData);
                }
                
                // Clear the file input
                event.target.value = '';
                
            } catch (error) {
                console.error('Failed to parse playlist file:', error);
                this.showError('Invalid playlist file format');
            }
        };
        
        reader.onerror = () => {
            this.showError('Failed to read playlist file');
        };
        
        reader.readAsText(file);
    }

    /**
     * Get current playlist name
     * @returns {string} - Playlist name
     */
    getPlaylistName() {
        return this.elements.playlistName?.value?.trim() || 'My Karaoke Playlist';
    }

    /**
     * Set playlist name
     * @param {string} name - Playlist name
     */
    setPlaylistName(name) {
        if (this.elements.playlistName) {
            this.elements.playlistName.value = name || '';
        }
    }

    /**
     * Get transition setting
     * @returns {boolean} - Whether transitions are enabled
     */
    getTransitionEnabled() {
        return this.elements.transitionsStatus?.textContent === 'ON';
    }

    /**
     * Set transition setting
     * @param {boolean} enabled - Whether to enable transitions
     */
    setTransitionEnabled(enabled) {
        console.log('setTransitionEnabled called with:', enabled);
        console.log('transitionsStatus element:', this.elements.transitionsStatus);
        
        if (this.elements.transitionsStatus) {
            this.elements.transitionsStatus.textContent = enabled ? 'ON' : 'OFF';
            console.log('Updated textContent to:', this.elements.transitionsStatus.textContent);
        } else {
            console.log('transitionsStatus element not found!');
        }
    }

    /**
     * Export playlist data as JSON file
     * @param {Object} playlistData - Playlist data to export
     * @param {string} filename - Filename for the export
     */
    exportPlaylistFile(playlistData, filename = 'playlist.json') {
        try {
            const jsonString = JSON.stringify(playlistData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const downloadLink = createElement('a', {
                href: url,
                download: filename,
                style: 'display: none'
            });
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            this.showSuccess(`Playlist exported as "${filename}"`);
            
        } catch (error) {
            console.error('Failed to export playlist:', error);
            this.showError('Failed to export playlist');
        }
    }

    /**
     * Update save button state based on playlist content
     * @param {boolean} hasItems - Whether playlist has items
     */
    updateSaveButtonState(hasItems) {
        if (this.elements.savePlaylistBtn) {
            this.elements.savePlaylistBtn.disabled = !hasItems;
        }
    }

    /* ==========================================================================
       Playlist UI Management
       ========================================================================== */

    /**
     * Update playlist display
     * @param {Array} playlist - Playlist array
     * @param {number} currentIndex - Current video index
     */
    updatePlaylist(playlist, currentIndex = -1) {
        if (!this.elements.playlist) return;
        
        this.elements.playlist.innerHTML = '';
        
        if (playlist.length === 0) {
            this.elements.playlist.innerHTML = '<p class="empty-playlist">No videos in playlist</p>';
            return;
        }
        
        playlist.forEach((video, index) => {
            const playlistItem = this.createPlaylistItem(video, index, index === currentIndex);
            this.elements.playlist.appendChild(playlistItem);
        });
    }

    /**
     * Create playlist item element
     * @param {Object} video - Video data
     * @param {number} index - Video index
     * @param {boolean} isActive - Whether this is the current video
     * @returns {HTMLElement} - Playlist item element
     */
    createPlaylistItem(video, index, isActive = false) {
        const endTimeText = video.endTime ? formatTime(video.endTime) : 'End';
        const timeInfo = `${formatTime(video.startTime)} - ${endTimeText}`;
        
        const item = createElement('div', {
            className: `playlist-item ${isActive ? 'active' : ''}`,
            dataset: { index: index }
        });
        
        // Make item focusable for keyboard navigation
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Play ${video.title}`);
        
        const content = createElement('div', {}, `
            <h4>${this.escapeHtml(video.title)}</h4>
            <div class="time-info">${timeInfo}</div>
        `);
        
        const editBtn = createElement('button', {
            className: 'btn btn-outline edit-btn',
            'aria-label': `Edit ${video.title}`
        }, 'Edit');
        
        const removeBtn = createElement('button', {
            className: 'btn btn-secondary remove-btn',
            'aria-label': `Remove ${video.title}`
        }, 'Remove');
        
        // Event listeners
        const playHandler = (e) => {
            if (e.target === removeBtn || e.target === editBtn) return;
            if (this.onVideoSelectCallback) {
                this.onVideoSelectCallback(index);
            }
        };
        
        const editHandler = (e) => {
            preventDefault(e);
            this.openEditVideoModal(video, index);
        };
        
        const removeHandler = (e) => {
            preventDefault(e);
            if (this.onVideoRemoveCallback) {
                this.onVideoRemoveCallback(index);
            }
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                preventDefault(e);
                playHandler(e);
            }
        };
        
        item.addEventListener('click', playHandler);
        item.addEventListener('keydown', keyHandler);
        editBtn.addEventListener('click', editHandler);
        removeBtn.addEventListener('click', removeHandler);
        
        item.appendChild(content);
        item.appendChild(editBtn);
        item.appendChild(removeBtn);
        
        return item;
    }

    /**
     * Highlight current playlist item
     * @param {number} currentIndex - Index of current video
     */
    highlightCurrentItem(currentIndex) {
        if (!this.elements.playlist) return;
        
        // Remove active class from all items
        const items = this.elements.playlist.querySelectorAll('.playlist-item');
        items.forEach(item => item.classList.remove('active'));
        
        // Add active class to current item
        const currentItem = this.elements.playlist.querySelector(`[data-index="${currentIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            
            // Scroll into view if needed
            currentItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    /* ==========================================================================
       Player Status Updates
       ========================================================================== */

    /**
     * Update current video info display
     * @param {Object} video - Current video data
     * @param {number} currentIndex - Current video index
     * @param {number} totalVideos - Total number of videos
     */
    updateCurrentInfo(video, currentIndex, totalVideos) {
        if (!this.elements.currentInfo) return;
        
        if (!video) {
            this.elements.currentInfo.innerHTML = 'No video loaded';
            return;
        }
        
        const endTimeText = video.endTime ? formatTime(video.endTime) : 'End';
        const videoNumber = currentIndex + 1;
        
        this.elements.currentInfo.innerHTML = `
            <strong>${this.escapeHtml(video.title)}</strong><br>
            Segment: ${formatTime(video.startTime)} - ${endTimeText}<br>
            Video ${videoNumber} of ${totalVideos}
        `;
    }

    /**
     * Update progress bar
     * @param {Object} progressData - Progress information
     */
    updateProgress(progressData) {
        if (!this.elements.progressFill) return;
        
        const { progressPercent } = progressData;
        this.elements.progressFill.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
    }

    /**
     * Update loop status display
     * @param {boolean} loopEnabled - Loop status
     */
    updateLoopStatus(loopEnabled) {
        if (this.elements.loopStatus) {
            this.elements.loopStatus.textContent = loopEnabled ? 'ON' : 'OFF';
        }
        
        if (this.elements.loopBtn) {
            this.elements.loopBtn.setAttribute('aria-pressed', loopEnabled.toString());
        }
    }

    /**
     * Update control buttons state
     * @param {Object} state - Button states
     */
    updateControlButtons(state = {}) {
        const { hasNext = true, hasPrevious = true, isPlaying = false } = state;
        
        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = !hasNext;
        }
        
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = !hasPrevious;
        }
        
        if (this.elements.playPauseBtn) {
            const icon = isPlaying ? '⏸' : '▶';
            const text = isPlaying ? 'Pause' : 'Play';
            this.elements.playPauseBtn.innerHTML = `${icon} ${text}`;
            this.elements.playPauseBtn.setAttribute('aria-label', text);
        }
    }

    /* ==========================================================================
       Feedback and Notifications
       ========================================================================== */

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show info message
     * @param {string} message - Info message
     */
    showInfo(message) {
        this.showNotification(message, 'info');
    }

    /**
     * Show notification
     * @param {string} message - Message text
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = createElement('div', {
            className: `notification notification-${type}`,
            role: 'alert',
            'aria-live': 'polite'
        }, message);
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Show loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        const container = querySelector('.container');
        if (container) {
            if (loading) {
                container.classList.add('loading');
            } else {
                container.classList.remove('loading');
            }
        }
    }

    /* ==========================================================================
       Event Callback Registration
       ========================================================================== */

    /**
     * Set video add callback
     * @param {Function} callback - Callback function
     */
    onVideoAdd(callback) {
        this.onVideoAddCallback = callback;
    }

    /**
     * Set video edit callback
     * @param {Function} callback - Callback function
     */
    onVideoEdit(callback) {
        this.onVideoEditCallback = callback;
    }

    /**
     * Set video remove callback
     * @param {Function} callback - Callback function
     */
    onVideoRemove(callback) {
        this.onVideoRemoveCallback = callback;
    }

    /**
     * Set video select callback
     * @param {Function} callback - Callback function
     */
    onVideoSelect(callback) {
        this.onVideoSelectCallback = callback;
    }

    /**
     * Set play/pause callback
     * @param {Function} callback - Callback function
     */
    onPlayPause(callback) {
        this.onPlayPauseCallback = callback;
    }

    /**
     * Set next callback
     * @param {Function} callback - Callback function
     */
    onNext(callback) {
        this.onNextCallback = callback;
    }

    /**
     * Set previous callback
     * @param {Function} callback - Callback function
     */
    onPrevious(callback) {
        this.onPreviousCallback = callback;
    }

    /**
     * Set loop toggle callback
     * @param {Function} callback - Callback function
     */
    onLoopToggle(callback) {
        this.onLoopToggleCallback = callback;
    }

    /**
     * Set load playlist callback
     * @param {Function} callback - Callback function
     */
    onLoadPlaylist(callback) {
        this.onLoadPlaylistCallback = callback;
    }

    /**
     * Set save playlist callback
     * @param {Function} callback - Callback function
     */
    onSavePlaylist(callback) {
        this.onSavePlaylistCallback = callback;
    }

    /**
     * Set transition toggle callback
     * @param {Function} callback - Callback function
     */
    onTransitionToggle(callback) {
        this.onTransitionToggleCallback = callback;
    }

    /* ==========================================================================
       Utility Methods
       ========================================================================== */

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Focus on specific element
     * @param {string} elementId - Element ID to focus
     */
    focusElement(elementId) {
        const element = getElementById(elementId);
        if (element) {
            element.focus();
        }
    }

    /**
     * Scroll to element
     * @param {string} elementId - Element ID to scroll to
     */
    scrollToElement(elementId) {
        const element = getElementById(elementId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy UI controller and clean up event listeners
     */
    destroy() {
        devLog('Destroying UIController');
        
        // Clean up video segment modal
        if (this.videoSegmentModal) {
            this.videoSegmentModal.destroy();
            this.videoSegmentModal = null;
        }
        
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        
        this.eventListeners = [];
        this.elements = {};
        
        // Clear callbacks
        this.onVideoAddCallback = null;
        this.onVideoEditCallback = null;
        this.onVideoRemoveCallback = null;
        this.onVideoSelectCallback = null;
        this.onPlayPauseCallback = null;
        this.onNextCallback = null;
        this.onPreviousCallback = null;
        this.onLoopToggleCallback = null;
        this.onLoadPlaylistCallback = null;
        this.onSavePlaylistCallback = null;
        this.onTransitionToggleCallback = null;
    }
}
