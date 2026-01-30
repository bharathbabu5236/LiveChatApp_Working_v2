// API Configuration for Live Translation
// Central configuration for all translation-related APIs

export const TRANSLATION_API_CONFIG = {
    // Google Cloud Translation API
    googleTranslate: {
        apiKey: 'AIzaSyC-KeQ39iD_HAwGVbQt830FP8EzEY7Ez5s', // Replace with your actual API key
        endpoint: 'https://translation.googleapis.com/language/translate/v2',
        enabled: true,
        // Fallback to free service if no API key
        fallbackToFree: true
    },

    // Alternative Translation Services
    alternativeTranslation: {
        // MyMemory Free Translation API
        myMemory: {
            endpoint: 'https://api.mymemory.translated.net/get',
            enabled: true,
            isFreeTier: true
        },
        
        // LibreTranslate (if you want to host your own)
        libreTranslate: {
            endpoint: 'http://localhost:5000/translate', // Change to your LibreTranslate instance
            enabled: false
        }
    },

    // Speech Recognition Settings
    speechRecognition: {
        // Web Speech API (browser native)
        webSpeech: {
            enabled: true,
            language: 'en-US',
            continuous: true,
            interimResults: true,
            maxAlternatives: 1
        }
    },

    // Text-to-Speech Settings
    textToSpeech: {
        // Web Speech Synthesis API (browser native)
        webSpeechSynthesis: {
            enabled: true,
            rate: 0.9,
            pitch: 1.0,
            volume: 0.8
        }
    },

    // Audio Processing Settings
    audioProcessing: {
        constraints: {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
            }
        },
        recording: {
            mimeType: 'audio/webm;codecs=opus',
            timeslice: 1000 // 1 second chunks
        }
    },

    // Translation Quality Settings
    quality: {
        minTextLength: 3, // Minimum text length to translate
        maxHistorySize: 20, // Maximum translation history entries
        confidenceThreshold: 0.7, // Minimum confidence for translations
        retryAttempts: 3 // Number of retry attempts for failed translations
    },

    // Performance Settings
    performance: {
        enableCaching: true,
        maxCacheSize: 100,
        cacheExpiry: 3600000, // 1 hour in milliseconds
        rateLimitDelay: 100 // Minimum delay between API calls in ms
    },

    // Supported Languages Configuration
    supportedLanguages: {
        // Primary languages with high quality support
        primary: {
            'en': { name: 'English', quality: 'excellent', medical: true },
            'es': { name: 'Spanish', quality: 'excellent', medical: true },
            'fr': { name: 'French', quality: 'excellent', medical: true },
            'de': { name: 'German', quality: 'excellent', medical: true },
            'it': { name: 'Italian', quality: 'very-good', medical: true },
            'pt': { name: 'Portuguese', quality: 'very-good', medical: true }
        },

        // Secondary languages with good support
        secondary: {
            'ru': { name: 'Russian', quality: 'good', medical: false },
            'ja': { name: 'Japanese', quality: 'good', medical: false },
            'ko': { name: 'Korean', quality: 'good', medical: false },
            'zh': { name: 'Chinese', quality: 'good', medical: false },
            'ar': { name: 'Arabic', quality: 'good', medical: false },
            'hi': { name: 'Hindi', quality: 'good', medical: false },
            'tr': { name: 'Turkish', quality: 'good', medical: false },
            'nl': { name: 'Dutch', quality: 'very-good', medical: true }
        },

        // Additional languages with basic support
        additional: {
            'sv': { name: 'Swedish', quality: 'fair', medical: false },
            'da': { name: 'Danish', quality: 'fair', medical: false },
            'no': { name: 'Norwegian', quality: 'fair', medical: false },
            'fi': { name: 'Finnish', quality: 'fair', medical: false },
            'pl': { name: 'Polish', quality: 'fair', medical: false },
            'cs': { name: 'Czech', quality: 'fair', medical: false },
            'hu': { name: 'Hungarian', quality: 'fair', medical: false },
            'ro': { name: 'Romanian', quality: 'fair', medical: false },
            'bg': { name: 'Bulgarian', quality: 'fair', medical: false },
            'hr': { name: 'Croatian', quality: 'fair', medical: false },
            'sk': { name: 'Slovak', quality: 'fair', medical: false },
            'sl': { name: 'Slovenian', quality: 'fair', medical: false },
            'et': { name: 'Estonian', quality: 'fair', medical: false },
            'lv': { name: 'Latvian', quality: 'fair', medical: false },
            'lt': { name: 'Lithuanian', quality: 'fair', medical: false },
            'mt': { name: 'Maltese', quality: 'fair', medical: false },
            'el': { name: 'Greek', quality: 'fair', medical: false },
            'he': { name: 'Hebrew', quality: 'fair', medical: false },
            'th': { name: 'Thai', quality: 'fair', medical: false },
            'vi': { name: 'Vietnamese', quality: 'fair', medical: false },
            'id': { name: 'Indonesian', quality: 'fair', medical: false },
            'ms': { name: 'Malay', quality: 'fair', medical: false },
            'fil': { name: 'Filipino', quality: 'fair', medical: false },
            'bn': { name: 'Bengali', quality: 'fair', medical: false },
            'ur': { name: 'Urdu', quality: 'fair', medical: false },
            'fa': { name: 'Persian', quality: 'fair', medical: false },
            'sw': { name: 'Swahili', quality: 'fair', medical: false }
        }
    },

    // Medical/Healthcare Specific Settings
    medical: {
        enabled: true,
        specialTerms: [
            'blood pressure', 'heart rate', 'temperature', 'symptoms',
            'medication', 'allergies', 'pain level', 'breathing',
            'chest pain', 'headache', 'nausea', 'dizziness', 'fever',
            'prescription', 'dosage', 'side effects', 'medical history'
        ],
        contextBoost: 20.0 // Boost confidence for medical terms
    },

    // Debug and Logging Settings
    debug: {
        enabled: process.env.NODE_ENV === 'development',
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logToConsole: true,
        logTranslations: true,
        logPerformance: true
    }
};

// Helper functions for configuration
export const getApiKey = (service) => {
    switch (service) {
        case 'google-translate':
            return TRANSLATION_API_CONFIG.googleTranslate.apiKey;
        default:
            return null;
    }
};

export const getAllSupportedLanguages = () => {
    return {
        ...TRANSLATION_API_CONFIG.supportedLanguages.primary,
        ...TRANSLATION_API_CONFIG.supportedLanguages.secondary,
        ...TRANSLATION_API_CONFIG.supportedLanguages.additional
    };
};

export const getMedicalLanguages = () => {
    const allLanguages = getAllSupportedLanguages();
    return Object.entries(allLanguages)
        .filter(([code, info]) => info.medical)
        .reduce((acc, [code, info]) => {
            acc[code] = info;
            return acc;
        }, {});
};

export const getHighQualityLanguages = () => {
    const allLanguages = getAllSupportedLanguages();
    return Object.entries(allLanguages)
        .filter(([code, info]) => info.quality === 'excellent' || info.quality === 'very-good')
        .reduce((acc, [code, info]) => {
            acc[code] = info;
            return acc;
        }, {});
};

export const isLanguageSupported = (languageCode) => {
    const allLanguages = getAllSupportedLanguages();
    return languageCode in allLanguages;
};

export const getLanguageQuality = (languageCode) => {
    const allLanguages = getAllSupportedLanguages();
    return allLanguages[languageCode]?.quality || 'unknown';
};

export const hasMedicalSupport = (languageCode) => {
    const allLanguages = getAllSupportedLanguages();
    return allLanguages[languageCode]?.medical || false;
};

// Validation functions
export const validateApiConfig = () => {
    const issues = [];
    
    // Check if Google Translate API key is set
    if (!TRANSLATION_API_CONFIG.googleTranslate.apiKey) {
        issues.push('Google Translate API key not configured - will use free MyMemory API with limitations');
    }
    
    // Check browser support
    if (typeof window !== 'undefined') {
        if (!('speechSynthesis' in window)) {
            issues.push('Text-to-Speech not supported in this browser');
        }
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            issues.push('Speech Recognition not supported in this browser');
        }
        
        if (!('MediaRecorder' in window)) {
            issues.push('Audio Recording not supported in this browser');
        }
    }
    
    return {
        isValid: issues.length === 0,
        issues,
        canWork: issues.length === 0 || issues.every(issue => issue.includes('Google Translate API key'))
    };
};

// Export SUPPORTED_LANGUAGES constant
export const SUPPORTED_LANGUAGES = getAllSupportedLanguages();

export default TRANSLATION_API_CONFIG;
