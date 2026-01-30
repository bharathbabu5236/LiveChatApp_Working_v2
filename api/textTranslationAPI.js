// Custom Text Translation API Service
// Handles text translation between languages

class TextTranslationAPI {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://translation.googleapis.com/language/translate/v2';
        this.cache = new Map(); // Cache translations to reduce API calls
        this.maxCacheSize = 100;
        
        console.log('🌍 Text Translation API initialized');
    }

    // Set API key
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        console.log('🔑 Translation API key configured');
    }

    // Translate text
    async translateText(text, sourceLanguage, targetLanguage, options = {}) {
        try {
            if (!text || text.trim().length === 0) {
                return { success: false, error: 'Text is required' };
            }

            if (sourceLanguage === targetLanguage) {
                return { 
                    success: true, 
                    translatedText: text,
                    sourceLanguage,
                    targetLanguage,
                    confidence: 1.0,
                    cached: false
                };
            }

            // Check cache first
            const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.toLowerCase()}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                console.log('📦 Using cached translation:', cached.translatedText);
                return { ...cached, cached: true };
            }

            // Use Google Translate API
            const result = await this.callGoogleTranslateAPI(text, sourceLanguage, targetLanguage, options);
            
            if (result.success) {
                // Cache the result
                this.addToCache(cacheKey, result);
            }

            return result;

        } catch (error) {
            console.error('Translation error:', error);
            return { success: false, error: error.message };
        }
    }

    // Call Google Translate API
    async callGoogleTranslateAPI(text, sourceLanguage, targetLanguage, options) {
        try {
            if (!this.apiKey) {
                // Fallback to free Google Translate (limited)
                return await this.callFreeTranslateAPI(text, sourceLanguage, targetLanguage);
            }

            const params = new URLSearchParams({
                key: this.apiKey,
                q: text,
                source: this.normalizeLanguageCode(sourceLanguage),
                target: this.normalizeLanguageCode(targetLanguage),
                format: 'text'
            });

            const response = await fetch(`${this.baseUrl}?${params}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            const translation = data.data.translations[0];
            
            return {
                success: true,
                translatedText: translation.translatedText,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                detectedSourceLanguage: translation.detectedSourceLanguage,
                confidence: 0.95, // Google Translate typically has high confidence
                provider: 'google-api',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Google Translate API error:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback free translation API (using a free service)
    async callFreeTranslateAPI(text, sourceLanguage, targetLanguage) {
        try {
            console.log('📡 Using free translation service...');
            
            // Using MyMemory free translation API as fallback
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLanguage}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Free API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.responseStatus !== 200) {
                throw new Error(data.responseDetails || 'Translation failed');
            }

            return {
                success: true,
                translatedText: data.responseData.translatedText,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                confidence: parseFloat(data.responseData.match) || 0.8,
                provider: 'mymemory-free',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Free translation API error:', error);
            
            // Final fallback - basic word substitution (very limited)
            return await this.basicWordSubstitution(text, sourceLanguage, targetLanguage);
        }
    }

    // Basic word substitution fallback (very limited)
    async basicWordSubstitution(text, sourceLanguage, targetLanguage) {
        const basicTranslations = {
            'en-es': {
                'hello': 'hola',
                'goodbye': 'adiós',
                'thank you': 'gracias',
                'yes': 'sí',
                'no': 'no',
                'please': 'por favor',
                'excuse me': 'disculpe',
                'sorry': 'lo siento'
            },
            'en-fr': {
                'hello': 'bonjour',
                'goodbye': 'au revoir',
                'thank you': 'merci',
                'yes': 'oui',
                'no': 'non',
                'please': 's\'il vous plaît',
                'excuse me': 'excusez-moi',
                'sorry': 'désolé'
            }
        };

        const langPair = `${sourceLanguage}-${targetLanguage}`;
        const translations = basicTranslations[langPair];
        
        if (translations) {
            let translatedText = text.toLowerCase();
            Object.entries(translations).forEach(([source, target]) => {
                translatedText = translatedText.replace(new RegExp(source, 'gi'), target);
            });
            
            return {
                success: true,
                translatedText: translatedText,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                confidence: 0.3,
                provider: 'basic-substitution',
                timestamp: new Date().toISOString(),
                warning: 'Basic translation used - accuracy limited'
            };
        }

        return {
            success: false,
            error: 'No translation service available',
            originalText: text
        };
    }

    // Normalize language codes for API compatibility
    normalizeLanguageCode(langCode) {
        // Convert full language codes to simple ones for API
        const mapping = {
            'en-US': 'en',
            'en-GB': 'en',
            'es-ES': 'es',
            'es-MX': 'es',
            'fr-FR': 'fr',
            'de-DE': 'de',
            'it-IT': 'it',
            'pt-BR': 'pt',
            'ru-RU': 'ru',
            'ja-JP': 'ja',
            'ko-KR': 'ko',
            'zh-CN': 'zh',
            'ar-SA': 'ar',
            'hi-IN': 'hi',
            'tr-TR': 'tr',
            'nl-NL': 'nl',
            'sv-SE': 'sv',
            'da-DK': 'da',
            'no-NO': 'no',
            'fi-FI': 'fi',
            'pl-PL': 'pl',
            'cs-CZ': 'cs',
            'hu-HU': 'hu',
            'ro-RO': 'ro',
            'bg-BG': 'bg',
            'hr-HR': 'hr',
            'sk-SK': 'sk',
            'sl-SI': 'sl',
            'et-EE': 'et',
            'lv-LV': 'lv',
            'lt-LT': 'lt',
            'mt-MT': 'mt',
            'el-GR': 'el',
            'he-IL': 'he',
            'th-TH': 'th',
            'vi-VN': 'vi',
            'id-ID': 'id',
            'ms-MY': 'ms',
            'fil-PH': 'tl'
        };

        return mapping[langCode] || langCode.split('-')[0];
    }

    // Add translation to cache
    addToCache(key, result) {
        try {
            // Remove oldest entries if cache is full
            if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            this.cache.set(key, {
                ...result,
                cachedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error adding to cache:', error);
        }
    }

    // Get translation statistics
    getStats() {
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            hasApiKey: !!this.apiKey,
            supportedLanguages: Object.keys(this.getSupportedLanguages()).length
        };
    }

    // Get supported languages
    getSupportedLanguages() {
        return {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French', 
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'tr': 'Turkish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish',
            'pl': 'Polish',
            'cs': 'Czech',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'bg': 'Bulgarian',
            'hr': 'Croatian',
            'sk': 'Slovak',
            'sl': 'Slovenian',
            'et': 'Estonian',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'mt': 'Maltese',
            'el': 'Greek',
            'he': 'Hebrew',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'id': 'Indonesian',
            'ms': 'Malay',
            'tl': 'Filipino',
            'bn': 'Bengali',
            'ur': 'Urdu',
            'fa': 'Persian',
            'sw': 'Swahili'
        };
    }

    // Clear translation cache
    clearCache() {
        this.cache.clear();
        console.log('🧹 Translation cache cleared');
    }

    // Test the API
    async testAPI() {
        try {
            console.log('🧪 Testing Text Translation API...');
            
            const testResult = await this.translateText(
                'Hello, how are you?',
                'en',
                'es'
            );

            if (testResult.success) {
                console.log('✅ Translation test passed:', testResult.translatedText);
                return { success: true, result: testResult };
            } else {
                throw new Error(testResult.error);
            }

        } catch (error) {
            console.error('❌ Translation API test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Batch translate multiple texts
    async batchTranslate(texts, sourceLanguage, targetLanguage) {
        try {
            const results = [];
            
            for (const text of texts) {
                const result = await this.translateText(text, sourceLanguage, targetLanguage);
                results.push(result);
            }

            return {
                success: true,
                results,
                summary: {
                    total: texts.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                }
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const textTranslationAPI = new TextTranslationAPI();

export default textTranslationAPI;
