import { Translate } from '@google-cloud/translate/build/src/v2';

// Translation service interfaces
interface TranslationResult {
    success: boolean;
    translatedText?: string;
    originalText?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    error?: string;
}

interface TranslationOptions {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
}

// Language code mapping for Google Translate API
const GOOGLE_TRANSLATE_LANGUAGE_MAP: { [key: string]: string } = {
    'en-US': 'en',
    'es-ES': 'es',
    'es-MX': 'es',
    'zh-CN': 'zh',
    'hi-IN': 'hi',
    'te-IN': 'te',
    'tl-PH': 'tl',
    'ta-IN': 'ta',
    'kn-IN': 'kn',
    'ml-IN': 'ml',
    'pa-IN': 'pa',
    'gu-IN': 'gu',
    'bn-IN': 'bn',
    'mr-IN': 'mr',
    'ur-PK': 'ur',
    'ar-SA': 'ar',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'pt-BR': 'pt',
    'pt-PT': 'pt',
    'ru-RU': 'ru',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'it-IT': 'it',
    'th-TH': 'th',
    'vi-VN': 'vi',
    'id-ID': 'id',
    'ms-MY': 'ms',
    'tr-TR': 'tr',
    'fa-IR': 'fa',
    'he-IL': 'he',
    'sw-KE': 'sw',
    'am-ET': 'am',
    'yo-NG': 'yo',
    'ig-NG': 'ig',
    'ha-NG': 'ha',
    'pl-PL': 'pl',
    'uk-UA': 'uk',
    'cs-CZ': 'cs',
    'hu-HU': 'hu',
    'ro-RO': 'ro',
    'bg-BG': 'bg',
    'hr-HR': 'hr',
    'sr-RS': 'sr',
    'sk-SK': 'sk',
    'sl-SI': 'sl',
    'et-EE': 'et',
    'lv-LV': 'lv',
    'lt-LT': 'lt',
    'fi-FI': 'fi',
    'sv-SE': 'sv',
    'no-NO': 'no',
    'da-DK': 'da',
    'is-IS': 'is',
    'nl-NL': 'nl',
    'af-ZA': 'af',
    'zu-ZA': 'zu',
    'xh-ZA': 'xh'
};

class GoogleTranslationService {
    private translate: Translate | null = null;
    private isInitialized = false;

    constructor() {
        // Initialize asynchronously to avoid blocking the main thread
        this.initializeTranslate().catch(error => {
            console.warn('Translation service initialization failed:', error);
        });
    }

    private async initializeTranslate(): Promise<void> {
        try {
            // Initialize Google Translate with your credentials
            this.translate = new Translate({
                // Use environment variable (recommended)
                key: process.env.GOOGLE_TRANSLATE_API_KEY || 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE'
                
                // Alternative: Use service account file
                // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                
                // Alternative: Direct API key (not recommended for production)
                // key: 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE'
            });
            
            this.isInitialized = true;
            console.log('✅ Google Translate service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Translate service:', error);
            this.isInitialized = false;
            // Don't throw error to prevent blocking the app
        }
    }

    private mapLanguageCode(languageCode: string): string {
        return GOOGLE_TRANSLATE_LANGUAGE_MAP[languageCode] || languageCode.split('-')[0];
    }

    async translateText(options: TranslationOptions): Promise<TranslationResult> {
        if (!this.isInitialized || !this.translate) {
            return {
                success: false,
                error: 'Translation service not initialized'
            };
        }

        try {
            const { text, sourceLanguage, targetLanguage } = options;

            // Skip translation if text is empty or languages are the same
            if (!text.trim()) {
                return {
                    success: false,
                    error: 'Empty text provided for translation'
                };
            }

            const sourceLang = this.mapLanguageCode(sourceLanguage);
            const targetLang = this.mapLanguageCode(targetLanguage);

            if (sourceLang === targetLang) {
                return {
                    success: true,
                    translatedText: text,
                    originalText: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                };
            }

            console.log(`🌐 Translating: "${text}" from ${sourceLang} to ${targetLang}`);

            // Perform the translation
            const [translation] = await this.translate.translate(text, {
                from: sourceLang,
                to: targetLang
            });

            console.log(`✅ Translation result: "${translation}"`);

            return {
                success: true,
                translatedText: translation,
                originalText: text,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            };

        } catch (error) {
            console.error('❌ Translation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Translation failed',
                originalText: options.text,
                sourceLanguage: options.sourceLanguage,
                targetLanguage: options.targetLanguage
            };
        }
    }

    // Batch translation for multiple texts
    async translateTexts(texts: string[], sourceLanguage: string, targetLanguage: string): Promise<TranslationResult[]> {
        const results: TranslationResult[] = [];
        
        for (const text of texts) {
            const result = await this.translateText({
                text,
                sourceLanguage,
                targetLanguage
            });
            results.push(result);
        }
        
        return results;
    }

    // Check if the service is ready
    isReady(): boolean {
        return this.isInitialized && this.translate !== null;
    }

    // Get supported language codes
    getSupportedLanguages(): string[] {
        return Object.keys(GOOGLE_TRANSLATE_LANGUAGE_MAP);
    }
}

// Create a singleton instance
export const googleTranslationService = new GoogleTranslationService();

// Export types
export type { TranslationResult, TranslationOptions };
