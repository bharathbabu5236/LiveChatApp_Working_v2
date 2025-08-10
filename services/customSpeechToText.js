// LiveChatApp/services/customSpeechToText.js
// Custom Speech-to-Text API Service

class CustomSpeechToText {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        
        // TODO: Add your API configuration here
        this.API_CONFIG = {
            API_KEY: 'YOUR_API_KEY_HERE',
            ENDPOINT: 'YOUR_API_ENDPOINT_HERE',
            ENABLED: true,
            DEBUG: true,
        };
    }

    // Map language codes to your API's language format
    getApiLanguageCode(langCode) {
        const languageMap = {
            'en': 'en-US', // Adjust these to match your API's format
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
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
            'pa': 'pa-IN', // Punjabi
            'ur': 'ur-IN', // Urdu
            // Add more languages as supported by your API
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
                    sampleRate: 16000, // Adjust based on your API requirements
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            if (!window.MediaRecorder) {
                throw new Error('MediaRecorder not supported');
            }

            // Choose the best format for your API
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/wav';

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 16000 // Adjust based on your API requirements
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            if (this.API_CONFIG.DEBUG) {
                console.log('Custom STT: Audio recording initialized with', mimeType);
            }

            return true;
        } catch (error) {
            console.error('Custom STT: Failed to initialize recording:', error);
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
            this.currentLanguage = this.getApiLanguageCode(languageCode);
            
            this.mediaRecorder.start(1000); // Collect data every second

            if (this.API_CONFIG.DEBUG) {
                console.log('Custom STT: Started recording for language:', this.currentLanguage);
            }

            return true;
        } catch (error) {
            console.error('Custom STT: Failed to start recording:', error);
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
                        
                        if (this.API_CONFIG.DEBUG) {
                            console.log('Custom STT: Audio blob created, size:', audioBlob.size, 'bytes');
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

    // Convert audio blob to the format your API expects
    async prepareAudioForApi(audioBlob) {
        // TODO: Implement based on your API requirements
        // This could be base64, FormData, ArrayBuffer, etc.
        
        // Example for base64:
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        // Example for FormData:
        // const formData = new FormData();
        // formData.append('audio', audioBlob, 'recording.webm');
        // formData.append('language', languageCode);
        // return formData;

        // Example for ArrayBuffer:
        // return audioBlob.arrayBuffer();
    }

    // Send audio to your Speech-to-Text API
    async transcribeAudio(audioBlob, languageCode) {
        try {
            if (!this.API_CONFIG.ENABLED) {
                throw new Error('Custom Speech-to-Text is not enabled');
            }

            if (!this.API_CONFIG.API_KEY || this.API_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
                throw new Error('API key not configured');
            }

            // Prepare audio data for your API
            const audioData = await this.prepareAudioForApi(audioBlob);

            // TODO: Customize this request based on your API documentation
            const requestBody = {
                // Example structure - adjust based on your API:
                audio: audioData,
                language: languageCode,
                // Add other parameters your API requires:
                // format: 'webm',
                // sampleRate: 16000,
                // encoding: 'WEBM_OPUS',
                // etc.
            };

            if (this.API_CONFIG.DEBUG) {
                console.log('Custom STT: Sending request for language:', languageCode);
                console.log('Custom STT: Request body keys:', Object.keys(requestBody));
            }

            // TODO: Customize headers based on your API requirements
            const headers = {
                'Content-Type': 'application/json',
                // Add authentication headers:
                'Authorization': `Bearer ${this.API_CONFIG.API_KEY}`,
                // or
                // 'X-API-Key': this.API_CONFIG.API_KEY,
                // or whatever your API requires
            };

            const response = await fetch(this.API_CONFIG.ENDPOINT, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Custom STT API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();

            if (this.API_CONFIG.DEBUG) {
                console.log('Custom STT: Response received:', data);
            }

            // TODO: Extract transcript from your API response
            // Adjust this based on your API's response structure:
            const transcript = data.transcript || data.text || data.result || '';
            const confidence = data.confidence || data.score || 1.0;

            if (this.API_CONFIG.DEBUG) {
                console.log('Custom STT: Transcript:', transcript);
                console.log('Custom STT: Confidence:', confidence);
            }

            if (!transcript) {
                throw new Error('No speech detected in audio');
            }

            return {
                transcript,
                confidence,
                languageCode
            };

        } catch (error) {
            console.error('Custom STT: Transcription error:', error);
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

        if (this.API_CONFIG.DEBUG) {
            console.log('Custom STT: Cleanup completed');
        }
    }

    // Check if your API is available
    static isAvailable() {
        return (
            typeof navigator !== 'undefined' &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            typeof window !== 'undefined' &&
            window.MediaRecorder
            // Add any other checks specific to your API
        );
    }

    // Get supported languages for your API
    static getSupportedLanguages() {
        return [
            { code: 'en', name: 'English', apiCode: 'en-US' },
            { code: 'hi', name: 'Hindi', apiCode: 'hi-IN' },
            { code: 'te', name: 'Telugu', apiCode: 'te-IN' },
            { code: 'ta', name: 'Tamil', apiCode: 'ta-IN' },
            // Add all languages supported by your API
        ];
    }
}

export default CustomSpeechToText;
