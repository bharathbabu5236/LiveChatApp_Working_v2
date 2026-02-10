/**
 * LOUD & CLEAR TTS SOLUTION
 * 
 * This generates VERY obvious audio that should definitely be heard
 * by the other person if audio transmission is working at all.
 */

import workingVoiceCallService from './workingVoiceCallService';

export interface LoudTTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

class LoudTTSService {
    private audioContext: AudioContext | null = null;

    async initialize(): Promise<boolean> {
        try {
            this.audioContext = new AudioContext();
            console.log('🔊 Loud TTS Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Loud TTS Service initialization failed:', error);
            return false;
        }
    }

    /**
     * LOUD OBVIOUS BEEP PATTERN
     * Creates very loud, obvious beeps that should definitely be heard
     */
    async transmitLoudTTS(text: string, options: LoudTTSOptions = {}): Promise<boolean> {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            if (!this.audioContext) {
                throw new Error('AudioContext not available');
            }

            console.log(`🔊 LOUD TTS: Transmitting LOUD beeps for "${text}"`);

            // Check if call is ready
            if (!workingVoiceCallService.isReadyForAudioInjection()) {
                console.error('❌ Voice call not ready for audio injection');
                return false;
            }

            // Create VERY LOUD and OBVIOUS beep pattern
            const duration = 5; // 5 seconds of loud beeps
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate LOUD alternating beeps - 1000Hz and 500Hz
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                
                // Alternate between high and low beep every 0.5 seconds
                const beepPhase = Math.floor(t / 0.5) % 2;
                const frequency = beepPhase === 0 ? 1000 : 500; // Very clear frequencies
                
                // Create envelope with sharp attack and decay for clear beeps
                const beepTime = t % 0.5;
                let envelope = 0;
                
                if (beepTime < 0.1) {
                    // Attack - ramp up quickly
                    envelope = beepTime / 0.1;
                } else if (beepTime < 0.3) {
                    // Sustain - full volume
                    envelope = 1.0;
                } else {
                    // Release - fade out
                    envelope = 1.0 - ((beepTime - 0.3) / 0.2);
                }
                
                envelope = Math.max(0, Math.min(1, envelope));
                
                // Generate LOUD sine wave - much louder than before
                const volume = 0.9; // Very loud - 90% volume
                data[i] = volume * envelope * Math.sin(2 * Math.PI * frequency * t);
            }

            console.log(`🔊 Generated ${duration}s of LOUD alternating beeps (1000Hz/500Hz)`);

            // Create MediaStream from buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const destination = this.audioContext.createMediaStreamDestination();
            source.connect(destination);

            // Start the audio
            source.start();

            console.log('🔊 Injecting LOUD audio...');
            const success = await workingVoiceCallService.injectCustomAudio(destination.stream);

            if (success) {
                console.log('🔊 ✅ LOUD TTS injection successful - other person should hear LOUD beeps!');
            } else {
                console.log('🔊 ❌ LOUD TTS injection failed');
            }

            return success;

        } catch (error) {
            console.error('❌ Loud TTS failed:', error);
            return false;
        }
    }

    /**
     * Test with VERY OBVIOUS beeps
     */
    async testLoudTransmission(): Promise<boolean> {
        return this.transmitLoudTTS('LOUD TEST BEEPS', { volume: 0.9 });
    }
}

export const loudTTSService = new LoudTTSService();
export default loudTTSService;
