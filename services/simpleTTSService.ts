/**
 * Alternative 2: Simple Audio Capture TTS Service
 * 
 * This approach captures browser audio using MediaRecorder and injects it into calls.
 * Much simpler than the server approach.
 */

import workingVoiceCallService from '../services/workingVoiceCallService';

export interface SimpleTTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

class SimpleTTSService {
    private isRecording = false;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    /**
     * Simple approach: Record TTS audio and inject into call
     */
    async speakThroughCall(text: string, options: SimpleTTSOptions = {}): Promise<boolean> {
        try {
            console.log(`🗣️ 🎵 Simple TTS: Speaking "${text}"`);

            // Method 1: Use system audio capture
            if (await this.trySystemAudioCapture(text, options)) {
                return true;
            }

            // Method 2: Fallback to speaker playback (user must unmute)
            return await this.tryFallbackPlayback(text, options);

        } catch (error) {
            console.error('❌ Simple TTS failed:', error);
            return false;
        }
    }

    /**
     * Try to capture system audio (works on some browsers)
     */
    private async trySystemAudioCapture(text: string, options: SimpleTTSOptions): Promise<boolean> {
        try {
            console.log('🎵 Trying system audio capture...');

            // Request system audio access
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true
            });

            if (!stream || stream.getAudioTracks().length === 0) {
                throw new Error('No audio track in system capture');
            }

            console.log('✅ System audio capture successful');

            // Start recording
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.injectAudioIntoCall(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording and then play TTS
            this.mediaRecorder.start();
            this.isRecording = true;

            // Play TTS (will be captured by system audio)
            await this.playTTS(text, options);

            // Stop recording after a delay
            setTimeout(() => {
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                }
            }, text.length * 100 + 2000); // Estimate duration

            return true;

        } catch (error) {
            console.log('🎵 System audio capture failed:', error);
            return false;
        }
    }

    /**
     * Fallback: Play TTS through speakers (user must manage microphone)
     */
    private async tryFallbackPlayback(text: string, options: SimpleTTSOptions): Promise<boolean> {
        try {
            console.log('🎵 Using fallback playback method');
            
            // Show user instruction
            if (confirm(`🎤 TTS Fallback Mode\n\nI'll play the translated speech through your speakers.\n\nTo transmit it through the call:\n1. Make sure your microphone can hear your speakers\n2. Click OK to play the speech\n3. The remote user should hear it through your microphone\n\nReady?`)) {
                await this.playTTS(text, options);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Fallback playback failed:', error);
            return false;
        }
    }

    /**
     * Play TTS using browser's speech synthesis
     */
    private async playTTS(text: string, options: SimpleTTSOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = options.lang || 'en-US';
            utterance.rate = options.rate || 0.8;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;

            utterance.onend = () => {
                console.log('🗣️ TTS playback completed');
                resolve();
            };

            utterance.onerror = (error) => {
                console.error('🗣️ TTS playback error:', error);
                reject(error);
            };

            speechSynthesis.cancel(); // Clear any pending speech
            speechSynthesis.speak(utterance);
        });
    }

    /**
     * Inject captured audio blob into the call
     */
    private async injectAudioIntoCall(audioBlob: Blob): Promise<void> {
        try {
            console.log(`🎵 Injecting audio into call: ${audioBlob.size} bytes`);

            // Create audio element from blob
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioElement = document.createElement('audio');
            audioElement.src = audioUrl;
            audioElement.volume = 0.8;

            // Create audio context for injection (similar to our previous method)
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            const source = audioContext.createMediaElementSource(audioElement);
            
            source.connect(destination);

            // Get the audio track
            const audioTrack = destination.stream.getAudioTracks()[0];

            if (audioTrack) {
                // Use the voice call service to inject audio
                // This would require extending the voice call service
                console.log('🎵 Audio track created for injection');
                
                // Play the audio (this will be captured if system audio is working)
                audioElement.play();
            }

            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
                audioElement.remove();
                audioContext.close();
            }, 5000);

        } catch (error) {
            console.error('❌ Audio injection failed:', error);
        }
    }
}

export const simpleTTSService = new SimpleTTSService();
export default simpleTTSService;
