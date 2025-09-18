/**
 * Programmatic Example - Using YouTube Segments Engine API
 * This example shows how to use the engine programmatically without any UI
 */

import { YouTubeSegmentsEngine } from '../js/engine/YouTubeSegmentsEngine.js';

class ProgrammaticExample {
    constructor() {
        this.engine = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Programmatic Example...');
            
            // Initialize engine with custom configuration
            this.engine = new YouTubeSegmentsEngine({
                playerId: 'player', // This would be a hidden player element
                autoAdvance: true,
                enableStorage: false, // Disable storage for this example
            });
            
            // Wait for engine to be ready
            this.engine.on('engine:ready', () => {
                this.isInitialized = true;
                console.log('✅ Engine ready!');
                this.runExample();
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    setupEventListeners() {
        // Player events
        this.engine.on('player:ready', () => {
            console.log('🎮 Player is ready');
        });
        
        this.engine.on('player:stateChanged', (data) => {
            const states = {
                [-1]: 'UNSTARTED',
                [0]: 'ENDED',
                [1]: 'PLAYING',
                [2]: 'PAUSED',
                [3]: 'BUFFERING',
                [5]: 'CUED'
            };
            console.log(`🎵 Player state: ${states[data.state] || 'UNKNOWN'} (${data.state})`);
        });
        
        this.engine.on('player:videoLoaded', (data) => {
            console.log(`📺 Video loaded: "${data.video.title}"`);
        });
        
        this.engine.on('player:error', (data) => {
            console.error(`❌ Player error: ${data.error}`);
        });
        
        // Playlist events
        this.engine.on('playlist:videoAdded', (data) => {
            console.log(`➕ Video added: "${data.video.title}" at index ${data.index}`);
        });
        
        this.engine.on('playlist:videoRemoved', (data) => {
            console.log(`➖ Video removed: "${data.video.title}" from index ${data.index}`);
        });
        
        this.engine.on('playlist:currentChanged', (data) => {
            console.log(`🎯 Current video changed to index ${data.index}: "${data.video.title}"`);
        });
        
        this.engine.on('playlist:autoAdvanced', (data) => {
            console.log(`⏭️ Auto-advanced from index ${data.fromIndex} to ${data.toIndex}`);
        });
        
        this.engine.on('playlist:ended', () => {
            console.log('🏁 Playlist finished');
        });
        
        this.engine.on('playlist:loopToggled', (data) => {
            console.log(`🔄 Loop ${data.loopEnabled ? 'enabled' : 'disabled'}`);
        });
        
        this.engine.on('playlist:imported', (data) => {
            console.log(`📥 Playlist imported: ${data.imported} videos`);
            if (data.errors && data.errors.length > 0) {
                console.warn('⚠️ Import errors:', data.errors);
            }
        });
        
        this.engine.on('playlist:error', (data) => {
            console.error(`❌ Playlist error: ${data.error}`);
        });
        
        // Engine events
        this.engine.on('engine:error', (data) => {
            console.error(`❌ Engine error: ${data.error}`);
        });
    }
    
    async runExample() {
        console.log('\n🎬 Starting Programmatic Example...\n');
        
        try {
            // Example 1: Add videos to playlist
            console.log('📝 Example 1: Adding videos to playlist');
            
            const videos = [
                {
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    startTime: 0,
                    endTime: 30,
                    title: 'Rick Roll (30s)'
                },
                {
                    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
                    startTime: 60,
                    endTime: 90,
                    title: 'PSY - Gangnam Style (30s)'
                },
                {
                    url: 'https://www.youtube.com/watch?v=L_jWHffIx5E',
                    startTime: 0,
                    endTime: 45,
                    title: 'Smells Like Teen Spirit (45s)'
                }
            ];
            
            for (const video of videos) {
                const result = this.engine.addVideo(video);
                if (result.success) {
                    console.log(`✅ Added: ${video.title}`);
                } else {
                    console.error(`❌ Failed to add ${video.title}: ${result.message}`);
                }
                
                // Small delay between additions
                await this.sleep(500);
            }
            
            // Example 2: Playlist management
            console.log('\n📋 Example 2: Playlist management');
            
            const playlist = this.engine.getPlaylist();
            console.log(`📊 Playlist length: ${playlist.length}`);
            console.log(`🎯 Current index: ${this.engine.getCurrentIndex()}`);
            console.log(`🔄 Loop enabled: ${this.engine.isLoopEnabled()}`);
            
            // Example 3: Navigation
            console.log('\n🧭 Example 3: Navigation');
            
            // Go to next video
            console.log('⏭️ Going to next video...');
            this.engine.next();
            await this.sleep(1000);
            
            // Go to previous video
            console.log('⏮️ Going to previous video...');
            this.engine.previous();
            await this.sleep(1000);
            
            // Example 4: Player controls
            console.log('\n🎮 Example 4: Player controls');
            
            // Start playing
            console.log('▶️ Starting playback...');
            this.engine.play();
            await this.sleep(2000);
            
            // Pause
            console.log('⏸️ Pausing...');
            this.engine.pause();
            await this.sleep(1000);
            
            // Resume
            console.log('▶️ Resuming...');
            this.engine.play();
            await this.sleep(3000);
            
            // Example 5: Loop toggle
            console.log('\n🔄 Example 5: Loop toggle');
            this.engine.toggleLoop();
            await this.sleep(1000);
            
            // Example 6: Export/Import
            console.log('\n💾 Example 6: Export/Import');
            
            const exportedData = this.engine.exportPlaylist();
            console.log('📤 Exported playlist data:', JSON.parse(exportedData));
            
            // Example 7: Update video
            console.log('\n✏️ Example 7: Update video');
            
            const updatedVideo = {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                startTime: 10,
                endTime: 40,
                title: 'Rick Roll (Updated)'
            };
            
            const updateResult = this.engine.updateVideo(0, updatedVideo);
            if (updateResult.success) {
                console.log('✅ Video updated successfully');
            } else {
                console.error('❌ Failed to update video:', updateResult.message);
            }
            
            // Example 8: Remove video
            console.log('\n🗑️ Example 8: Remove video');
            
            const removeResult = this.engine.removeVideo(1);
            if (removeResult) {
                console.log('✅ Video removed successfully');
            } else {
                console.error('❌ Failed to remove video');
            }
            
            // Example 9: Get status
            console.log('\n📊 Example 9: Get status');
            
            const status = this.engine.getStatus();
            console.log('📈 Engine status:', status);
            
            // Example 10: Configuration
            console.log('\n⚙️ Example 10: Configuration');
            
            const config = this.engine.getConfig();
            console.log('🔧 Current config:', config);
            
            // Update configuration
            this.engine.updateConfig({
                autoAdvance: false
            });
            console.log('🔧 Updated config:', this.engine.getConfig());
            
            console.log('\n🎉 Programmatic example completed!');
            
        } catch (error) {
            console.error('❌ Example failed:', error);
        }
    }
    
    // Utility function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cleanup method
    destroy() {
        if (this.engine) {
            this.engine.destroy();
        }
    }
}

// Export for use in other modules
export { ProgrammaticExample };

// If running directly, start the example
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('load', () => {
        new ProgrammaticExample();
    });
} else {
    // Node.js environment
    console.log('This example is designed to run in a browser environment with a YouTube player element.');
    console.log('To use it:');
    console.log('1. Create an HTML page with a div with id="player"');
    console.log('2. Include the YouTube IFrame API');
    console.log('3. Import and run this example');
}
