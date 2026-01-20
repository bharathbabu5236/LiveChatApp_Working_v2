// Alternative Agora Voice Service with different connection approach
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfigWeb';

class AlternativeAgoraService {
    constructor() {
        this.client = null;
        this.localAudioTrack = null;
        this.isJoined = false;
        this.currentChannel = null;
        this.uid = null;
    }

    // Alternative initialization with different settings
    async initializeAlternative() {
        try {
            if (this.client) {
                await this.cleanup();
            }

            console.log('Alt: Creating Agora client with alternative settings...');
            
            // Try with different client configurations
            this.client = AgoraRTC.createClient({ 
                mode: 'live',  // Try live mode instead of rtc
                codec: 'h264'  // Try h264 instead of vp8
            });

            // Set different connection parameters
            this.client.on('connection-state-change', (curState, revState) => {
                console.log('Alt: Connection state changed:', curState, 'from', revState);
            });

            this.client.on('user-joined', (user) => {
                console.log('Alt: User joined:', user.uid);
            });

            this.client.on('user-left', (user) => {
                console.log('Alt: User left:', user.uid);
            });

            return true;
        } catch (error) {
            console.error('Alt: Failed to initialize alternative client:', error);
            return false;
        }
    }

    // Alternative join method with different parameters
    async joinChannelAlternative(channelName) {
        try {
            await this.initializeAlternative();

            // Set client role to host for live mode
            if (this.client.mode === 'live') {
                await this.client.setClientRole('host');
            }

            this.uid = Math.floor(Math.random() * 100000);
            
            console.log('Alt: Attempting to join with alternative method...');
            console.log('Alt: Channel:', channelName);
            console.log('Alt: UID:', this.uid);

            // Try join with explicit timeout
            const joinResult = await Promise.race([
                this.client.join(
                    AGORA_CONFIG.APP_ID,
                    channelName,
                    null,
                    this.uid
                ),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Alternative join timeout')), 5000);
                })
            ]);

            console.log('Alt: Join result:', joinResult);
            this.isJoined = true;
            this.currentChannel = channelName;

            // Create audio track with different settings
            try {
                this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                    encoderConfig: {
                        sampleRate: 48000,
                        stereo: false,
                        bitrate: 128,
                    },
                });
                
                await this.client.publish([this.localAudioTrack]);
                console.log('Alt: Audio track published successfully');
            } catch (audioError) {
                console.error('Alt: Audio track error:', audioError);
            }

            return { success: true, uid: this.uid };

        } catch (error) {
            console.error('Alt: Alternative join failed:', error);
            return { 
                success: false, 
                error: error.message,
                suggestion: 'Try refreshing the page or check network connection'
            };
        }
    }

    // Test connectivity with alternative approach
    async testAlternativeConnection() {
        try {
            const testChannel = `alt_test_${Date.now()}`;
            const result = await this.joinChannelAlternative(testChannel);
            
            if (result.success) {
                await this.cleanup();
                return { 
                    success: true, 
                    message: 'Alternative Agora connection successful!',
                    method: 'live-mode-h264'
                };
            } else {
                return result;
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                method: 'alternative-failed'
            };
        }
    }

    // Cleanup method
    async cleanup() {
        try {
            if (this.localAudioTrack) {
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
            }

            if (this.client && this.isJoined) {
                await this.client.leave();
            }

            this.isJoined = false;
            this.currentChannel = null;
            this.uid = null;

        } catch (error) {
            console.error('Alt: Cleanup error:', error);
        }
    }
}

export default new AlternativeAgoraService();
