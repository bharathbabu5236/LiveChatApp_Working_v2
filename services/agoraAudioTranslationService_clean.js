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

            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.mediaDestination = this.audioContext.createMediaStreamDestination();
            
            console.log('✅ Agora Audio Translation Service initialized successfully');
            console.log(`🎯 Translation Route: ${userLanguage.toUpperCase()} → ${partnerLanguage.toUpperCase()}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AgoraAudioTranslationService:', error);
            throw error;
        }
    }

    // Enable translation mode - start capturing and translating user's audio
    async enableTranslation() {
        try {
            console.log('\n🔥🔥🔥 ENABLING TRANSLATION MODE 🔥🔥🔥');
            console.log('🎤 Starting speech recognition for real-time translation...');
            
            if (!this.agoraClient) {
                throw new Error('Agora client not initialized');
            }

            this.isTranslationModeActive = true;

            // Start speech recognition
            await this.setupOutgoingAudioTranslation();
            
            console.log('✅ Translation mode enabled successfully');
            console.log('🎯 Now listening for speech to translate and transmit via Agora');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to enable translation mode:', error);
            this.isTranslationModeActive = false;
            throw error;
        }
    }

    // Disable translation mode
    async disableTranslation() {
        try {
            console.log('\n🛑 DISABLING TRANSLATION MODE');
            
            this.isTranslationModeActive = false;
            
            // Stop speech recognition
            if (speechToTextAPI) {
                speechToTextAPI.stopRecognition();
                console.log('🔇 Speech recognition stopped');
            }
            
            // Restore original audio track if available
            if (this.originalAudioTrack) {
                await this.agoraClient.unpublish();
                await this.agoraClient.publish([this.originalAudioTrack]);
                console.log('🔄 Original audio track restored');
            }
            
            console.log('✅ Translation mode disabled successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to disable translation mode:', error);
            throw error;
        }
    }

    // Setup outgoing audio translation (user's speech)
    async setupOutgoingAudioTranslation() {
        try {
            console.log('\n🎙️ Setting up outgoing audio translation...');
            
            // Store original audio track
            const tracks = this.agoraClient.localTracks;
            this.originalAudioTrack = tracks.find(track => track.trackMediaType === 'audio');
            
            if (this.originalAudioTrack) {
                console.log('💾 Original audio track stored');
            }

            // Start speech recognition with translation callback
            await speechToTextAPI.startRecognition(
                this.userLanguage,
                async (result) => {
                    console.log('\n🗣️ === SPEECH RECOGNITION RESULT ===');
                    console.log('🎯 THIS MESSAGE SHOULD APPEAR IN BOTH CONSOLES');
                    console.log(`📝 Recognized Text: "${result.transcript}"`);
                    console.log(`✅ Is Final: ${result.isFinal}`);
                    console.log(`📊 Confidence: ${result.confidence || 'N/A'}`);
                    
                    if (result.isFinal && result.transcript.trim().length > 0) {
                        console.log('🔥 PROCESSING FINAL TRANSCRIPT FOR TRANSLATION');
                        await this.translateAndSendAudio(result.transcript, this.userLanguage, this.partnerLanguage);
                    }
                }
            );
            
            console.log('✅ Outgoing audio translation setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup outgoing audio translation:', error);
            throw error;
        }
    }

    // Translate text and send as audio
    async translateAndSendAudio(text, sourceLanguage, targetLanguage) {
        try {
            console.log('\n=== FIRE FIRE FIRE TRANSLATE AND SEND AUDIO CALLED ===');
            console.log('THIS MESSAGE SHOULD APPEAR IN BOTH CONSOLES');
            console.log(`\n=== TRANSLATION STEP-BY-STEP ===`);
            console.log(`📝 Original Text: "${text}"`);
            console.log(`📝 From: ${sourceLanguage.toUpperCase()}`);
            console.log(`📝 To: ${targetLanguage.toUpperCase()}`);
            console.log('VISIBLE TO BOTH SENDER AND RECEIVER');
            
            // Step 1: Translate the text
            console.log(`Step 1: Calling Google Translate API...`);
            const translationResult = await textTranslationAPI.translateText(
                text, 
                sourceLanguage, 
                targetLanguage
            );
            
            if (!translationResult.success) {
                console.log(`❌ Translation failed: ${translationResult.error}`);
                throw new Error(`Translation failed: ${translationResult.error}`);
            }
            
            const translatedText = translationResult.translatedText;
            console.log(`✅ Step 1 Complete - Translated Text: "${translatedText}"`);
            
            // Step 2: Generate audio from translated text
            console.log(`Step 2: Converting translated text to audio...`);
            const audioBuffer = await this.generateAudioFromText(translatedText, targetLanguage);
            console.log(`✅ Step 2 Complete - Audio buffer generated`);
            
            // Step 3: Create custom audio track and replace current track
            console.log(`Step 3: Creating custom Agora audio track...`);
            await this.replaceAudioTrackWithTranslation(audioBuffer);
            console.log(`✅ Step 3 Complete - Audio track replaced`);
            
            console.log('🎉 TRANSLATION AND AUDIO TRANSMISSION COMPLETE');
            console.log('🔥🔥🔥 BOTH SENDER AND RECEIVER SHOULD SEE THIS 🔥🔥🔥\n');
            
        } catch (error) {
            console.error('❌ Translation and audio sending failed:', error);
            console.error('🔥 ERROR DETAILS:', error.message);
        }
    }

    // Generate audio buffer from text using Web Audio API
    async generateAudioFromText(text, language) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔊 Generating audio for: "${text}" in ${language}`);
                
                // Create an oscillator for audio generation (fallback if TTS not available)
                const sampleRate = 44100;
                const duration = Math.max(2, text.length * 0.1); // Dynamic duration based on text length
                const frameCount = sampleRate * duration;
                
                const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
                const channelData = audioBuffer.getChannelData(0);
                
                // Generate a simple tone sequence (placeholder for TTS)
                for (let i = 0; i < frameCount; i++) {
                    const t = i / sampleRate;
                    channelData[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 2) * 0.1;
                }
                
                console.log(`✅ Audio buffer created: ${duration}s duration`);
                resolve(audioBuffer);
                
            } catch (error) {
                console.error('❌ Failed to generate audio from text:', error);
                reject(error);
            }
        });
    }

    // Replace current audio track with translated audio
    async replaceAudioTrackWithTranslation(audioBuffer) {
        try {
            console.log('🔄 Replacing audio track with translation...');
            
            // Create audio source from buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Connect to media destination
            source.connect(this.mediaDestination);
            
            // Create audio track from the media stream
            const translatedStream = this.mediaDestination.stream;
            const translatedAudioTrack = AgoraRTC.createCustomAudioTrack({
                mediaStreamTrack: translatedStream.getAudioTracks()[0]
            });
            
            // Unpublish current track and publish translated track
            if (this.agoraClient.localTracks.length > 0) {
                await this.agoraClient.unpublish();
                console.log('📤 Current audio track unpublished');
            }
            
            await this.agoraClient.publish([translatedAudioTrack]);
            console.log('📡 Translated audio track published to Agora');
            
            // Play the audio
            source.start();
            console.log('🎵 Audio playback started');
            
            // Schedule restoration of original track after audio finishes
            source.onended = async () => {
                try {
                    console.log('🔄 Audio finished, restoring original track...');
                    await this.agoraClient.unpublish();
                    
                    if (this.originalAudioTrack) {
                        await this.agoraClient.publish([this.originalAudioTrack]);
                        console.log('✅ Original audio track restored');
                    }
                } catch (error) {
                    console.error('❌ Failed to restore original track:', error);
                }
            };
            
            this.translatedAudioTrack = translatedAudioTrack;
            
        } catch (error) {
            console.error('❌ Failed to replace audio track:', error);
            throw error;
        }
    }

    // Update language preferences
    updateLanguagePreferences(userLanguage, partnerLanguage) {
        console.log(`🔄 Updating language preferences:`);
        console.log(`   User: ${this.userLanguage} → ${userLanguage}`);
        console.log(`   Partner: ${this.partnerLanguage} → ${partnerLanguage}`);
        
        this.userLanguage = userLanguage;
        this.partnerLanguage = partnerLanguage;
        
        // Restart speech recognition with new language if active
        if (this.isTranslationModeActive) {
            speechToTextAPI.updateLanguage(userLanguage);
        }
    }

    // Get current status
    getStatus() {
        return {
            isActive: this.isActive,
            isTranslationModeActive: this.isTranslationModeActive,
            userLanguage: this.userLanguage,
            partnerLanguage: this.partnerLanguage,
            hasAgoraClient: !!this.agoraClient,
            hasOriginalTrack: !!this.originalAudioTrack,
            isProcessing: this.isProcessing
        };
    }

    // Cleanup resources
    async cleanup() {
        try {
            console.log('\n🧹 Cleaning up AgoraAudioTranslationService...');
            
            await this.disableTranslation();
            
            if (this.audioContext && this.audioContext.state !== 'closed') {
                await this.audioContext.close();
                console.log('🔇 Audio context closed');
            }
            
            this.agoraClient = null;
            this.originalAudioTrack = null;
            this.translatedAudioTrack = null;
            this.audioContext = null;
            this.mediaDestination = null;
            this.currentAudioSource = null;
            
            console.log('✅ Cleanup complete');
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Create singleton instance
const agoraAudioTranslationService = new AgoraAudioTranslationService();

export default agoraAudioTranslationService;
