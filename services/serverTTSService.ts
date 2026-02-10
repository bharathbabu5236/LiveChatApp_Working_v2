/**
 * Server-Side TTS Service Client
 * 
 * This service communicates with the Node.js TTS server to generate high-quality
 * speech audio that can be injected into voice calls.
 */

export interface TTSRequest {
    text: string;
    languageCode: string;
    voiceName?: string;
    audioEncoding?: 'MP3' | 'WAV';
}

export interface TTSResponse {
    success: boolean;
    audioBlob?: Blob;
    error?: string;
}

export interface VoiceInfo {
    name: string;
    gender: string;
    naturalSampleRateHertz: number;
}

export interface VoicesResponse {
    success: boolean;
    totalVoices?: number;
    voicesByLanguage?: Record<string, VoiceInfo[]>;
    error?: string;
}

class ServerTTSService {
    private baseUrl: string;

    constructor(serverUrl: string = 'http://localhost:3001') {
        this.baseUrl = serverUrl;
    }

    /**
     * Generate speech from text using server-side Google Cloud TTS
     */
    async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
        try {
            console.log(`🌐 Server TTS Request: "${request.text}" in ${request.languageCode}`);

            const response = await fetch(`${this.baseUrl}/api/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // Get the audio data as a blob
            const audioBlob = await response.blob();

            console.log(`✅ Server TTS Success: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

            return {
                success: true,
                audioBlob: audioBlob
            };

        } catch (error) {
            console.error('❌ Server TTS Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown TTS error'
            };
        }
    }

    /**
     * Get available voices from the server
     */
    async getAvailableVoices(): Promise<VoicesResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/voices`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                totalVoices: data.totalVoices,
                voicesByLanguage: data.voicesByLanguage
            };

        } catch (error) {
            console.error('❌ Error fetching voices:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch voices'
            };
        }
    }

    /**
     * Check if the TTS server is healthy
     */
    async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ TTS Server healthy:', data);
                return { healthy: true };
            } else {
                return { healthy: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('❌ TTS Server health check failed:', error);
            return { 
                healthy: false, 
                error: error instanceof Error ? error.message : 'Connection failed' 
            };
        }
    }

    /**
     * Convert language code from Google Translate format to Google Cloud TTS format
     * 
     * Google Translate uses 2-letter codes (e.g., 'hi', 'te', 'en')
     * Google Cloud TTS uses locale codes (e.g., 'hi-IN', 'te-IN', 'en-US')
     */
    static formatLanguageCodeForTTS(translateLangCode: string): string {
        const languageMapping: Record<string, string> = {
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
            'ar': 'ar-XA',
            'hi': 'hi-IN',
            'te': 'te-IN',
            'ta': 'ta-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'mr': 'mr-IN',
            'pa': 'pa-IN',
            'ur': 'ur-IN',
            'fil': 'fil-PH',
            'th': 'th-TH',
            'vi': 'vi-VN',
            'id': 'id-ID',
            'ms': 'ms-MY',
            'tr': 'tr-TR',
            'pl': 'pl-PL',
            'nl': 'nl-NL',
            'sv': 'sv-SE',
            'da': 'da-DK',
            'no': 'nb-NO',
            'fi': 'fi-FI'
        };

        return languageMapping[translateLangCode] || `${translateLangCode}-US`;
    }

    /**
     * Helper method to find the best voice for a language
     */
    static findBestVoice(voices: VoiceInfo[], preference: 'male' | 'female' | 'neutral' = 'neutral'): VoiceInfo | null {
        if (!voices || voices.length === 0) return null;

        // Priority: NEUTRAL > FEMALE > MALE (generally more pleasant for TTS)
        const genderPriority = preference === 'male' ? ['MALE', 'NEUTRAL', 'FEMALE'] :
                              preference === 'female' ? ['FEMALE', 'NEUTRAL', 'MALE'] :
                              ['NEUTRAL', 'FEMALE', 'MALE'];

        for (const gender of genderPriority) {
            const voice = voices.find(v => v.gender === gender);
            if (voice) return voice;
        }

        return voices[0]; // Fallback to first available
    }
}

export const serverTTSService = new ServerTTSService();
export default serverTTSService;
