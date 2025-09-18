/**
 * YouTube Video Segments Playlist - Video Segment Modal
 * Isolated module for handling video segment addition and editing
 */

import { 
    getElementById,
    querySelector,
    createElement,
    addEventListener,
    preventDefault,
    formatTime,
    extractVideoId,
    devLog
} from './utils.js';

export class VideoSegmentModal {
    constructor(containerId = 'modal-container') {
        this.containerId = containerId;
        this.container = null;
        this.elements = {};
        this.eventListeners = [];
        this.previewPlayer = null;
        this.isEditMode = false;
        this.editIndex = null;
        
        // Callbacks
        this.onVideoAddCallback = null;
        this.onVideoEditCallback = null;
        this.onModalCloseCallback = null;
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the modal
     */
    init() {
        devLog('Initializing VideoSegmentModal');
        this.createModalHTML();
        this.cacheElements();
        this.bindEvents();
    }

    /**
     * Create modal HTML structure
     */
    createModalHTML() {
        // Find or create container
        this.container = getElementById(this.containerId);
        if (!this.container) {
            this.container = createElement('div', { id: this.containerId });
            document.body.appendChild(this.container);
        }

        // Create modal HTML with Bootstrap components
        this.container.innerHTML = `
            <div id="video-segment-modal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="modal-title" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-gradient-primary text-white">
                            <h4 class="modal-title" id="modal-title">
                                <i class="bi bi-plus-circle me-2"></i>Add New Video Segment
                            </h4>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        
                        <div class="modal-body">
                            <form id="video-segment-form">
                                <!-- Video URL Section -->
                                <div class="mb-4">
                                    <label for="video-url" class="form-label fw-semibold">
                                        <i class="bi bi-link-45deg me-1"></i>YouTube URL or Video ID:
                                    </label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="video-url" 
                                               placeholder="https://www.youtube.com/watch?v=VIDEO_ID or just VIDEO_ID" required>
                                        <button type="button" class="btn btn-outline-secondary" id="validate-video-btn">
                                            <i class="bi bi-search me-1"></i>Validate & Preview
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Video Preview Section -->
                                <div class="video-preview-section card mb-4" id="video-preview-section" style="display: none;">
                                    <div class="card-body">
                                        <h6 class="card-title mb-3">
                                            <i class="bi bi-play-circle me-2"></i>Video Preview
                                        </h6>
                                        <div class="preview-player-container bg-dark rounded mb-3">
                                            <div id="preview-player"></div>
                                        </div>
                                        <div class="video-info text-center">
                                            <h5 class="mb-1" id="preview-title">Loading...</h5>
                                            <p class="text-muted mb-0" id="preview-duration">Duration: Loading...</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Time Inputs Section -->
                                <div class="row g-3 mb-4">
                                    <div class="col-md-6">
                                        <label for="start-time" class="form-label fw-semibold">
                                            <i class="bi bi-play-fill me-1"></i>Start Time (seconds):
                                        </label>
                                        <div class="input-group">
                                            <input type="number" class="form-control" id="start-time" 
                                                   placeholder="0" min="0" value="0">
                                            <button type="button" class="btn btn-outline-primary" id="set-current-start">
                                                <i class="bi bi-clock me-1"></i>Use Current
                                            </button>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="end-time" class="form-label fw-semibold">
                                            <i class="bi bi-stop-fill me-1"></i>End Time (seconds):
                                        </label>
                                        <div class="input-group">
                                            <input type="number" class="form-control" id="end-time" 
                                                   placeholder="Leave empty for full video">
                                            <button type="button" class="btn btn-outline-primary" id="set-current-end">
                                                <i class="bi bi-clock me-1"></i>Use Current
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Title Section -->
                                <div class="mb-3">
                                    <label for="video-title" class="form-label fw-semibold">
                                        <i class="bi bi-tag me-1"></i>Title (optional):
                                    </label>
                                    <input type="text" class="form-control" id="video-title" 
                                           placeholder="Custom title for this segment">
                                </div>
                            </form>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-1"></i>Cancel
                            </button>
                            <button type="submit" form="video-segment-form" class="btn btn-success" id="modal-submit" disabled>
                                <i class="bi bi-plus-circle me-1"></i>Add to Playlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Modal elements
            modal: getElementById('video-segment-modal'),
            modalCancel: getElementById('modal-cancel'),
            modalSubmit: getElementById('modal-submit'),
            modalTitle: getElementById('modal-title'),
            
            // Form elements
            videoForm: getElementById('video-segment-form'),
            videoUrl: getElementById('video-url'),
            startTime: getElementById('start-time'),
            endTime: getElementById('end-time'),
            videoTitle: getElementById('video-title'),
            validateBtn: getElementById('validate-video-btn'),
            setCurrentStartBtn: getElementById('set-current-start'),
            setCurrentEndBtn: getElementById('set-current-end'),
            
            // Preview elements
            previewSection: getElementById('video-preview-section'),
            previewPlayer: getElementById('preview-player'),
            previewTitle: getElementById('preview-title'),
            previewDuration: getElementById('preview-duration')
        };
        
        // Validate required elements
        const requiredElements = ['modal', 'videoForm', 'modalSubmit'];
        requiredElements.forEach(elementKey => {
            if (!this.elements[elementKey]) {
                console.error(`Required modal element not found: ${elementKey}`);
            }
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Modal events - Bootstrap handles overlay clicks automatically
        this.addEventListenerSafe(this.elements.modalCancel, 'click', () => {
            this.closeModal();
        });
        
        // Bootstrap modal events
        this.addEventListenerSafe(this.elements.modal, 'hidden.bs.modal', () => {
            this.handleModalHidden();
        });
        
        // Form submission
        this.addEventListenerSafe(this.elements.videoForm, 'submit', (e) => {
            preventDefault(e);
            this.handleFormSubmit();
        });
        
        // Video validation
        this.addEventListenerSafe(this.elements.validateBtn, 'click', () => {
            this.handleVideoValidation();
        });
        
        // Set current time buttons
        this.addEventListenerSafe(this.elements.setCurrentStartBtn, 'click', () => {
            this.setCurrentTime('start');
        });
        
        this.addEventListenerSafe(this.elements.setCurrentEndBtn, 'click', () => {
            this.setCurrentTime('end');
        });
        
        // Form input validation
        this.addEventListenerSafe(this.elements.videoUrl, 'input', () => {
            this.validateForm();
        });
        
        this.addEventListenerSafe(this.elements.startTime, 'input', () => {
            this.validateTimeInputs();
        });
        
        this.addEventListenerSafe(this.elements.endTime, 'input', () => {
            this.validateTimeInputs();
        });

        // Keyboard shortcuts
        this.addEventListenerSafe(document, 'keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcuts(event) {
        // Don't handle shortcuts when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Only handle shortcuts when modal is open
        if (!this.isOpen()) {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                preventDefault(event);
                this.closeModal();
                break;
        }
    }

    /**
     * Safely add event listener with cleanup tracking
     */
    addEventListenerSafe(element, event, handler, options = {}) {
        if (!element) return;
        
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler });
    }

    /* ==========================================================================
       Modal Management
       ========================================================================== */

    /**
     * Open the modal in add mode
     * @param {Object} initialData - Optional initial data to populate form
     */
    openAddMode(initialData = null) {
        this.isEditMode = false;
        this.editIndex = null;
        this.updateModalTitle('Add New Video Segment');
        this.updateSubmitButton('➕ Add to Playlist');
        this.populateForm(initialData);
        this.showModal();
    }

    /**
     * Open the modal in edit mode
     * @param {Object} videoData - Video data to edit
     * @param {number} index - Index of the video being edited
     */
    openEditMode(videoData, index) {
        this.isEditMode = true;
        this.editIndex = index;
        this.updateModalTitle('Edit Video Segment');
        this.updateSubmitButton('💾 Save Changes');
        this.populateForm(videoData);
        this.showModal();
    }

    /**
     * Show the modal
     */
    showModal() {
        if (!this.elements.modal) return;
        
        // Reset form and preview
        this.hidePreview();
        
        // Use Bootstrap modal API
        const modal = new bootstrap.Modal(this.elements.modal);
        modal.show();
        
        // Focus on first input after modal is shown
        this.elements.modal.addEventListener('shown.bs.modal', () => {
            if (this.elements.videoUrl) {
                this.elements.videoUrl.focus();
            }
        }, { once: true });
        
        devLog('Modal opened in', this.isEditMode ? 'edit' : 'add', 'mode');
    }

    /**
     * Close the modal
     */
    closeModal() {
        if (!this.elements.modal) return;
        
        // Use Bootstrap modal API
        const modal = bootstrap.Modal.getInstance(this.elements.modal);
        if (modal) {
            modal.hide();
        }
        
        // Clean up preview player
        this.destroyPreviewPlayer();
        
        // Reset form
        this.clearForm();
        this.hidePreview();
        
        // Reset mode
        this.isEditMode = false;
        this.editIndex = null;
        
        // Notify callback
        if (this.onModalCloseCallback) {
            this.onModalCloseCallback();
        }
        
        devLog('Modal closed');
    }

    /**
     * Check if modal is open
     * @returns {boolean} - True if modal is open
     */
    isOpen() {
        const modal = bootstrap.Modal.getInstance(this.elements.modal);
        return modal && modal._isShown;
    }

    /**
     * Handle modal hidden event
     */
    handleModalHidden() {
        // Clean up preview player
        this.destroyPreviewPlayer();
        
        // Reset form
        this.clearForm();
        this.hidePreview();
        
        // Reset mode
        this.isEditMode = false;
        this.editIndex = null;
        
        // Notify callback
        if (this.onModalCloseCallback) {
            this.onModalCloseCallback();
        }
        
        devLog('Modal hidden');
    }

    /**
     * Update modal title
     * @param {string} title - New title
     */
    updateModalTitle(title) {
        if (this.elements.modalTitle) {
            this.elements.modalTitle.textContent = title;
        }
    }

    /**
     * Update submit button text
     * @param {string} text - New button text
     */
    updateSubmitButton(text) {
        if (this.elements.modalSubmit) {
            this.elements.modalSubmit.textContent = text;
        }
    }

    /* ==========================================================================
       Form Handling
       ========================================================================== */

    /**
     * Handle form submission
     */
    handleFormSubmit() {
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }
        
        if (this.isEditMode) {
            if (this.onVideoEditCallback) {
                this.onVideoEditCallback(formData, this.editIndex);
            }
        } else {
            if (this.onVideoAddCallback) {
                this.onVideoAddCallback(formData);
            }
        }
        
        // Close modal after successful submission
        this.closeModal();
    }

    /**
     * Get form data
     * @returns {Object} - Form data object
     */
    getFormData() {
        return {
            url: this.elements.videoUrl?.value?.trim() || '',
            startTime: parseInt(this.elements.startTime?.value) || 0,
            endTime: this.elements.endTime?.value ? parseInt(this.elements.endTime.value) : null,
            title: this.elements.videoTitle?.value?.trim() || ''
        };
    }

    /**
     * Validate form data
     * @param {Object} formData - Form data to validate
     * @returns {boolean} - Validation result
     */
    validateFormData(formData) {
        if (!formData.url) {
            this.showError('Please enter a YouTube URL or video ID');
            return false;
        }
        
        if (formData.startTime < 0) {
            this.showError('Start time cannot be negative');
            return false;
        }
        
        if (formData.endTime !== null && formData.endTime <= formData.startTime) {
            this.showError('End time must be greater than start time');
            return false;
        }
        
        return true;
    }

    /**
     * Populate form with data
     * @param {Object} data - Data to populate form with
     */
    populateForm(data) {
        if (!data) {
            this.clearForm();
            return;
        }
        
        if (this.elements.videoUrl) this.elements.videoUrl.value = data.url || '';
        if (this.elements.startTime) this.elements.startTime.value = data.startTime || 0;
        if (this.elements.endTime) this.elements.endTime.value = data.endTime || '';
        if (this.elements.videoTitle) this.elements.videoTitle.value = data.title || '';
        
        this.validateForm();
    }

    /**
     * Clear form inputs
     */
    clearForm() {
        if (this.elements.videoUrl) this.elements.videoUrl.value = '';
        if (this.elements.startTime) this.elements.startTime.value = '0';
        if (this.elements.endTime) this.elements.endTime.value = '';
        if (this.elements.videoTitle) this.elements.videoTitle.value = '';
        
        this.validateForm();
    }

    /**
     * Validate form in real-time
     */
    validateForm() {
        if (!this.elements.modalSubmit) return;
        
        const formData = this.getFormData();
        const isValid = formData.url && formData.startTime >= 0 && 
                        (formData.endTime === null || formData.endTime > formData.startTime);
        
        this.elements.modalSubmit.disabled = !isValid;
    }

    /**
     * Validate time inputs
     */
    validateTimeInputs() {
        const startTime = parseInt(this.elements.startTime?.value) || 0;
        const endTime = this.elements.endTime?.value ? parseInt(this.elements.endTime.value) : null;
        
        // Add visual feedback for invalid time ranges
        if (endTime !== null && endTime <= startTime) {
            this.elements.endTime?.classList.add('error');
        } else {
            this.elements.endTime?.classList.remove('error');
        }
        
        this.validateForm();
    }

    /* ==========================================================================
       Video Validation and Preview
       ========================================================================== */

    /**
     * Handle video validation and preview
     */
    async handleVideoValidation() {
        const url = this.elements.videoUrl?.value?.trim();
        if (!url) {
            this.showError('Please enter a YouTube URL or video ID');
            return;
        }
        
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showError('Invalid YouTube URL or video ID');
            return;
        }
        
        try {
            // Show loading state
            this.elements.validateBtn.disabled = true;
            this.elements.validateBtn.textContent = '🔄 Validating...';
            
            // Create preview player
            await this.createPreviewPlayer(videoId);
            
            // Show preview section
            this.showPreview();
            
            // Enable submit button
            this.elements.modalSubmit.disabled = false;
            
        } catch (error) {
            console.error('Video validation failed:', error);
            this.showError('Failed to validate video. Please check the URL and try again.');
        } finally {
            // Restore button state
            this.elements.validateBtn.disabled = false;
            this.elements.validateBtn.textContent = '🔍 Validate & Preview';
        }
    }

    /**
     * Set current time from preview player
     * @param {string} type - 'start' or 'end'
     */
    setCurrentTime(type) {
        if (!this.previewPlayer) {
            this.showError('No preview video loaded');
            return;
        }
        
        try {
            const currentTime = Math.floor(this.previewPlayer.getCurrentTime());
            
            if (type === 'start') {
                this.elements.startTime.value = currentTime;
            } else if (type === 'end') {
                this.elements.endTime.value = currentTime;
            }
            
            this.validateTimeInputs();
            this.showSuccess(`${type === 'start' ? 'Start' : 'End'} time set to ${currentTime}s`);
            
        } catch (error) {
            console.error('Failed to get current time:', error);
            this.showError('Failed to get current time from preview');
        }
    }

    /**
     * Show preview section
     */
    showPreview() {
        if (this.elements.previewSection) {
            this.elements.previewSection.style.display = 'block';
        }
    }

    /**
     * Hide preview section
     */
    hidePreview() {
        if (this.elements.previewSection) {
            this.elements.previewSection.style.display = 'none';
        }
    }

    /**
     * Create preview YouTube player
     * @param {string} videoId - YouTube video ID
     */
    async createPreviewPlayer(videoId) {
        return new Promise((resolve, reject) => {
            // Wait for YouTube API to be ready
            if (typeof YT === 'undefined' || !YT.Player) {
                reject(new Error('YouTube API not loaded'));
                return;
            }
            
            // Destroy existing player
            this.destroyPreviewPlayer();
            
            try {
                this.previewPlayer = new YT.Player('preview-player', {
                    height: '200',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        controls: 1,
                        autoplay: 0
                    },
                    events: {
                        onReady: (event) => {
                            this.updatePreviewInfo(event.target);
                            resolve(event.target);
                        },
                        onError: (event) => {
                            reject(new Error(`YouTube player error: ${event.data}`));
                        }
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Update preview video information
     * @param {Object} player - YouTube player instance
     */
    updatePreviewInfo(player) {
        try {
            const videoData = player.getVideoData();
            const duration = player.getDuration();
            
            if (this.elements.previewTitle) {
                this.elements.previewTitle.textContent = videoData.title || 'Unknown Title';
            }
            
            if (this.elements.previewDuration) {
                this.elements.previewDuration.textContent = `Duration: ${this.formatTime(duration)}`;
            }
            
            // Auto-fill title if empty
            if (!this.elements.videoTitle.value && videoData.title) {
                this.elements.videoTitle.value = videoData.title;
            }
            
        } catch (error) {
            console.error('Failed to update preview info:', error);
        }
    }

    /**
     * Destroy preview player
     */
    destroyPreviewPlayer() {
        if (this.previewPlayer && this.previewPlayer.destroy) {
            try {
                this.previewPlayer.destroy();
            } catch (error) {
                console.error('Error destroying preview player:', error);
            }
        }
        this.previewPlayer = null;
    }

    /**
     * Extract video ID from URL (using utils function)
     */
    extractVideoId(url) {
        return extractVideoId(url);
    }

    /**
     * Format time in seconds to MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
     * Set modal close callback
     * @param {Function} callback - Callback function
     */
    onModalClose(callback) {
        this.onModalCloseCallback = callback;
    }

    /* ==========================================================================
       Cleanup
       ========================================================================== */

    /**
     * Destroy modal and clean up resources
     */
    destroy() {
        devLog('Destroying VideoSegmentModal');
        
        // Clean up preview player
        this.destroyPreviewPlayer();
        
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        
        this.eventListeners = [];
        this.elements = {};
        
        // Remove modal from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Clear callbacks
        this.onVideoAddCallback = null;
        this.onVideoEditCallback = null;
        this.onModalCloseCallback = null;
    }
}
