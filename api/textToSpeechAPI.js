// Custom Text-to-Speech API Service
// Handles text-to-speech conversion for live translation

class TextToSpeechAPI {
    constructor() {
        this.synthesis = null;
        this.voices = [];
        this.isInitialized = false;
        this.currentUtterance = null;
        this.onSpeakStartCallback = null;
        this.onSpeakEndCallback = null;
        this.onSpeakErrorCallback = null;
        
        this.initialize();
        console.log('🔊 Text-to-Speech API initialized');
    }

    // Initialize speech synthesis
    initialize() {
        try {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                console.warn('⚠️ Speech synthesis not supported in this environment');
                return;
            }

            this.synthesis = window.speechSynthesis;
            this.loadVoices();
            
            // Listen for voices change (voices load asynchronously)
            if ('onvoiceschanged' in this.synthesis) {
                this.synthesis.onvoiceschanged = () => {
                    this.loadVoices();
                };
            }

            this.isInitialized = true;
            console.log('✅ Text-to-Speech initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Text-to-Speech:', error);
        }
    }

    // Load available voices
    loadVoices() {
        try {
            this.voices = this.synthesis.getVoices();
            console.log(`🎙️ Loaded ${this.voices.length} voices`);
            
            // Log available languages
            const languages = [...new Set(this.voices.map(voice => voice.lang))];
            console.log('Available languages:', languages.slice(0, 10).join(', '), '...');
            
        } catch (error) {
            console.error('Error loading voices:', error);
        }
    }

    // Speak text with specified language and options
    async speak(text, language = 'en-US', options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Text-to-Speech not initialized');
            }

            if (!text || text.trim().length === 0) {
                throw new Error('Text is required for speech synthesis');
            }

            // Stop any ongoing speech
            this.stop();

            // Create speech utterance
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Configure utterance
            this.configureUtterance(language, options);
            
            // Set up event listeners
            this.setupUtteranceEvents();

            // Speak the text
            this.synthesis.speak(this.currentUtterance);
            
            console.log(`🔊 Speaking: "${text}" (${language})`);
            
            return new Promise((resolve, reject) => {
                this.currentUtterance.onend = () => {
                    resolve({
                        success: true,
                        text,
                        language,
                        duration: Date.now() - startTime
                    });
                };
                
                this.currentUtterance.onerror = (event) => {
                    reject({
                        success: false,
                        error: `Speech synthesis error: ${event.error}`,
                        text,
                        language
                    });
                };
                
                const startTime = Date.now();
            });

        } catch (error) {
            console.error('Speech synthesis error:', error);
            return { success: false, error: error.message };
        }
    }

    // Configure speech utterance
    configureUtterance(language, options) {
        if (!this.currentUtterance) return;

        // Set language
        this.currentUtterance.lang = language;
        
        // Set voice if available
        const voice = this.findBestVoice(language, options.gender);
        if (voice) {
            this.currentUtterance.voice = voice;
        }

        // Set speech parameters
        this.currentUtterance.rate = options.rate || 0.9; // Slightly slower for clarity
        this.currentUtterance.pitch = options.pitch || 1.0;
        this.currentUtterance.volume = options.volume || 0.8; // Lower volume for calls
    }

    // Find the best voice for a language
    findBestVoice(language, preferredGender = null) {
        try {
            if (!this.voices.length) {
                this.loadVoices();
            }

            // Try exact language match first
            let matchingVoices = this.voices.filter(voice => voice.lang === language);
            
            if (matchingVoices.length === 0) {
                // Try language family match (e.g., 'en' for 'en-US')
                const langFamily = language.split('-')[0];
                matchingVoices = this.voices.filter(voice => voice.lang.startsWith(langFamily));
            }

            if (matchingVoices.length === 0) {
                // Fallback to default voice
                return this.voices.find(voice => voice.default) || this.voices[0];
            }

            // Filter by gender preference if specified
            if (preferredGender) {
                const genderFiltered = matchingVoices.filter(voice => 
                    voice.name.toLowerCase().includes(preferredGender.toLowerCase())
                );
                
                if (genderFiltered.length > 0) {
                    matchingVoices = genderFiltered;
                }
            }

            // Prefer neural/high-quality voices
            const neuralVoices = matchingVoices.filter(voice => 
                voice.name.toLowerCase().includes('neural') ||
                voice.name.toLowerCase().includes('premium') ||
                voice.name.toLowerCase().includes('enhanced')
            );

            if (neuralVoices.length > 0) {
                return neuralVoices[0];
            }

            // Return first matching voice
            return matchingVoices[0];

        } catch (error) {
            console.error('Error finding voice:', error);
            return null;
        }
    }

    // Set up utterance event listeners
    setupUtteranceEvents() {
        if (!this.currentUtterance) return;

        this.currentUtterance.onstart = () => {
            console.log('🎤 Speech started');
            if (this.onSpeakStartCallback) {
                this.onSpeakStartCallback();
            }
        };

        this.currentUtterance.onend = () => {
            console.log('✅ Speech ended');
            if (this.onSpeakEndCallback) {
                this.onSpeakEndCallback();
            }
        };

        this.currentUtterance.onerror = (event) => {
            console.error('🚨 Speech error:', event.error);
            if (this.onSpeakErrorCallback) {
                this.onSpeakErrorCallback(event);
            }
        };
    }

    // Stop current speech
    stop() {
        try {
            if (this.synthesis && this.synthesis.speaking) {
                this.synthesis.cancel();
                console.log('🛑 Speech stopped');
            }
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    }

    // Pause speech
    pause() {
        try {
            if (this.synthesis && this.synthesis.speaking) {
                this.synthesis.pause();
                console.log('⏸️ Speech paused');
            }
        } catch (error) {
            console.error('Error pausing speech:', error);
        }
    }

    // Resume speech
    resume() {
        try {
            if (this.synthesis && this.synthesis.paused) {
                this.synthesis.resume();
                console.log('▶️ Speech resumed');
            }
        } catch (error) {
            console.error('Error resuming speech:', error);
        }
    }

    // Get available voices for a language
    getVoicesForLanguage(language) {
        try {
            const langFamily = language.split('-')[0];
            return this.voices.filter(voice => 
                voice.lang === language || voice.lang.startsWith(langFamily)
            ).map(voice => ({
                name: voice.name,
                language: voice.lang,
                gender: this.guessGender(voice.name),
                quality: this.guessQuality(voice.name),
                isDefault: voice.default
            }));
        } catch (error) {
            console.error('Error getting voices for language:', error);
            return [];
        }
    }

    // Guess voice gender from name
    guessGender(voiceName) {
        const name = voiceName.toLowerCase();
        if (name.includes('female') || name.includes('woman') || 
            name.includes('alice') || name.includes('samantha') ||
            name.includes('victoria') || name.includes('zira')) {
            return 'female';
        } else if (name.includes('male') || name.includes('man') ||
                   name.includes('alex') || name.includes('david') ||
                   name.includes('mark') || name.includes('tom')) {
            return 'male';
        }
        return 'unknown';
    }

    // Guess voice quality from name
    guessQuality(voiceName) {
        const name = voiceName.toLowerCase();
        if (name.includes('neural') || name.includes('premium') || name.includes('enhanced')) {
            return 'high';
        } else if (name.includes('compact') || name.includes('basic')) {
            return 'low';
        }
        return 'medium';
    }

    // Get supported languages
    getSupportedLanguages() {
        try {
            const languages = [...new Set(this.voices.map(voice => voice.lang))];
            const languageMap = {};
            
            languages.forEach(lang => {
                const voicesForLang = this.getVoicesForLanguage(lang);
                languageMap[lang] = {
                    name: this.getLanguageName(lang),
                    voiceCount: voicesForLang.length,
                    hasNeuralVoice: voicesForLang.some(v => v.quality === 'high'),
                    genders: [...new Set(voicesForLang.map(v => v.gender))].filter(g => g !== 'unknown')
                };
            });
            
            return languageMap;
        } catch (error) {
            console.error('Error getting supported languages:', error);
            return {};
        }
    }

    // Get language name from code
    getLanguageName(langCode) {
        const languageNames = {
            'en-US': 'English (US)',
            'en-GB': 'English (UK)',
            'es-ES': 'Spanish (Spain)',
            'es-MX': 'Spanish (Mexico)',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-BR': 'Portuguese (Brazil)',
            'ru-RU': 'Russian',
            'ja-JP': 'Japanese',
            'ko-KR': 'Korean',
            'zh-CN': 'Chinese (Mandarin)',
            'ar-SA': 'Arabic',
            'hi-IN': 'Hindi',
            'tr-TR': 'Turkish',
            'nl-NL': 'Dutch',
            'sv-SE': 'Swedish',
            'da-DK': 'Danish',
            'no-NO': 'Norwegian',
            'fi-FI': 'Finnish',
            'pl-PL': 'Polish',
            'cs-CZ': 'Czech',
            'hu-HU': 'Hungarian'
        };
        
        return languageNames[langCode] || langCode;
    }

    // Get API status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isSupported: !!this.synthesis,
            isSpeaking: this.synthesis ? this.synthesis.speaking : false,
            isPaused: this.synthesis ? this.synthesis.paused : false,
            voiceCount: this.voices.length,
            supportedLanguages: Object.keys(this.getSupportedLanguages()).length
        };
    }

    // Set event callbacks
    onSpeakStart(callback) {
        this.onSpeakStartCallback = callback;
    }

    onSpeakEnd(callback) {
        this.onSpeakEndCallback = callback;
    }

    onSpeakError(callback) {
        this.onSpeakErrorCallback = callback;
    }

    // Test the API
    async testAPI() {
        try {
            console.log('🧪 Testing Text-to-Speech API...');
            
            const status = this.getStatus();
            console.log('Status:', status);
            
            if (!status.isSupported) {
                throw new Error('Text-to-Speech not supported');
            }

            const result = await this.speak(
                'Hello, this is a test of the text to speech system.',
                'en-US',
                { rate: 1.0, volume: 0.5 }
            );

            if (result.success) {
                console.log('✅ Text-to-Speech test passed');
                return { success: true, result, status };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Text-to-Speech API test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup
    destroy() {
        try {
            this.stop();
            this.onSpeakStartCallback = null;
            this.onSpeakEndCallback = null;
            this.onSpeakErrorCallback = null;
            this.currentUtterance = null;
            
            console.log('🧹 Text-to-Speech API cleanup completed');
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Create singleton instance
const textToSpeechAPI = new TextToSpeechAPI();

export default textToSpeechAPI;
