import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfig';

class AgoraVoiceService {
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

    // Initialize Agora client
    async initializeClient() {
        try {
            if (!this.client) {
                this.client = AgoraRTC.createClient({ 
                    mode: 'rtc', 
                    codec: 'vp8' 
                });
                
                // Set up event listeners
                this.setupEventListeners();
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize Agora client:', error);
            if (this.onError) this.onError('Failed to initialize voice service');
            return false;
        }
    }

    // Set up event listeners
    setupEventListeners() {
        if (!this.client) return;

        // User joined
        this.client.on('user-joined', async (user) => {
            console.log('User joined:', user.uid);
            this.remoteUsers[user.uid] = user;
            if (this.onUserJoined) this.onUserJoined(user);
        });

        // User left
        this.client.on('user-left', (user, reason) => {
            console.log('User left:', user.uid, 'Reason:', reason);
            delete this.remoteUsers[user.uid];
            if (this.onUserLeft) this.onUserLeft(user, reason);
        });

        // User published audio
        this.client.on('user-published', async (user, mediaType) => {
            if (mediaType === 'audio') {
                console.log('User published audio:', user.uid);
                await this.client.subscribe(user, mediaType);
                user.audioTrack?.play();
            }
        });

        // User unpublished
        this.client.on('user-unpublished', (user, mediaType) => {
            console.log('User unpublished:', user.uid, mediaType);
            if (mediaType === 'audio') {
                user.audioTrack?.stop();
            }
        });

        // Connection state changed
        this.client.on('connection-state-change', (curState, revState) => {
            console.log('Connection state changed:', curState, 'Previous:', revState);
            if (this.onConnectionStateChanged) {
                this.onConnectionStateChanged(curState, revState);
            }
        });

        // Exception handling
        this.client.on('exception', (evt) => {
            console.error('Agora exception:', evt);
            if (this.onError) this.onError('Voice call error occurred');
        });
    }

    // Join voice channel
    async joinChannel(channelName, userId = null) {
        try {
            await this.initializeClient();
            
            if (this.isJoined) {
                await this.leaveChannel();
            }

            // Generate UID if not provided
            this.uid = userId || Math.floor(Math.random() * 100000);

            // Join the channel
            await this.client.join(
                AGORA_CONFIG.APP_ID,
                channelName,
                null, // Token (null for testing, should use token in production)
                this.uid
            );

            this.isJoined = true;
            this.currentChannel = channelName;
            
            console.log('Successfully joined channel:', channelName, 'with UID:', this.uid);
            
            // Create and publish local audio track
            await this.enableMicrophone();
            
            return { success: true, uid: this.uid, channel: channelName };
        } catch (error) {
            console.error('Failed to join channel:', error);
            if (this.onError) this.onError('Failed to join voice call');
            return { success: false, error: error.message };
        }
    }

    // Leave voice channel
    async leaveChannel() {
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
            this.remoteUsers = {};
            
            console.log('Successfully left channel');
            return { success: true };
        } catch (error) {
            console.error('Failed to leave channel:', error);
            return { success: false, error: error.message };
        }
    }

    // Enable microphone
    async enableMicrophone() {
        try {
            if (!this.localAudioTrack) {
                this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                    encoderConfig: AGORA_CONFIG.AUDIO_PROFILE,
                });
            }

            if (this.client && this.isJoined) {
                await this.client.publish([this.localAudioTrack]);
            }

            console.log('Microphone enabled');
            return true;
        } catch (error) {
            console.error('Failed to enable microphone:', error);
            if (this.onError) this.onError('Failed to access microphone');
            return false;
        }
    }

    // Disable microphone
    async disableMicrophone() {
        try {
            if (this.localAudioTrack) {
                if (this.client && this.isJoined) {
                    await this.client.unpublish([this.localAudioTrack]);
                }
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
            }
            console.log('Microphone disabled');
            return true;
        } catch (error) {
            console.error('Failed to disable microphone:', error);
            return false;
        }
    }

    // Mute/unmute microphone
    async toggleMicrophone() {
        try {
            if (this.localAudioTrack) {
                const enabled = this.localAudioTrack.enabled;
                await this.localAudioTrack.setEnabled(!enabled);
                console.log('Microphone', enabled ? 'muted' : 'unmuted');
                return !enabled;
            }
            return false;
        } catch (error) {
            console.error('Failed to toggle microphone:', error);
            return false;
        }
    }

    // Get call statistics
    async getCallStats() {
        try {
            if (this.client && this.isJoined) {
                return await this.client.getRTCStats();
            }
            return null;
        } catch (error) {
            console.error('Failed to get call stats:', error);
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
}

// Export singleton instance
export default new AgoraVoiceService();
