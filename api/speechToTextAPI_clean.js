// Custom Speech-to-Text API Service
// Handles real-time speech recognition for live translation

class SpeechToTextAPI {
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
            throw new Error('Web Speech API not supported');
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = config.language;
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = config.interimResults;
        this.recognition.maxAlternatives = config.maxAlternatives;

        // Set up event handlers
        this.recognition.onstart = () => {
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
            console.error('❌ Error handling speech result:', error);
        }
    }

    // Handle speech recognition errors
    handleSpeechError(event) {
        const error = {
            error: event.error,
            message: event.message || `Speech recognition error: ${event.error}`,
            timestamp: new Date().toISOString()
        };

        if (event.error === 'not-allowed') {
            error.message = 'Microphone access not allowed. Please grant permission and try again.';
        } else if (event.error === 'no-speech') {
            error.message = 'No speech detected. Please speak clearly.';
        } else if (event.error === 'network') {
            error.message = 'Network error occurred during speech recognition.';
        }

        if (this.onErrorCallback) {
            this.onErrorCallback(error);
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

    // Update language
    updateLanguage(language) {
        if (this.recognition && this.recognition.lang !== language) {
            this.recognition.lang = language;
            
            // Restart recognition with new language if currently active
            if (this.isRecording) {
                this.recognition.stop(); // This will trigger restart with new language
            }
        }
    }

    // Check if currently recording
    isActive() {
        return this.isRecording;
    }

    // Get current language
    getCurrentLanguage() {
        return this.recognition ? this.recognition.lang : null;
    }

    // Get supported languages (basic list)
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
            'zh-CN': 'Chinese (Simplified)',
            'ar-SA': 'Arabic',
            'hi-IN': 'Hindi',
            'tr-TR': 'Turkish',
            'nl-NL': 'Dutch'
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

    // Get current status
    getStatus() {
        return {
            isRecording: this.isRecording,
            shouldContinue: this.shouldContinue,
            isStopping: this.isStopping,
            language: this.getCurrentLanguage(),
            isSupported: this.isBrowserSupported()
        };
    }

    // Cleanup resources
    async cleanup() {
        try {
            await this.stopRecognition();
            
            this.recognition = null;
            this.onResultCallback = null;
            this.onErrorCallback = null;
            this.onStartCallback = null;
            this.onEndCallback = null;
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }
}

// Create singleton instance
const speechToTextAPI = new SpeechToTextAPI();

export default speechToTextAPI;
