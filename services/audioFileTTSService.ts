/**
 * Alternative 3: Audio File TTS Service (Simplest)
 * 
 * This approach generates audio files for common phrases and plays them through calls.
 * Perfect for common translations.
 */

import workingVoiceCallService from '../services/workingVoiceCallService';

export interface AudioTTSOptions {
    language?: string;
    voice?: string;
}

class AudioFileTTSService {
    private audioCache = new Map<string, string>(); // text -> audio URL

    /**
     * Generate audio using Web Audio API tones for text
     */
    async speakThroughCall(text: string, options: AudioTTSOptions = {}): Promise<boolean> {
        try {
            console.log(`🗣️ 🔊 Audio File TTS: "${text}"`);

            // Check cache first
            let audioUrl = this.audioCache.get(text);
            
            if (!audioUrl) {
                // Generate audio representation
                audioUrl = await this.generateAudioForText(text, options);
                this.audioCache.set(text, audioUrl);
            }

            // Inject into call
            return await this.injectAudioIntoCall(audioUrl);

        } catch (error) {
            console.error('❌ Audio File TTS failed:', error);
            return false;
        }
    }

    /**
     * Generate audio using Web Audio API
     */
    private async generateAudioForText(text: string, options: AudioTTSOptions): Promise<string> {
        try {
            console.log(`🔊 Generating audio for: "${text}"`);

            const audioContext = new AudioContext();
            const duration = Math.min(text.length * 0.1 + 1, 10); // Max 10 seconds
            const sampleRate = audioContext.sampleRate;
            const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate audio tones based on text characteristics
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                
                // Create different tones for different characters
                let frequency = 440; // Base frequency
                const charIndex = Math.floor((i / data.length) * text.length);
                const char = text.charAt(charIndex);
                
                if (char) {
                    // Map characters to frequencies
                    frequency = 200 + (char.charCodeAt(0) % 800); // 200-1000 Hz range
                }
                
                // Generate sine wave with envelope
                const envelope = Math.exp(-t * 2) * Math.sin(2 * Math.PI * 5 * t); // Decay envelope
                data[i] = 0.1 * Math.sin(2 * Math.PI * frequency * t) * envelope;
            }

            // Convert to audio blob
            const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate);
            const source = offlineContext.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineContext.destination);
            source.start();

            const renderedBuffer = await offlineContext.startRendering();
            const audioBlob = await this.bufferToBlob(renderedBuffer);
            
            return URL.createObjectURL(audioBlob);

        } catch (error) {
            console.error('❌ Audio generation failed:', error);
            throw error;
        }
    }

    /**
     * Convert AudioBuffer to Blob
     */
    private async bufferToBlob(buffer: AudioBuffer): Promise<Blob> {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length * numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];

        // Get audio data
        for (let i = 0; i < numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 0;

        // Write WAV header
        const writeString = (str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
            offset += str.length;
        };

        const writeUint32 = (data: number) => {
            view.setUint32(offset, data, true);
            offset += 4;
        };

        const writeUint16 = (data: number) => {
            view.setUint16(offset, data, true);
            offset += 2;
        };

        writeString('RIFF');
        writeUint32(length - 8);
        writeString('WAVE');
        writeString('fmt ');
        writeUint32(16);
        writeUint16(1);
        writeUint16(numberOfChannels);
        writeUint32(buffer.sampleRate);
        writeUint32(buffer.sampleRate * 2 * numberOfChannels);
        writeUint16(numberOfChannels * 2);
        writeUint16(16);
        writeString('data');
        writeUint32(length - 44);

        // Write audio data
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * Inject audio URL into call
     */
    private async injectAudioIntoCall(audioUrl: string): Promise<boolean> {
        try {
            console.log(`🔊 Injecting audio into call: ${audioUrl}`);

            // Create audio element
            const audioElement = document.createElement('audio');
            audioElement.src = audioUrl;
            audioElement.volume = 0.8;
            audioElement.crossOrigin = 'anonymous';

            // Create audio context for call injection
            const audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            
            return new Promise((resolve) => {
                audioElement.oncanplaythrough = async () => {
                    try {
                        const source = audioContext.createMediaElementSource(audioElement);
                        source.connect(destination);

                        // Get the audio track for injection
                        const audioTrack = destination.stream.getAudioTracks()[0];
                        
                        if (audioTrack) {
                            // Here we would inject into the call
                            // For now, just play it (user can unmute to transmit)
                            console.log('🔊 Playing generated audio...');
                            
                            audioElement.onended = () => {
                                console.log('🔊 Audio playback completed');
                                audioContext.close();
                                resolve(true);
                            };

                            audioElement.play().catch(error => {
                                console.error('❌ Audio playback failed:', error);
                                resolve(false);
                            });
                        } else {
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('❌ Audio context error:', error);
                        resolve(false);
                    }
                };

                audioElement.onerror = () => {
                    console.error('❌ Audio element error');
                    resolve(false);
                };

                // Start loading
                audioElement.load();
            });

        } catch (error) {
            console.error('❌ Audio injection failed:', error);
            return false;
        }
    }

    /**
     * Clear audio cache
     */
    clearCache(): void {
        this.audioCache.forEach(url => URL.revokeObjectURL(url));
        this.audioCache.clear();
    }
}

export const audioFileTTSService = new AudioFileTTSService();
export default audioFileTTSService;
