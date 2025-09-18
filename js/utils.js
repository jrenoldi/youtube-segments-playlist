/**
 * YouTube Video Segments Playlist - Utilities Module
 * Contains helper functions and constants used throughout the application
 */

/* ==========================================================================
   Constants
   ========================================================================== */

export const YOUTUBE_PLAYER_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
};

export const DEFAULT_PLAYER_CONFIG = {
    height: '400',
    width: '100%',
    playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        controls: 1,
        disablekb: 0,
        fs: 1,
        iv_load_policy: 3
    }
};

export const KEYBOARD_SHORTCUTS = {
    SPACE: ' ',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    LOOP_TOGGLE: 'l',
    ESCAPE: 'Escape'
};

export const DEFAULT_VIDEOS = [
    {
        url: 'enX0rOc5RR0',
        startTime: 100,
        endTime: 130,
        title: 'Prófugos - Soda Stereo'
    },
    {
        url: 'O7xFdFjW0nQ',
        startTime: 60,
        endTime: 90,
        title: 'In the End - Linkin Park'
    },
    {
        url: 'O4xewb7BZZw',
        startTime: 74,
        endTime: 90,
        title: 'Toxicity - System of a Down'
    },
];

/* ==========================================================================
   YouTube URL Processing
   ========================================================================== */

/**
 * Extracts video ID from various YouTube URL formats
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - Extracted video ID or null if invalid
 */
export function extractVideoId(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const trimmedUrl = url.trim();
    
    // If it's already just a video ID (11 characters, alphanumeric + _ -)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
        return trimmedUrl;
    }
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = trimmedUrl.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}


/* ==========================================================================
   Time Formatting
   ========================================================================== */

/**
 * Formats seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '0:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}



/* ==========================================================================
   DOM Utilities
   ========================================================================== */

/**
 * Safely gets DOM element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} - Element or null if not found
 */
export function getElementById(id) {
    return document.getElementById(id);
}


/**
 * Safely gets first DOM element by selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element (default: document)
 * @returns {HTMLElement|null} - Element or null if not found
 */
export function querySelector(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Creates a DOM element with attributes and content
 * @param {string} tagName - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Element content
 * @returns {HTMLElement} - Created element
 */
export function createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Set content
    if (typeof content === 'string') {
        element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        element.appendChild(content);
    }
    
    return element;
}

/* ==========================================================================
   Event Utilities
   ========================================================================== */


/**
 * Prevents default behavior and stops propagation
 * @param {Event} event - Event object
 */
export function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
}

/* ==========================================================================
   Data Validation
   ========================================================================== */

/**
 * Validates video segment data
 * @param {Object} videoData - Video data object
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateVideoData(videoData) {
    const errors = [];
    
    if (!videoData) {
        errors.push('Video data is required');
        return { isValid: false, errors };
    }
    
    // Validate URL/ID
    if (!videoData.url || !extractVideoId(videoData.url)) {
        errors.push('Valid YouTube URL or video ID is required');
    }
    
    // Validate start time
    if (videoData.startTime !== undefined && (typeof videoData.startTime !== 'number' || videoData.startTime < 0)) {
        errors.push('Start time must be a non-negative number');
    }
    
    // Validate end time
    if (videoData.endTime !== undefined && videoData.endTime !== null) {
        if (typeof videoData.endTime !== 'number' || videoData.endTime < 0) {
            errors.push('End time must be a non-negative number');
        } else if (videoData.startTime !== undefined && videoData.endTime <= videoData.startTime) {
            errors.push('End time must be greater than start time');
        }
    }
    
    // Validate title
    if (videoData.title && typeof videoData.title !== 'string') {
        errors.push('Title must be a string');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/* ==========================================================================
   Storage Utilities
   ========================================================================== */

/**
 * Safely stores data in localStorage
 * @param {string} key - Storage key
 * @param {*} data - Data to store
 * @returns {boolean} - Success status
 */
export function setStorageItem(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
}

/**
 * Safely retrieves data from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} - Retrieved data or default value
 */
export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to retrieve from localStorage:', error);
        return defaultValue;
    }
}


/* ==========================================================================
   Utility Functions
   ========================================================================== */


/**
 * Throttles a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generates a unique ID
 * @returns {string} - Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}


/**
 * Checks if code is running in development mode
 * @returns {boolean} - True if in development mode
 */
export function isDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

/**
 * Logs messages only in development mode
 * @param {...*} args - Arguments to log
 */
export function devLog(...args) {
    if (isDevelopment()) {
        console.log('[DEV]', ...args);
    }
}
