// Working Voice Call Service - Based on Successful Ultra Simple Test
import AgoraRTC from 'agora-rtc-sdk-ng';

class WorkingVoiceCallService {
    constructor() {
        this.client = null;
        this.localAudioTrack = null;
        this.localVideoTrack = null;
        this.remoteVideoTrack = null; // store latest remote video track
        this.isJoined = false;
        this.currentChannel = null;
        this.uid = null;
        
        // Event callbacks
        this.onUserJoined = null;
        this.onUserLeft = null;
        this.onError = null;
        this.onRemoteVideoAvailable = null;
        this.onRemoteVideoUnavailable = null;
        this.onLocalVideoAvailable = null;
    }

    // Get the Agora client instance for audio translation
    getAgoraClient() {
        return this.client;
    }

    // Start a voice call using the working approach
    async startVoiceCall(channelName, userId = null) {
        try {
            console.log('🎤 Starting working voice call...');
            console.log('- Channel:', channelName);
            
            // Use the SAME approach as the successful ultra simple test
            const APP_ID = '3abcebb9062c4a0cb6e5967b1f028cd9';
            
            // Create client exactly like the working test
            this.client = AgoraRTC.createClient({ 
                mode: 'rtc', 
                codec: 'vp8' 
            });
            
        // Set up event listeners
        this.setupEventListeners();            // Generate UID
            this.uid = userId || Math.floor(Math.random() * 100000);
            
            console.log('🚀 Joining voice call channel...');
            console.log('- UID:', this.uid);
            
            // Join channel using NULL token (same as working test)
            const result = await this.client.join(APP_ID, channelName, null, this.uid);
            
            this.isJoined = true;
            this.currentChannel = channelName;
            
            console.log('✅ Voice call channel joined successfully!');
            
            // Create and publish audio track (same as working test)
            await this.enableMicrophone();
            
            return {
                success: true,
                uid: result,
                channel: channelName,
                message: 'Voice call started successfully!'
            };
            
        } catch (error) {
            console.error('❌ Working voice call failed:', error);
            this.cleanup();
            
            return {
                success: false,
                error: error.code || 'VOICE_CALL_ERROR',
                message: error.message,
                details: 'Voice call connection failed'
            };
        }
    }

    // Set up event listeners
    setupEventListeners() {
        if (!this.client) return;

        // User joined
        this.client.on('user-joined', async (user) => {
            console.log('🎉 Remote user joined voice call:', user.uid);
            if (this.onUserJoined) this.onUserJoined(user);
        });

        // User left
        this.client.on('user-left', (user, reason) => {
            console.log('👋 Remote user left voice call:', user.uid, 'Reason:', reason);
            // Clear stored remote video track when a user leaves
            if (this.remoteVideoTrack) {
                try {
                    this.remoteVideoTrack.stop();
                } catch (e) {}
                this.remoteVideoTrack = null;
            }
            if (this.onUserLeft) this.onUserLeft(user, reason);
        });

        // User published audio/video
        this.client.on('user-published', async (user, mediaType) => {
            if (mediaType === 'audio') {
                console.log('🎶 Remote user published audio:', user.uid);
                try {
                    await this.client.subscribe(user, mediaType);
                    if (user.audioTrack) {
                        user.audioTrack.play();
                        console.log('🔊 Playing remote audio');
                    }
                } catch (error) {
                    console.error('Error subscribing to remote audio:', error);
                }
            } else if (mediaType === 'video') {
                console.log('📹 Remote user published video:', user.uid);
                try {
                    await this.client.subscribe(user, mediaType);
                    if (user.videoTrack) {
                        console.log('📺 Remote video track available - ready to play');

                        // Store remote video track so UI can mount it later
                        this.remoteVideoTrack = user.videoTrack;

                        // Trigger callback with video track if UI has registered handler
                        if (this.onRemoteVideoAvailable) {
                            this.onRemoteVideoAvailable(user.videoTrack);
                        }
                    }
                } catch (error) {
                    console.error('Error subscribing to remote video:', error);
                }
            }
        });

        // User unpublished
        this.client.on('user-unpublished', (user, mediaType) => {
            console.log('👋 Remote user unpublished:', user.uid, mediaType);
            if (mediaType === 'audio' && user.audioTrack) {
                try { user.audioTrack.stop(); } catch (e) {}
                console.log('🔇 Stopped remote audio');
            } else if (mediaType === 'video') {
                try {
                    if (user.videoTrack) user.videoTrack.stop();
                } catch (e) {}
                console.log('📺 Stopped remote video');

                // Clear stored remote track and notify UI
                this.remoteVideoTrack = null;
                if (this.onRemoteVideoUnavailable) {
                    this.onRemoteVideoUnavailable();
                }
            }
        });

        // Connection state changes
        this.client.on('connection-state-change', (curState, revState) => {
            console.log('🔗 Voice call connection state:', curState, 'from', revState);
        });

        // Errors
        this.client.on('exception', (evt) => {
            console.error('🚨 Voice call exception:', evt);
            if (this.onError) this.onError(evt);
        });
    }

    // Enable microphone (same approach as working test)
    async enableMicrophone() {
        try {
            console.log('🎤 Creating microphone audio track...');
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: 'music_standard'
            });
            
            console.log('📢 Publishing audio track...');
            await this.client.publish([this.localAudioTrack]);
            
            console.log('✅ Microphone enabled and published!');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to enable microphone:', error);
            return { success: false, error: error.message };
        }
    }

    // Mute/unmute microphone
    async setMicrophoneMuted(muted) {
        if (this.localAudioTrack) {
            await this.localAudioTrack.setMuted(muted);
            console.log(muted ? '🔇 Microphone muted' : '🎤 Microphone unmuted');
            return true;
        }
        return false;
    }

    // Enable video
    async enableVideo() {
        try {
            if (this.localVideoTrack) {
                console.log('📹 Video track already exists');
                return { success: true };
            }

            console.log('📹 Creating camera video track...');
            console.log('📹 Requesting camera permissions...');
            
            // Request camera and microphone permissions explicitly
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: false // Only request video permission here
                });
                // Stop the test stream immediately
                stream.getTracks().forEach(track => track.stop());
                console.log('📹 Camera permission granted');
            } catch (permError) {
                console.error('📹 Camera permission denied:', permError);
                return { success: false, error: 'Camera permission denied. Please allow camera access.' };
            }

            this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
                encoderConfig: "480p_1",
                optimizationMode: "motion", // Better for video calls
                facingMode: "user" // Front camera for selfie view
            });
            
            console.log('📢 Publishing video track...');
            await this.client.publish([this.localVideoTrack]);
            
            console.log('✅ Video enabled and published!');
            
            // Auto-play local video for preview
            if (this.onLocalVideoAvailable) {
                this.onLocalVideoAvailable(this.localVideoTrack);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to enable video:', error);
            let errorMessage = 'Failed to enable camera';
            
            if (error.message.includes('Permission')) {
                errorMessage = 'Camera permission denied. Please allow camera access and try again.';
            } else if (error.message.includes('NotFoundError')) {
                errorMessage = 'No camera found. Please check your camera is connected.';
            } else if (error.message.includes('NotAllowedError')) {
                errorMessage = 'Camera access blocked. Please allow camera permissions in your browser.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    // Disable video
    async disableVideo() {
        try {
            if (this.localVideoTrack) {
                console.log('📹 Stopping and closing video track...');
                
                // Unpublish the video track
                await this.client.unpublish([this.localVideoTrack]);
                
                // Stop and close the video track
                this.localVideoTrack.stop();
                this.localVideoTrack.close();
                this.localVideoTrack = null;
                
                console.log('✅ Video disabled successfully');
                return { success: true };
            }
            return { success: true }; // Already disabled
            
        } catch (error) {
            console.error('❌ Failed to disable video:', error);
            return { success: false, error: error.message };
        }
    }

    // End voice call
    async endVoiceCall() {
        try {
            console.log('📞 Ending voice call...');
            
            await this.cleanup();
            
            console.log('✅ Voice call ended successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error ending voice call:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup resources
    async cleanup() {
        try {
            // Stop and close local audio track
            if (this.localAudioTrack) {
                this.localAudioTrack.stop();
                this.localAudioTrack.close();
                this.localAudioTrack = null;
                console.log('🧹 Local audio track cleaned up');
            }

            // Stop and close local video track
            if (this.localVideoTrack) {
                this.localVideoTrack.stop();
                this.localVideoTrack.close();
                this.localVideoTrack = null;
                console.log('🧹 Local video track cleaned up');
            }

            // Leave the channel
            if (this.client && this.isJoined) {
                await this.client.leave();
                console.log('👋 Left voice call channel');
            }

            this.isJoined = false;
            this.currentChannel = null;
            this.uid = null;
            this.client = null;
            
        } catch (error) {
            console.error('Error during voice call cleanup:', error);
        }
    }

    // Get current call status
    getCallStatus() {
        return {
            isJoined: this.isJoined,
            channel: this.currentChannel,
            uid: this.uid,
            hasMicrophone: !!this.localAudioTrack,
            hasVideo: !!this.localVideoTrack
        };
    }

    // Get local video track for preview
    getLocalVideoTrack() {
        return this.localVideoTrack;
    }

    // Get remote video track if available
    getRemoteVideoTrack() {
        return this.remoteVideoTrack;
    }

    // Switch camera (front/back)
    async switchCamera() {
        try {
            if (this.localVideoTrack) {
                await this.localVideoTrack.switchDevice();
                console.log('📹 Camera switched successfully');
                return { success: true };
            }
            return { success: false, error: 'No video track available' };
        } catch (error) {
            console.error('❌ Failed to switch camera:', error);
            return { success: false, error: error.message };
        }
    }

    // Check camera permission
    async checkCameraPermission() {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' });
                console.log('📹 Camera permission:', permission.state);
                return permission.state === 'granted';
            }
            return false;
        } catch (error) {
            console.warn('📹 Could not check camera permission:', error);
            return false;
        }
    }

    // Request camera permission
    async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            stream.getTracks().forEach(track => track.stop()); // Stop the test stream
            console.log('📹 Camera permission granted');
            return true;
        } catch (error) {
            console.error('📹 Camera permission denied:', error);
            return false;
        }
    }
}

export default new WorkingVoiceCallService();
