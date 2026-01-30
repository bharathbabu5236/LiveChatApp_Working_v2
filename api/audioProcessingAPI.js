// Audio Processing API Service
// Handles audio input/output during voice calls for translation

class AudioProcessingAPI {
    constructor() {
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isRecording = false;
        this.audioChunks = [];
        this.onAudioDataCallback = null;
        this.onAudioLevelCallback = null;
        this.onRecordingStateCallback = null;
        
        console.log('🎧 Audio Processing API initialized');
    }

    // Initialize audio processing
    async initialize(constraints = {}) {
        try {
            const defaultConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1
                },
                video: false
            };

            const audioConstraints = { ...defaultConstraints, ...constraints };
            
            // Get media stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            
            // Set up audio context for analysis
            await this.setupAudioContext();
            
            console.log('✅ Audio processing initialized successfully');
            return { success: true, stream: this.mediaStream };
            
        } catch (error) {
            console.error('❌ Failed to initialize audio processing:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Set up Web Audio API context
    async setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Configure analyser
            this.analyser.fftSize = 256;
            this.microphone.connect(this.analyser);
            
            console.log('🔊 Audio analysis setup complete');
            
        } catch (error) {
            console.error('Error setting up audio context:', error);
            throw error;
        }
    }

    // Start recording audio
    async startRecording(options = {}) {
        try {
            if (!this.mediaStream) {
                throw new Error('Audio not initialized. Call initialize() first.');
            }

            if (this.isRecording) {
                console.log('⚠️ Already recording');
                return { success: false, error: 'Already recording' };
            }

            // Set up MediaRecorder
            const mimeType = this.getBestMimeType();
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType
            });

            // Reset audio chunks
            this.audioChunks = [];

            // Set up event listeners
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    
                    if (this.onAudioDataCallback) {
                        this.onAudioDataCallback(event.data);
                    }
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('📹 Recording stopped');
                this.isRecording = false;
                
                if (this.onRecordingStateCallback) {
                    this.onRecordingStateCallback(false);
                }
            };

            this.mediaRecorder.onstart = () => {
                console.log('🔴 Recording started');
                this.isRecording = true;
                
                if (this.onRecordingStateCallback) {
                    this.onRecordingStateCallback(true);
                }
            };

            // Start recording
            const timeslice = options.timeslice || 1000; // 1 second chunks
            this.mediaRecorder.start(timeslice);

            // Start audio level monitoring
            if (options.monitorAudioLevel !== false) {
                this.startAudioLevelMonitoring();
            }

            return { success: true, mimeType };
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop recording audio
    async stopRecording() {
        try {
            if (!this.isRecording) {
                return { success: true, message: 'Not recording' };
            }

            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }

            this.stopAudioLevelMonitoring();

            // Return recorded audio blob
            const audioBlob = new Blob(this.audioChunks, { 
                type: this.mediaRecorder.mimeType 
            });

            return { 
                success: true, 
                audioBlob,
                size: audioBlob.size,
                duration: this.getRecordingDuration()
            };
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return { success: false, error: error.message };
        }
    }

    // Get best available MIME type for recording
    getBestMimeType() {
        const possibleTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav'
        ];

        for (const type of possibleTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`📹 Using MIME type: ${type}`);
                return type;
            }
        }

        console.warn('⚠️ No optimal MIME type found, using default');
        return '';
    }

    // Monitor audio levels for visual feedback
    startAudioLevelMonitoring() {
        if (!this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateAudioLevel = () => {
            if (!this.isRecording) return;

            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const normalizedLevel = average / 255; // Normalize to 0-1
            
            if (this.onAudioLevelCallback) {
                this.onAudioLevelCallback(normalizedLevel);
            }

            requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
    }

    // Stop audio level monitoring
    stopAudioLevelMonitoring() {
        // Monitoring will stop automatically when isRecording becomes false
    }

    // Get recording duration estimate
    getRecordingDuration() {
        // This is an estimate based on chunks received
        return this.audioChunks.length; // Rough estimate in seconds
    }

    // Convert audio blob to base64
    async audioToBase64(audioBlob) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(audioBlob);
            });
        } catch (error) {
            console.error('Error converting audio to base64:', error);
            throw error;
        }
    }

    // Convert audio blob to array buffer
    async audioToArrayBuffer(audioBlob) {
        try {
            return await audioBlob.arrayBuffer();
        } catch (error) {
            console.error('Error converting audio to array buffer:', error);
            throw error;
        }
    }

    // Play audio blob
    async playAudio(audioBlob, options = {}) {
        try {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.volume = options.volume || 0.8;
            audio.playbackRate = options.playbackRate || 1.0;

            return new Promise((resolve, reject) => {
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve({ success: true, duration: audio.duration });
                };
                
                audio.onerror = (error) => {
                    URL.revokeObjectURL(audioUrl);
                    reject({ success: false, error: error.message });
                };
                
                audio.play();
            });
            
        } catch (error) {
            console.error('Error playing audio:', error);
            return { success: false, error: error.message };
        }
    }

    // Get available audio input devices
    async getAudioInputDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.substr(0, 8)}...`,
                    groupId: device.groupId
                }));
            
            console.log(`🎤 Found ${audioInputs.length} audio input devices`);
            return { success: true, devices: audioInputs };
            
        } catch (error) {
            console.error('Error getting audio input devices:', error);
            return { success: false, error: error.message };
        }
    }

    // Switch to a different microphone
    async switchMicrophone(deviceId) {
        try {
            // Stop current stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            // Initialize with new device
            const result = await this.initialize({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            if (result.success) {
                console.log(`🎤 Switched to microphone: ${deviceId}`);
            }

            return result;
            
        } catch (error) {
            console.error('Error switching microphone:', error);
            return { success: false, error: error.message };
        }
    }

    // Get error message for different error types
    getErrorMessage(error) {
        const errorMessages = {
            'NotFoundError': 'No microphone found. Please connect a microphone.',
            'NotAllowedError': 'Microphone permission denied. Please allow microphone access.',
            'NotReadableError': 'Microphone is already in use by another application.',
            'OverconstrainedError': 'Microphone does not support the requested settings.',
            'SecurityError': 'Microphone access blocked due to security settings.',
            'TypeError': 'Browser does not support audio recording.'
        };

        return errorMessages[error.name] || `Audio error: ${error.message}`;
    }

    // Get API status
    getStatus() {
        return {
            isInitialized: !!this.mediaStream,
            isRecording: this.isRecording,
            hasAudioContext: !!this.audioContext,
            hasAnalyser: !!this.analyser,
            streamActive: this.mediaStream ? this.mediaStream.active : false,
            recordedChunks: this.audioChunks.length
        };
    }

    // Set event callbacks
    onAudioData(callback) {
        this.onAudioDataCallback = callback;
    }

    onAudioLevel(callback) {
        this.onAudioLevelCallback = callback;
    }

    onRecordingState(callback) {
        this.onRecordingStateCallback = callback;
    }

    // Test the API
    async testAPI() {
        try {
            console.log('🧪 Testing Audio Processing API...');
            
            const initResult = await this.initialize();
            if (!initResult.success) {
                throw new Error(initResult.error);
            }

            const devices = await this.getAudioInputDevices();
            console.log('Audio devices:', devices);

            const status = this.getStatus();
            console.log('Status:', status);

            console.log('✅ Audio Processing API test passed');
            return { success: true, status, devices };
            
        } catch (error) {
            console.error('❌ Audio Processing API test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup
    async cleanup() {
        try {
            // Stop recording if active
            if (this.isRecording) {
                await this.stopRecording();
            }

            // Stop media stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            // Close audio context
            if (this.audioContext) {
                await this.audioContext.close();
                this.audioContext = null;
            }

            // Clear references
            this.analyser = null;
            this.microphone = null;
            this.mediaRecorder = null;
            this.audioChunks = [];
            
            // Clear callbacks
            this.onAudioDataCallback = null;
            this.onAudioLevelCallback = null;
            this.onRecordingStateCallback = null;

            console.log('🧹 Audio Processing API cleanup completed');
            return { success: true };
            
        } catch (error) {
            console.error('Error during audio cleanup:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const audioProcessingAPI = new AudioProcessingAPI();

export default audioProcessingAPI;
