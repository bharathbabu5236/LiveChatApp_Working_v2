// Working Voice Call Service - Based on Successful Ultra Simple Test
import AgoraRTC, { 
    IAgoraRTCClient, 
    IMicrophoneAudioTrack, 
    ICameraVideoTrack,
    IRemoteVideoTrack,
    UID,
    ConnectionState,
    ConnectionDisconnectedReason
} from 'agora-rtc-sdk-ng';

// Remote user type from Agora SDK
type IRemoteUser = any; // Using any for now as the exact type export varies by SDK version

// Types
interface CallStatus {
    isJoined: boolean;
    channel: string | null;
    uid: UID | null;
    hasMicrophone: boolean;
    hasVideo: boolean;
}

interface CallResult {
    success: boolean;
    uid?: UID;
    channel?: string;
    message?: string;
    error?: string;
    details?: string;
}

interface ServiceResult {
    success: boolean;
    error?: string;
}

// Event callback types
type UserJoinedCallback = (user: IRemoteUser) => void;
type UserLeftCallback = (user: IRemoteUser, reason?: ConnectionDisconnectedReason) => void;
type ErrorCallback = (error: any) => void;
type RemoteVideoAvailableCallback = (videoTrack: IRemoteVideoTrack) => void;
type RemoteVideoUnavailableCallback = () => void;
type LocalVideoAvailableCallback = (videoTrack: ICameraVideoTrack) => void;

class WorkingVoiceCallService {
    private client: IAgoraRTCClient | null = null;
    private localAudioTrack: IMicrophoneAudioTrack | null = null;
    private localVideoTrack: ICameraVideoTrack | null = null;
    private remoteVideoTrack: IRemoteVideoTrack | null = null; // store latest remote video track
    private isJoined: boolean = false;
    private currentChannel: string | null = null;
    private uid: UID | null = null;
    
    // Event callbacks
    public onUserJoined: UserJoinedCallback | null = null;
    public onUserLeft: UserLeftCallback | null = null;
    public onError: ErrorCallback | null = null;
    public onRemoteVideoAvailable: RemoteVideoAvailableCallback | null = null;
    public onRemoteVideoUnavailable: RemoteVideoUnavailableCallback | null = null;
    public onLocalVideoAvailable: LocalVideoAvailableCallback | null = null;

    // Start a voice call using the working approach
    async startVoiceCall(channelName: string, userId?: string | null): Promise<CallResult> {
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
            this.setupEventListeners();
            
            // Generate UID
            this.uid = userId || Math.floor(Math.random() * 100000).toString();
            
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
            
        } catch (error: any) {
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
    private setupEventListeners(): void {
        if (!this.client) return;

        // User joined
        this.client.on('user-joined', async (user: IRemoteUser) => {
            console.log('🎉 Remote user joined voice call:', user.uid);
            if (this.onUserJoined) this.onUserJoined(user);
        });

        // User left
        this.client.on('user-left', (user: IRemoteUser, reason?: ConnectionDisconnectedReason) => {
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
        this.client.on('user-published', async (user: IRemoteUser, mediaType: 'audio' | 'video') => {
            if (mediaType === 'audio') {
                console.log('🎶 Remote user published audio:', user.uid);
                try {
                    await this.client!.subscribe(user, mediaType);
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
                    await this.client!.subscribe(user, mediaType);
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
        this.client.on('user-unpublished', (user: IRemoteUser, mediaType: 'audio' | 'video') => {
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
        this.client.on('connection-state-change', (curState: ConnectionState, revState: ConnectionState) => {
            console.log('🔗 Voice call connection state:', curState, 'from', revState);
        });

        // Errors
        this.client.on('exception', (evt: any) => {
            console.error('🚨 Voice call exception:', evt);
            if (this.onError) this.onError(evt);
        });
    }

    // Enable microphone (same approach as working test)
    async enableMicrophone(): Promise<ServiceResult> {
        try {
            console.log('🎤 Creating microphone audio track...');
            
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: 'music_standard'
            });
            
            console.log('📢 Publishing audio track...');
            await this.client!.publish([this.localAudioTrack]);
            
            console.log('✅ Microphone enabled and published!');
            return { success: true };
            
        } catch (error: any) {
            console.error('❌ Failed to enable microphone:', error);
            return { success: false, error: error.message };
        }
    }

    // REAL TTS SOLUTION: Record speech synthesis through virtual audio cable
    async speakTextThroughCall(text: string, options: {
        lang?: string;
        voice?: SpeechSynthesisVoice;
        rate?: number;
        pitch?: number;
        volume?: number;
    } = {}): Promise<boolean> {
        try {
            console.log(`🗣️ 📞 REAL TTS SOLUTION: Speaking "${text}"`);

            // Check if we have an active call and audio track
            if (!this.localAudioTrack || !this.client) {
                console.error('🗣️ ❌ No active call or audio track');
                return false;
            }

            console.log('🗣️ 🎤 Implementing ACTUAL TTS audio transmission...');

            // Step 1: Store original state
            const wasOriginallyMuted = this.localAudioTrack.muted;
            
            // Step 2: Create audio context for recording TTS
            const audioContext = new AudioContext();
            
            // Step 3: Create a MediaStreamDestination to capture our audio
            const destination = audioContext.createMediaStreamDestination();
            const masterGain = audioContext.createGain();
            masterGain.gain.setValueAtTime(0.0, audioContext.currentTime); // Start silent
            masterGain.connect(destination);
            
            // Step 4: Get microphone access to create a working audio stream
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Connect microphone but keep it muted during TTS
            const micSource = audioContext.createMediaStreamSource(micStream);
            const micGain = audioContext.createGain();
            micGain.gain.setValueAtTime(0.0, audioContext.currentTime); // Mute mic during TTS
            micSource.connect(micGain);
            micGain.connect(masterGain);
            
            // Step 5: Create custom Agora track
            const ttsAudioTrack = await AgoraRTC.createCustomAudioTrack({
                mediaStreamTrack: destination.stream.getAudioTracks()[0]
            });
            
            // Replace the audio track
            await this.client.unpublish([this.localAudioTrack]);
            await this.client.publish([ttsAudioTrack]);
            console.log('🗣️ ✅ TTS audio track published');

            // Step 6: The KEY INSIGHT - Use screen audio capture workaround
            // Since we can't capture TTS directly, we'll create an audio element
            // and use screen sharing audio to capture it
            
            // Create hidden audio element for TTS playback
            const audioElement = document.createElement('audio');
            audioElement.style.display = 'none';
            audioElement.volume = 1.0;
            document.body.appendChild(audioElement);
            
            // Create TTS utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = 1.0;
            utterance.lang = options.lang || 'en-US';
            
            if (options.voice) {
                utterance.voice = options.voice;
                console.log(`🗣️ Using voice: ${options.voice.name}`);
            }
            
            // Step 7: WORKAROUND SOLUTION - Use getDisplayMedia with audio
            // This can capture system audio including TTS
            let screenStream: MediaStream | null = null;
            
            try {
                // Request screen capture with audio (this can capture TTS)
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: false,
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 44100
                    } as any
                });
                
                if (screenStream && screenStream.getAudioTracks().length > 0) {
                    console.log('🗣️ ✅ Screen audio capture successful - using for TTS');
                    
                    // Connect screen audio to our destination
                    const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
                    const screenGain = audioContext.createGain();
                    screenGain.gain.setValueAtTime(0.7, audioContext.currentTime);
                    screenAudioSource.connect(screenGain);
                    screenGain.connect(masterGain);
                    
                    // Enable audio output
                    masterGain.gain.setValueAtTime(0.8, audioContext.currentTime);
                    
                    console.log('🗣️ Starting TTS with screen audio capture...');
                } else {
                    throw new Error('No audio track in screen capture');
                }
            } catch (screenError) {
                console.log('🗣️ Screen capture not available, using fallback method');
                
                // Fallback: Use microphone but ask user to play TTS through speakers
                micGain.gain.setValueAtTime(0.8, audioContext.currentTime);
                masterGain.gain.setValueAtTime(0.8, audioContext.currentTime);
                
                alert('🎤 IMPORTANT: Please ensure your microphone can pick up the computer speakers, then click OK. The TTS will play through speakers and be captured by the microphone for transmission.');
            }
            
            // Step 8: Play the TTS
            return new Promise((resolve) => {
                // Calculate estimated duration
                const words = text.split(' ').length;
                const estimatedDuration = Math.max(2, (words * 60) / 120); // 120 WPM average
                
                utterance.onstart = () => {
                    console.log('🗣️ TTS started playing');
                };
                
                utterance.onend = () => {
                    console.log('🗣️ TTS finished playing');
                };
                
                utterance.onerror = (event) => {
                    console.error('🗣️ TTS error:', event);
                };
                
                // Start the TTS
                speechSynthesis.speak(utterance);
                
                // Cleanup after TTS completes
                setTimeout(async () => {
                    console.log('🗣️ Cleaning up TTS transmission...');
                    
                    try {
                        // Stop everything
                        speechSynthesis.cancel();
                        
                        // Stop screen sharing if active
                        if (screenStream) {
                            screenStream.getTracks().forEach(track => track.stop());
                        }
                        
                        // Stop microphone
                        micStream.getTracks().forEach(track => track.stop());
                        
                        // Clean up audio element
                        document.body.removeChild(audioElement);
                        
                        // Restore original audio track
                        await this.client!.unpublish([ttsAudioTrack]);
                        ttsAudioTrack.stop();
                        ttsAudioTrack.close();
                        
                        await this.client!.publish([this.localAudioTrack!]);
                        await this.localAudioTrack!.setMuted(wasOriginallyMuted);
                        
                        audioContext.close();
                        
                        console.log('🗣️ ✅ TTS transmission complete - audio restored');
                        resolve(true);
                        
                    } catch (error) {
                        console.error('🗣️ ❌ Cleanup error:', error);
                        resolve(false);
                    }
                }, (estimatedDuration + 1) * 1000);
            });
            
        } catch (error) {
            console.error('🗣️ ❌ Failed to transmit real TTS:', error);
            
            // Emergency cleanup
            try {
                speechSynthesis.cancel();
                if (this.client && this.localAudioTrack) {
                    await this.client.publish([this.localAudioTrack]);
                }
            } catch (restoreError) {
                console.error('🗣️ ❌ Emergency cleanup failed:', restoreError);
            }
            
            return false;
        }
    }

    // Mute/unmute microphone
    async setMicrophoneMuted(muted: boolean): Promise<boolean> {
        if (this.localAudioTrack) {
            await this.localAudioTrack.setMuted(muted);
            console.log(muted ? '🔇 Microphone muted' : '🎤 Microphone unmuted');
            return true;
        }
        return false;
    }

    // Toggle microphone mute state
    async toggleMicrophone(): Promise<boolean> {
        if (this.localAudioTrack) {
            const isMuted = this.localAudioTrack.muted;
            await this.setMicrophoneMuted(!isMuted);
            return !isMuted; // Return new mute state
        }
        return false;
    }

    // Enable video
    async enableVideo(): Promise<ServiceResult> {
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
            await this.client!.publish([this.localVideoTrack]);
            
            console.log('✅ Video enabled and published!');
            
            // Auto-play local video for preview
            if (this.onLocalVideoAvailable) {
                this.onLocalVideoAvailable(this.localVideoTrack);
            }
            
            return { success: true };
            
        } catch (error: any) {
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
    async disableVideo(): Promise<ServiceResult> {
        try {
            if (this.localVideoTrack) {
                console.log('📹 Stopping and closing video track...');
                
                // Unpublish the video track
                await this.client!.unpublish([this.localVideoTrack]);
                
                // Stop and close the video track
                this.localVideoTrack.stop();
                this.localVideoTrack.close();
                this.localVideoTrack = null;
                
                console.log('✅ Video disabled successfully');
                return { success: true };
            }
            return { success: true }; // Already disabled
            
        } catch (error: any) {
            console.error('❌ Failed to disable video:', error);
            return { success: false, error: error.message };
        }
    }

    // End voice call
    async endCall(): Promise<ServiceResult> {
        try {
            console.log('📞 Ending voice call...');
            
            await this.cleanup();
            
            console.log('✅ Voice call ended successfully');
            return { success: true };
            
        } catch (error: any) {
            console.error('❌ Error ending voice call:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup resources
    private async cleanup(): Promise<void> {
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
    getCallStatus(): CallStatus {
        return {
            isJoined: this.isJoined,
            channel: this.currentChannel,
            uid: this.uid,
            hasMicrophone: !!this.localAudioTrack,
            hasVideo: !!this.localVideoTrack
        };
    }

    // Get local video track for preview
    getLocalVideoTrack(): ICameraVideoTrack | null {
        return this.localVideoTrack;
    }

    // Get remote video track if available
    getRemoteVideoTrack(): IRemoteVideoTrack | null {
        return this.remoteVideoTrack;
    }

    // Switch camera (front/back)
    async switchCamera(): Promise<ServiceResult> {
        try {
            if (this.localVideoTrack) {
                // Use switchDevice method if available, otherwise return success
                if (typeof (this.localVideoTrack as any).switchDevice === 'function') {
                    await (this.localVideoTrack as any).switchDevice();
                    console.log('📹 Camera switched successfully');
                } else {
                    console.log('📹 Camera switching not supported on this device');
                }
                return { success: true };
            }
            return { success: false, error: 'No video track available' };
        } catch (error: any) {
            console.error('❌ Failed to switch camera:', error);
            return { success: false, error: error.message };
        }
    }

    // Check camera permission
    async checkCameraPermission(): Promise<boolean> {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
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
    async requestCameraPermission(): Promise<boolean> {
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
