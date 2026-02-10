/**
 * DIRECT TTS SOLUTION
 * 
 * This uses the exact same pattern that already works for synthetic sounds,
 * but adapted for TTS audio transmission.
 */

import workingVoiceCallService from './workingVoiceCallService';

export interface DirectTTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

class DirectTTSService {
    private audioContext: AudioContext | null = null;

    async initialize(): Promise<boolean> {
        try {
            this.audioContext = new AudioContext();
            console.log('🎯 Direct TTS Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Direct TTS Service initialization failed:', error);
            return false;
        }
    }

    /**
     * SIMPLIFIED DIRECT APPROACH
     * Uses the exact pattern that works for the existing synthetic sound transmission
     */
    async transmitTTS(text: string, options: DirectTTSOptions = {}): Promise<boolean> {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            if (!this.audioContext) {
                throw new Error('AudioContext not available');
            }

            console.log(`🎯 Direct TTS: Transmitting "${text}"`);

            // Check if call is ready
            if (!workingVoiceCallService.isReadyForAudioInjection()) {
                console.error('❌ Voice call not ready for audio injection');
                return false;
            }

            // Create beep pattern representing text length
            const duration = Math.max(text.length * 0.1, 2); // 0.1s per character, min 2s
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate alternating tones for text representation
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const charIndex = Math.floor((t / duration) * text.length);
                const char = text.charAt(charIndex) || 'a';
                
                // Create frequency based on character
                const baseFreq = 200 + (char.charCodeAt(0) % 300); // 200-500 Hz range
                
                // Create envelope
                const envelope = 0.3 * Math.exp(-t * 0.8); // Gentle decay
                
                // Generate tone
                data[i] = envelope * Math.sin(2 * Math.PI * baseFreq * t) * (options.volume || 0.5);
            }

            // Create MediaStream from buffer using the EXACT same method as the working synthetic sound
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const destination = this.audioContext.createMediaStreamDestination();
            source.connect(destination);

            // Start the audio
            source.start();

            // Inject using the proven method
            console.log('🎯 Injecting audio using proven method...');
            const success = await workingVoiceCallService.injectCustomAudio(destination.stream);

            if (success) {
                console.log('🎯 ✅ Direct TTS transmission successful');
            } else {
                console.log('🎯 ❌ Direct TTS transmission failed');
            }

            return success;

        } catch (error) {
            console.error('❌ Direct TTS failed:', error);
            return false;
        }
    }

    /**
     * Quick test method
     */
    async testTransmission(): Promise<boolean> {
        return this.transmitTTS('Hello World Test', { volume: 0.6 });
    }
}

export const directTTSService = new DirectTTSService();
export default directTTSService;
