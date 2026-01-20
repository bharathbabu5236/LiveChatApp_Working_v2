import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, IAgoraRTCRemoteUser, ConnectionState } from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG, type AudioProfile } from '../config/agoraConfigWeb';

// Types for voice service
export interface CallResult {
    success: boolean;
    uid?: string | number;
    channel?: string;
    error?: string;
}

export interface CallInfo {
    isInCall: boolean;
    channel: string | null;
    uid: string | number | null;
    remoteUsers: string[];
    microphoneEnabled: boolean;
}

export type UserEventCallback = (user: IAgoraRTCRemoteUser) => void;
export type UserLeftEventCallback = (user: IAgoraRTCRemoteUser, reason: string) => void;
export type ConnectionStateCallback = (newState: ConnectionState, oldState: ConnectionState) => void;
export type ErrorCallback = (error: string) => void;

class AgoraWebVoiceService {
    private client: IAgoraRTCClient | null = null;
    private localAudioTrack: IMicrophoneAudioTrack | null = null;
    private remoteUsers: Record<string, IAgoraRTCRemoteUser> = {};
    private isJoined: boolean = false;
    private currentChannel: string | null = null;
    private uid: string | number | null = null;
    
    // Event callbacks
    public onUserJoined: UserEventCallback | null = null;
    public onUserLeft: UserLeftEventCallback | null = null;
    public onConnectionStateChanged: ConnectionStateCallback | null = null;
    public onError: ErrorCallback | null = null;

    // Initialize Agora client for web
    async initializeClient(): Promise<boolean> {
        try {
            if (!this.client) {
                this.client = AgoraRTC.createClient({ 
                    mode: 'rtc', 
                    codec: 'vp8' 
                });
                
                // Set up event listeners
                this.setupEventListeners();
                
                // Enable dual stream for better performance
                await this.client.enableDualStream();
                
                console.log('Agora Web client initialized successfully');
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize Agora web client:', error);
            if (this.onError) this.onError('Failed to initialize voice service for web');
            return false;
        }
    }

    // Set up event listeners for web
    private setupEventListeners(): void {
        if (!this.client) return;

        // User joined
        this.client.on('user-joined', async (user: IAgoraRTCRemoteUser) => {
            console.log('Web: User joined:', user.uid);
            this.remoteUsers[user.uid.toString()] = user;
            if (this.onUserJoined) this.onUserJoined(user);
        });

        // User left
        this.client.on('user-left', (user: IAgoraRTCRemoteUser, reason: string) => {
            console.log('Web: User left:', user.uid, 'Reason:', reason);
            delete this.remoteUsers[user.uid.toString()];
            if (this.onUserLeft) this.onUserLeft(user, reason);
        });

        // User published audio
        this.client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
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
        this.client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
            console.log('Web: User unpublished:', user.uid, mediaType);
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.stop();
                console.log('Web: Stopped remote audio track');
            }
        });

        // Connection state changed
        this.client.on('connection-state-change', (curState: ConnectionState, revState: ConnectionState) => {
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
        this.client.on('exception', (evt: any) => {
            console.error('Web: Agora exception:', evt);
            if (this.onError) this.onError('Voice call error occurred');
        });

        // Token privilege will expire
        this.client.on('token-privilege-will-expire', () => {
            console.warn('Web: Token privilege will expire soon');
            // In production, refresh the token here
        });
    }

    // Join voice channel for web
    async joinChannel(channelName: string, userId: string | number | null = null): Promise<CallResult> {
        try {
            await this.initializeClient();
            
            if (this.isJoined) {
                await this.leaveChannel();
            }

            // Generate UID if not provided
            this.uid = userId || Math.floor(Math.random() * 100000);

            // Join the channel
            if (!this.client) {
                throw new Error('Agora web client not initialized');
            }

            console.log('Web: Attempting to join channel:', channelName, 'with UID:', this.uid);

            await this.client.join(
                AGORA_CONFIG.APP_ID,
                channelName,
                null, // Token (null for testing, should use token in production)
                this.uid
            );

            this.isJoined = true;
            this.currentChannel = channelName;
            
            console.log('Web: Successfully joined channel:', channelName, 'with UID:', this.uid);
            
            // Create and publish local audio track
            await this.enableMicrophone();
            
            return { success: true, uid: this.uid, channel: channelName };
        } catch (error) {
            console.error('Web: Failed to join channel:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (this.onError) this.onError('Failed to join voice call: ' + errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    // Leave voice channel
    async leaveChannel(): Promise<CallResult> {
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
    async enableMicrophone(): Promise<boolean> {
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
    async disableMicrophone(): Promise<boolean> {
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
    async toggleMicrophone(): Promise<boolean> {
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
    async setVolume(volume: number): Promise<boolean> {
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
    async getMicrophones(): Promise<MediaDeviceInfo[]> {
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
    async switchMicrophone(deviceId: string): Promise<boolean> {
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
    async getCallStats(): Promise<any> {
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
    isInCall(): boolean {
        return this.isJoined && this.currentChannel !== null;
    }

    // Get current channel info
    getCurrentCallInfo(): CallInfo {
        return {
            isInCall: this.isInCall(),
            channel: this.currentChannel,
            uid: this.uid,
            remoteUsers: Object.keys(this.remoteUsers),
            microphoneEnabled: this.localAudioTrack?.enabled || false
        };
    }

    // Check microphone permissions
    async checkMicrophonePermission(): Promise<boolean> {
        try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log('Web: Microphone permission:', permission.state);
            return permission.state === 'granted';
        } catch (error) {
            console.warn('Web: Could not check microphone permission:', error);
            return false;
        }
    }

    // Request microphone permission
    async requestMicrophonePermission(): Promise<boolean> {
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
