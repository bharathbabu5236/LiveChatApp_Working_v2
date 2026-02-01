// Agora Audio Translation Service
// Integrates real-time audio translation with Agora voice channel

import AgoraRTC from 'agora-rtc-sdk-ng';
import speechToTextAPI from '../api/speechToTextAPI';
import textTranslationAPI from '../api/textTranslationAPI';
import { getApiKey } from '../config/translationApiConfig';

class AgoraAudioTranslationService {
    constructor() {
        console.log('\n🔥🔥🔥 AGORA AUDIO TRANSLATION SERVICE CONSTRUCTOR 🔥🔥🔥');
        console.log('🎯 This message should appear in BOTH sender and receiver console');
        console.log('📅 Timestamp:', new Date().toISOString());
        
        this.isActive = false;
        this.agoraClient = null;
        this.originalAudioTrack = null;
        this.translatedAudioTrack = null;
        this.audioContext = null;
        this.mediaDestination = null;
        this.currentAudioSource = null;
        
        // User language preferences
        this.userLanguage = 'en'; // Current user's language
        this.partnerLanguage = 'hi'; // Partner's language
        
        // Translation state
        this.isProcessing = false;
        this.audioQueue = [];
        this.isTranslationModeActive = false;
        
        // Initialize API key
        const apiKey = getApiKey('google-translate');
        if (apiKey) {
            textTranslationAPI.setApiKey(apiKey);
            console.log('🔑 Agora Translation: API key configured');
        }
        
        console.log('🎵 Agora Audio Translation Service initialized');
        console.log('🔥🔥🔥 CONSTRUCTOR COMPLETE 🔥🔥🔥\n');
    }

    // Initialize the service with Agora client and user languages
    async initialize(agoraClient, userLanguage = 'en', partnerLanguage = 'hi') {
        try {
            console.log('\n🚀 === AGORA AUDIO TRANSLATION INITIALIZATION ===');
            console.log('📋 Initialization Parameters:');
            console.log(`   User Language: ${userLanguage}`);
            console.log(`   Partner Language: ${partnerLanguage}`);
            console.log(`   Agora Client: ${agoraClient ? 'Available' : 'NULL'}`);
            
            this.agoraClient = agoraClient;
            this.userLanguage = userLanguage;
            this.partnerLanguage = partnerLanguage;
            
            // Initialize Web Audio API for audio processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.mediaDestination = this.audioContext.createMediaStreamDestination();
            
            console.log(`🌍 Audio Translation initialized: ${userLanguage} ↔ ${partnerLanguage}`);
            console.log('🚀 === INITIALIZATION COMPLETE ===\n');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to initialize audio translation:', error);
            return { success: false, error: error.message };
        }
    }

    // Start audio translation
    async startAudioTranslation() {
        try {
            if (this.isActive) {
                console.log('⚠️ Audio translation already active');
                return { success: false, error: 'Already active' };
            }

            console.log('\n🚀=== STARTING AUDIO TRANSLATION SERVICE ===');
            console.log(`👤 User Language: ${this.userLanguage}`);
            console.log(`👥 Partner Language: ${this.partnerLanguage}`);
            console.log(`🎯 Translation Direction: ${this.userLanguage} → ${this.partnerLanguage}`);

            // Store original audio track
            await this.storeOriginalAudioTrack();
            
            // Set up translation mode
            this.isTranslationModeActive = true;
            
            // Set up outgoing audio translation (our speech)
            await this.setupOutgoingAudioTranslation();
            
            this.isActive = true;
            console.log('✅ Audio translation service is now ACTIVE');
            console.log('🎤 Listening for speech to translate...');
            console.log('🚀=== SERVICE READY ===\n');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to start audio translation:', error);
            return { success: false, error: error.message };
        }
    }

    // Store the original audio track before replacing it
    async storeOriginalAudioTrack() {
        try {
            if (this.agoraClient) {
                // Get published tracks
                const localTracks = this.agoraClient.localTracks;
                this.originalAudioTrack = localTracks?.find(track => track.trackMediaType === 'audio');
                console.log('💾 Original audio track stored');
            }
        } catch (error) {
            console.error('❌ Failed to store original audio track:', error);
        }
    }

    // Set up outgoing audio translation (our voice → partner's language via Agora)
    async setupOutgoingAudioTranslation() {
        try {
            console.log('🎙️ Setting up outgoing audio translation...');
            console.log(`📝 User Language: ${this.userLanguage}`);
            console.log(`📝 Partner Language: ${this.partnerLanguage}`);
            
            // Initialize speech recognition for our voice
            const sttResult = await speechToTextAPI.initialize({
                language: this.getFullLanguageCode(this.userLanguage),
                continuous: true,
                interimResults: false // Only final results to avoid too many translations
            });
            
            if (!sttResult.success) {
                throw new Error(`Speech recognition failed: ${sttResult.error}`);
            }

            // Set up speech result handler with detailed logging
            speechToTextAPI.onResult(async (result) => {
                console.log('\n🔥🔥🔥 SPEECH RESULT HANDLER TRIGGERED 🔥🔥🔥');
                console.log('🎯 This should appear in BOTH sender and receiver console');
                console.log('📋 Result details:', result);
                
                if (result.isFinal && result.transcript.trim().length > 0 && this.isActive) {
                    console.log('\n🔥=== TRANSLATION EVENT START ===');
                    console.log(`🎤 SENDER (${this.userLanguage.toUpperCase()}) SPOKE: "${result.transcript}"`);
                    console.log(`🔄 TRANSLATING: ${this.userLanguage} → ${this.partnerLanguage}`);
                    console.log('🌍 THIS SHOULD APPEAR IN BOTH BROWSER CONSOLES');
                    
                    // Translate and send audio via Agora
                    await this.translateAndSendAudio(result.transcript, this.userLanguage, this.partnerLanguage);
                    
                    console.log('🔥=== TRANSLATION EVENT END ===\n');
                    
                    // Restart speech recognition for continuous listening
                    setTimeout(async () => {
                        if (this.isActive) {
                            console.log('🔄 Restarting speech recognition for continuous listening...');
                            try {
                                await speechToTextAPI.stopRecognition();
                                await speechToTextAPI.startRecognition(this.getFullLanguageCode(this.userLanguage));
                            } catch (restartError) {
                                console.error('❌ Failed to restart speech recognition:', restartError);
                            }
                        }
                    }, 1000); // Wait 1 second before restarting
                }
            });

            // Start listening to our speech
            await speechToTextAPI.startRecognition(this.getFullLanguageCode(this.userLanguage));
            
            console.log('✅ Outgoing audio translation setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup outgoing audio translation:', error);
            throw error;
        }
    }

    // Translate text and send as audio
    async translateAndSendAudio(text, sourceLanguage, targetLanguage) {
        try {
            console.log(`\n� === TRANSLATION STEP-BY-STEP ===`);
            console.log(`📝 Original Text: "${text}"`);
            console.log(`📝 From: ${sourceLanguage.toUpperCase()}`);
            console.log(`� To: ${targetLanguage.toUpperCase()}`);
            
            // Step 1: Translate the text
            console.log(`Step 1: Calling Google Translate API...`);
            const translationResult = await textTranslationAPI.translateText(
                text, 
                sourceLanguage, 
                targetLanguage
            );
            
            if (!translationResult.success) {
                console.log(`Translation failed: ${translationResult.error}`);
                throw new Error(`Translation failed: ${translationResult.error}`);
            }
            
            const translatedText = translationResult.translatedText;
            console.log(`TRANSLATION SUCCESS!`);
            console.log(`Translated Text: "${translatedText}"`);
            console.log('BOTH USERS SHOULD SEE THIS TRANSLATION');
            
            // Step 2: Send as audio via Agora (temporarily disabled to avoid local audio)
            console.log(`Step 2: Converting to audio for receiver...`);
            console.log(`AUDIO GENERATION TEMPORARILY DISABLED FOR DEBUGGING`);
            console.log(`This text should be sent as audio to receiver: "${translatedText}"`);
            
            // TODO: Re-enable audio transmission after debugging
            // const audioResult = await this.textToAudio(translatedText, targetLanguage);
            
            console.log(`Translation complete - receiver should hear: "${translatedText}"`);
            console.log(`=== END TRANSLATION ===\n`);
            console.log('=== TRANSLATE METHOD COMPLETE ===\n');
            
        } catch (error) {
            console.error('❌ Error in translate and send audio:', error);
        }
    }

    // Convert text to audio and send via Agora
    async textToAudio(text, language) {
        try {
            console.log(`🔊 Converting text to Agora audio stream: "${text}" in ${language}`);
            
            // Use simple audio replacement approach - no local playback
            return await this.injectSimpleAudioToAgora(text, language);
            
        } catch (error) {
            console.error('❌ Text to audio conversion failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Create audio from text and send via Agora
    async createAndSendAgoraAudio(text, language) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`🔊 Creating audio for Agora transmission: "${text}" in ${language}`);
                
                // Use simple audio injection - guaranteed no local speakers
                await this.injectSimpleAudioToAgora(text, language);
                
                console.log('✅ Audio sent via Agora to receiver (zero local playback)');
                resolve({ success: true, text });
                
            } catch (error) {
                console.error('❌ Failed to create and send Agora audio:', error);
                reject(error);
            }
        });
    }

    // Simple audio injection to Agora with no local playback
    async injectSimpleAudioToAgora(text, language) {
        try {
            console.log('🎙️ Injecting audio directly to Agora (bypassing all local audio)...');
            
            // Get user's microphone
            const micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true
            });
            
            // Create audio context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Create simple tone generator that represents the translation
            const duration = this.estimateSpeechDuration(text) / 1000;
            const sampleRate = this.audioContext.sampleRate;
            const frameCount = sampleRate * duration;
            
            // Generate a simple beep pattern to represent translated audio
            const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            
            // Create a simple pattern of beeps for the translation
            for (let i = 0; i < frameCount; i++) {
                const time = i / sampleRate;
                const beepFreq = 800; // 800Hz beep
                const envelope = Math.sin(time * 4) * 0.5 + 0.5; // Slow modulation
                channelData[i] = Math.sin(2 * Math.PI * beepFreq * time) * envelope * 0.3;
            }
            
            // Create audio nodes
            const micSource = this.audioContext.createMediaStreamSource(micStream);
            const micGain = this.audioContext.createGain();
            const bufferSource = this.audioContext.createBufferSource();
            const bufferGain = this.audioContext.createGain();
            const destination = this.audioContext.createMediaStreamDestination();
            
            // Connect microphone (muted)
            micSource.connect(micGain);
            micGain.connect(destination);
            micGain.gain.value = 0; // Mute microphone
            
            // Connect buffer source
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(bufferGain);
            bufferGain.connect(destination);
            bufferGain.gain.value = 1; // Enable translation audio
            
            // Replace Agora audio track
            const customTrack = await AgoraRTC.createCustomAudioTrack({
                mediaStreamTrack: destination.stream.getAudioTracks()[0]
            });
            
            // Unpublish original audio
            if (this.originalAudioTrack) {
                await this.agoraClient.unpublish([this.originalAudioTrack]);
                console.log('🔇 Original mic muted during translation');
            }
            
            // Publish custom track
            await this.agoraClient.publish([customTrack]);
            this.translatedAudioTrack = customTrack;
            console.log('📡 Translation audio published to Agora');
            
            // Start the translation audio
            bufferSource.start();
            console.log('🎵 Translation beeps playing through Agora (no local audio)');
            
            // Schedule restoration
            bufferSource.onended = async () => {
                console.log('🔄 Translation audio ended, restoring microphone...');
                await this.restoreOriginalAudio(micStream);
            };
            
            // Also set a timeout as backup
            setTimeout(async () => {
                await this.restoreOriginalAudio(micStream);
            }, duration * 1000 + 1000);
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to inject simple audio:', error);
            throw error;
        }
    }

    // Estimate speech duration based on text length
    estimateSpeechDuration(text) {
        // Rough estimation: average speech rate is about 150 words per minute
        const words = text.split(' ').length;
        const wordsPerSecond = 150 / 60; // 2.5 words per second
        const estimatedSeconds = words / wordsPerSecond;
        return Math.max(estimatedSeconds * 1000, 2000); // At least 2 seconds
    }

    // Restore original audio track
    async restoreOriginalAudio(micStream) {
        try {
            console.log('🔄 Restoring original audio configuration...');
            
            // Clean up custom track
            if (this.translatedAudioTrack) {
                await this.agoraClient.unpublish([this.translatedAudioTrack]);
                this.translatedAudioTrack.close();
                this.translatedAudioTrack = null;
                console.log('🗑️ Custom audio track cleaned up');
            }
            
            // Restore original audio track
            if (this.originalAudioTrack) {
                await this.agoraClient.publish([this.originalAudioTrack]);
                console.log('🔊 Original audio track restored');
            }
            
            // Stop temporary microphone stream
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
            }
            
        } catch (error) {
            console.error('❌ Failed to restore original audio:', error);
        }
    }

    // Replace audio track with translated speech
    async replaceAudioWithTranslation(utterance) {
        try {
            console.log('🔄 Using simple audio injection approach');
            // Use the new simple audio injection approach
            return await this.injectSimpleAudioToAgora(utterance.text, utterance.lang);
        } catch (error) {
            console.error('❌ Failed to inject translated audio:', error);
            throw error;
        }
    }

    // Send audio via Agora (Simplified approach)
    async sendAudioViaAgora(audioUrl) {
        try {
            console.log('🎵 Playing translated audio locally (simplified approach)');
            
            // For now, play the translated audio locally
            // In production, you would need more complex audio processing to inject into Agora
            const audioElement = new Audio(audioUrl);
            audioElement.volume = 0.8;
            
            // Play the translated audio
            await audioElement.play();
            
            // Clean up when done
            audioElement.onended = () => {
                URL.revokeObjectURL(audioUrl);
                console.log('✅ Translated audio playback completed');
            };
            
            audioElement.onerror = (error) => {
                console.error('❌ Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
            };
            
            console.log('📡 Translated audio played locally');
            
        } catch (error) {
            console.error('❌ Failed to play translated audio:', error);
            throw error;
        }
    }

    // Stop audio translation
    async stopAudioTranslation() {
        try {
            this.isActive = false;
            this.isTranslationModeActive = false;
            
            // Stop speech recognition
            await speechToTextAPI.stopRecognition();
            
            // Restore original audio track if needed
            if (this.translatedAudioTrack) {
                await this.agoraClient.unpublish([this.translatedAudioTrack]);
                this.translatedAudioTrack.close();
                this.translatedAudioTrack = null;
            }
            
            if (this.originalAudioTrack) {
                await this.agoraClient.publish([this.originalAudioTrack]);
                console.log('🔄 Original audio track restored');
            }
            
            // Clean up audio resources
            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }
            
            console.log('🛑 Audio translation stopped');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to stop audio translation:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper function to get full language code
    getFullLanguageCode(languageCode) {
        const languageMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'hi': 'hi-IN',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'ar': 'ar-SA',
            'ru': 'ru-RU',
            'pt': 'pt-BR',
            'it': 'it-IT'
        };
        
        return languageMap[languageCode] || `${languageCode}-${languageCode.toUpperCase()}`;
    }

    // Set user languages
    setUserLanguages(userLang, partnerLang) {
        this.userLanguage = userLang;
        this.partnerLanguage = partnerLang;
        console.log(`🌍 Languages updated: User(${userLang}) ↔ Partner(${partnerLang})`);
    }

    // Get translation status
    getStatus() {
        return {
            isActive: this.isActive,
            userLanguage: this.userLanguage,
            partnerLanguage: this.partnerLanguage,
            isProcessing: this.isProcessing
        };
    }
}

// Create singleton instance
const agoraAudioTranslationService = new AgoraAudioTranslationService();

export default agoraAudioTranslationService;
