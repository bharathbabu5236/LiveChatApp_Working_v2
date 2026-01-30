// Smart Language Detection and Auto-Translation Service
// Automatically detects language and translates between participants

import textTranslationAPI from '../api/textTranslationAPI';
import { getAllSupportedLanguages, getApiKey } from '../config/translationApiConfig';

class SmartLanguageService {
    constructor() {
        this.participants = new Map(); // Store each participant's preferred language
        this.autoDetectEnabled = true;
        this.detectionConfidenceThreshold = 0.8;
        
        // Initialize Google Translate API key for smart language service
        const apiKey = getApiKey('google-translate');
        if (apiKey) {
            textTranslationAPI.setApiKey(apiKey);
            console.log('🔑 Smart Language Service: Google Translate API key configured');
        } else {
            console.warn('⚠️ Smart Language Service: No Google Translate API key found, using free service');
        }
        
        console.log('🧠 Smart Language Service initialized');
    }

    // Set participant's preferred language
    setParticipantLanguage(participantId, languageCode, participantType = 'user') {
        this.participants.set(participantId, {
            preferredLanguage: languageCode,
            type: participantType, // 'doctor', 'patient', 'user'
            confirmed: true
        });
        
        console.log(`👤 ${participantType} ${participantId} language set to: ${languageCode}`);
        return true;
    }

    // Get participant's language
    getParticipantLanguage(participantId) {
        return this.participants.get(participantId)?.preferredLanguage || null;
    }

    // Get all participants and their languages
    getParticipants() {
        return Array.from(this.participants.entries()).map(([id, info]) => ({
            id,
            language: info.preferredLanguage,
            type: info.type
        }));
    }

    // Auto-detect language from text
    async detectLanguage(text) {
        try {
            // Use Google Translate's detect API
            const response = await fetch(
                `https://translation.googleapis.com/language/translate/v2/detect?key=${this.getApiKey()}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: text
                    })
                }
            );

            const data = await response.json();
            
            if (data.data && data.data.detections && data.data.detections[0]) {
                const detection = data.data.detections[0][0];
                return {
                    language: detection.language,
                    confidence: detection.confidence,
                    isReliable: detection.confidence > this.detectionConfidenceThreshold
                };
            }

            return { language: null, confidence: 0, isReliable: false };

        } catch (error) {
            console.error('Language detection failed:', error);
            return { language: null, confidence: 0, isReliable: false, error: error.message };
        }
    }

    // Smart translation between participants
    async smartTranslate(text, fromParticipantId, toParticipantId) {
        try {
            const fromLanguage = this.getParticipantLanguage(fromParticipantId);
            const toLanguage = this.getParticipantLanguage(toParticipantId);

            if (!fromLanguage) {
                return {
                    success: false,
                    error: 'Source participant language not set'
                };
            }

            if (!toLanguage) {
                return {
                    success: false,
                    error: 'Target participant language not set'
                };
            }

            // If same language, no translation needed
            if (fromLanguage === toLanguage) {
                return {
                    success: true,
                    translatedText: text,
                    originalText: text,
                    fromLanguage,
                    toLanguage,
                    skipped: true,
                    reason: 'Same language'
                };
            }

            // Perform translation
            const result = await textTranslationAPI.translateText(text, fromLanguage, toLanguage);

            if (result.success) {
                return {
                    success: true,
                    translatedText: result.translatedText,
                    originalText: text,
                    fromLanguage,
                    toLanguage,
                    confidence: result.confidence || 1.0,
                    provider: result.provider || 'google'
                };
            } else {
                return {
                    success: false,
                    error: result.error,
                    originalText: text
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                originalText: text
            };
        }
    }

    // Auto-translate for all other participants
    async translateForAll(text, fromParticipantId) {
        const results = [];
        const otherParticipants = Array.from(this.participants.keys())
            .filter(id => id !== fromParticipantId);

        for (const toParticipantId of otherParticipants) {
            const result = await this.smartTranslate(text, fromParticipantId, toParticipantId);
            results.push({
                toParticipantId,
                ...result
            });
        }

        return results;
    }

    // Enhance text with auto-detection if participant language not confirmed
    async enhanceWithDetection(text, participantId) {
        const participant = this.participants.get(participantId);
        
        if (!participant || !participant.confirmed) {
            // Try to detect language
            const detection = await this.detectLanguage(text);
            
            if (detection.isReliable) {
                console.log(`🔍 Auto-detected language for ${participantId}: ${detection.language} (${detection.confidence})`);
                
                // Update participant with detected language
                this.setParticipantLanguage(participantId, detection.language);
                
                return {
                    detectedLanguage: detection.language,
                    confidence: detection.confidence,
                    wasDetected: true
                };
            }
        }

        return {
            detectedLanguage: participant?.preferredLanguage,
            confidence: 1.0,
            wasDetected: false
        };
    }

    // Get available languages for selection
    getAvailableLanguages() {
        const allLanguages = getAllSupportedLanguages();
        
        // Sort by quality and medical support
        return Object.entries(allLanguages)
            .sort(([aCode, aInfo], [bCode, bInfo]) => {
                // Prioritize medical support
                if (aInfo.medical && !bInfo.medical) return -1;
                if (!aInfo.medical && bInfo.medical) return 1;
                
                // Then by quality
                const qualityOrder = { 'excellent': 4, 'very-good': 3, 'good': 2, 'fair': 1 };
                return (qualityOrder[bInfo.quality] || 0) - (qualityOrder[aInfo.quality] || 0);
            })
            .map(([code, info]) => ({
                code,
                name: info.name,
                quality: info.quality,
                medical: info.medical,
                recommended: info.medical && (info.quality === 'excellent' || info.quality === 'very-good')
            }));
    }

    // Helper to get API key
    getApiKey() {
        return process.env.GOOGLE_TRANSLATE_API_KEY || 
               window.GOOGLE_TRANSLATE_API_KEY || 
               'AIzaSyC-KeQ39iD_HAwGVbQt830FP8EzEY7Ez5s'; // Your key as fallback
    }

    // Reset all participants
    reset() {
        this.participants.clear();
        console.log('🔄 Smart Language Service reset');
    }

    // Get status
    getStatus() {
        return {
            participantCount: this.participants.size,
            participants: this.getParticipants(),
            autoDetectEnabled: this.autoDetectEnabled,
            detectionThreshold: this.detectionConfidenceThreshold
        };
    }
}

// Create singleton instance
const smartLanguageService = new SmartLanguageService();

export default smartLanguageService;
