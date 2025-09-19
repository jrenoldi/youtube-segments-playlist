/**
 * Transition Screen - Handles countdown display between segments
 * Shows next song name and countdown timer during segment transitions
 */

import { devLog } from './utils.js';

export class TransitionScreen {
    constructor(options = {}) {
        this.container = null;
        this.isVisible = false;
        this.countdownInterval = null;
        this.currentCountdown = 0;
        this.totalDuration = 0;
        
        // Configuration
        this.config = {
            emphasisThreshold: options.emphasisThreshold || 5, // Last 5 seconds get emphasis
            fadeInDuration: options.fadeInDuration || 300, // Fade in animation duration
            fadeOutDuration: options.fadeOutDuration || 300, // Fade out animation duration
            enabled: options.enabled !== false, // Default to enabled
            ...options
        };
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the transition screen
     */
    init() {
        try {
            devLog('Initializing TransitionScreen');
            this.createTransitionElement();
            devLog('TransitionScreen initialized successfully');
        } catch (error) {
            console.error('Failed to initialize TransitionScreen:', error);
        }
    }

    /**
     * Create the transition screen element
     */
    createTransitionElement() {
        // Create the transition screen container
        this.container = document.createElement('div');
        this.container.id = 'transition-screen';
        this.container.className = 'transition-screen';
        
        // Create the content structure
        this.container.innerHTML = `
            <div class="transition-content">
                <div class="transition-title">Next Song</div>
                <div class="transition-song-name" id="transition-song-name">Loading...</div>
                <div class="transition-countdown" id="transition-countdown">0</div>
                <div class="transition-subtitle">Get ready!</div>
            </div>
        `;
        
        // Initially hidden
        this.container.style.display = 'none';
        this.container.style.opacity = '0';
        
        // Add to document body (will be positioned by parent)
        document.body.appendChild(this.container);
    }

    /* ==========================================================================
       Display Methods
       ========================================================================== */

    /**
     * Show transition screen with countdown
     * @param {Object} nextVideo - Next video data
     * @param {number} duration - Countdown duration in seconds
     * @returns {Promise} - Resolves when countdown completes
     */
    async showTransition(nextVideo, duration) {
        if (!this.config.enabled) {
            devLog('Transitions disabled, skipping transition screen');
            return Promise.resolve();
        }
        
        if (this.isVisible) {
            devLog('Transition screen already visible, skipping');
            return Promise.resolve();
        }
        
        try {
            devLog(`Showing transition screen for "${nextVideo?.title || 'Next Song'}" (${duration}s)`);
            
            this.isVisible = true;
            this.totalDuration = duration;
            this.currentCountdown = duration;
            
            // Update content
            this.updateContent(nextVideo);
            
            // Position the screen to match the player
            this.positionScreen();
            
            // Show with fade in
            await this.fadeIn();
            
            // Start countdown
            return this.startCountdown();
            
        } catch (error) {
            console.error('Error showing transition screen:', error);
            this.hideTransition();
            return Promise.resolve();
        }
    }

    /**
     * Hide transition screen
     */
    async hideTransition() {
        if (!this.isVisible) {
            return;
        }
        
        try {
            devLog('Hiding transition screen');
            
            // Stop countdown
            this.stopCountdown();
            
            // Fade out
            await this.fadeOut();
            
            // Hide completely and reset positioning
            this.container.style.display = 'none';
            this.container.style.position = 'fixed';
            this.container.style.left = '-9999px';
            this.container.style.top = '-9999px';
            this.container.style.zIndex = '-1';
            this.isVisible = false;
            
        } catch (error) {
            console.error('Error hiding transition screen:', error);
            this.isVisible = false;
        }
    }

    /**
     * Update transition content
     * @param {Object} nextVideo - Next video data
     */
    updateContent(nextVideo) {
        const songNameElement = document.getElementById('transition-song-name');
        const countdownElement = document.getElementById('transition-countdown');
        
        if (songNameElement) {
            songNameElement.textContent = nextVideo?.title || 'Next Song';
        }
        
        if (countdownElement) {
            countdownElement.textContent = this.formatTime(this.currentCountdown);
        }
    }

    /**
     * Position the screen to match the player dimensions
     */
    positionScreen() {
        const playerElement = document.getElementById('player');
        if (!playerElement) {
            devLog('Player element not found, using default positioning');
            return;
        }
        
        const playerRect = playerElement.getBoundingClientRect();
        
        // Position the transition screen to match the player
        this.container.style.position = 'absolute';
        this.container.style.left = `${playerRect.left}px`;
        this.container.style.top = `${playerRect.top}px`;
        this.container.style.width = `${playerRect.width}px`;
        this.container.style.height = `${playerRect.height}px`;
        this.container.style.zIndex = '1000';
    }

    /* ==========================================================================
       Animation Methods
       ========================================================================== */

    /**
     * Fade in animation
     */
    async fadeIn() {
        this.container.style.display = 'block';
        
        return new Promise(resolve => {
            const startTime = performance.now();
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / this.config.fadeInDuration, 1);
                
                this.container.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    /**
     * Fade out animation
     */
    async fadeOut() {
        return new Promise(resolve => {
            const startTime = performance.now();
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / this.config.fadeOutDuration, 1);
                
                this.container.style.opacity = 1 - progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });
    }

    /* ==========================================================================
       Countdown Methods
       ========================================================================== */

    /**
     * Start countdown timer
     * @returns {Promise} - Resolves when countdown completes
     */
    startCountdown() {
        return new Promise(resolve => {
            const countdownElement = document.getElementById('transition-countdown');
            
            this.countdownInterval = setInterval(() => {
                this.currentCountdown -= 0.1;
                
                if (countdownElement) {
                    countdownElement.textContent = this.formatTime(this.currentCountdown);
                    
                    // Add emphasis for last 5 seconds
                    if (this.currentCountdown <= this.config.emphasisThreshold) {
                        countdownElement.classList.add('emphasis');
                    } else {
                        countdownElement.classList.remove('emphasis');
                    }
                }
                
                // Check if countdown finished
                if (this.currentCountdown <= 0) {
                    this.stopCountdown();
                    resolve();
                }
            }, 100); // Update every 100ms for smooth countdown
        });
    }

    /**
     * Stop countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Format time for display
     * @param {number} seconds - Time in seconds
     * @returns {string} - Formatted time string
     */
    formatTime(seconds) {
        if (seconds <= 0) return '0';
        
        const wholeSeconds = Math.ceil(seconds);
        return wholeSeconds.toString();
    }

    /* ==========================================================================
       Status and Cleanup
       ========================================================================== */

    /**
     * Check if transition screen is visible
     * @returns {boolean} - True if visible
     */
    isTransitionVisible() {
        return this.isVisible;
    }

    /**
     * Get current countdown value
     * @returns {number} - Current countdown in seconds
     */
    getCurrentCountdown() {
        return this.currentCountdown;
    }

    /**
     * Get transition screen status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            visible: this.isVisible,
            currentCountdown: this.currentCountdown,
            totalDuration: this.totalDuration,
            emphasisThreshold: this.config.emphasisThreshold
        };
    }

    /**
     * Enable or disable transition effects
     * @param {boolean} enabled - Whether to enable transitions
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        devLog(`Transition screen ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Destroy transition screen and clean up resources
     */
    destroy() {
        devLog('Destroying TransitionScreen');
        
        this.stopCountdown();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        this.container = null;
        this.isVisible = false;
        this.currentCountdown = 0;
        this.totalDuration = 0;
    }
}
