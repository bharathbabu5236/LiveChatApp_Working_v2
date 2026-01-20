// Direct Agora calling service without Firebase signaling
import agoraWebVoiceService from './agoraWebVoiceService';
import { generateChannelName } from '../config/agoraConfigWeb';

class DirectCallService {
    constructor() {
        this.activeCall = null;
        this.onIncomingUser = null;
        this.onUserLeft = null;
        this.onCallEnded = null;
    }

    // Generate channel name from chat participants
    generateCallChannel(userId1, userId2) {
        // Create consistent channel name regardless of who calls first
        const sortedIds = [userId1, userId2].sort();
        return `call_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Start a voice call
    async startCall(currentUserId, targetUserId, callbacks = {}) {
        try {
            console.log('DirectCall: Starting call between', currentUserId, 'and', targetUserId);
            console.log('DirectCall: Callbacks provided:', typeof callbacks);
            
            this.onIncomingUser = callbacks.onIncomingUser || null;
            this.onUserLeft = callbacks.onUserLeft || null;
            this.onCallEnded = callbacks.onCallEnded || null;

            const channelName = this.generateCallChannel(currentUserId, targetUserId);
            console.log('DirectCall: Using channel:', channelName);

            // Set up Agora event listeners
            agoraWebVoiceService.onUserJoined = (user) => {
                console.log('DirectCall: Remote user joined:', user.uid);
                if (this.onIncomingUser) {
                    this.onIncomingUser(user);
                }
            };

            agoraWebVoiceService.onUserLeft = (user) => {
                console.log('DirectCall: Remote user left:', user.uid);
                if (this.onUserLeft) {
                    this.onUserLeft(user);
                }
                this.endCall();
            };

            agoraWebVoiceService.onError = (error) => {
                console.error('DirectCall: Agora error:', error);
                // Don't automatically end call, let the modal handle the error
                if (this.onCallEnded) {
                    this.onCallEnded({ error: error, status: 'failed' });
                }
            };

            // Initialize and join channel
            const initialized = await agoraWebVoiceService.initializeClient();
            if (!initialized) {
                throw new Error('Failed to initialize Agora client');
            }

            const result = await agoraWebVoiceService.joinChannel(channelName, currentUserId);
            if (!result.success) {
                throw new Error('Failed to join voice channel: ' + result.error);
            }
            
            this.activeCall = {
                channelName,
                currentUserId,
                targetUserId,
                startTime: Date.now()
            };

            console.log('DirectCall: Call started successfully');
            return {
                success: true,
                channelName,
                callInfo: this.activeCall
            };

        } catch (error) {
            console.error('DirectCall: Error starting call:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Join an existing call (when the other person is already in channel)
    async joinCall(currentUserId, targetUserId) {
        console.log('DirectCall: Joining existing call');
        return this.startCall(currentUserId, targetUserId);
    }

    // End the current call
    async endCall() {
        try {
            console.log('DirectCall: Ending call');
            
            if (this.activeCall) {
                await agoraWebVoiceService.leaveChannel();
                
                if (this.onCallEnded) {
                    this.onCallEnded(this.activeCall);
                }
                
                this.activeCall = null;
            }

            // Reset callbacks
            this.onIncomingUser = null;
            this.onUserLeft = null;
            this.onCallEnded = null;

        } catch (error) {
            console.error('DirectCall: Error ending call:', error);
        }
    }

    // Get current call info
    getCurrentCall() {
        return this.activeCall;
    }

    // Check if currently in a call
    isInCall() {
        return this.activeCall !== null;
    }

    // Mute/unmute microphone
    async toggleMute() {
        if (this.isInCall()) {
            return await agoraWebVoiceService.toggleMicrophone();
        }
        return false;
    }

    // Adjust volume
    async setVolume(volume) {
        if (this.isInCall()) {
            return await agoraWebVoiceService.setVolume(volume);
        }
        return false;
    }
}

// Create singleton instance
const directCallService = new DirectCallService();
export default directCallService;
