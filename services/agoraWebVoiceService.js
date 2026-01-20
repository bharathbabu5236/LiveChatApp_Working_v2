import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfigWeb';

class AgoraWebVoiceService {
    constructor() {
        this.client = null;
        this.localAudioTrack = null;
        this.remoteUsers = {};
        this.isJoined = false;
        this.currentChannel = null;
        this.uid = null;
        
        // Event callbacks
        this.onUserJoined = null;
        this.onUserLeft = null;
        this.onConnectionStateChanged = null;
        this.onError = null;
    }

    // Initialize Agora client for web with enhanced error handling and cloud proxy
    async initializeClient() {
        try {
            if (!this.client) {
                console.log('Web: Creating new Agora client...');
                
                // Check if AgoraRTC is available
                if (!AgoraRTC) {
                    throw new Error('Agora SDK not loaded properly');
                }
                
                // Verify App ID
                if (!AGORA_CONFIG.APP_ID || AGORA_CONFIG.APP_ID.length < 32) {
                    throw new Error('Invalid Agora App ID configuration');
                }
                
                // Create client with enhanced configuration
                this.client = AgoraRTC.createClient({ 
                    mode: AGORA_CONFIG.CLIENT_CONFIG?.mode || 'rtc', 
                    codec: AGORA_CONFIG.CLIENT_CONFIG?.codec || 'vp8'
                });
                
                // Enable cloud proxy for better connectivity in restrictive networks
                try {
                    console.log('Web: Enabling cloud proxy for better connectivity...');
                    await this.client.startProxyServer(3);
                    console.log('Web: Cloud proxy enabled successfully');
                } catch (proxyError) {
                    console.warn('Web: Cloud proxy setup failed, continuing without proxy:', proxyError.message);
                    // Continue without proxy - not critical
                }
                
                // Set up event listeners
                this.setupEventListeners();
                
                console.log('Agora Web client initialized successfully');
                console.log('Web: Client state:', {
                    mode: AGORA_CONFIG.CLIENT_CONFIG?.mode || 'rtc',
                    codec: AGORA_CONFIG.CLIENT_CONFIG?.codec || 'vp8',
                    appId: AGORA_CONFIG.APP_ID?.substring(0, 8) + '...',
                    cloudProxy: 'enabled'
                });
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize Agora web client:', error);
            
            // More specific error handling
            let errorMessage = 'Failed to initialize voice service';
            
            if (error.message.includes('App ID')) {
                errorMessage = 'Voice service configuration error. Please check settings.';
            } else if (error.message.includes('SDK')) {
                errorMessage = 'Voice service not available. Please refresh the page and try again.';
            } else if (error.message.includes('proxy')) {
                errorMessage = 'Network connectivity issue. Please check your internet connection.';
            }
            
            if (this.onError) this.onError(errorMessage);
            return false;
        }
    }

    // Set up event listeners for web
    setupEventListeners() {
        if (!this.client) return;

        // User joined
        this.client.on('user-joined', async (user) => {
            console.log('Web: User joined:', user.uid);
            this.remoteUsers[user.uid.toString()] = user;
            if (this.onUserJoined) this.onUserJoined(user);
        });

        // User left
        this.client.on('user-left', (user, reason) => {
            console.log('Web: User left:', user.uid, 'Reason:', reason);
            delete this.remoteUsers[user.uid.toString()];
            if (this.onUserLeft) this.onUserLeft(user, reason);
        });

        // User published audio
        this.client.on('user-published', async (user, mediaType) => {
            if (mediaType === 'audio' && this.client) {
                console.log('Web: User published audio:', user.uid);
                try {
                    await this.client.subscribe(user, mediaType);
                    // Play audio automatically
                    if (user.audioTrack) {
                        user.audioTrack.play();
                        console.log('Web: Playing remote audio track');
                    }
                } catch (error) {
                    console.error('Web: Error subscribing to audio:', error);
                }
            }
        });

        // User unpublished
        this.client.on('user-unpublished', (user, mediaType) => {
            console.log('Web: User unpublished:', user.uid, mediaType);
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.stop();
                console.log('Web: Stopped remote audio track');
            }
        });

        // Connection state changed
        this.client.on('connection-state-change', (curState, revState) => {
            console.log('Web: Connection state changed:', curState, 'Previous:', revState);
            if (this.onConnectionStateChanged) {
                this.onConnectionStateChanged(curState, revState);
            }
        });

        // Network quality
        this.client.on('network-quality', (stats) => {
            console.log('Web: Network quality:', stats);
        });

        // Exception handling
        this.client.on('exception', (evt) => {
            console.error('Web: Agora exception:', evt);
            if (this.onError) this.onError('Voice call error occurred');
        });

        // Token privilege will expire
        this.client.on('token-privilege-will-expire', () => {
            console.warn('Web: Token privilege will expire soon');
            // In production, refresh the token here
        });
    }

    // Join voice channel for web with enhanced error handling
    async joinChannel(channelName, userId = null) {
        try {
            console.log('Web: Starting joinChannel process...');
            
            await this.initializeClient();
            
            if (this.isJoined) {
                console.log('Web: Already in a channel, leaving first...');
                await this.leaveChannel();
                // Wait a bit before rejoining
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Generate UID if not provided
            this.uid = userId || Math.floor(Math.random() * 100000);

            // Join the channel
            if (!this.client) {
                throw new Error('Agora web client not initialized');
            }

            console.log('Web: Attempting to join channel:', channelName, 'with UID:', this.uid);
            console.log('Web: Using App ID:', AGORA_CONFIG.APP_ID);

            // Add timeout and retry logic
            const joinPromise = this.client.join(
                AGORA_CONFIG.APP_ID,
                channelName,
                null, // Token (null for testing, should use token in production)
                this.uid
            );

            // Race between join and timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Channel join timeout after 10 seconds')), 10000);
            });

            await Promise.race([joinPromise, timeoutPromise]);

            this.isJoined = true;
            this.currentChannel = channelName;
            
            console.log('Web: Successfully joined channel:', channelName, 'with UID:', this.uid);
            
            // Create and publish local audio track with retry
            try {
                await this.enableMicrophone();
            } catch (micError) {
                console.warn('Web: Failed to enable microphone on first try, retrying...', micError);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.enableMicrophone();
            }
            
            return { success: true, uid: this.uid, channel: channelName };
        } catch (error) {
            console.error('Web: Failed to join channel:', error);
            
            // Detailed error logging for debugging
            const errorDetails = {
                code: error.code || 'unknown',
                message: error.message || 'Unknown error',
                appId: AGORA_CONFIG.APP_ID?.substring(0, 8) + '...',
                channelName: channelName,
                uid: this.uid,
                timestamp: new Date().toISOString()
            };
            console.error('Web: Error details:', errorDetails);
            
            // Reset state on error
            this.isJoined = false;
            this.currentChannel = null;
            this.uid = null;
            
            // Handle specific Agora errors
            let userFriendlyMessage = 'Failed to join voice call';
            
            if (error.code) {
                switch (error.code) {
                    case 'INVALID_OPERATION':
                        userFriendlyMessage = 'Voice service is busy. Please try again in a moment.';
                        break;
                    case 'UNEXPECTED_RESPONSE':
                        userFriendlyMessage = 'Network connection issue. Please check your internet connection.';
                        break;
                    case 'UID_CONFLICT':
                        userFriendlyMessage = 'You are already in a voice call. Please end the current call first.';
                        break;
                    case 'PERMISSION_DENIED':
                        userFriendlyMessage = 'Microphone access denied. Please allow microphone permissions.';
                        break;
                    default:
                        if (error.message.includes('timeout')) {
                            userFriendlyMessage = 'Connection timeout. Please check your internet and try again.';
                        } else if (error.message.includes('App ID')) {
                            userFriendlyMessage = 'Voice service configuration issue. Please contact support.';
                        }
                }
            }
            
            if (this.onError) this.onError(userFriendlyMessage);
            return { success: false, error: userFriendlyMessage, details: errorDetails };
        }
    }

    // Leave voice channel
    async leaveChannel() {
        try {
            // Stop and close local audio track
            if (this.localAudioTrack) {
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
                console.log('Web: Local audio track stopped and closed');
            }

            // Stop all remote audio tracks
            Object.values(this.remoteUsers).forEach(user => {
                if (user.audioTrack) {
                    user.audioTrack.stop();
                }
            });

            // Leave the channel
            if (this.client && this.isJoined) {
                await this.client.leave();
                console.log('Web: Left channel successfully');
            }

            this.isJoined = false;
            this.currentChannel = null;
            this.uid = null;
            this.remoteUsers = {};
            
            console.log('Web: Successfully left channel and cleaned up');
            return { success: true };
        } catch (error) {
            console.error('Web: Failed to leave channel:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }

    // Enable microphone for web
    async enableMicrophone() {
        try {
            if (!this.localAudioTrack) {
                console.log('Web: Creating microphone audio track...');
                this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                    encoderConfig: AGORA_CONFIG.AUDIO_PROFILE,
                    microphoneId: undefined, // Use default microphone
                });
                console.log('Web: Microphone audio track created');
            }

            if (this.client && this.isJoined && this.localAudioTrack) {
                await this.client.publish([this.localAudioTrack]);
                console.log('Web: Published local audio track');
            }

            console.log('Web: Microphone enabled successfully');
            return true;
        } catch (error) {
            console.error('Web: Failed to enable microphone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (this.onError) this.onError('Failed to access microphone: ' + errorMessage);
            return false;
        }
    }

    // Disable microphone
    async disableMicrophone() {
        try {
            if (this.localAudioTrack) {
                if (this.client && this.isJoined) {
                    await this.client.unpublish([this.localAudioTrack]);
                    console.log('Web: Unpublished local audio track');
                }
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
                console.log('Web: Local audio track stopped and closed');
            }
            console.log('Web: Microphone disabled successfully');
            return true;
        } catch (error) {
            console.error('Web: Failed to disable microphone:', error);
            return false;
        }
    }

    // Mute/unmute microphone
    async toggleMicrophone() {
        try {
            if (this.localAudioTrack) {
                const enabled = this.localAudioTrack.enabled;
                await this.localAudioTrack.setEnabled(!enabled);
                console.log('Web: Microphone', enabled ? 'muted' : 'unmuted');
                return !enabled;
            }
            return false;
        } catch (error) {
            console.error('Web: Failed to toggle microphone:', error);
            return false;
        }
    }

    // Adjust volume
    async setVolume(volume) {
        try {
            if (this.localAudioTrack) {
                this.localAudioTrack.setVolume(volume);
                console.log('Web: Volume set to:', volume);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Web: Failed to set volume:', error);
            return false;
        }
    }

    // Get available microphones
    async getMicrophones() {
        try {
            const devices = await AgoraRTC.getMicrophones();
            console.log('Web: Available microphones:', devices.length);
            return devices;
        } catch (error) {
            console.error('Web: Failed to get microphones:', error);
            return [];
        }
    }

    // Switch microphone
    async switchMicrophone(deviceId) {
        try {
            if (this.localAudioTrack) {
                await this.localAudioTrack.setDevice(deviceId);
                console.log('Web: Switched to microphone:', deviceId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Web: Failed to switch microphone:', error);
            return false;
        }
    }

    // Get call statistics
    async getCallStats() {
        try {
            if (this.client && this.isJoined) {
                const stats = await this.client.getRTCStats();
                console.log('Web: Call stats retrieved');
                return stats;
            }
            return null;
        } catch (error) {
            console.error('Web: Failed to get call stats:', error);
            return null;
        }
    }

    // Check if currently in a call
    isInCall() {
        return this.isJoined && this.currentChannel !== null;
    }

    // Get current channel info
    getCurrentCallInfo() {
        return {
            isInCall: this.isInCall(),
            channel: this.currentChannel,
            uid: this.uid,
            remoteUsers: Object.keys(this.remoteUsers),
            microphoneEnabled: this.localAudioTrack?.enabled || false
        };
    }

    // Check microphone permissions
    async checkMicrophonePermission() {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                console.log('Web: Microphone permission:', permission.state);
                return permission.state === 'granted';
            }
            return false;
        } catch (error) {
            console.warn('Web: Could not check microphone permission:', error);
            return false;
        }
    }

    // Request microphone permission
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the test stream
            console.log('Web: Microphone permission granted');
            return true;
        } catch (error) {
            console.error('Web: Microphone permission denied:', error);
            return false;
        }
    }
}

// Export singleton instance
export default new AgoraWebVoiceService();
