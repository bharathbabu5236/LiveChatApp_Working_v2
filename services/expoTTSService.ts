import * as Speech from 'expo-speech';
import workingVoiceCallService from '../services/workingVoiceCallService';

/**
 * Alternative 1: Expo Speech TTS Service
 * 
 * This approach uses Expo's built-in speech synthesis which may have better
 * integration with native audio systems and voice calls.
 */

export interface ExpoTTSOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    voice?: string;
}

class ExpoTTSService {
    private isInitialized = false;

    async initialize(): Promise<boolean> {
        try {
            // Check if speech is available
            const voices = await Speech.getAvailableVoicesAsync();
            console.log(`📱 Expo Speech: ${voices.length} voices available`);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Expo Speech initialization failed:', error);
            return false;
        }
    }

    /**
     * Speak text using Expo Speech and inject into call
     */
    async speakForCall(text: string, options: ExpoTTSOptions = {}): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log(`🗣️ 📱 Expo Speech: Speaking "${text}" and injecting into call`);

            // Check if call is ready
            if (!workingVoiceCallService.isReadyForAudioInjection()) {
                console.error('❌ Voice call not ready for TTS injection');
                return false;
            }

            // Stop any ongoing speech
            Speech.stop();

            return new Promise<boolean>((resolve, reject) => {
                // Create audio context for capture
                const audioContext = new AudioContext();
                const destination = audioContext.createMediaStreamDestination();
                
                // Configure speech options with higher volume
                const speechOptions: Speech.SpeechOptions = {
                    language: options.language || 'en-US',
                    pitch: options.pitch || 1.2, // Slightly higher pitch for clarity
                    rate: options.rate || 0.9,   // Slightly faster for better injection
                    voice: options.voice,
                    onStart: () => {
                        console.log('🗣️ Expo Speech started - attempting capture');
                    },
                    onDone: () => {
                        console.log('🗣️ Expo Speech completed');
                        resolve(true);
                    },
                    onStopped: () => {
                        console.log('🗣️ Expo Speech stopped');
                        resolve(true);
                    },
                    onError: (error) => {
                        console.error('🗣️ Expo Speech error:', error);
                        resolve(false);
                    }
                };

                // Start speech and immediately try to inject
                Speech.speak(text, speechOptions);
                
                // Since we can't directly capture Expo Speech, we'll create a workaround
                // Use Web Speech API as backup for actual speech generation
                this.generateWebSpeech(text, options).then(async (success) => {
                    if (success) {
                        console.log('✅ TTS audio injection successful');
                        resolve(true);
                    } else {
                        console.log('⚠️ TTS injection failed, falling back to local speech only');
                        resolve(false);
                    }
                }).catch((error) => {
                    console.error('❌ TTS injection error:', error);
                    resolve(false);
                });
            });

        } catch (error) {
            console.error('❌ Expo Speech failed:', error);
            return false;
        }
    }

    /**
     * Generate Web Speech and inject into call using system audio capture
     */
    private async generateWebSpeech(text: string, options: ExpoTTSOptions): Promise<boolean> {
        try {
            // Check if Web Speech API is available
            if (!('speechSynthesis' in window)) {
                console.log('Web Speech API not available');
                return false;
            }

            return new Promise<boolean>((resolve, reject) => {
                console.log(`🎤 Attempting to capture system audio for: "${text}"`);
                
                // First, try to capture system audio (microphone + speakers)
                navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        // Try to capture system audio including speakers
                        suppressLocalAudioPlayback: false
                    } 
                }).then(async (stream) => {
                    console.log('🎤 System audio capture started');
                    
                    // Create speech utterance
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = options.language || 'en-US';
                    utterance.pitch = options.pitch || 1.2;
                    utterance.rate = options.rate || 0.9;
                    utterance.volume = 1.0; // Max volume
                    
                    let speechStarted = false;
                    let injectionAttempted = false;
                    
                    utterance.onstart = () => {
                        console.log('🎤 Web Speech started, will inject captured audio...');
                        speechStarted = true;
                        
                        // Give a moment for speech to start, then inject the captured stream
                        setTimeout(async () => {
                            if (!injectionAttempted) {
                                injectionAttempted = true;
                                console.log('🎤 Injecting captured system audio...');
                                try {
                                    const success = await workingVoiceCallService.injectCustomAudio(stream);
                                    console.log(`🎤 System audio injection result: ${success ? 'SUCCESS' : 'FAILED'}`);
                                    
                                    // Stop the stream after injection
                                    setTimeout(() => {
                                        stream.getTracks().forEach(track => track.stop());
                                    }, 3000);
                                    
                                    resolve(success);
                                } catch (error) {
                                    console.error('🎤 System audio injection error:', error);
                                    stream.getTracks().forEach(track => track.stop());
                                    resolve(false);
                                }
                            }
                        }, 500); // Wait 500ms for speech to start
                    };
                    
                    utterance.onend = () => {
                        console.log('🎤 Web Speech completed');
                        if (!injectionAttempted) {
                            stream.getTracks().forEach(track => track.stop());
                            resolve(false);
                        }
                    };
                    
                    utterance.onerror = (event) => {
                        console.error('🎤 Web Speech error:', event);
                        stream.getTracks().forEach(track => track.stop());
                        resolve(false);
                    };
                    
                    // Start speech synthesis
                    console.log('🎤 Starting Web Speech synthesis...');
                    window.speechSynthesis.speak(utterance);
                    
                }).catch(async (error) => {
                    console.error('🎤 System audio capture failed:', error);
                    console.log('🔊 Falling back to direct loud audio generation...');
                    
                    // Fallback: Generate loud speech-like audio directly
                    try {
                        const audioContext = new AudioContext();
                        const duration = Math.max(text.length * 0.15, 2);
                        const sampleRate = audioContext.sampleRate;
                        const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
                        const data = buffer.getChannelData(0);
                        
                        // Generate LOUD speech-like audio
                        for (let i = 0; i < data.length; i++) {
                            const t = i / sampleRate;
                            const charIndex = Math.floor((t / duration) * text.length);
                            const char = text.charAt(charIndex) || 'a';
                            
                            // Speech-like frequencies
                            const baseFreq = char === 'a' || char === 'A' ? 730 :
                                           char === 'e' || char === 'E' ? 530 :
                                           char === 'i' || char === 'I' ? 270 :
                                           char === 'o' || char === 'O' ? 570 :
                                           char === 'u' || char === 'U' ? 460 :
                                           350 + (char.charCodeAt(0) % 200);
                            
                            // Create envelope
                            const syllableTime = t % 0.3;
                            let envelope = syllableTime < 0.05 ? syllableTime / 0.05 :
                                          syllableTime < 0.2 ? 1.0 :
                                          1.0 - ((syllableTime - 0.2) / 0.1);
                            envelope = Math.max(0, Math.min(1, envelope));
                            
                            // Generate speech-like wave with harmonics
                            const fundamental = 0.6 * Math.sin(2 * Math.PI * baseFreq * t);
                            const harmonic2 = 0.3 * Math.sin(2 * Math.PI * (baseFreq * 2) * t);
                            const sample = fundamental + harmonic2;
                            
                            // LOUD volume for headphones
                            data[i] = 0.9 * envelope * sample;
                        }
                        
                        // Create stream and inject
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        const destination = audioContext.createMediaStreamDestination();
                        source.connect(destination);
                        source.start();
                        
                        console.log('🔊 Injecting fallback speech-like audio...');
                        const success = await workingVoiceCallService.injectCustomAudio(destination.stream);
                        console.log(`🔊 Fallback injection result: ${success ? 'SUCCESS' : 'FAILED'}`);
                        
                        resolve(success);
                        
                    } catch (fallbackError) {
                        console.error('🔊 Fallback generation failed:', fallbackError);
                        resolve(false);
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Web Speech generation failed:', error);
            return false;
        }
    }

    /**
     * Get available voices
     */
    async getVoices(): Promise<Speech.Voice[]> {
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            return voices;
        } catch (error) {
            console.error('❌ Failed to get voices:', error);
            return [];
        }
    }

    /**
     * Stop current speech
     */
    stop(): void {
        Speech.stop();
    }

    /**
     * Check if currently speaking
     */
    async isSpeaking(): Promise<boolean> {
        try {
            return await Speech.isSpeakingAsync();
        } catch (error) {
            return false;
        }
    }
}

export const expoTTSService = new ExpoTTSService();
export default expoTTSService;
