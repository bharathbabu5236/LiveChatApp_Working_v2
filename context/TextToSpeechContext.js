// LiveChatApp/context/TextToSpeechContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from './TranslationContext';

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
        // Map common language codes to speech synthesis language codes
        const languageMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
            'ru': 'ru-RU',
            'zh': 'zh-CN',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'ar': 'ar-SA',
            'hi': 'hi-IN',
            'te': 'te-IN', // Telugu
            'ta': 'ta-IN', // Tamil
            'ml': 'ml-IN', // Malayalam
            'kn': 'kn-IN', // Kannada
            'gu': 'gu-IN', // Gujarati
            'mr': 'mr-IN', // Marathi
            'pa': 'pa-IN', // Punjabi
            'or': 'or-IN', // Odia
            'as': 'as-IN', // Assamese
            'tr': 'tr-TR',
            'nl': 'nl-NL',
            'sv': 'sv-SE',
            'da': 'da-DK',
            'no': 'nb-NO',
            'fi': 'fi-FI',
            'pl': 'pl-PL',
            'cs': 'cs-CZ',
            'hu': 'hu-HU',
            'ro': 'ro-RO',
            'bg': 'bg-BG',
            'hr': 'hr-HR',
            'sk': 'sk-SK',
            'sl': 'sl-SI',
            'et': 'et-EE',
            'lv': 'lv-LV',
            'lt': 'lt-LT',
            'el': 'el-GR',
            'he': 'he-IL',
            'th': 'th-TH',
            'vi': 'vi-VN',
            'id': 'id-ID',
            'ms': 'ms-MY',
            'bn': 'bn-BD',
            'ur': 'ur-PK',
            'fa': 'fa-IR',
            'sw': 'sw-KE',
        };
        return languageMap[language] || 'en-US';
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

    const speak = (text, options = {}) => {
        if (!isEnabled || !text?.trim()) return;

        // Stop any current speech
        stopSpeech();

        // Check if browser supports speech synthesis
        if (!window.speechSynthesis) {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(text.trim());
            
            // Set speech parameters
            utterance.rate = options.rate || speechRate;
            utterance.pitch = options.pitch || speechPitch;
            utterance.volume = options.volume || speechVolume;
            utterance.lang = options.language || getLanguageCode(currentLanguage);

            // Event handlers
            utterance.onstart = () => {
                setIsReading(true);
                setCurrentUtterance(utterance);
                console.log('TTS: Started speaking:', text.substring(0, 50) + '...');
            };

            utterance.onend = () => {
                setIsReading(false);
                setCurrentUtterance(null);
                console.log('TTS: Finished speaking');
            };

            utterance.onerror = (event) => {
                console.error('TTS Error:', event.error);
                setIsReading(false);
                setCurrentUtterance(null);
            };

            utterance.onpause = () => {
                console.log('TTS: Paused');
            };

            utterance.onresume = () => {
                console.log('TTS: Resumed');
            };

            // Try to get the best voice for the language
            const voices = window.speechSynthesis.getVoices();
            
            // Enhanced voice selection for better language support
            let preferredVoice = null;
            
            // First, try exact language match
            preferredVoice = voices.find(voice => 
                voice.lang.toLowerCase() === utterance.lang.toLowerCase()
            );
            
            // If no exact match, try language family match (e.g., 'te' for 'te-IN')
            if (!preferredVoice) {
                const languagePrefix = utterance.lang.split('-')[0];
                preferredVoice = voices.find(voice => 
                    voice.lang.toLowerCase().startsWith(languagePrefix.toLowerCase())
                );
            }
            
            // For Indian languages, try alternative voice selection
            if (!preferredVoice && (utterance.lang.includes('-IN') || currentLanguage === 'te')) {
                // Look for any Indian voice that might work
                preferredVoice = voices.find(voice => 
                    voice.lang.includes('-IN') || 
                    voice.name.toLowerCase().includes('indian') ||
                    voice.name.toLowerCase().includes('hindi') // Sometimes Hindi voice can handle other Indian languages
                );
            }
            
            // Fallback: try to find any voice that starts with the current language
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => 
                    voice.lang.toLowerCase().startsWith(currentLanguage.toLowerCase())
                );
            }
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
                console.log(`TTS: Using voice "${preferredVoice.name}" (${preferredVoice.lang}) for language "${currentLanguage}"`);
            } else {
                // Special handling for Telugu and other Indian languages
                if (currentLanguage === 'te' || utterance.lang.includes('-IN')) {
                    console.warn(`TTS: No Telugu/Indian voice available. Checking for alternative options...`);
                    
                    // Try Hindi voice as fallback for Telugu (many browsers support Hindi better)
                    const hindiVoice = voices.find(voice => 
                        voice.lang.includes('hi-IN') || voice.lang.includes('hi')
                    );
                    
                    if (hindiVoice) {
                        utterance.voice = hindiVoice;
                        utterance.rate = (options.rate || speechRate) * 0.8; // Slower for cross-language pronunciation
                        console.log(`TTS: Using Hindi voice as fallback for Telugu: "${hindiVoice.name}"`);
                    } else {
                        // Use default voice with slower rate
                        utterance.rate = (options.rate || speechRate) * 0.7;
                        console.log(`TTS: Using default voice for Telugu with slower rate`);
                    }
                } else {
                    console.warn(`TTS: No suitable voice found for language "${currentLanguage}" (${utterance.lang}). Available voices:`, 
                        voices.map(v => `${v.name} (${v.lang})`).slice(0, 5));
                }
            }

            // Start speaking
            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('Error in text-to-speech:', error);
            setIsReading(false);
            setCurrentUtterance(null);
        }
    };

    const stopSpeech = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsReading(false);
            setCurrentUtterance(null);
        }
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
        speak,
        stopSpeech,
        pauseSpeech,
        resumeSpeech,
        toggleEnabled,
        setIsEnabled,
        setSpeechRate,
        setSpeechPitch,
        setSpeechVolume,
        getAvailableVoices,
        getAvailableVoicesForLanguage,
        // Expose TTS properties with shorter names for easier access
        ttsEnabled: isEnabled,
        ttsRate: speechRate,
        ttsPitch: speechPitch,
        ttsVolume: speechVolume,
    };

    return (
        <TextToSpeechContext.Provider value={value}>
            {children}
        </TextToSpeechContext.Provider>
    );
};

export default TextToSpeechContext;
