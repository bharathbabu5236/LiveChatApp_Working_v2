// LiveChatApp/context/TextToSpeechContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './TranslationContext';
import GOOGLE_TTS_CONFIG from '../config/ttsConfig';

const TextToSpeechContext = createContext();

export const useTextToSpeech = () => {
    const context = useContext(TextToSpeechContext);
    if (!context) {
        throw new Error('useTextToSpeech must be used within a TextToSpeechProvider');
    }
    return context;
};

export const TextToSpeechProvider = ({ children }) => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [isReading, setIsReading] = useState(false);
    const [speechRate, setSpeechRate] = useState(1.0);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [speechVolume, setSpeechVolume] = useState(1.0);
    const [currentUtterance, setCurrentUtterance] = useState(null);
    const [useGoogleTTS, setUseGoogleTTS] = useState(true); // Enable Google TTS for premium voices
    const [audioCache, setAudioCache] = useState(new Map()); // Cache audio files
    const { currentLanguage } = useTranslation();

    // Load TTS preferences
    useEffect(() => {
        loadTTSPreferences();
    }, []);

    // Stop current speech when language changes
    useEffect(() => {
        stopSpeech();
    }, [currentLanguage]);

    const loadTTSPreferences = async () => {
        try {
            const enabled = await AsyncStorage.getItem('ttsEnabled');
            const rate = await AsyncStorage.getItem('ttsRate');
            const pitch = await AsyncStorage.getItem('ttsPitch');
            const volume = await AsyncStorage.getItem('ttsVolume');

            if (enabled !== null) setIsEnabled(JSON.parse(enabled));
            if (rate !== null) setSpeechRate(parseFloat(rate));
            if (pitch !== null) setSpeechPitch(parseFloat(pitch));
            if (volume !== null) setSpeechVolume(parseFloat(volume));
        } catch (error) {
            console.error('Error loading TTS preferences:', error);
        }
    };

    const saveTTSPreferences = async () => {
        try {
            await AsyncStorage.setItem('ttsEnabled', JSON.stringify(isEnabled));
            await AsyncStorage.setItem('ttsRate', speechRate.toString());
            await AsyncStorage.setItem('ttsPitch', speechPitch.toString());
            await AsyncStorage.setItem('ttsVolume', speechVolume.toString());
        } catch (error) {
            console.error('Error saving TTS preferences:', error);
        }
    };

    // Save preferences when they change
    useEffect(() => {
        saveTTSPreferences();
    }, [isEnabled, speechRate, speechPitch, speechVolume]);

    const getLanguageCode = (language) => {
        // Google Cloud TTS language codes with voice names
        const languageMap = {
            'en': { code: 'en-US', voice: 'en-US-Neural2-D' },
            'es': { code: 'es-ES', voice: 'es-ES-Neural2-B' },
            'fr': { code: 'fr-FR', voice: 'fr-FR-Neural2-B' },
            'de': { code: 'de-DE', voice: 'de-DE-Neural2-B' },
            'it': { code: 'it-IT', voice: 'it-IT-Neural2-A' },
            'pt': { code: 'pt-PT', voice: 'pt-PT-Wavenet-A' },
            'ru': { code: 'ru-RU', voice: 'ru-RU-Wavenet-A' },
            'zh': { code: 'zh-CN', voice: 'zh-CN-Wavenet-A' },
            'ja': { code: 'ja-JP', voice: 'ja-JP-Neural2-B' },
            'ko': { code: 'ko-KR', voice: 'ko-KR-Neural2-A' },
            'ar': { code: 'ar-XA', voice: 'ar-XA-Wavenet-A' },
            'hi': { code: 'hi-IN', voice: 'hi-IN-Neural2-A' },
            'te': { code: 'te-IN', voice: 'te-IN-Standard-A' }, // Telugu
            'ta': { code: 'ta-IN', voice: 'ta-IN-Wavenet-A' }, // Tamil
            'ml': { code: 'ml-IN', voice: 'ml-IN-Wavenet-A' }, // Malayalam
            'kn': { code: 'kn-IN', voice: 'kn-IN-Wavenet-A' }, // Kannada
            'gu': { code: 'gu-IN', voice: 'gu-IN-Wavenet-A' }, // Gujarati
            'mr': { code: 'mr-IN', voice: 'mr-IN-Wavenet-A' }, // Marathi
            'pa': { code: 'pa-IN', voice: 'pa-IN-Wavenet-A' }, // Punjabi
            'bn': { code: 'bn-IN', voice: 'bn-IN-Wavenet-A' }, // Bengali
            'tr': { code: 'tr-TR', voice: 'tr-TR-Wavenet-A' },
            'nl': { code: 'nl-NL', voice: 'nl-NL-Wavenet-A' },
            'sv': { code: 'sv-SE', voice: 'sv-SE-Wavenet-A' },
            'da': { code: 'da-DK', voice: 'da-DK-Wavenet-A' },
            'no': { code: 'nb-NO', voice: 'nb-NO-Wavenet-A' },
            'fi': { code: 'fi-FI', voice: 'fi-FI-Wavenet-A' },
            'pl': { code: 'pl-PL', voice: 'pl-PL-Wavenet-A' },
            'cs': { code: 'cs-CZ', voice: 'cs-CZ-Wavenet-A' },
            'hu': { code: 'hu-HU', voice: 'hu-HU-Wavenet-A' },
            'ro': { code: 'ro-RO', voice: 'ro-RO-Wavenet-A' },
            'bg': { code: 'bg-BG', voice: 'bg-BG-Standard-A' },
            'hr': { code: 'hr-HR', voice: 'hr-HR-Wavenet-A' },
            'sk': { code: 'sk-SK', voice: 'sk-SK-Wavenet-A' },
            'sl': { code: 'sl-SI', voice: 'sl-SI-Wavenet-A' },
            'et': { code: 'et-EE', voice: 'et-EE-Standard-A' },
            'lv': { code: 'lv-LV', voice: 'lv-LV-Standard-A' },
            'lt': { code: 'lt-LT', voice: 'lt-LT-Standard-A' },
            'el': { code: 'el-GR', voice: 'el-GR-Wavenet-A' },
            'he': { code: 'he-IL', voice: 'he-IL-Wavenet-A' },
            'th': { code: 'th-TH', voice: 'th-TH-Neural2-C' },
            'vi': { code: 'vi-VN', voice: 'vi-VN-Neural2-A' },
            'id': { code: 'id-ID', voice: 'id-ID-Wavenet-A' },
            'ms': { code: 'ms-MY', voice: 'ms-MY-Wavenet-A' },
            'ur': { code: 'ur-IN', voice: 'ur-IN-Wavenet-A' },
            'fa': { code: 'fa-IR', voice: 'fa-IR-Standard-A' },
            'sw': { code: 'sw-KE', voice: 'sw-KE-Wavenet-A' },
        };
        return languageMap[language] || { code: 'en-US', voice: 'en-US-Neural2-D' };
    };

    // Helper function to split text into chunks under byte limit
    const splitTextIntoChunks = (text, maxBytes = 4800) => {
        const chunks = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const testChunk = currentChunk ? `${currentChunk}. ${sentence.trim()}` : sentence.trim();
            
            // Check if adding this sentence would exceed the byte limit
            if (new TextEncoder().encode(testChunk).length > maxBytes) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = sentence.trim();
                } else {
                    // Single sentence is too long, split by words
                    const words = sentence.trim().split(' ');
                    let wordChunk = '';
                    for (const word of words) {
                        const testWordChunk = wordChunk ? `${wordChunk} ${word}` : word;
                        if (new TextEncoder().encode(testWordChunk).length > maxBytes) {
                            if (wordChunk) chunks.push(wordChunk.trim());
                            wordChunk = word;
                        } else {
                            wordChunk = testWordChunk;
                        }
                    }
                    if (wordChunk) currentChunk = wordChunk;
                }
            } else {
                currentChunk = testChunk;
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks.filter(chunk => chunk.length > 0);
    };

    // Google Cloud Text-to-Speech API function
    const synthesizeWithGoogleTTS = async (text, languageInfo) => {
        if (!GOOGLE_TTS_CONFIG.ENABLED || !GOOGLE_TTS_CONFIG.API_KEY || GOOGLE_TTS_CONFIG.API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
            console.warn('Google TTS API not configured. Falling back to browser TTS.');
            return null;
        }

        console.log('🔊 Google TTS: Starting synthesis...', {
            text: text.substring(0, 50) + '...',
            language: languageInfo.code,
            voice: languageInfo.voice
        });

        // Check cache first
        const cacheKey = `${text}-${languageInfo.code}-${languageInfo.voice}`;
        if (audioCache.has(cacheKey)) {
            console.log('🔊 Google TTS: Using cached audio');
            return audioCache.get(cacheKey);
        }

        try {
            const requestBody = {
                input: { text: text },
                voice: {
                    languageCode: languageInfo.code,
                    name: languageInfo.voice,
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: speechRate,
                    pitch: (speechPitch - 1) * 20, // Convert to Google's range (-20 to 20)
                    volumeGainDb: (speechVolume - 1) * 16, // Convert to dB range
                }
            };

            const response = await fetch(`${GOOGLE_TTS_CONFIG.ENDPOINT}?key=${GOOGLE_TTS_CONFIG.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('🔊 Google TTS: API Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔊 Google TTS: API Error Details:', errorText);
                throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const audioContent = data.audioContent;

            console.log('🔊 Google TTS: Successfully received audio content');

            // Cache the result
            audioCache.set(cacheKey, audioContent);

            return audioContent;
        } catch (error) {
            console.error('🔊 Google TTS: API error details:', {
                message: error.message,
                stack: error.stack
            });
            return null;
        }
    };

    // Play multiple audio chunks sequentially
    const playAudioChunks = async (audioChunks) => {
        setIsReading(true);
        
        for (let i = 0; i < audioChunks.length; i++) {
            console.log(`🔊 Google TTS: Playing chunk ${i + 1} of ${audioChunks.length}`);
            
            try {
                await playAudioFromBase64(audioChunks[i]);
                
                // Small pause between chunks for natural flow
                if (i < audioChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (error) {
                console.error(`🔊 Google TTS: Error playing chunk ${i + 1}:`, error);
                // Continue with next chunk
            }
        }
        
        setIsReading(false);
        setCurrentUtterance(null);
    };

    // Play audio from base64 content
    const playAudioFromBase64 = (audioContent) => {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
                
                audio.onloadstart = () => {
                    setIsReading(true);
                    console.log('Google TTS: Started playing audio');
                };

                audio.onended = () => {
                    setIsReading(false);
                    setCurrentUtterance(null);
                    console.log('Google TTS: Finished playing audio');
                    resolve();
                };

                audio.onerror = (error) => {
                    setIsReading(false);
                    setCurrentUtterance(null);
                    console.error('Audio playback error:', error);
                    reject(error);
                };

                audio.volume = speechVolume;
                audio.play();
                setCurrentUtterance(audio);
            } catch (error) {
                reject(error);
            }
        });
    };

    // Helper function to check available voices for a language
    const getAvailableVoicesForLanguage = (language) => {
        if (!window.speechSynthesis) return [];
        
        const voices = window.speechSynthesis.getVoices();
        const languageCode = getLanguageCode(language);
        
        return voices.filter(voice => 
            voice.lang.toLowerCase().includes(language.toLowerCase()) ||
            voice.lang.toLowerCase().includes(languageCode.toLowerCase()) ||
            (language === 'te' && voice.lang.includes('-IN'))
        );
    };

    // Initialize audio permissions with user interaction
    const initializeAudioPermissions = () => {
        if (window.speechSynthesis) {
            // Create a short, silent utterance to initialize permissions
            const testUtterance = new SpeechSynthesisUtterance(' ');
            testUtterance.volume = 0.01;
            testUtterance.rate = 10;
            window.speechSynthesis.speak(testUtterance);
            console.log('TTS: Audio permissions initialized');
        }
    };

    const speak = async (text, options = {}) => {
        if (!isEnabled || !text?.trim()) return;

        // Stop any current speech
        stopSpeech();

        const languageInfo = getLanguageCode(currentLanguage);
        
        try {
            // Try Google TTS first
            if (useGoogleTTS) {
                console.log(`🔊 Attempting Google TTS for language: ${currentLanguage} (${languageInfo.code})`);
                
                // Check text length and split if necessary
                const textBytes = new TextEncoder().encode(text.trim()).length;
                console.log(`🔊 Google TTS: Text length: ${textBytes} bytes`);
                
                if (textBytes > 4800) {
                    console.log('🔊 Google TTS: Text too long, splitting into chunks...');
                    const chunks = splitTextIntoChunks(text.trim());
                    console.log(`🔊 Google TTS: Split into ${chunks.length} chunks`);
                    
                    const audioChunks = [];
                    
                    for (let i = 0; i < chunks.length; i++) {
                        console.log(`🔊 Google TTS: Processing chunk ${i + 1}: "${chunks[i].substring(0, 50)}..."`);
                        const audioContent = await synthesizeWithGoogleTTS(chunks[i], languageInfo);
                        
                        if (audioContent) {
                            audioChunks.push(audioContent);
                        } else {
                            console.warn(`🔊 Google TTS: Failed to synthesize chunk ${i + 1}, falling back to browser TTS`);
                            await speakWithBrowserTTS(text, options, languageInfo);
                            return;
                        }
                    }
                    
                    if (audioChunks.length > 0) {
                        console.log(`🔊 Google TTS: Playing ${audioChunks.length} audio chunks`);
                        await playAudioChunks(audioChunks);
                        return;
                    }
                } else {
                    // Text is short enough for single request
                    const audioContent = await synthesizeWithGoogleTTS(text.trim(), languageInfo);
                    
                    if (audioContent) {
                        console.log('🔊 Google TTS: Playing single audio content');
                        await playAudioFromBase64(audioContent);
                        return;
                    } else {
                        console.warn('🔊 Google TTS: No audio content received, falling back to browser TTS');
                    }
                }
            }

            // Fallback to browser TTS
            console.log(`🔊 Using browser TTS for language: ${currentLanguage}`);
            await speakWithBrowserTTS(text, options, languageInfo);

        } catch (error) {
            console.error('Error in text-to-speech:', error);
            setIsReading(false);
            setCurrentUtterance(null);
            
            // Try browser TTS as last resort
            try {
                await speakWithBrowserTTS(text, options, languageInfo);
            } catch (fallbackError) {
                console.error('Browser TTS fallback also failed:', fallbackError);
            }
        }
    };

    // Browser TTS implementation (fallback)
    const speakWithBrowserTTS = (text, options = {}, languageInfo) => {
        return new Promise((resolve, reject) => {
            // Check if browser supports speech synthesis
            if (!window.speechSynthesis) {
                reject(new Error('Speech synthesis not supported in this browser'));
                return;
            }

            try {
                // Cancel any existing speech first
                window.speechSynthesis.cancel();
                
                // Small delay to ensure cancellation
                setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(text.trim());
                    
                    // Set speech parameters
                    utterance.rate = options.rate || speechRate;
                    utterance.pitch = options.pitch || speechPitch;
                    utterance.volume = options.volume || speechVolume;
                    utterance.lang = options.language || languageInfo.code;

                    // Event handlers
                    utterance.onstart = () => {
                        setIsReading(true);
                        setCurrentUtterance(utterance);
                        console.log('Browser TTS: Started speaking:', text.substring(0, 50) + '...');
                    };

                    utterance.onend = () => {
                        setIsReading(false);
                        setCurrentUtterance(null);
                        console.log('Browser TTS: Finished speaking');
                        resolve();
                    };

                    utterance.onerror = (event) => {
                        console.error('Browser TTS Error:', event.error);
                        setIsReading(false);
                        setCurrentUtterance(null);
                        
                        // Handle permission errors gracefully
                        if (event.error === 'not-allowed') {
                            console.warn('Browser TTS: Audio permission denied. User needs to interact with page first.');
                            // Don't reject - just log the issue
                            resolve();
                        } else {
                            reject(new Error(`Browser TTS Error: ${event.error}`));
                        }
                    };

                    // Enhanced voice selection for browser TTS
                    const voices = window.speechSynthesis.getVoices();
                    let preferredVoice = null;
                    
                    // First, try exact language match
                    preferredVoice = voices.find(voice => 
                        voice.lang.toLowerCase() === utterance.lang.toLowerCase()
                    );
                    
                    // If no exact match, try language family match
                    if (!preferredVoice) {
                        const languagePrefix = utterance.lang.split('-')[0];
                        preferredVoice = voices.find(voice => 
                            voice.lang.toLowerCase().startsWith(languagePrefix.toLowerCase())
                        );
                    }
                    
                    // For Indian languages, try alternative voice selection
                    if (!preferredVoice && (utterance.lang.includes('-IN') || currentLanguage === 'te')) {
                        preferredVoice = voices.find(voice => 
                            voice.lang.includes('-IN') || 
                            voice.name.toLowerCase().includes('hindi')
                        );
                    }
                    
                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                        console.log(`Browser TTS: Using voice "${preferredVoice.name}" (${preferredVoice.lang})`);
                    } else {
                        console.warn(`Browser TTS: No suitable voice found for ${currentLanguage}`);
                    }

                    // Start speaking with error handling
                    try {
                        window.speechSynthesis.speak(utterance);
                    } catch (speakError) {
                        console.error('Error calling speechSynthesis.speak:', speakError);
                        setIsReading(false);
                        setCurrentUtterance(null);
                        reject(speakError);
                    }
                }, 100);

            } catch (error) {
                reject(error);
            }
        });
    };

    const stopSpeech = () => {
        // Stop browser TTS
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // Stop Google TTS audio
        if (currentUtterance && currentUtterance.pause) {
            currentUtterance.pause();
            currentUtterance.currentTime = 0;
        }
        
        setIsReading(false);
        setCurrentUtterance(null);
    };

    const pauseSpeech = () => {
        if (window.speechSynthesis && isReading) {
            window.speechSynthesis.pause();
        }
    };

    const resumeSpeech = () => {
        if (window.speechSynthesis && isReading) {
            window.speechSynthesis.resume();
        }
    };

    const toggleEnabled = () => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        if (!newEnabled) {
            stopSpeech();
        }
    };

    const getAvailableVoices = () => {
        if (!window.speechSynthesis) return [];
        return window.speechSynthesis.getVoices();
    };

    const value = {
        isEnabled,
        isReading,
        speechRate,
        speechPitch,
        speechVolume,
        currentLanguage,
        useGoogleTTS,
        speak,
        stopSpeech,
        pauseSpeech,
        resumeSpeech,
        toggleEnabled,
        setIsEnabled,
        setSpeechRate,
        setSpeechPitch,
        setSpeechVolume,
        setUseGoogleTTS,
        getAvailableVoices,
        getAvailableVoicesForLanguage,
        initializeAudioPermissions,
        // Expose TTS properties with shorter names for easier access
        ttsEnabled: isEnabled,
        ttsRate: speechRate,
        ttsPitch: speechPitch,
        ttsVolume: speechVolume,
        googleTTS: useGoogleTTS,
        // Debug functions
        clearAudioCache: () => setAudioCache(new Map()),
        getCacheSize: () => audioCache.size,
    };

    return (
        <TextToSpeechContext.Provider value={value}>
            {children}
        </TextToSpeechContext.Provider>
    );
};

export default TextToSpeechContext;
