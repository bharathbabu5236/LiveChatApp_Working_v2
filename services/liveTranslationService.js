// Live Translation Service for Voice Calls - Using Custom APIs
// Integrates speech-to-text, translation, and text-to-speech using separate custom APIs

import speechToTextAPI from '../api/speechToTextAPI';
import textTranslationAPI from '../api/textTranslationAPI';
import textToSpeechAPI from '../api/textToSpeechAPI';
import audioProcessingAPI from '../api/audioProcessingAPI';
import { SUPPORTED_LANGUAGES, getApiKey } from '../config/translationApiConfig';

class LiveTranslationService {
    constructor() {
        this.isTranslationActive = false;
        this.isListening = false;
        this.sourceLanguage = 'en';
        this.targetLanguage = 'es';
        this.translationHistory = [];
        this.onTranslationResult = null;
        this.onTranslationError = null;
        this.onStatusChange = null;
        
        // Initialize Google Translate API key
        const apiKey = getApiKey('google-translate');
        if (apiKey) {
            textTranslationAPI.setApiKey(apiKey);
            console.log('🔑 Google Translate API key configured');
        } else {
            console.warn('⚠️ No Google Translate API key found, using free service');
        }
        
        console.log('🌍 Live Translation Service initialized with custom APIs');
    }

    // Start live translation during a call
    async startLiveTranslation(sourceLanguage = 'en', targetLanguage = 'es') {
        try {
            console.log(`🌍 Starting live translation: ${sourceLanguage} → ${targetLanguage}`);
            
            this.sourceLanguage = sourceLanguage;
            this.targetLanguage = targetLanguage;
            
            // Initialize audio processing
            const audioResult = await audioProcessingAPI.initialize();
            if (!audioResult.success) {
                throw new Error(`Audio initialization failed: ${audioResult.error}`);
            }

            // Initialize speech-to-text
            const sttResult = await speechToTextAPI.initialize({
                language: this.getFullLanguageCode(sourceLanguage),
                continuous: true,
                interimResults: true
            });
            
            if (!sttResult.success) {
                throw new Error(`Speech-to-Text initialization failed: ${sttResult.error}`);
            }

            // Set up speech-to-text callbacks
            speechToTextAPI.onResult((result) => {
                if (result.isFinal && result.transcript.length > 3) {
                    this.processTranslation(result.transcript, result.confidence);
                }
            });

            speechToTextAPI.onError((error) => {
                console.error('Speech recognition error:', error);
                if (this.onTranslationError) {
                    this.onTranslationError(error);
                }
            });

            speechToTextAPI.onStart(() => {
                this.isListening = true;
                this.notifyStatusChange();
            });

            speechToTextAPI.onEnd(() => {
                this.isListening = false;
                this.notifyStatusChange();
                
                // Restart recognition if translation is still active
                if (this.isTranslationActive) {
                    setTimeout(() => {
                        if (this.isTranslationActive) {
                            speechToTextAPI.startRecognition(this.getFullLanguageCode(this.sourceLanguage));
                        }
                    }, 100);
                }
            });

            // Start speech recognition
            const recognitionResult = await speechToTextAPI.startRecognition(
                this.getFullLanguageCode(sourceLanguage)
            );
            
            if (!recognitionResult.success) {
                throw new Error(`Speech recognition failed to start: ${recognitionResult.error}`);
            }

            this.isTranslationActive = true;
            this.notifyStatusChange();
            
            console.log('✅ Live translation started successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to start live translation:', error);
            this.isTranslationActive = false;
            
            if (this.onTranslationError) {
                this.onTranslationError(error);
            }
            
            return { success: false, error: error.message };
        }
    }

    // Process and translate recognized speech
    async processTranslation(text, confidence) {
        try {
            console.log(`� Processing translation: "${text}"`);
            
            // Translate the text using custom API
            const translationResult = await textTranslationAPI.translateText(
                text,
                this.sourceLanguage,
                this.targetLanguage
            );
            
            if (translationResult.success) {
                console.log(`✅ Translated: "${translationResult.translatedText}"`);
                
                // Create translation result
                const result = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    originalText: text,
                    translatedText: translationResult.translatedText,
                    sourceLanguage: this.sourceLanguage,
                    targetLanguage: this.targetLanguage,
                    confidence: confidence || 0.8,
                    speaker: 'current_user',
                    provider: translationResult.provider
                };
                
                // Add to history
                this.translationHistory.push(result);
                
                // Limit history to last 20 translations
                if (this.translationHistory.length > 20) {
                    this.translationHistory = this.translationHistory.slice(-20);
                }
                
                // Speak the translation
                await this.speakTranslation(translationResult.translatedText, this.targetLanguage);
                
                // Notify callback
                if (this.onTranslationResult) {
                    this.onTranslationResult(result);
                }
                
                return result;
            } else {
                throw new Error(translationResult.error);
            }
            
        } catch (error) {
            console.error('Translation processing error:', error);
            
            if (this.onTranslationError) {
                this.onTranslationError(error);
            }
        }
    }

    // Speak the translated text using custom TTS API
    async speakTranslation(text, language) {
        try {
            console.log(`🔊 Speaking translation: "${text}"`);
            
            const result = await textToSpeechAPI.speak(
                text,
                this.getFullLanguageCode(language),
                {
                    rate: 0.9,
                    volume: 0.8,
                    pitch: 1.0
                }
            );
            
            if (result.success) {
                console.log('✅ Translation spoken successfully');
            } else {
                console.error('❌ Failed to speak translation:', result.error);
            }
            
            return result;
            
        } catch (error) {
            console.error('Failed to speak translation:', error);
        }
    }

    // Convert short language codes to full language codes
    getFullLanguageCode(langCode) {
        const mapping = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-BR',
            'ru': 'ru-RU',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'ar': 'ar-SA',
            'hi': 'hi-IN',
            'tr': 'tr-TR',
            'nl': 'nl-NL',
            'sv': 'sv-SE',
            'da': 'da-DK',
            'no': 'no-NO',
            'fi': 'fi-FI',
            'pl': 'pl-PL',
            'cs': 'cs-CZ',
            'hu': 'hu-HU',
            'ro': 'ro-RO',
            'bg': 'bg-BG',
            'hr': 'hr-HR',
            'sk': 'sk-SK',
            'sl': 'sl-SI',
            'et': 'et-EE',
            'lv': 'lv-LV',
            'lt': 'lt-LT',
            'mt': 'mt-MT',
            'el': 'el-GR',
            'he': 'he-IL',
            'th': 'th-TH',
            'vi': 'vi-VN',
            'id': 'id-ID',
            'ms': 'ms-MY',
            'fil': 'fil-PH'
        };
        
        return mapping[langCode] || langCode;
    }

    // Notify status change
    notifyStatusChange() {
        if (this.onStatusChange) {
            this.onStatusChange({
                isActive: this.isTranslationActive,
                isListening: this.isListening,
                sourceLanguage: this.sourceLanguage,
                targetLanguage: this.targetLanguage,
                status: this.isListening ? 'listening' : 'ready'
            });
        }
    }

    // Stop live translation
    async stopLiveTranslation() {
        try {
            console.log('🛑 Stopping live translation...');
            
            this.isTranslationActive = false;
            this.isListening = false;
            
            // Stop speech recognition
            await speechToTextAPI.stopRecognition();
            
            // Stop any ongoing speech synthesis
            textToSpeechAPI.stop();
            
            // Clean up audio processing
            await audioProcessingAPI.cleanup();
            
            this.notifyStatusChange();
            
            console.log('✅ Live translation stopped');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to stop live translation:', error);
            return { success: false, error: error.message };
        }
    }

    // Set translation languages
    setLanguages(sourceLanguage, targetLanguage) {
        console.log(`🌍 Setting languages: ${sourceLanguage} → ${targetLanguage}`);
        
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        
        // Update speech recognition language if active
        if (this.isTranslationActive) {
            speechToTextAPI.setLanguage(this.getFullLanguageCode(sourceLanguage));
        }
    }

    // Get supported languages from translation API
    getSupportedLanguages() {
        return textTranslationAPI.getSupportedLanguages();
    }

    // Get translation history
    getTranslationHistory() {
        return this.translationHistory;
    }

    // Clear translation history
    clearTranslationHistory() {
        this.translationHistory = [];
    }

    // Get current status
    getStatus() {
        return {
            isActive: this.isTranslationActive,
            isListening: this.isListening,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage,
            historyCount: this.translationHistory.length,
            supportedLanguagesCount: Object.keys(SUPPORTED_LANGUAGES).length
        };
    }

    // Toggle translation on/off
    async toggleTranslation(sourceLanguage, targetLanguage) {
        if (this.isTranslationActive) {
            return await this.stopLiveTranslation();
        } else {
            return await this.startLiveTranslation(sourceLanguage, targetLanguage);
        }
    }

    // Test translation functionality
    async testTranslation() {
        try {
            console.log('🧪 Testing live translation...');
            
            const testText = 'Hello, this is a test message.';
            const translated = await translateText(testText, 'en', 'es');
            
            if (translated) {
                console.log(`✅ Test successful: "${testText}" → "${translated}"`);
                await this.speakTranslation(translated, 'es');
                return { success: true, result: translated };
            } else {
                throw new Error('Translation test failed');
            }
            
        } catch (error) {
            console.error('❌ Translation test failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const liveTranslationService = new LiveTranslationService();

export default liveTranslationService;
