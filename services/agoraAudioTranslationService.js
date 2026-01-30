// Agora Audio Translation Service
// Integrates real-time audio translation with Agora voice channel

import AgoraRTC from 'agora-rtc-sdk-ng';
import speechToTextAPI from '../api/speechToTextAPI';
import textTranslationAPI from '../api/textTranslationAPI';
import textToSpeechAPI from '../api/textToSpeechAPI';
import { getApiKey } from '../config/translationApiConfig';

class AgoraAudioTranslationService {
    constructor() {
        this.isActive = false;
        this.agoraClient = null;
        this.localAudioTrack = null;
        this.translatedAudioTrack = null;
        this.audioContext = null;
        this.mediaDestination = null;
        
        // User language preferences
        this.userLanguage = 'en'; // Current user's language
        this.partnerLanguage = 'hi'; // Partner's language
        
        // Translation state
        this.isProcessing = false;
        this.audioQueue = [];
        
        // Initialize API key
        const apiKey = getApiKey('google-translate');
        if (apiKey) {
            textTranslationAPI.setApiKey(apiKey);
            console.log('🔑 Agora Translation: API key configured');
        }
        
        console.log('🎵 Agora Audio Translation Service initialized');
    }

    // Initialize the service with Agora client and user languages
    async initialize(agoraClient, userLanguage = 'en', partnerLanguage = 'hi') {
        try {
            this.agoraClient = agoraClient;
            this.userLanguage = userLanguage;
            this.partnerLanguage = partnerLanguage;
            
            // Initialize Web Audio API for audio processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.mediaDestination = this.audioContext.createMediaStreamDestination();
            
            console.log(`🌍 Audio Translation initialized: ${userLanguage} ↔ ${partnerLanguage}`);
            
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

            // Set up incoming audio processing (from partner)
            await this.setupIncomingAudioTranslation();
            
            // Set up outgoing audio translation (our speech)
            await this.setupOutgoingAudioTranslation();
            
            this.isActive = true;
            console.log('✅ Audio translation started');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to start audio translation:', error);
            return { success: false, error: error.message };
        }
    }

    // Set up incoming audio translation (partner's voice → our language)
    async setupIncomingAudioTranslation() {
        try {
            // Listen for remote audio tracks from Agora
            this.agoraClient.on('user-published', async (user, mediaType) => {
                if (mediaType === 'audio' && this.isActive) {
                    console.log('📥 Receiving partner audio for translation');
                    
                    // Subscribe to remote audio
                    await this.agoraClient.subscribe(user, mediaType);
                    
                    // Process incoming audio for translation
                    this.processIncomingAudio(user.audioTrack);
                }
            });
            
            console.log('👂 Incoming audio translation setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup incoming audio translation:', error);
            throw error;
        }
    }

    // Set up outgoing audio translation (our voice → partner's language)
    async setupOutgoingAudioTranslation() {
        try {
            // Initialize speech recognition for our voice
            const sttResult = await speechToTextAPI.initialize({
                language: this.getFullLanguageCode(this.userLanguage),
                continuous: true,
                interimResults: false // Only final results to avoid too many translations
            });
            
            if (!sttResult.success) {
                throw new Error(`Speech recognition failed: ${sttResult.error}`);
            }

            // Set up speech result handler
            speechToTextAPI.onResult(async (result) => {
                if (result.isFinal && result.transcript.trim().length > 0 && this.isActive) {
                    console.log(`🎤 User said: "${result.transcript}"`);
                    
                    // Translate and send audio
                    await this.translateAndSendAudio(result.transcript, this.userLanguage, this.partnerLanguage);
                    
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
            
            console.log('🎙️ Outgoing audio translation setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup outgoing audio translation:', error);
            throw error;
        }
    }

    // Process incoming audio from partner
    async processIncomingAudio(audioTrack) {
        try {
            if (this.isProcessing) {
                return; // Prevent overlapping processing
            }
            
            this.isProcessing = true;
            
            // For now, we'll use a simplified approach
            // In production, you'd need to implement audio-to-text from the audio stream
            console.log('📡 Processing partner audio...');
            
            // TODO: Implement audio stream to text conversion
            // This would require more complex audio processing
            // For demo, we'll trigger on remote audio events
            
        } catch (error) {
            console.error('❌ Error processing incoming audio:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    // Translate text and send as audio
    async translateAndSendAudio(text, sourceLanguage, targetLanguage) {
        try {
            console.log(`🔄 Translating: "${text}" (${sourceLanguage} → ${targetLanguage})`);
            
            // Step 1: Translate the text
            const translationResult = await textTranslationAPI.translateText(
                text, 
                sourceLanguage, 
                targetLanguage
            );
            
            if (!translationResult.success) {
                throw new Error(`Translation failed: ${translationResult.error}`);
            }
            
            const translatedText = translationResult.translatedText;
            console.log(`✅ Translated: "${translatedText}"`);
            
            // Step 2: Convert translated text to speech and play it
            const audioResult = await this.textToAudio(translatedText, targetLanguage);
            
            if (!audioResult.success) {
                throw new Error(`Text-to-speech failed: ${audioResult.error}`);
            }
            
            // For simplified version, audio is played directly during textToAudio
            console.log('🎵 Translated audio played successfully');
            
        } catch (error) {
            console.error('❌ Error in translate and send audio:', error);
        }
    }

    // Convert text to audio (Simplified)
    async textToAudio(text, language) {
        try {
            console.log(`🔊 Converting text to speech: "${text}" in ${language}`);
            
            // Use simpler approach - direct speech synthesis
            return await this.simpleSpeechSynthesis(text, language);
            
        } catch (error) {
            console.error('❌ Text to audio conversion failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Simple speech synthesis without complex recording
    async simpleSpeechSynthesis(text, language) {
        return new Promise((resolve, reject) => {
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = this.getFullLanguageCode(language);
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                
                utterance.onend = () => {
                    console.log('✅ Speech synthesis completed');
                    resolve({ 
                        success: true, 
                        audioUrl: null, // No URL needed for direct speech
                        text 
                    });
                };
                
                utterance.onerror = (error) => {
                    console.error('❌ Speech synthesis error:', error);
                    reject(error);
                };
                
                // Speak the text directly
                speechSynthesis.speak(utterance);
                
            } catch (error) {
                reject(error);
            }
        });
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
            
            // Stop speech recognition
            await speechToTextAPI.stopRecognition();
            
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
