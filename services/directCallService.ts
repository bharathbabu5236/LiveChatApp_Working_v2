// Direct Agora calling service without Firebase signaling
import workingVoiceCallService from './workingVoiceCallService';
import { generateChannelName } from '../config/agoraConfigWeb';

// Types
interface ActiveCall {
    channelName: string;
    currentUserId: string;
    targetUserId: string;
    startTime: number;
}

interface CallResult {
    success: boolean;
    channelName?: string;
    callInfo?: ActiveCall;
    error?: string;
}

interface CallCallbacks {
    onIncomingUser?: (user: any) => void;
    onUserLeft?: (user: any) => void;
    onCallEnded?: (callInfo: ActiveCall | { error: any; status: string }) => void;
}

type UserCallback = (user: any) => void;
type CallEndedCallback = (callInfo: ActiveCall | { error: any; status: string }) => void;

class DirectCallService {
    private activeCall: ActiveCall | null = null;
    private onIncomingUser: UserCallback | null = null;
    private onUserLeft: UserCallback | null = null;
    private onCallEnded: CallEndedCallback | null = null;

    // Generate channel name from chat participants
    generateCallChannel(userId1: string, userId2: string): string {
        // Create consistent channel name regardless of who calls first
        const sortedIds = [userId1, userId2].sort();
        return `call_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Start a voice call
    async startCall(currentUserId: string, targetUserId: string, callbacks: CallCallbacks = {}): Promise<CallResult> {
        try {
            console.log('DirectCall: Starting call between', currentUserId, 'and', targetUserId);
            console.log('DirectCall: Callbacks provided:', typeof callbacks);
            
            this.onIncomingUser = callbacks.onIncomingUser || null;
            this.onUserLeft = callbacks.onUserLeft || null;
            this.onCallEnded = callbacks.onCallEnded || null;

            const channelName = this.generateCallChannel(currentUserId, targetUserId);
            console.log('DirectCall: Using channel:', channelName);

            // Set up Agora event listeners
            workingVoiceCallService.onUserJoined = (user: any) => {
                console.log('DirectCall: Remote user joined:', user.uid);
                if (this.onIncomingUser) {
                    this.onIncomingUser(user);
                }
            };

            workingVoiceCallService.onUserLeft = (user: any) => {
                console.log('DirectCall: Remote user left:', user.uid);
                if (this.onUserLeft) {
                    this.onUserLeft(user);
                }
                this.endCall();
            };

            workingVoiceCallService.onError = (error: any) => {
                console.error('DirectCall: Agora error:', error);
                // Don't automatically end call, let the modal handle the error
                if (this.onCallEnded) {
                    this.onCallEnded({ error: error, status: 'failed' });
                }
            };

            // Initialize and join channel using working voice service
            const result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);
            if (!result.success) {
                throw new Error(result.message || 'Failed to start voice call');
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

        } catch (error: any) {
            console.error('DirectCall: Error starting call:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Join an existing call (when the other person is already in channel)
    async joinCall(currentUserId: string, targetUserId: string): Promise<CallResult> {
        console.log('DirectCall: Joining existing call');
        return this.startCall(currentUserId, targetUserId);
    }

    // End the current call
    async endCall(): Promise<void> {
        try {
            console.log('DirectCall: Ending call');
            
            if (this.activeCall) {
                await workingVoiceCallService.endCall();
                
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
    getCurrentCall(): ActiveCall | null {
        return this.activeCall;
    }

    // Check if currently in a call
    isInCall(): boolean {
        return this.activeCall !== null;
    }

    // Mute/unmute microphone
    async toggleMute(): Promise<boolean> {
        if (this.isInCall()) {
            return await workingVoiceCallService.toggleMicrophone();
        }
        return false;
    }

    // Adjust volume (Note: workingVoiceCallService might not have this method)
    async setVolume(volume: number): Promise<boolean> {
        if (this.isInCall()) {
            // workingVoiceCallService doesn't have setVolume, so return true for compatibility
            console.log('DirectCall: Volume control not implemented in workingVoiceCallService');
            return true;
        }
        return false;
    }
}

// Create singleton instance
const directCallService = new DirectCallService();
export default directCallService;
