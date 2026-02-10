/**
 * PERFECT TTS SOLUTION
 * 
 * Now that we know audio transmission works, this creates speech-like audio
 * that's loud and clear enough to be heard through headphones.
 */

import workingVoiceCallService from './workingVoiceCallService';

export interface PerfectTTSOptions {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

class PerfectTTSService {
    private audioContext: AudioContext | null = null;

    async initialize(): Promise<boolean> {
        try {
            this.audioContext = new AudioContext();
            console.log('🎯 Perfect TTS Service initialized');
            return true;
        } catch (error) {
            console.error('❌ Perfect TTS Service initialization failed:', error);
            return false;
        }
    }

    /**
     * PERFECT SPEECH-LIKE AUDIO
     * Creates loud, clear speech-like audio that works through headphones
     */
    async speakPerfectTTS(text: string, options: PerfectTTSOptions = {}): Promise<boolean> {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            if (!this.audioContext) {
                throw new Error('AudioContext not available');
            }

            console.log(`🎯 Perfect TTS: Speaking "${text}" (LOUD & CLEAR for headphones)`);

            // Check if call is ready
            if (!workingVoiceCallService.isReadyForAudioInjection()) {
                console.error('❌ Voice call not ready for audio injection');
                return false;
            }

            // Create speech-like audio that's loud and clear
            const duration = Math.max(text.length * 0.15, 3); // 0.15s per character, min 3s
            const sampleRate = this.audioContext.sampleRate;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            console.log(`🎯 Generating ${duration}s of speech-like audio for: "${text}"`);

            // Generate LOUD speech-like patterns
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const charIndex = Math.floor((t / duration) * text.length);
                const char = text.charAt(charIndex) || 'a';
                
                // Create speech-like frequencies based on characters
                const baseFreq = this.getCharacterFrequency(char);
                
                // Create vowel/consonant patterns
                const isVowel = 'aeiouAEIOU'.includes(char);
                
                // Create speech-like envelope (louder and clearer)
                const syllableTime = t % 0.4; // 400ms syllables
                let envelope = 0;
                
                if (syllableTime < 0.05) {
                    // Quick attack
                    envelope = syllableTime / 0.05;
                } else if (syllableTime < 0.25) {
                    // Sustain at high volume
                    envelope = 1.0;
                } else if (syllableTime < 0.4) {
                    // Gradual release
                    envelope = 1.0 - ((syllableTime - 0.25) / 0.15);
                }
                
                envelope = Math.max(0, Math.min(1, envelope));
                
                // Generate speech-like audio with harmonics (like human voice)
                let sample = 0;
                
                if (isVowel) {
                    // Vowels: richer harmonics, more like voice
                    const fundamental = 0.6 * Math.sin(2 * Math.PI * baseFreq * t);
                    const harmonic2 = 0.3 * Math.sin(2 * Math.PI * (baseFreq * 2) * t);
                    const harmonic3 = 0.15 * Math.sin(2 * Math.PI * (baseFreq * 3) * t);
                    sample = fundamental + harmonic2 + harmonic3;
                } else {
                    // Consonants: more noise-like with filtered frequencies
                    const noise = (Math.random() - 0.5) * 0.3;
                    const tone = 0.4 * Math.sin(2 * Math.PI * baseFreq * t);
                    sample = tone + noise;
                }
                
                // Apply envelope and make it LOUD (85% volume for headphones)
                const volume = 0.85;
                data[i] = volume * envelope * sample;
                
                // Add slight tremolo for more natural speech-like quality
                const tremolo = 1 + 0.1 * Math.sin(2 * Math.PI * 5 * t); // 5Hz tremolo
                data[i] *= tremolo;
            }

            console.log(`🎯 Generated speech-like audio: ${data.length} samples`);

            // Create MediaStream from buffer using proven method
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const destination = this.audioContext.createMediaStreamDestination();
            source.connect(destination);

            // Start the audio
            source.start();

            console.log('🎯 Injecting speech-like audio (optimized for headphones)...');
            const success = await workingVoiceCallService.injectCustomAudio(destination.stream);

            if (success) {
                console.log('🎯 ✅ Perfect TTS injection successful - should be clear through headphones!');
            } else {
                console.log('🎯 ❌ Perfect TTS injection failed');
            }

            return success;

        } catch (error) {
            console.error('❌ Perfect TTS failed:', error);
            return false;
        }
    }

    /**
     * Get frequency for character (speech-like mapping)
     */
    private getCharacterFrequency(char: string): number {
        // Map characters to speech-like frequencies
        const vowelFreqs: { [key: string]: number } = {
            'a': 730, 'A': 730,  // /a/ sound
            'e': 530, 'E': 530,  // /e/ sound  
            'i': 270, 'I': 270,  // /i/ sound
            'o': 570, 'O': 570,  // /o/ sound
            'u': 460, 'U': 460   // /u/ sound
        };
        
        // Consonants get mid-range frequencies
        const consonantFreq = 350 + (char.charCodeAt(0) % 200); // 350-550 Hz
        
        return vowelFreqs[char] || consonantFreq;
    }

    /**
     * Test with speech-like audio
     */
    async testPerfectTTS(text: string = "Hello! This is a test of perfect speech transmission."): Promise<boolean> {
        return this.speakPerfectTTS(text, { volume: 0.85 });
    }
}

export const perfectTTSService = new PerfectTTSService();
export default perfectTTSService;
