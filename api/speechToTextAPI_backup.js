// Custom Speech-to-Text API Service
// Handles real-time speech recognition for live tra        this.recognition.onend = () => {
            this.isRecording = false;
            
            if (this.onEndCallback) {
                this.onEndCallback();
            }
            
            // Auto-restart for continuous recognition
            if (this.shouldContinue && !this.isStopping) {
                setTimeout(() => {
                    if (this.shouldContinue && !this.isStopping) {
                        try {
                            this.isRecording = true;
                            this.recognition.start();
                        } catch (error) {SpeechToTextAPI {
    constructor() {
        this.isRecording = false;
        this.shouldContinue = false;
        this.isStopping = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.recognition = null;
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        
        console.log('🎤 Speech-to-Text API initialized');
    }

    // Initialize speech recognition
    async initialize(options = {}) {
        try {
            const config = {
                language: options.language || 'en-US',
                continuous: options.continuous !== false,
                interimResults: options.interimResults !== false,
                maxAlternatives: options.maxAlternatives || 1,
                ...options
            };

            // Check browser support
            if (!this.isBrowserSupported()) {
                throw new Error('Speech recognition not supported in this browser');
            }

            // Set up Web Speech API
            await this.setupWebSpeechAPI(config);
            
            console.log('✅ Speech-to-Text API initialized successfully');
            return { success: true, config };
            
        } catch (error) {
            console.error('❌ Failed to initialize Speech-to-Text API:', error);
            return { success: false, error: error.message };
        }
    }

    // Check browser support for speech recognition
    isBrowserSupported() {
        if (typeof window === 'undefined') {
            return false;
        }
        
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    // Set up Web Speech API
    async setupWebSpeechAPI(config) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            throw new Error('Web Speech API not available');
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = config.interimResults;
        this.recognition.lang = config.language;
        this.recognition.maxAlternatives = config.maxAlternatives;

        // Set up event listeners
        this.recognition.onstart = () => {
            console.log('🎤 Speech recognition started');
            this.isRecording = true;
            if (this.onStartCallback) {
                this.onStartCallback();
            }
        };

        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('🚨 Speech recognition error:', event.error);
            this.handleSpeechError(event);
        };

        this.recognition.onend = () => {
            console.log('� Speech recognition ended, restarting...');
            this.isRecording = false;
            
            if (this.onEndCallback) {
                this.onEndCallback();
            }
            
            // Auto-restart for continuous recognition
            if (this.shouldContinue && !this.isStopping) {
                setTimeout(() => {
                    if (this.shouldContinue && !this.isStopping) {
                        try {
                            this.isRecording = true;
                            this.recognition.start();
                        } catch (error) {
                            console.warn('⚠️ Restart failed, trying again...', error.message);
                            setTimeout(() => {
                                if (this.shouldContinue && !this.isStopping) {
                                    this.isRecording = true;
                                    this.recognition.start();
                                }
                            }, 500);
                        }
                    }
                }, 100);
            }
        };
    }

    // Handle speech recognition results
    handleSpeechResult(event) {
        try {
            const results = event.results;
            const lastResult = results[results.length - 1];
            
            if (lastResult) {
                const transcript = lastResult[0].transcript;
                const confidence = lastResult[0].confidence || 0;
                const isFinal = lastResult.isFinal;
                
                const result = {
                    transcript: transcript.trim(),
                    confidence: confidence,
                    isFinal: isFinal,
                    timestamp: new Date().toISOString(),
                    language: this.recognition.lang
                };

                if (isFinal && transcript.trim().length > 0) {
                    console.log(`🗣️ SPEECH: "${transcript}"`);
                }

                if (this.onResultCallback) {
                    this.onResultCallback(result);
                }
            }
        } catch (error) {
            console.error('Error handling speech result:', error);
        }
    }

    // Handle speech recognition errors
    handleSpeechError(event) {
        const errorMessages = {
            'aborted': 'Speech recognition was aborted',
            'audio-capture': 'Audio capture failed',
            'network': 'Network error occurred',
            'not-allowed': 'Microphone permission was denied',
            'service-not-allowed': 'Speech service not allowed',
            'bad-grammar': 'Grammar compilation failed',
            'language-not-supported': 'Language not supported',
            'no-speech': 'No speech was detected'
        };

        const errorMessage = errorMessages[event.error] || `Unknown error: ${event.error}`;
        
        if (this.onErrorCallback) {
            this.onErrorCallback({
                type: event.error,
                message: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Start speech recognition
    async startRecognition(language = 'en-US') {
        try {
            if (!this.recognition) {
                await this.initialize({ language });
            }

            if (this.isRecording) {
                return { success: false, error: 'Already recording' };
            }

            // Request microphone permission first
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately, we just needed permission
            } catch (permissionError) {
                return { success: false, error: 'Microphone permission denied. Please allow microphone access.' };
            }

            // Update language if needed
            if (this.recognition.lang !== language) {
                this.recognition.lang = language;
            }

            this.shouldContinue = true;
            this.isStopping = false;
            this.recognition.start();
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to start speech recognition:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop speech recognition
    async stopRecognition() {
        try {
            if (!this.isRecording) {
                return { success: true, message: 'Not recording' };
            }

            this.shouldContinue = false;
            this.isStopping = true;

            if (this.recognition) {
                this.recognition.stop();
            }

            this.isRecording = false;
            
            return { success: true };
            
        } catch (error) {
            console.error('Failed to stop speech recognition:', error);
            return { success: false, error: error.message };
        }
    }

    // Set language for recognition
    setLanguage(language) {
        try {
            if (this.recognition) {
                this.recognition.lang = language;
                console.log(`🌍 Speech recognition language set to: ${language}`);
                return { success: true };
            } else {
                return { success: false, error: 'Recognition not initialized' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get supported languages
    getSupportedLanguages() {
        return {
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
            'hu-HU': 'Hungarian',
            'ro-RO': 'Romanian',
            'bg-BG': 'Bulgarian',
            'hr-HR': 'Croatian',
            'sk-SK': 'Slovak',
            'sl-SI': 'Slovenian',
            'et-EE': 'Estonian',
            'lv-LV': 'Latvian',
            'lt-LT': 'Lithuanian',
            'mt-MT': 'Maltese',
            'el-GR': 'Greek',
            'he-IL': 'Hebrew',
            'th-TH': 'Thai',
            'vi-VN': 'Vietnamese',
            'id-ID': 'Indonesian',
            'ms-MY': 'Malay',
            'fil-PH': 'Filipino'
        };
    }

    // Get current status
    getStatus() {
        return {
            isRecording: this.isRecording,
            isSupported: this.isBrowserSupported(),
            currentLanguage: this.recognition?.lang || null,
            isInitialized: !!this.recognition
        };
    }

    // Set event callbacks
    onResult(callback) {
        this.onResultCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    onStart(callback) {
        this.onStartCallback = callback;
    }

    onEnd(callback) {
        this.onEndCallback = callback;
    }

    // Test the API
    async testAPI() {
        try {
            console.log('🧪 Testing Speech-to-Text API...');
            
            const status = this.getStatus();
            console.log('Status:', status);
            
            if (!status.isSupported) {
                throw new Error('Speech recognition not supported');
            }

            const initResult = await this.initialize();
            if (!initResult.success) {
                throw new Error(initResult.error);
            }

            console.log('✅ Speech-to-Text API test passed');
            return { success: true, status };
            
        } catch (error) {
            console.error('❌ Speech-to-Text API test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup
    destroy() {
        try {
            if (this.isRecording) {
                this.stopRecognition();
            }
            
            this.recognition = null;
            this.onResultCallback = null;
            this.onErrorCallback = null;
            this.onStartCallback = null;
            this.onEndCallback = null;
            
            console.log('🧹 Speech-to-Text API cleanup completed');
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Create singleton instance
const speechToTextAPI = new SpeechToTextAPI();

export default speechToTextAPI;
