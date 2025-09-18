/**
 * Audio Manager - Handles sound effects and audio playback
 * Provides a clean API for playing audio files with proper error handling
 */

import { devLog } from './utils.js';

export class AudioManager {
    constructor(options = {}) {
        this.audioContext = null;
        this.sounds = new Map();
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            volume: options.volume || 0.7, // Default volume (0-1)
            preloadSounds: options.preloadSounds !== false, // Default true
            ...options
        };
        
        // Audio file paths
        this.audioFiles = {
            crowdCheers: 'examples/assets/crowd-cheers.wav'
        };
        
        this.init();
    }

    /* ==========================================================================
       Initialization
       ========================================================================== */

    /**
     * Initialize the audio manager
     */
    async init() {
        try {
            devLog('Initializing AudioManager');
            
            // Initialize Web Audio API context
            this.initAudioContext();
            
            // Preload sounds if enabled
            if (this.config.preloadSounds) {
                await this.preloadSounds();
            }
            
            this.isInitialized = true;
            devLog('AudioManager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        try {
            // Create audio context (with fallback for older browsers)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            devLog('Audio context created');
        } catch (error) {
            console.error('Failed to create audio context:', error);
            throw error;
        }
    }

    /**
     * Preload all sound files
     */
    async preloadSounds() {
        devLog('Preloading sound files...');
        
        for (const [name, path] of Object.entries(this.audioFiles)) {
            try {
                await this.loadSound(name, path);
                devLog(`Loaded sound: ${name}`);
            } catch (error) {
                console.error(`Failed to load sound ${name}:`, error);
            }
        }
    }

    /* ==========================================================================
       Sound Loading and Management
       ========================================================================== */

    /**
     * Load a sound file
     * @param {string} name - Sound name
     * @param {string} path - File path
     * @returns {Promise<AudioBuffer>} - Audio buffer
     */
    async loadSound(name, path) {
        try {
            // Check if already loaded
            if (this.sounds.has(name)) {
                return this.sounds.get(name);
            }
            
            // Fetch audio file
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio file: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Store the audio buffer
            this.sounds.set(name, audioBuffer);
            
            return audioBuffer;
            
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
            throw error;
        }
    }

    /**
     * Check if a sound is loaded
     * @param {string} name - Sound name
     * @returns {boolean} - True if loaded
     */
    isSoundLoaded(name) {
        return this.sounds.has(name);
    }

    /* ==========================================================================
       Audio Playback
       ========================================================================== */

    /**
     * Play a sound effect
     * @param {string} name - Sound name
     * @param {Object} options - Playback options
     * @returns {Promise<boolean>} - Success status
     */
    async playSound(name, options = {}) {
        try {
            if (!this.isInitialized) {
                devLog('AudioManager not initialized, skipping sound playback');
                return false;
            }
            
            // Ensure audio context is running (required for some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Load sound if not already loaded
            if (!this.isSoundLoaded(name)) {
                const path = this.audioFiles[name];
                if (!path) {
                    throw new Error(`Unknown sound: ${name}`);
                }
                await this.loadSound(name, path);
            }
            
            const audioBuffer = this.sounds.get(name);
            if (!audioBuffer) {
                throw new Error(`Sound not loaded: ${name}`);
            }
            
            // Create audio source
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            // Configure audio
            source.buffer = audioBuffer;
            
            // Set volume
            const volume = options.volume !== undefined ? options.volume : this.config.volume;
            gainNode.gain.value = volume;
            
            // Connect audio nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play the sound
            source.start(0);
            
            devLog(`Playing sound: ${name}`);
            
            // Return promise that resolves when sound finishes
            return new Promise((resolve) => {
                source.onended = () => {
                    devLog(`Sound finished: ${name}`);
                    resolve(true);
                };
            });
            
        } catch (error) {
            console.error(`Error playing sound ${name}:`, error);
            return false;
        }
    }

    /**
     * Play crowd cheers sound effect
     * @param {Object} options - Playback options
     * @returns {Promise<boolean>} - Success status
     */
    async playCrowdCheers(options = {}) {
        return this.playSound('crowdCheers', options);
    }

    /**
     * Play crowd cheers with a delay
     * @param {number} delayMs - Delay in milliseconds
     * @param {Object} options - Playback options
     * @returns {Promise<boolean>} - Success status
     */
    async playCrowdCheersWithDelay(delayMs = 0, options = {}) {
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return this.playCrowdCheers(options);
    }

    /* ==========================================================================
       Configuration
       ========================================================================== */

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        this.config.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Get current volume
     * @returns {number} - Current volume level
     */
    getVolume() {
        return this.config.volume;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /* ==========================================================================
       Status and Cleanup
       ========================================================================== */

    /**
     * Get audio manager status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            audioContextState: this.audioContext?.state || 'not-initialized',
            loadedSounds: Array.from(this.sounds.keys()),
            volume: this.config.volume
        };
    }

    /**
     * Check if audio manager is ready
     * @returns {boolean} - True if ready
     */
    isReady() {
        return this.isInitialized && this.audioContext && this.audioContext.state === 'running';
    }

    /**
     * Destroy audio manager and clean up resources
     */
    destroy() {
        devLog('Destroying AudioManager');
        
        // Clear loaded sounds
        this.sounds.clear();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.audioContext = null;
        this.isInitialized = false;
    }
}
