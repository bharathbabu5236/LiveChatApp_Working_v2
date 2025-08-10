// LiveChatApp/services/googleSpeechToText.js
// Google Cloud Speech-to-Text API Service

import { GOOGLE_STT_CONFIG } from '../config/ttsConfig';

class GoogleSpeechToText {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    // Map language codes to Google Speech recognition language codes
    getGoogleLanguageCode(langCode) {
        const languageMap = {
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
            'te': 'te-IN', // Telugu
            'ta': 'ta-IN', // Tamil
            'bn': 'bn-IN', // Bengali
            'mr': 'mr-IN', // Marathi
            'gu': 'gu-IN', // Gujarati
            'kn': 'kn-IN', // Kannada
            'ml': 'ml-IN', // Malayalam
            'or': 'or-IN', // Odia
            'pa': 'pa-Guru-IN', // Punjabi
            'ur': 'ur-IN', // Urdu
            'ne': 'ne-NP', // Nepali
            'si': 'si-LK', // Sinhala
            'my': 'my-MM', // Myanmar
            'th': 'th-TH', // Thai
            'vi': 'vi-VN', // Vietnamese
            'id': 'id-ID', // Indonesian
            'ms': 'ms-MY', // Malay
            'tl': 'fil-PH', // Filipino
            'sw': 'sw-KE', // Swahili
            'tr': 'tr-TR', // Turkish
            'fa': 'fa-IR', // Persian
            'he': 'he-IL', // Hebrew
            'nl': 'nl-NL', // Dutch
            'sv': 'sv-SE', // Swedish
            'da': 'da-DK', // Danish
            'no': 'nb-NO', // Norwegian
            'fi': 'fi-FI', // Finnish
            'pl': 'pl-PL', // Polish
            'cs': 'cs-CZ', // Czech
            'sk': 'sk-SK', // Slovak
            'hu': 'hu-HU', // Hungarian
            'ro': 'ro-RO', // Romanian
            'bg': 'bg-BG', // Bulgarian
            'hr': 'hr-HR', // Croatian
            'sr': 'sr-RS', // Serbian
            'sl': 'sl-SI', // Slovenian
            'et': 'et-EE', // Estonian
            'lv': 'lv-LV', // Latvian
            'lt': 'lt-LT', // Lithuanian
            'uk': 'uk-UA', // Ukrainian
            'ka': 'ka-GE', // Georgian
            'hy': 'hy-AM', // Armenian
            'az': 'az-AZ', // Azerbaijani
            'kk': 'kk-KZ', // Kazakh
            'ky': 'ky-KG', // Kyrgyz
            'uz': 'uz-UZ', // Uzbek
            'mn': 'mn-MN', // Mongolian
        };
        return languageMap[langCode] || 'en-US';
    }

    // Initialize audio recording
    async initializeRecording() {
        try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
                throw new Error('Media devices not supported');
            }

            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Check for MediaRecorder support
            if (!window.MediaRecorder) {
                throw new Error('MediaRecorder not supported');
            }

            // Use WebM format with Opus codec for better compression
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/wav';

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 16000
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            if (GOOGLE_STT_CONFIG.DEBUG) {
                console.log('Google STT: Audio recording initialized with', mimeType);
            }

            return true;
        } catch (error) {
            console.error('Google STT: Failed to initialize recording:', error);
            throw error;
        }
    }

    // Start recording audio
    async startRecording(languageCode = 'en') {
        try {
            if (this.isRecording) {
                throw new Error('Already recording');
            }

            if (!this.mediaRecorder) {
                await this.initializeRecording();
            }

            this.audioChunks = [];
            this.isRecording = true;
            this.currentLanguage = this.getGoogleLanguageCode(languageCode);
            
            this.mediaRecorder.start(1000); // Collect data every second

            if (GOOGLE_STT_CONFIG.DEBUG) {
                console.log('Google STT: Started recording for language:', this.currentLanguage);
            }

            return true;
        } catch (error) {
            console.error('Google STT: Failed to start recording:', error);
            this.isRecording = false;
            throw error;
        }
    }

    // Stop recording and transcribe
    async stopRecording() {
        return new Promise((resolve, reject) => {
            try {
                if (!this.isRecording || !this.mediaRecorder) {
                    reject(new Error('Not currently recording'));
                    return;
                }

                this.mediaRecorder.onstop = async () => {
                    try {
                        this.isRecording = false;
                        
                        if (this.audioChunks.length === 0) {
                            reject(new Error('No audio data recorded'));
                            return;
                        }

                        const audioBlob = new Blob(this.audioChunks, { 
                            type: this.mediaRecorder.mimeType 
                        });
                        
                        if (GOOGLE_STT_CONFIG.DEBUG) {
                            console.log('Google STT: Audio blob created, size:', audioBlob.size, 'bytes');
                        }

                        const transcript = await this.transcribeAudio(audioBlob, this.currentLanguage);
                        resolve(transcript);
                    } catch (error) {
                        reject(error);
                    }
                };

                this.mediaRecorder.stop();
            } catch (error) {
                this.isRecording = false;
                reject(error);
            }
        });
    }

    // Convert audio blob to base64
    async audioToBase64(audioBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
    }

    // Send audio to Google Speech-to-Text API
    async transcribeAudio(audioBlob, languageCode) {
        try {
            if (!GOOGLE_STT_CONFIG.ENABLED) {
                throw new Error('Google Speech-to-Text is not enabled');
            }

            if (!GOOGLE_STT_CONFIG.API_KEY || GOOGLE_STT_CONFIG.API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
                throw new Error('Google API key not configured');
            }

            // Convert audio to base64
            const base64Audio = await this.audioToBase64(audioBlob);

            const requestBody = {
                config: {
                    encoding: audioBlob.type.includes('webm') ? 'WEBM_OPUS' : 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: languageCode,
                    alternativeLanguageCodes: [
                        'en-US', // Always include English as fallback
                        languageCode !== 'hi-IN' ? 'hi-IN' : 'ta-IN' // Include another Indian language
                    ],
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: false,
                    model: 'latest_long', // Use latest model for better accuracy
                    useEnhanced: true, // Use enhanced model for better quality
                },
                audio: {
                    content: base64Audio
                }
            };

            if (GOOGLE_STT_CONFIG.DEBUG) {
                console.log('Google STT: Sending request for language:', languageCode);
                console.log('Google STT: Audio size:', base64Audio.length, 'characters');
            }

            const response = await fetch(`${GOOGLE_STT_CONFIG.ENDPOINT}?key=${GOOGLE_STT_CONFIG.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Google STT API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();

            if (GOOGLE_STT_CONFIG.DEBUG) {
                console.log('Google STT: Response received:', data);
            }

            // Extract transcript from response
            if (data.results && data.results.length > 0) {
                const transcript = data.results
                    .map(result => result.alternatives[0].transcript)
                    .join(' ')
                    .trim();

                const confidence = data.results[0].alternatives[0].confidence || 0;

                if (GOOGLE_STT_CONFIG.DEBUG) {
                    console.log('Google STT: Transcript:', transcript);
                    console.log('Google STT: Confidence:', confidence);
                }

                return {
                    transcript,
                    confidence,
                    languageCode
                };
            } else {
                throw new Error('No speech detected in audio');
            }

        } catch (error) {
            console.error('Google STT: Transcription error:', error);
            throw error;
        }
    }

    // Clean up resources
    cleanup() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.isRecording = false;
        this.audioChunks = [];
        this.mediaRecorder = null;

        if (GOOGLE_STT_CONFIG.DEBUG) {
            console.log('Google STT: Cleanup completed');
        }
    }

    // Check if Google STT is available
    static isAvailable() {
        return (
            GOOGLE_STT_CONFIG.ENABLED &&
            GOOGLE_STT_CONFIG.API_KEY &&
            GOOGLE_STT_CONFIG.API_KEY !== 'YOUR_ACTUAL_API_KEY_HERE' &&
            typeof navigator !== 'undefined' &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            typeof window !== 'undefined' &&
            window.MediaRecorder
        );
    }

    // Get supported languages
    static getSupportedLanguages() {
        return [
            { code: 'en', name: 'English', googleCode: 'en-US' },
            { code: 'hi', name: 'Hindi', googleCode: 'hi-IN' },
            { code: 'te', name: 'Telugu', googleCode: 'te-IN' },
            { code: 'ta', name: 'Tamil', googleCode: 'ta-IN' },
            { code: 'bn', name: 'Bengali', googleCode: 'bn-IN' },
            { code: 'mr', name: 'Marathi', googleCode: 'mr-IN' },
            { code: 'gu', name: 'Gujarati', googleCode: 'gu-IN' },
            { code: 'kn', name: 'Kannada', googleCode: 'kn-IN' },
            { code: 'ml', name: 'Malayalam', googleCode: 'ml-IN' },
            { code: 'pa', name: 'Punjabi', googleCode: 'pa-Guru-IN' },
            { code: 'or', name: 'Odia', googleCode: 'or-IN' },
            { code: 'ur', name: 'Urdu', googleCode: 'ur-IN' },
            { code: 'es', name: 'Spanish', googleCode: 'es-ES' },
            { code: 'fr', name: 'French', googleCode: 'fr-FR' },
            { code: 'de', name: 'German', googleCode: 'de-DE' },
            { code: 'it', name: 'Italian', googleCode: 'it-IT' },
            { code: 'pt', name: 'Portuguese', googleCode: 'pt-BR' },
            { code: 'ru', name: 'Russian', googleCode: 'ru-RU' },
            { code: 'ja', name: 'Japanese', googleCode: 'ja-JP' },
            { code: 'ko', name: 'Korean', googleCode: 'ko-KR' },
            { code: 'zh', name: 'Chinese', googleCode: 'zh-CN' },
            { code: 'ar', name: 'Arabic', googleCode: 'ar-SA' },
        ];
    }
}

export default GoogleSpeechToText;
