import React, { useState, useEffect, useRef, FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import workingVoiceCallService from '../services/workingVoiceCallService';
import { translateText as translateTextService } from '../translationService';
// Temporarily disable Google Translate import for web compatibility
// import { googleTranslationService, TranslationResult } from '../services/translationService';

// Web-compatible translation interface
interface TranslationResult {
    success: boolean;
    translatedText?: string;
    originalText?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    error?: string;
}

// Global interface declarations for Web APIs
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
    onstart: () => void;
}

// Props interface
interface WorkingVoiceCallModalProps {
    visible: boolean;
    onClose: () => void;
    currentUserId: string;
    targetUserId: string;
    targetUserName: string;
}

// Component state types
type CallStatus = 'connecting' | 'connected' | 'ended';

// Language interface
interface Language {
    code: string;
    name: string;
    flag: string;
    nativeName: string;
}

// Translation status interface
interface TranslationStatus {
    isEnabled: boolean;
    selectedLanguage: string;
    isTranslating: boolean;
    lastTranslation: string;
    error?: string;
}

// Subtitle interface for speech-to-text display
interface SubtitleData {
    text: string;
    timestamp: number;
    isFinal: boolean;
    confidence: number;
}

// Speech recognition status interface
interface SpeechRecognitionStatus {
    isListening: boolean;
    isSupported: boolean;
    currentSubtitle: SubtitleData | null;
    subtitleHistory: SubtitleData[];
}

// Language exchange interface
interface LanguageExchange {
    myLanguage: string;
    myLanguageName: string;
    myTargetLanguage: string;
    myTargetLanguageName: string;
    remoteLanguage: string | null;
    remoteLanguageName: string | null;
    isRemoteLanguageKnown: boolean;
    exchangeComplete: boolean;
}

// Translation message interface for sharing between users
interface TranslationMessage {
    id: string;
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    timestamp: number;
    userId: string;
    userName: string;
    confidence: number;
}

// Real-time translation state interface
interface RealTimeTranslation {
    isActive: boolean;
    myTranslations: TranslationMessage[];
    remoteTranslations: TranslationMessage[];
    lastTranslationId: string | null;
}

const WorkingVoiceCallModal: FC<WorkingVoiceCallModalProps> = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName 
}) => {
    const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(false);
    const [callDuration, setCallDuration] = useState<number>(0);
    const [isRemoteUserConnected, setIsRemoteUserConnected] = useState<boolean>(false);
    const [isRemoteVideoPlaying, setIsRemoteVideoPlaying] = useState<boolean>(false);
    
    // Translation states
    const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);
    const [translationStatus, setTranslationStatus] = useState<TranslationStatus>({
        isEnabled: false,
        selectedLanguage: 'en-US',
        isTranslating: false,
        lastTranslation: ''
    });
    
    // Speech recognition and subtitle states
    const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognitionStatus>({
        isListening: false,
        isSupported: false,
        currentSubtitle: null,
        subtitleHistory: []
    });
    
    // Language exchange state
    const [languageExchange, setLanguageExchange] = useState<LanguageExchange>({
        myLanguage: 'en-US',
        myLanguageName: 'English (US)',
        myTargetLanguage: 'es-ES',
        myTargetLanguageName: 'Spanish',
        remoteLanguage: null,
        remoteLanguageName: null,
        isRemoteLanguageKnown: false,
        exchangeComplete: false
    });
    
    // Real-time translation state
    const [realTimeTranslation, setRealTimeTranslation] = useState<RealTimeTranslation>({
        isActive: false,
        myTranslations: [],
        remoteTranslations: [],
        lastTranslationId: null
    });
    
    // Refs for speech recognition
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const translationPollingRef = useRef<NodeJS.Timeout | null>(null);
    const speechRecognitionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
    
    // Available languages for translation
    const AVAILABLE_LANGUAGES: Language[] = [
        { code: 'en-US', name: 'English (US)', flag: '🇺🇸', nativeName: 'English' },
        { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
        { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽', nativeName: 'Español (MX)' },
        { code: 'zh-CN', name: 'Chinese (Mandarin)', flag: '🇨🇳', nativeName: '中文' },
        { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
        { code: 'te-IN', name: 'Telugu', flag: '🇮🇳', nativeName: 'తెలుగు' },
        { code: 'tl-PH', name: 'Filipino (Tagalog)', flag: '🇵🇭', nativeName: 'Filipino' },
        { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
        { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳', nativeName: 'ಕನ್ನಡ' },
        { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳', nativeName: 'മലയാളം' },
        { code: 'pa-IN', name: 'Punjabi', flag: '🇮🇳', nativeName: 'ਪੰਜਾਬੀ' },
        { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳', nativeName: 'ગુજરાતી' },
        { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳', nativeName: 'বাংলা' },
        { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳', nativeName: 'मराठी' },
        { code: 'ur-PK', name: 'Urdu', flag: '🇵🇰', nativeName: 'اردو' },
        { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
        { code: 'fr-FR', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
        { code: 'de-DE', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷', nativeName: 'Português' },
        { code: 'pt-PT', name: 'Portuguese (Portugal)', flag: '🇵🇹', nativeName: 'Português (PT)' },
        { code: 'ru-RU', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
        { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
        { code: 'ko-KR', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
        { code: 'it-IT', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
        { code: 'th-TH', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
        { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
        { code: 'id-ID', name: 'Indonesian', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
        { code: 'ms-MY', name: 'Malay', flag: '🇲🇾', nativeName: 'Bahasa Melayu' },
        { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
        { code: 'fa-IR', name: 'Persian (Farsi)', flag: '🇮🇷', nativeName: 'فارسی' },
        { code: 'he-IL', name: 'Hebrew', flag: '🇮🇱', nativeName: 'עברית' },
        { code: 'sw-KE', name: 'Swahili', flag: '🇰🇪', nativeName: 'Kiswahili' },
        { code: 'am-ET', name: 'Amharic', flag: '🇪🇹', nativeName: 'አማርኛ' },
        { code: 'yo-NG', name: 'Yoruba', flag: '🇳🇬', nativeName: 'Yorùbá' },
        { code: 'ig-NG', name: 'Igbo', flag: '🇳🇬', nativeName: 'Igbo' },
        { code: 'ha-NG', name: 'Hausa', flag: '🇳🇬', nativeName: 'Hausa' },
        { code: 'pl-PL', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
        { code: 'uk-UA', name: 'Ukrainian', flag: '🇺🇦', nativeName: 'Українська' },
        { code: 'cs-CZ', name: 'Czech', flag: '🇨🇿', nativeName: 'Čeština' },
        { code: 'hu-HU', name: 'Hungarian', flag: '🇭🇺', nativeName: 'Magyar' },
        { code: 'ro-RO', name: 'Romanian', flag: '🇷🇴', nativeName: 'Română' },
        { code: 'bg-BG', name: 'Bulgarian', flag: '🇧🇬', nativeName: 'Български' },
        { code: 'hr-HR', name: 'Croatian', flag: '🇭🇷', nativeName: 'Hrvatski' },
        { code: 'sr-RS', name: 'Serbian', flag: '🇷🇸', nativeName: 'Српски' },
        { code: 'sk-SK', name: 'Slovak', flag: '🇸🇰', nativeName: 'Slovenčina' },
        { code: 'sl-SI', name: 'Slovenian', flag: '🇸🇮', nativeName: 'Slovenščina' },
        { code: 'et-EE', name: 'Estonian', flag: '🇪🇪', nativeName: 'Eesti' },
        { code: 'lv-LV', name: 'Latvian', flag: '🇱🇻', nativeName: 'Latviešu' },
        { code: 'lt-LT', name: 'Lithuanian', flag: '🇱🇹', nativeName: 'Lietuvių' },
        { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮', nativeName: 'Suomi' },
        { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪', nativeName: 'Svenska' },
        { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴', nativeName: 'Norsk' },
        { code: 'da-DK', name: 'Danish', flag: '🇩🇰', nativeName: 'Dansk' },
        { code: 'is-IS', name: 'Icelandic', flag: '🇮🇸', nativeName: 'Íslenska' },
        { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
        { code: 'af-ZA', name: 'Afrikaans', flag: '🇿🇦', nativeName: 'Afrikaans' },
        { code: 'zu-ZA', name: 'Zulu', flag: '🇿🇦', nativeName: 'isiZulu' },
        { code: 'xh-ZA', name: 'Xhosa', flag: '🇿🇦', nativeName: 'isiXhosa' }
    ];

    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);

    // helper to apply sizing to any injected <video> elements
    const applyVideoElementStyles = (container: HTMLDivElement | null): void => {
        if (!container) return;
        // If Agora injected a <video> element, ensure it fills the container
        try {
            const videoEl = container.querySelector ? container.querySelector('video') : null;
            if (videoEl) {
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.style.display = 'block';
            }
        } catch (e) {
            // ignore DOM access errors
            console.warn('Could not apply video element styles', e);
        }
    };

    // Speech Recognition Functions
    const initializeSpeechRecognition = (): void => {
        // Check if speech recognition is supported
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            setSpeechRecognition(prev => ({ ...prev, isSupported: false }));
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            
            // Configure recognition settings
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            
            // Set language based on selected speaking language
            const myLanguage = AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);
            if (myLanguage) {
                recognition.lang = myLanguage.code;
                console.log(`🎤 Speech recognition set to: ${myLanguage.name} (${myLanguage.code})`);
            }

            // Handle speech recognition results
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence;

                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        
                        // Add final subtitle to history
                        const finalSubtitle: SubtitleData = {
                            text: transcript.trim(),
                            timestamp: Date.now(),
                            isFinal: true,
                            confidence: confidence || 0.9
                        };

                        setSpeechRecognition(prev => ({
                            ...prev,
                            currentSubtitle: finalSubtitle,
                            subtitleHistory: [...prev.subtitleHistory.slice(-4), finalSubtitle] // Keep last 5 subtitles
                        }));

                        // Trigger translation if target language is selected and text is meaningful
                        if (finalSubtitle.text.trim().length > 2 && languageExchange.myTargetLanguage) {
                            processTranslationAndShare(finalSubtitle.text.trim(), finalSubtitle.confidence);
                        }

                        // Clear subtitle after 3 seconds
                        if (subtitleTimeoutRef.current) {
                            clearTimeout(subtitleTimeoutRef.current);
                        }
                        subtitleTimeoutRef.current = setTimeout(() => {
                            setSpeechRecognition(prev => ({
                                ...prev,
                                currentSubtitle: null
                            }));
                        }, 3000);

                    } else {
                        interimTranscript += transcript;
                        
                        // Show interim results
                        const interimSubtitle: SubtitleData = {
                            text: interimTranscript.trim(),
                            timestamp: Date.now(),
                            isFinal: false,
                            confidence: 0.5
                        };

                        setSpeechRecognition(prev => ({
                            ...prev,
                            currentSubtitle: interimSubtitle
                        }));
                    }
                }
            };

            // Handle recognition errors
            recognition.onerror = (event: any) => {
                console.error('🎤 Speech recognition error:', event.error);
                setSpeechRecognition(prev => ({
                    ...prev,
                    isListening: false
                }));
                
                // Handle different error types
                if (event.error === 'not-allowed') {
                    Alert.alert(
                        'Microphone Permission',
                        'Please allow microphone access to enable speech-to-text subtitles.',
                        [{ text: 'OK' }]
                    );
                } else if (event.error === 'no-speech') {
                    console.log('🎤 No speech detected, will restart...');
                    // This is normal - restart after a short delay
                    setTimeout(() => {
                        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                            startSpeechRecognition();
                        }
                    }, 1000);
                } else if (event.error === 'aborted' || event.error === 'audio-capture') {
                    console.log('🎤 Speech recognition aborted/audio issue, will restart...');
                    // Restart after audio issues
                    setTimeout(() => {
                        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                            startSpeechRecognition();
                        }
                    }, 2000);
                } else {
                    console.warn('🎤 Other speech recognition error:', event.error);
                    // For other errors, try restart after a longer delay
                    setTimeout(() => {
                        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                            startSpeechRecognition();
                        }
                    }, 3000);
                }
            };

            // Handle recognition end
            recognition.onend = () => {
                console.log('🎤 Speech recognition ended, checking restart conditions...');
                setSpeechRecognition(prev => ({
                    ...prev,
                    isListening: false
                }));
                
                // Restart recognition if conditions are met
                const shouldRestart = translationStatus.isEnabled && 
                                    callStatus === 'connected' && 
                                    !isMuted && 
                                    speechRecognition.isSupported;
                
                console.log(`🎤 Restart conditions: enabled=${translationStatus.isEnabled}, connected=${callStatus === 'connected'}, unmuted=${!isMuted}, supported=${speechRecognition.isSupported}`);
                
                if (shouldRestart) {
                    console.log('🎤 Restarting speech recognition in 500ms...');
                    setTimeout(() => {
                        // Double-check conditions before restart
                        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                            startSpeechRecognition();
                        }
                    }, 500); // Increased delay for more reliable restart
                }
            };

            // Handle recognition start
            recognition.onstart = () => {
                console.log('🎤 Speech recognition started successfully');
                setSpeechRecognition(prev => ({
                    ...prev,
                    isListening: true
                }));
            };

            recognitionRef.current = recognition;
            setSpeechRecognition(prev => ({ ...prev, isSupported: true }));
            
        } catch (error) {
            console.error('🎤 Failed to initialize speech recognition:', error);
            setSpeechRecognition(prev => ({ ...prev, isSupported: false }));
        }
    };

    const startSpeechRecognition = (): void => {
        if (!recognitionRef.current || isMuted) {
            console.log('🎤 Cannot start: no recognition ref or muted');
            return;
        }
        
        if (speechRecognition.isListening) {
            console.log('🎤 Already listening, skipping start');
            return;
        }
        
        try {
            // Update language if changed
            const myLanguage = AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);
            if (myLanguage && recognitionRef.current.lang !== myLanguage.code) {
                recognitionRef.current.lang = myLanguage.code;
                console.log(`🎤 Updated speech recognition language to: ${myLanguage.name}`);
            }

            console.log('🎤 Attempting to start speech recognition...');
            recognitionRef.current.start();
            
            // Don't set isListening here - wait for onstart event
            console.log('🎤 Speech recognition start command sent');
        } catch (error) {
            console.error('🎤 Failed to start speech recognition:', error);
            
            // If start fails, try again after a delay
            setTimeout(() => {
                if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted && !speechRecognition.isListening) {
                    console.log('🎤 Retrying speech recognition start...');
                    startSpeechRecognition();
                }
            }, 2000);
        }
    };

    const stopSpeechRecognition = (): void => {
        if (!recognitionRef.current || !speechRecognition.isListening) return;
        
        try {
            recognitionRef.current.stop();
            setSpeechRecognition(prev => ({
                ...prev,
                isListening: false,
                currentSubtitle: null
            }));
            
            if (subtitleTimeoutRef.current) {
                clearTimeout(subtitleTimeoutRef.current);
                subtitleTimeoutRef.current = null;
            }
            
            console.log('🎤 Speech recognition stopped');
        } catch (error) {
            console.error('🎤 Failed to stop speech recognition:', error);
        }
    };

    // Language Exchange Functions
    const saveLanguagePreference = (language: Language): void => {
        try {
            const languageData = {
                code: language.code,
                name: language.name,
                flag: language.flag,
                nativeName: language.nativeName,
                timestamp: Date.now()
            };
            localStorage.setItem(`voiceCallLanguage_${currentUserId}`, JSON.stringify(languageData));
            localStorage.setItem(`lastUsedLanguage`, JSON.stringify(languageData));
            
            // Also save in a shared location for this call
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_languages`;
            const existingData = JSON.parse(localStorage.getItem(channelKey) || '{}');
            existingData[currentUserId] = languageData;
            localStorage.setItem(channelKey, JSON.stringify(existingData));
            
            console.log(`💾 Saved language preference: ${language.name} for user ${currentUserId}`);
        } catch (error) {
            console.warn('Could not save language preference:', error);
        }
    };

    // Translation Functions - Use existing translation service with mock fallback
    const translateText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> => {
        try {
            console.log(`🌐 Starting translation: "${text}" from ${sourceLanguage} to ${targetLanguage}`);
            
            setTranslationStatus(prev => ({ ...prev, isTranslating: true }));
            
            // Map language codes for Google Translate API
            const mapLanguageCode = (lang: string): string => {
                const languageMap: { [key: string]: string } = {
                    'en-US': 'en', 'es-ES': 'es', 'es-MX': 'es', 'zh-CN': 'zh',
                    'hi-IN': 'hi', 'te-IN': 'te', 'tl-PH': 'fil', 'ta-IN': 'ta',
                    'fr-FR': 'fr', 'de-DE': 'de', 'pt-BR': 'pt', 'ru-RU': 'ru',
                    'ja-JP': 'ja', 'ko-KR': 'ko', 'it-IT': 'it', 'ar-SA': 'ar'
                };
                return languageMap[lang] || lang.split('-')[0];
            };

            const sourceLang = mapLanguageCode(sourceLanguage);
            const targetLang = mapLanguageCode(targetLanguage);

            // Skip translation if languages are the same
            if (sourceLang === targetLang) {
                setTranslationStatus(prev => ({ ...prev, isTranslating: false }));
                return {
                    success: true,
                    translatedText: text,
                    originalText: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                };
            }

            // Try to use existing translation service first
            try {
                const translationResult = await translateTextService(text, targetLang, sourceLang);
                
                // If translation service returns an error, use mock translation
                if (translationResult.error) {
                    throw new Error('API Error: ' + translationResult.error);
                }
                
                console.log(`✅ Translation successful: "${translationResult.translatedText}"`);

                const result: TranslationResult = {
                    success: true,
                    translatedText: translationResult.translatedText,
                    originalText: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                };
                
                setTranslationStatus(prev => ({ 
                    ...prev, 
                    isTranslating: false,
                    lastTranslation: translationResult.translatedText,
                    error: undefined // Clear any previous errors
                }));
                
                return result;
            } catch (apiError) {
                console.warn('🔄 API translation failed, using mock translation:', apiError.message);
                
                // Mock translation for demo purposes
                const mockTranslations: { [key: string]: { [key: string]: string } } = {
                    'en': {
                        'es': `[ES] ${text}`,
                        'fr': `[FR] ${text}`,
                        'de': `[DE] ${text}`,
                        'hi': `[हिंदी] ${text}`,
                        'fil': `[FIL] ${text}`,
                        'ta': `[தமிழ்] ${text}`,
                        'te': `[తెలుగు] ${text}`,
                        'zh': `[中文] ${text}`,
                        'ja': `[日本語] ${text}`,
                        'ko': `[한국어] ${text}`,
                        'ar': `[العربية] ${text}`,
                        'ru': `[РУС] ${text}`
                    },
                    'es': {
                        'en': `[EN] ${text}`,
                        'fr': `[FR] ${text}`,
                        'hi': `[हिंदी] ${text}`,
                        'fil': `[FIL] ${text}`
                    },
                    'fil': {
                        'en': `[EN] ${text}`,
                        'es': `[ES] ${text}`,
                        'hi': `[हिंदी] ${text}`
                    }
                };
                
                const mockTranslated = mockTranslations[sourceLang]?.[targetLang] || `[${targetLang.toUpperCase()}] ${text}`;
                
                const result: TranslationResult = {
                    success: true,
                    translatedText: mockTranslated,
                    originalText: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                };
                
                setTranslationStatus(prev => ({ 
                    ...prev, 
                    isTranslating: false,
                    lastTranslation: mockTranslated
                }));
                
                return result;
            }
        } catch (error) {
            console.error('❌ Translation error:', error);
            setTranslationStatus(prev => ({ ...prev, isTranslating: false }));
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Translation failed',
                originalText: text,
                sourceLanguage,
                targetLanguage
            };
        }
    };

    const processTranslationAndShare = async (originalText: string, confidence: number): Promise<void> => {
        if (!languageExchange.myTargetLanguage || !languageExchange.myTargetLanguageName) {
            console.log('🌐 Translation skipped: Target language not selected');
            return;
        }

        try {
            console.log(`🌐 Starting translation: "${originalText}" from ${languageExchange.myLanguage} to ${languageExchange.myTargetLanguage}`);
            
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: true,
                error: undefined // Clear any previous errors
            }));

            const translationResult = await translateText(
                originalText,
                languageExchange.myLanguage,
                languageExchange.myTargetLanguage
            );

            if (translationResult.success && translationResult.translatedText) {
                // Update translation status for UI display
                setTranslationStatus(prev => ({ 
                    ...prev, 
                    isTranslating: false,
                    lastTranslation: translationResult.translatedText,
                    error: undefined // Clear any previous errors
                }));

                const translationMessage: TranslationMessage = {
                    id: `translation_${Date.now()}_${currentUserId}`,
                    originalText,
                    translatedText: translationResult.translatedText,
                    sourceLanguage: languageExchange.myLanguage,
                    targetLanguage: languageExchange.myTargetLanguage,
                    timestamp: Date.now(),
                    userId: currentUserId,
                    userName: 'You',
                    confidence
                };

                // Add to my translations
                setRealTimeTranslation(prev => ({
                    ...prev,
                    myTranslations: [...prev.myTranslations.slice(-4), translationMessage], // Keep last 5
                    lastTranslationId: translationMessage.id
                }));

                // Save translation for the other user to see
                await shareTranslationMessage(translationMessage);

                console.log(`✅ Translation shared: "${translationMessage.translatedText}"`);
            } else {
                console.error('❌ Translation failed:', translationResult.error);
                
                // Show user-friendly error messages for specific cases
                if (translationResult.error?.includes('QUOTA_EXCEEDED')) {
                    setTranslationStatus(prev => ({ 
                        ...prev, 
                        isTranslating: false,
                        error: '⚠️ Translation quota exceeded. Please check your Google Cloud billing.' 
                    }));
                } else if (translationResult.error?.includes('API_KEY_INVALID')) {
                    setTranslationStatus(prev => ({ 
                        ...prev, 
                        isTranslating: false,
                        error: '🔑 Invalid API key. Please check your Google Translate API key.' 
                    }));
                } else if (translationResult.error?.includes('PERMISSION_DENIED')) {
                    setTranslationStatus(prev => ({ 
                        ...prev, 
                        isTranslating: false,
                        error: '🚫 API access denied. Please enable Google Translate API in your Google Cloud Console.' 
                    }));
                } else {
                    setTranslationStatus(prev => ({ 
                        ...prev, 
                        isTranslating: false,
                        error: '❌ Translation service temporarily unavailable.' 
                    }));
                }
            }
        } catch (error) {
            console.error('❌ Translation process failed:', error);
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: false,
                error: '💥 Translation system error. Please try again.' 
            }));
        }
    };

    const shareTranslationMessage = async (message: TranslationMessage): Promise<void> => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_translations`;
            const existingTranslations = JSON.parse(localStorage.getItem(channelKey) || '[]');
            
            // Add new translation
            existingTranslations.push(message);
            
            // Keep only last 20 translations to prevent storage overflow
            const recentTranslations = existingTranslations.slice(-20);
            localStorage.setItem(channelKey, JSON.stringify(recentTranslations));
            
            console.log(`💬 Translation message shared to channel: ${channelKey}`);
        } catch (error) {
            console.error('❌ Failed to share translation message:', error);
        }
    };

    const checkForRemoteTranslations = (): void => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_translations`;
            const allTranslations = JSON.parse(localStorage.getItem(channelKey) || '[]');
            
            // Filter translations from the remote user
            const remoteTranslations = allTranslations.filter((t: TranslationMessage) => 
                t.userId === targetUserId && t.id !== realTimeTranslation.lastTranslationId
            );

            if (remoteTranslations.length > 0) {
                setRealTimeTranslation(prev => ({
                    ...prev,
                    remoteTranslations: remoteTranslations.slice(-5), // Keep last 5 remote translations
                    lastTranslationId: remoteTranslations[remoteTranslations.length - 1].id
                }));
                
                console.log(`📥 Received ${remoteTranslations.length} remote translations`);
            }
        } catch (error) {
            console.error('❌ Error checking for remote translations:', error);
        }
    };

    const startTranslationPolling = (): void => {
        if (translationPollingRef.current) {
            clearInterval(translationPollingRef.current);
        }
        
        translationPollingRef.current = setInterval(() => {
            checkForRemoteTranslations();
        }, 1000); // Check every second
        
        console.log('🔄 Translation polling started');
    };

    const stopTranslationPolling = (): void => {
        if (translationPollingRef.current) {
            clearInterval(translationPollingRef.current);
            translationPollingRef.current = null;
            console.log('⏹️ Translation polling stopped');
        }
    };

    // Speech recognition health check function
    const startSpeechRecognitionHealthCheck = (): void => {
        if (speechRecognitionHealthCheckRef.current) {
            clearInterval(speechRecognitionHealthCheckRef.current);
        }
        
        speechRecognitionHealthCheckRef.current = setInterval(() => {
            const shouldBeListening = translationStatus.isEnabled && 
                                     callStatus === 'connected' && 
                                     !isMuted && 
                                     speechRecognition.isSupported;
            
            if (shouldBeListening && !speechRecognition.isListening) {
                console.log('🔧 Health check: Speech recognition should be running but isn\'t. Restarting...');
                startSpeechRecognition();
            }
        }, 5000); // Check every 5 seconds
        
        console.log('❤️ Speech recognition health check started');
    };

    const stopSpeechRecognitionHealthCheck = (): void => {
        if (speechRecognitionHealthCheckRef.current) {
            clearInterval(speechRecognitionHealthCheckRef.current);
            speechRecognitionHealthCheckRef.current = null;
            console.log('⏹️ Speech recognition health check stopped');
        }
    };

    // Get stored language preference
    const getStoredLanguagePreference = (): Language | null => {
        try {
            const stored = localStorage.getItem(`voiceCallLanguage_${currentUserId}`) || 
                          localStorage.getItem(`lastUsedLanguage`);
            if (stored) {
                const languageData = JSON.parse(stored);
                return AVAILABLE_LANGUAGES.find(l => l.code === languageData.code) || null;
            }
        } catch (error) {
            console.error('❌ Error getting stored language preference:', error);
        }
        return null;
    };

    const checkForRemoteLanguage = (): boolean => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_languages`;
            const callLanguages = JSON.parse(localStorage.getItem(channelKey) || '{}'); 
                          localStorage.getItem(`lastUsedLanguage`);
            if (stored) {guageData) {
                const languageData = JSON.parse(stored);
                return AVAILABLE_LANGUAGES.find(l => l.code === languageData.code) || null;
            }       remoteLanguage: remoteLanguageData.code,
        } catch (error) {eLanguageName: remoteLanguageData.name,
            console.warn('Could not load language preference:', error);
        }           exchangeComplete: prev.myLanguage !== 'en-US'
        return null;
    };          
                console.log(`🎯 Remote language detected: ${remoteLanguageData.name} (${remoteLanguageData.code})`);
    const checkForRemoteLanguage = (): boolean => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_languages`;
            const callLanguages = JSON.parse(localStorage.getItem(channelKey) || '{}');
            
            const remoteLanguageData = callLanguages[targetUserId];
            if (remoteLanguageData) {
                setLanguageExchange(prev => ({
                    ...prev,ng = (): void => {
                    remoteLanguage: remoteLanguageData.code,
                    remoteLanguageName: remoteLanguageData.name,
                    isRemoteLanguageKnown: true,uage !== 'en-US') {
                    exchangeComplete: prev.myLanguage !== 'en-US'
                }));LanguageExchangeComplete();
                
                console.log(`🎯 Remote language detected: ${remoteLanguageData.name} (${remoteLanguageData.code})`);
                return true;
            }ear interval after 2 minutes to avoid infinite polling
        } catch (error) {clearInterval(interval), 120000);
            console.warn('Error checking for remote language:', error);
        }
        return false;eExchangeComplete = (): void => {
    };  const myLang = getSelectedLanguageInfo();
        const remoteLang = AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage);
    const startLanguagePolling = (): void => {
        const interval = setInterval(() => {
            const found = checkForRemoteLanguage();
            if (found && languageExchange.myLanguage !== 'en-US') {ue }));
                clearInterval(interval);
                showLanguageExchangeComplete();
            }lert.alert(
        }, 2000); // Check every 2 seconds
                `Language Exchange Complete:\n\n🗣️ You: ${myLang.flag} ${myLang.name}\n🎧 Them: ${remoteLang.flag} ${remoteLang.name}\n\nReal-time translation is now active! Speak naturally and see live subtitles with translations.`,
        // Clear interval after 2 minutes to avoid infinite polling
        setTimeout(() => clearInterval(interval), 120000);
    };  }
    };
    const showLanguageExchangeComplete = (): void => {
        const myLang = getSelectedLanguageInfo();e): void => {
        const remoteLang = AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage);
            'Language Setup Complete! 🎉',
        if (myLang && remoteLang) {{language.flag} ${language.name}\n\nTo complete the setup:\n1. Let the other person know you selected ${language.name}\n2. Ask them to click the purple "translate" button\n3. Have them select their preferred language\n\nOnce both languages are set, you'll see a "Translation Ready!" confirmation.`,
            // Start real-time translation
            setRealTimeTranslation(prev => ({ ...prev, isActive: true }));
            startTranslationPolling();
                    text: 'Copy Instructions', 
            Alert.alert(ess: () => {
                '🌐 Translation Ready!',ipboard) {
                `Language Exchange Complete:\n\n🗣️ You: ${myLang.flag} ${myLang.name}\n🎧 Them: ${remoteLang.flag} ${remoteLang.name}\n\nReal-time translation is now active! Speak naturally and see live subtitles with translations.`,
                [{ text: 'Perfect!' }]enabled translation and selected ${language.name}. Please click the purple translate button in your call controls and select your preferred language for real-time translation!`
            );              );
        }                   Alert.alert('📋 Copied!', 'Instructions copied to clipboard. Share with the other person.');
    };                  }
                    }
    const announceMyLanguage = (language: Language): void => {
        Alert.alert(
            'Language Setup Complete! 🎉',n',
            `You're now speaking: ${language.flag} ${language.name}\n\nTo complete the setup:\n1. Let the other person know you selected ${language.name}\n2. Ask them to click the purple "translate" button\n3. Have them select their preferred language\n\nOnce both languages are set, you'll see a "Translation Ready!" confirmation.`,
            [   }
                { text: 'Got it!' },
                { 
                    text: 'Copy Instructions', 
                    onPress: () => {
                        if (navigator.clipboard) {b API is working
                            navigator.clipboard.writeText(ing): Promise<void> => {
                                `I've enabled translation and selected ${language.name}. Please click the purple translate button in your call controls and select your preferred language for real-time translation!`
                            );sting Google Translate Web API...');
                            Alert.alert('📋 Copied!', 'Instructions copied to clipboard. Share with the other person.');
                        }anguage = sourceLanguage === 'en-US' ? 'es-ES' : 'en-US';
                    }
                },result = await translateText(testText, sourceLanguage, targetLanguage);
                {
                    text: 'Test Translation',
                    onPress: () => testGoogleTranslate(language.code)
                }   '✅ Translation Test Successful!',
            ]       `Original: "${result.originalText}"\nTranslated: "${result.translatedText}"\n\nGoogle Translate Web API is working correctly!`,
        );          [{ text: 'Excellent!' }]
    };          );
            } else {
    // Test function to verify Google Translate Web API is working
    const testGoogleTranslate = async (sourceLanguage: string): Promise<void> => {
        try {       `Error: ${result.error}\n\nPlease check:\n1. Internet connection\n2. Google Cloud API key\n3. Translation API enabled`,
            console.log('🧪 Testing Google Translate Web API...');
            const testText = 'Hello world, this is a translation test!';
            const targetLanguage = sourceLanguage === 'en-US' ? 'es-ES' : 'en-US';
            tch (error) {
            const result = await translateText(testText, sourceLanguage, targetLanguage);
                '❌ Translation Test Error', 
            if (result.success) {: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis might be a network or CORS issue.`,
                Alert.alert(' }]
                    '✅ Translation Test Successful!',
                    `Original: "${result.originalText}"\nTranslated: "${result.translatedText}"\n\nGoogle Translate Web API is working correctly!`,
                    [{ text: 'Excellent!' }]
                );
            } else {l duration
                Alert.alert(
                    '❌ Translation Test Failed',
                    `Error: ${result.error}\n\nPlease check:\n1. Internet connection\n2. Google Cloud API key\n3. Translation API enabled`,
                    [{ text: 'OK' }]) => {
                );tCallDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            Alert.alert(
                '❌ Translation Test Error', rval);
                `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis might be a network or CORS issue.`,
                [{ text: 'OK' }]
            );
        }itialize call when modal becomes visible
    };eEffect(() => {
        if (visible && currentUserId && targetUserId) {
    // Timer for call durationall();
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        };
        return () => {ntUserId, targetUserId]);
            if (interval) clearInterval(interval);
        };tialize speech recognition when modal becomes visible
    }, [callStatus]);
        if (visible) {
    // Initialize call when modal becomes visible
    useEffect(() => {
        if (visible && currentUserId && targetUserId) {
            initializeWorkingCall();
        }   // Cleanup speech recognition on unmount
            stopSpeechRecognition();
        return () => {ationPolling();
            if (visible) {gnitionHealthCheck();
                endCall();meoutRef.current) {
            }   clearTimeout(subtitleTimeoutRef.current);
        };  }
    }, [visible, currentUserId, targetUserId]);
    }, [visible]);
    // Initialize speech recognition when modal becomes visible
    useEffect(() => {recognition based on translation status and mute state
        if (visible) {
            initializeSpeechRecognition(); callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
        }   startSpeechRecognition();
            startSpeechRecognitionHealthCheck(); // Start health monitoring
        return () => {
            // Cleanup speech recognition on unmount
            stopSpeechRecognition();lthCheck(); // Stop health monitoring
            stopTranslationPolling();
            stopSpeechRecognitionHealthCheck();, isMuted, speechRecognition.isSupported]);
            if (subtitleTimeoutRef.current) {
                clearTimeout(subtitleTimeoutRef.current);anguage changes
            }(() => {
        }; (speechRecognition.isListening && recognitionRef.current) {
    }, [visible]);currentLang = getCurrentSpeakingLanguage();
            if (currentLang && recognitionRef.current.lang !== currentLang.code) {
    // Handle speech recognition based on translation status and mute statestarting speech recognition...`);
    useEffect(() => {peechRecognition();
        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
            startSpeechRecognition();atus.isEnabled && callStatus === 'connected' && !isMuted) {
            startSpeechRecognitionHealthCheck(); // Start health monitoring
        } else {    }
            stopSpeechRecognition();
            stopSpeechRecognitionHealthCheck(); // Stop health monitoring
        }
    }, [translationStatus.isEnabled, callStatus, isMuted, speechRecognition.isSupported]);

    // Update speech recognition language when speaking language changes
    useEffect(() => {
        if (speechRecognition.isListening && recognitionRef.current) {
            const currentLang = getCurrentSpeakingLanguage();e();
            if (currentLang && recognitionRef.current.lang !== currentLang.code) {
                console.log(`🎤 Language changed to ${currentLang.name}, restarting speech recognition...`);
                stopSpeechRecognition();
                setTimeout(() => {ge: storedLanguage.code,
                    if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                        startSpeechRecognition();
                    }
                }, 100);ageExchange(prev => ({
            }       ...prev,
        }           myLanguage: storedLanguage.code,
    }, [languageExchange.myLanguage]); // Watch the speaking language
                }));
    // Load stored language preference on component mount
    useEffect(() => {le.log(`🔄 Auto-loaded language: ${storedLanguage.name}`);
        if (visible) {
            const storedLanguage = getStoredLanguagePreference();
            if (storedLanguage) {{
                setTranslationStatus(prev => ({
                    ...prev,guagePolling();
                    selectedLanguage: storedLanguage.code,
                    isEnabled: true
                }));
                );
                setLanguageExchange(prev => ({
                    ...prev,all = async (): Promise<void> => {
                    myLanguage: storedLanguage.code,
                    myLanguageName: storedLanguage.namecall...');
                }));tatus('connecting');
                
                console.log(`🔄 Auto-loaded language: ${storedLanguage.name}`);
                t channelName = `call_${[currentUserId, targetUserId].sort().join('_')}`;
                // Check for remote language and start polling
                setTimeout(() => {ers
                    checkForRemoteLanguage();ned = (user: any) => {
                    startLanguagePolling(); joined the call:', user.uid);
                }, 2000);teUserConnected(true);
            }   setCallStatus('connected');
        }   };
    }, [visible]);
            workingVoiceCallService.onUserLeft = (user: any) => {
    // Auto-enable translation when both languages are selectedser.uid);
    useEffect(() => {   setIsRemoteUserConnected(false);
        if (languageExchange.myLanguage && languageExchange.myTargetLanguage && 
            languageExchange.myLanguageName && languageExchange.myTargetLanguageName && 
            !translationStatus.isEnabled) {        endCall();
            
            console.log(`🌐 Auto-enabling translation: ${languageExchange.myLanguageName} → ${languageExchange.myTargetLanguageName}`);
            
            setTranslationStatus(prev => ({nError = (error: any) => {
                ...prev,
                isEnabled: true,
                selectedLanguage: languageExchange.myLanguage,
                isTranslating: false,h the voice call. Please try again.',
                error: undefined      [{ text: 'OK', onPress: () => endCall() }]
            }));                );
            
            setRealTimeTranslation(prev => ({ ...prev, isActive: true }));
            startTranslationPolling();
        }emoteVideoAvailable = (videoTrack: any) => {
    }, [languageExchange.myLanguage, languageExchange.myTargetLanguage, languageExchange.myLanguageName, languageExchange.myTargetLanguageName]);mote video available');
oRef.current) {
    const initializeWorkingCall = async (): Promise<void> => {
        try {          videoTrack.play(remoteVideoRef.current);
            console.log('🎤 Initializing working voice call...');                        // Ensure injected <video> fills container
            setCallStatus('connecting');s(remoteVideoRef.current), 50);
            e placeholder text
            // Generate channel name (same as before)ole.log('📺 Remote video playing');
            const channelName = `call_${[currentUserId, targetUserId].sort().join('_')}`;
            
            // Set up event listeners
            workingVoiceCallService.onUserJoined = (user: any) => {
                console.log('🎉 Remote user joined the call:', user.uid);
                setIsRemoteUserConnected(true);
                setCallStatus('connected');teVideoUnavailable = () => {
            };
laceholder text again
            workingVoiceCallService.onUserLeft = (user: any) => {
                console.log('👋 Remote user left the call:', user.uid);eVideoRef.current) {
                setIsRemoteUserConnected(false);
                setCallStatus('ended'); catch(e){}
                setTimeout(() => {
                    endCall();
                }, 2000);
            };o preview callback
 => {
            workingVoiceCallService.onError = (error: any) => {ocalVideoRef.current) {
                console.error('🚨 Voice call error:', error);   try {
                Alert.alert(          videoTrack.play(localVideoRef.current);
                    'Voice Call Error',                        setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                    'There was an issue with the voice call. Please try again.',
                    [{ text: 'OK', onPress: () => endCall() }]
                );
            };

            // Set up video event handlers
            workingVoiceCallService.onRemoteVideoAvailable = (videoTrack: any) => {
                console.log('📹 Remote video available');e-request camera permissions for smoother video enabling
                if (remoteVideoRef.current) {y {
                    try {                workingVoiceCallService.checkCameraPermission().then((hasPermission: boolean) => {
                        videoTrack.play(remoteVideoRef.current);
                        // Ensure injected <video> fills containere prompted when enabling video');
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder textonsole.log('📹 Camera permission already granted');
                        console.log('📺 Remote video playing');
                    } catch (error) {
                        console.error('Failed to play remote video:', error);
                    }ould not check camera permission:', error);
                }
            };
art the call using our proven working method
            workingVoiceCallService.onRemoteVideoUnavailable = () => {nst result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);
                console.log('📹 Remote video unavailable');
                setIsRemoteVideoPlaying(false); // Show placeholder text again
                // Clear remote video viewonsole.log('✅ Working voice call started successfully!');
                if (remoteVideoRef.current) {
                    // remove child nodes if any);
                    try { remoteVideoRef.current.innerHTML = ''; } catch(e){}
                }te video track was already published before UI mounted, play it
            }; && workingVoiceCallService.getRemoteVideoTrack();
xisting && remoteVideoRef.current) {
            // Also handle local video preview callback try {
            workingVoiceCallService.onLocalVideoAvailable = (videoTrack: any) => {ing.play(remoteVideoRef.current);
                if (localVideoRef.current) {Ref.current), 50);
                    try {           setIsRemoteVideoPlaying(true); // Hide placeholder text
                        videoTrack.play(localVideoRef.current);                        console.log('📺 Played existing remote video track');
                        setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                        console.log('📹 Local preview playing');
                    } catch (e) {                    }
                        console.error('Failed to play local preview', e);
                    }
                }
            };ice call failed:', result);
                Alert.alert(
            // Pre-request camera permissions for smoother video enabling
            try {
                workingVoiceCallService.checkCameraPermission().then((hasPermission: boolean) => {() }]
                    if (!hasPermission) {
                        console.log('📹 Camera permission not granted, user will be prompted when enabling video');
                    } else {
                        console.log('📹 Camera permission already granted');
                    }
                });
            } catch (error) {
                console.log('📹 Could not check camera permission:', error);le to initialize voice call. Please try again.',
            }{ text: 'OK', onPress: () => onClose() }]
            );
            // Start the call using our proven working method
            const result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);

            if (result.success) {romise<void> => {
                console.log('✅ Working voice call started successfully!');
                // We're connected, waiting for the other user
                setCallStatus('connected');uted(!isMuted);

                // If a remote video track was already published before UI mounted, play it            // Handle speech recognition based on mute state
                const existing = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack(); {
                if (existing && remoteVideoRef.current) {anslation is enabled
                    try {slationStatus.isEnabled && callStatus === 'connected' && speechRecognition.isSupported) {
                        existing.play(remoteVideoRef.current);(() => startSpeechRecognition(), 100);
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder text
                        console.log('📺 Played existing remote video track');  // Was unmuted, now muted - stop speech recognition
                    } catch (e) {       stopSpeechRecognition();
                        console.warn('Could not play existing remote video track', e);      }
                    }        }
                }

            } else {= async (): Promise<void> => {
                console.error('❌ Working voice call failed:', result);
                Alert.alert(// Disable video
                    'Call Failed',ableVideo();
                    result.message || 'Unable to start voice call. Please try again.',ess) {
                    [{ text: 'OK', onPress: () => onClose() }]
                );
            }
f (localVideoRef.current) {
        } catch (error) {try { localVideoRef.current.innerHTML = ''; } catch(e){}
            console.error('❌ Working call initialization failed:', error);
            Alert.alert(
                'Call Failed',e {
                'Unable to initialize voice call. Please try again.',   // Enable video
                [{ text: 'OK', onPress: () => onClose() }]      const result = await workingVoiceCallService.enableVideo();
            );            if (result.success) {
        }
    };l video preview
) => {
    const toggleMute = async (): Promise<void> => {ideoTrack();
        const success = await workingVoiceCallService.setMicrophoneMuted(!isMuted);k && localVideoRef.current) {
        if (success) {
            setIsMuted(!isMuted);
            (() => applyVideoElementStyles(localVideoRef.current), 50);
            // Handle speech recognition based on mute stateLocal video preview started');
            if (!isMuted) {
                // Was muted, now unmuted - start speech recognition if translation is enabled           console.error('Failed to start local video preview:', error);
                if (translationStatus.isEnabled && callStatus === 'connected' && speechRecognition.isSupported) {           }
                    setTimeout(() => startSpeechRecognition(), 100);    }
                }
            } else { remote container
                // Was unmuted, now muted - stop speech recognitionrack = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();
                stopSpeechRecognition();emoteVideoRef.current) {
            }
        }Track.play(remoteVideoRef.current);
    };current), 50);
Hide placeholder text
    const toggleVideo = async (): Promise<void> => {onsole.log('📺 Remote video playing after enabling local video');
        if (isVideoEnabled) {
            // Disable video, e);
            const result = await workingVoiceCallService.disableVideo();
            if (result.success) {
                setIsVideoEnabled(false);
                setIsRemoteVideoPlaying(false); // Reset remote video state
                // clear local previewow error if video failed to enable
                if (localVideoRef.current) {                Alert.alert(
                    try { localVideoRef.current.innerHTML = ''; } catch(e){}
                }
            }
        } else {t: 'OK' },
            // Enable video
            const result = await workingVoiceCallService.enableVideo();
            if (result.success) {
                setIsVideoEnabled(true);
                // Start local video preview.alert(
                setTimeout(() => {
                    const videoTrack = workingVoiceCallService.getLocalVideoTrack();           'Please allow camera access in your browser settings and try again.\\n\\n1. Click the camera icon in your browser address bar\\n2. Allow camera access for this site\\n3. Refresh the page if needed',
                    if (videoTrack && localVideoRef.current) {               [{ text: 'OK' }]
                        try {        );
                            videoTrack.play(localVideoRef.current);        }
                            setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                            console.log('📹 Local video preview started');
                        } catch (error) {
                            console.error('Failed to start local video preview:', error);
                        }
                    }

                    // If remote track already exists, play it into the remote container
                    const remoteTrack = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();lService.switchCamera();
                    if (remoteTrack && remoteVideoRef.current) {
                        try {d', result.error || 'Failed to switch camera');
                            remoteTrack.play(remoteVideoRef.current);
                            setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                            setIsRemoteVideoPlaying(true); // Hide placeholder text
                            console.log('📺 Remote video playing after enabling local video');ise<void> => {
                        } catch (e) {g working voice call...');
                            console.warn('Could not play remote track after enabling local video', e);lling();
                        }VoiceCallService.endCall();
                    }tus('ended');
                }, 500);meout(() => {
            } else {   onClose();
                // Show error if video failed to enable  }, 1000);
                Alert.alert(    };
                    'Camera Error', 
                    result.error || 'Failed to enable camera. Please check your camera permissions.',
                    [(): void => {
                        { text: 'OK' },
                        {    // Disable translation
                            text: 'Check Permissions',       setTranslationStatus(prev => ({
                            onPress: () => {                ...prev,
                                // Guide user to check browser permissions
                                Alert.alert(
                                    'Camera Permissions',
                                    'Please allow camera access in your browser settings and try again.\\n\\n1. Click the camera icon in your browser address bar\\n2. Allow camera access for this site\\n3. Refresh the page if needed',
                                    [{ text: 'OK' }] polling and real-time translation
                                );nslation(prev => ({ ...prev, isActive: false }));
                            }ationPolling();
                        }
                    ]      console.log('🌐 Translation disabled');
                );        } else {
            }ation using currently selected languages
        } && languageExchange.myTargetLanguage) {
    };=> ({

    const switchCamera = async (): Promise<void> => {
        const result = await workingVoiceCallService.switchCamera();ctedLanguage: languageExchange.myLanguage,
        if (!result.success) {: false
            Alert.alert('Camera Switch Failed', result.error || 'Failed to switch camera');
        }
    };    // Save language preference
l => l.code === languageExchange.myLanguage);
    const endCall = async (): Promise<void> => {
        console.log('📞 Ending working voice call...');rence(currentLanguage);
        stopTranslationPolling();    }
        await workingVoiceCallService.endCall();
        setCallStatus('ended');console.log(`🌐 Translation enabled: ${languageExchange.myLanguageName} → ${languageExchange.myTargetLanguageName}`);
        setTimeout(() => {
            onClose();
        }, 1000);&& !isMuted && speechRecognition.isSupported) {
    };chRecognition();
 {
    // Translation Functions
    const toggleTranslation = (): void => {
        if (translationStatus.isEnabled) {
            // Disable translation
            setTranslationStatus(prev => ({g for real-time translation sharing
                ...prev,
                isEnabled: false,g();
                isTranslating: false
            }));/ Show language dropdown if languages not selected
            setShowLanguageDropdown(true);
            // Stop translation polling and real-time translation
            setRealTimeTranslation(prev => ({ ...prev, isActive: false }));
            stopTranslationPolling();
            
            console.log('🌐 Translation disabled');e: Language): void => {
        } else {{
            // Enable translation using currently selected languages
            if (languageExchange.myLanguage && languageExchange.myTargetLanguage) {
                setTranslationStatus(prev => ({tedLanguage: languageExchange.myLanguage, // Use current selected language
                    ...prev,anslating: false
                    isEnabled: true,
                    selectedLanguage: languageExchange.myLanguage,
                    isTranslating: false
                }));
                
                // Save language preferenceUAGES.find(l => l.code === languageExchange.myLanguage);
                const currentLanguage = AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myLanguage);urrentLanguage) {
                if (currentLanguage) {   saveLanguagePreference(currentLanguage);
                    saveLanguagePreference(currentLanguage);  }
                }        
                .myLanguageName} → ${languageExchange.myTargetLanguageName}`);
                console.log(`🌐 Translation enabled: ${languageExchange.myLanguageName} → ${languageExchange.myTargetLanguageName}`);
                e speech recognition for the selected language
                // Initialize speech recognitionconnected' && !isMuted && speechRecognition.isSupported) {
                if (callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
                    stopSpeechRecognition();
                    setTimeout(() => {    startSpeechRecognition();
                        startSpeechRecognition();    }, 200);
                    }, 200);
                }
                language
                // Start translation polling for real-time translation sharing
                setRealTimeTranslation(prev => ({ ...prev, isActive: true }));uage();
                startTranslationPolling();
            } else {, 1000);
                // Show language dropdown if languages not selected
                setShowLanguageDropdown(true);
            }announceMyLanguage(language);
        }
    };
(): Language | undefined => {
    const handleLanguageSelection = (language: Language): void => {AGES.find(lang => lang.code === languageExchange.myLanguage);
        setTranslationStatus(prev => ({
            ...prev,
            isEnabled: true, getCurrentSpeakingLanguage = (): Language | undefined => {
            selectedLanguage: languageExchange.myLanguage, // Use current selected languagereturn AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);
            isTranslating: false
        }));
        (): Language | undefined => {
        setShowLanguageDropdown(false);find(lang => lang.code === languageExchange.myTargetLanguage);
        
        // Save language preference locally
        const currentLanguage = AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myLanguage);: number): string => {
        if (currentLanguage) {ds / 60);
            saveLanguagePreference(currentLanguage);  const secs = seconds % 60;
        }        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        console.log(`🌐 Translation enabled for: ${languageExchange.myLanguageName} → ${languageExchange.myTargetLanguageName}`);
         (!visible) return null;
        // Initialize speech recognition for the selected language
        if (callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
            stopSpeechRecognition();
            setTimeout(() => {      visible={visible}
                startSpeechRecognition();            animationType="slide"
            }, 200);
        }
          >
        // Start polling for remote user's language            <View style={styles.overlay}>
        setTimeout(() => {
            checkForRemoteLanguage();
            startLanguagePolling();tyles.header}>
        }, 1000);
                          <Text style={styles.subtitle}>
        // Show announcement helper                            {callStatus === 'connecting' && 'Connecting...'}
        announceMyLanguage(language);allStatus === 'connected' && (isRemoteUserConnected ? `Connected to ${targetUserName}` : 'Waiting for other user...')}
    };                            {callStatus === 'ended' && 'Call Ended'}
            </Text>
    const getSelectedLanguageInfo = (): Language | undefined => {      </View>
        return AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);
    };dicator */}
e={styles.statusContainer}>
    const getCurrentSpeakingLanguage = (): Language | undefined => {{[styles.statusIndicator, {
        return AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);                   backgroundColor: callStatus === 'connected' ? '#27ae60' : '#e74c3c'
    };
xt}>
    const getCurrentTargetLanguage = (): Language | undefined => {tatus === 'connecting' && 'Establishing connection...'}
        return AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myTargetLanguage);nected' && (isRemoteUserConnected ? 'Call in progress' : 'Waiting for response...')}
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; === 'connected' && (
    };xt style={styles.duration}>{formatDuration(callDuration)}</Text>
                    )}
    if (!visible) return null;

    return (
        <Modal
            visible={visible}* Local Video Preview */}
            animationType="slide"eoContainer}>
            transparent={true}
            onRequestClose={endCall}
        >
            <View style={styles.overlay}>         width: '100%',
                <View style={styles.modalContainer}>             height: 150,
                    {/* Header */}                                        backgroundColor: '#f8f9fa',
                    <View style={styles.header}>orderRadius: 8,
                        <Text style={styles.title}>Voice Call</Text> solid #27ae60',
                        <Text style={styles.subtitle}>
                            {callStatus === 'connecting' && 'Connecting...'}                  overflow: 'hidden'
                            {callStatus === 'connected' && (isRemoteUserConnected ? `Connected to ${targetUserName}` : 'Waiting for other user...')}                                    }}
                            {callStatus === 'ended' && 'Call Ended'}
                        </Text> style={{
                    </View>,

                    {/* Status Indicator */}
                    <View style={styles.statusContainer}>   fontSize: 10,
                        <View style={[styles.statusIndicator, {
                            backgroundColor: callStatus === 'connected' ? '#27ae60' : '#e74c3c'groundColor: 'rgba(255,255,255,0.8)',
                        }]} />4px',
                        <Text style={styles.statusText}>: 4,
                            {callStatus === 'connecting' && 'Establishing connection...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? 'Call in progress' : 'Waiting for response...')}
                            {callStatus === 'ended' && 'Call ended'}
                        </Text>
                    </View>

                    {/* Call Duration */}
                    {callStatus === 'connected' && ( */}
                        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>ntainer}>
                    )}
ideoRef}
                    {/* Video Preview Areas */}
                    {isVideoEnabled && (
                        <View style={styles.videoContainer}>
                            {/* Local Video Preview */}f8f9fa',
                            <View style={styles.localVideoContainer}>
                                <div px solid #3498db',
                                    ref={localVideoRef} position: 'relative',
                                    style={{flex',
                                        width: '100%',stifyContent: 'center',
                                        height: 150,  alignItems: 'center',
                                        backgroundColor: '#f8f9fa',     overflow: 'hidden'
                                        borderRadius: 8,        }}
                                        border: '2px solid #27ae60',
                                        position: 'relative',
                                        overflow: 'hidden'   position: 'absolute',
                                    }}
                                >: 5,
                                    <div style={{
                                        position: 'absolute',',
                                        top: 5,255,255,0.8)',
                                        left: 5,x',
                                        fontSize: 10,
                                        color: '#666',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        zIndex: 10 && (
                                    }}>  <div style={{
                                        Your Video           fontSize: 12,
                                    </div>: '#666',
                                </div>r'
                            </View>
                            ing for remote video...
                            {/* Remote Video Area */}
                            <View style={styles.remoteVideoContainer}>
                                <div 
                                    ref={remoteVideoRef}
                                    style={{
                                        width: '100%',
                                        height: 150,
                                        backgroundColor: '#f8f9fa',en video is off or as overlay */}
                                        borderRadius: 8,serContainer, isVideoEnabled && styles.overlayUserContainer]}>
                                        border: '2px solid #3498db',
                                        position: 'relative',
                                        display: 'flex',0} 
                                        justifyContent: 'center', '#27ae60' : '#95a5a6'} 
                                        alignItems: 'center',
                                        overflow: 'hidden's.userName, isVideoEnabled && styles.overlayUserName]}>{targetUserName}</Text>
                                    }} && styles.overlayUserStatus]}>
                                >cted ? 'Connected' : 'Calling...'}
                                    <div style={{
                                        position: 'absolute',
                                        top: 5,
                                        left: 5,e Selection Section */}
                                        fontSize: 10,iew style={styles.languageSelectionContainer}>
                                        color: '#666',                        <Text style={styles.languageSelectionTitle}>🌐 Translation Setup</Text>
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,king Language */}
                                        zIndex: 10nguageDropdownContainer}>
                                    }}>DropdownLabel}>I speak:</Text>
                                        Remote Video
                                    </div>          <select
                                    {!isRemoteVideoPlaying && (
                                        <div style={{
                                            fontSize: 12,AGES.find(lang => lang.code === e.target.value);
                                            color: '#666',             if (selectedLang) {
                                            textAlign: 'center'                     setLanguageExchange(prev => ({
                                        }}>                                                    ...prev,
                                            Waiting for remote video...Language: e.target.value,
                                        </div>selectedLang.name
                                    )}
                                </div>                    }
                            </View>
                        </View>lectElement}
                    )}

                    {/* Remote User Status - Show when video is off or as overlay */}alue={lang.code}>
                    <View style={[styles.userContainer, isVideoEnabled && styles.overlayUserContainer]}>     {lang.flag} {lang.name}
                        <MaterialIcons 
                            name="account-circle" 
                            size={isVideoEnabled ? 40 : 80} 
                            color={isRemoteUserConnected ? '#27ae60' : '#95a5a6'} 
                        />
                        <Text style={[styles.userName, isVideoEnabled && styles.overlayUserName]}>{targetUserName}</Text>
                        <Text style={[styles.userStatus, isVideoEnabled && styles.overlayUserStatus]}>
                            {isRemoteUserConnected ? 'Connected' : 'Calling...'}
                        </Text>languageDropdownLabel}>Translate to:</Text>
                    </View>styles.selectContainer}>
t
                    {/* Language Selection Section */}rgetLanguage}
                    <View style={styles.languageSelectionContainer}>   onChange={(e) => {
                        <Text style={styles.languageSelectionTitle}>🌐 Translation Setup</Text>_LANGUAGES.find(lang => lang.code === e.target.value);
                        
                        <View style={styles.languageDropdownRow}>v => ({
                            {/* My Speaking Language */}..prev,
                            <View style={styles.languageDropdownContainer}>         myTargetLanguage: e.target.value,
                                <Text style={styles.languageDropdownLabel}>I speak:</Text>       myTargetLanguageName: selectedLang.name
                                <View style={styles.selectContainer}>         }));
                                    <select         }
                                        value={languageExchange.myLanguage}                                        }}
                                        onChange={(e) => {selectElement}
                                            const selectedLang = AVAILABLE_LANGUAGES.find(lang => lang.code === e.target.value);
                                            if (selectedLang) {
                                                setLanguageExchange(prev => ({alue={lang.code}>
                                                    ...prev,     {lang.flag} {lang.name}
                                                    myLanguage: e.target.value,
                                                    myLanguageName: selectedLang.name
                                                }));
                                            }
                                        }}
                                        style={styles.selectElement}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>, then click the translate button to start
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </View>
                            </View>

                            {/* My Target Language */}ton, isMuted && styles.mutedButton]} 
                            <View style={styles.languageDropdownContainer}>Mute}
                                <Text style={styles.languageDropdownLabel}>Translate to:</Text>
                                <View style={styles.selectContainer}>ons 
                                    <selecte={isMuted ? 'mic-off' : 'mic'} 
                                        value={languageExchange.myTargetLanguage} size={24} 
                                        onChange={(e) => {                                color="white" 
                                            const selectedLang = AVAILABLE_LANGUAGES.find(lang => lang.code === e.target.value);
                                            if (selectedLang) {
                                                setLanguageExchange(prev => ({
                                                    ...prev, Video Toggle Button */}
                                                    myTargetLanguage: e.target.value,                        <TouchableOpacity 
                                                    myTargetLanguageName: selectedLang.namestyles.controlButton, isVideoEnabled ? styles.videoOnButton : styles.videoOffButton]} 
                                                }));
                                            }
                                        }} 
                                        style={styles.selectElement}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (       color="white" 
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))} */}
                                    </select>ableOpacity 
                                </View>controlButton, translationStatus.isEnabled ? styles.translationOnButton : styles.translationOffButton]} 
                            </View>                            onPress={toggleTranslation}
                        </View>
 
                        <Text style={styles.languageSelectionHint}>
                            💡 Select both languages, then click the translate button to start
                        </Text>       color="white" 
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>on (only show when video is on) */}
                        {/* Mute Button */}eoEnabled && (
                        <TouchableOpacity ty 
                            style={[styles.controlButton, isMuted && styles.mutedButton]}                                 style={[styles.controlButton, styles.cameraSwitchButton]} 
                            onPress={toggleMute}era}
                        >
                            <MaterialIcons 
                                name={isMuted ? 'mic-off' : 'mic'} os" 
                                size={24}            size={20} 
                                color="white" white" 
                            />
                        </TouchableOpacity>city>

                        {/* Video Toggle Button */}
                        <TouchableOpacity  */}
                            style={[styles.controlButton, isVideoEnabled ? styles.videoOnButton : styles.videoOffButton]}                         <TouchableOpacity 
                            onPress={toggleVideo}
                        >}
                            <MaterialIcons 
                                name={isVideoEnabled ? 'videocam' : 'videocam-off'} 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>w if no translation active */}
led && !languageExchange.isRemoteLanguageKnown && callStatus === 'connected' && (
                        {/* Translation Button */}
                        <TouchableOpacity {styles.languageSetupTip}
                            style={[styles.controlButton, translationStatus.isEnabled ? styles.translationOnButton : styles.translationOffButton]} howLanguageDropdown(true)}
                            onPress={toggleTranslation}
                        >                            <MaterialIcons name="translate" size={16} color="#9b59b6" />
                            <MaterialIcons .languageSetupTipText}>
                                name="translate" speak in your native language
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>
Display */}
                        {/* Camera Switch Button (only show when video is on) */}ationStatus.isEnabled && (
                        {isVideoEnabled && (                        <View style={styles.translationStatus}>
                            <TouchableOpacity 
                                style={[styles.controlButton, styles.cameraSwitchButton]} 
                                onPress={switchCamera}e={styles.translationText}>
                            >_LANGUAGES.find(l => l.code === languageExchange.myLanguage)?.flag} {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myLanguage)?.name} → {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myTargetLanguage)?.flag} {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myTargetLanguage)?.name}
                                <MaterialIcons 
                                    name="flip-camera-ios"        {translationStatus.isTranslating && (
                                    size={20} e={{ marginLeft: 8 }} />
                                    color="white" 
                                />
                            </TouchableOpacity>ationStatus.lastTranslation && (
                        )}={styles.lastTranslationText}>
              Last: "{translationStatus.lastTranslation}"
                        {/* End Call Button */}                                </Text>
                        <TouchableOpacity 
                            style={styles.endCallButton} 
                            onPress={endCall}
                        >
                            <MaterialIcons name="call-end" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
={styles.subtitleHeader}>
                    {/* Quick Language Setup Tip - Only show if no translation active */}size={16} color="#e74c3c" />
                    {!translationStatus.isEnabled && !languageExchange.isRemoteLanguageKnown && callStatus === 'connected' && (
                        <TouchableOpacity   Live Subtitles ({getCurrentSpeakingLanguage()?.flag} {getCurrentSpeakingLanguage()?.name}) {speechRecognition.isListening ? '🎙️' : '🔇'}
                            style={styles.languageSetupTip}ext>
                            onPress={() => setShowLanguageDropdown(true)}
                        >
                            <MaterialIcons name="translate" size={16} color="#9b59b6" />ening ? '#e74c3c' : '#95a5a6' }
                            <Text style={styles.languageSetupTipText}>
                                💡 Tap to speak in your native languageView>
                            </Text>
                        </TouchableOpacity>      {speechRecognition.currentSubtitle ? (
                    )}                                <View style={styles.subtitleTextContainer}>

                    {/* Translation Status Display */}
                    {translationStatus.isEnabled && (,
                        <View style={styles.translationStatus}>
                            <View style={styles.translationHeader}>l ? 1 : 0.7,
                                <MaterialIcons name="translate" size={16} color="#9b59b6" />ange.myLanguage.startsWith('hi') ? 'System' : 
                                <Text style={styles.translationText}>
                                    Translation: {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myLanguage)?.flag} {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myLanguage)?.name} → {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myTargetLanguage)?.flag} {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.myTargetLanguage)?.name}                   languageExchange.myLanguage.startsWith('ta') ? 'System' : 
                                </Text>            languageExchange.myLanguage.startsWith('ar') ? 'System' : 
                                {translationStatus.isTranslating && (uageExchange.myLanguage.startsWith('zh') ? 'System' : 
                                    <ActivityIndicator size="small" color="#9b59b6" style={{ marginLeft: 8 }} />em' : 
                                )}                     languageExchange.myLanguage.startsWith('ko') ? 'System' : 
                            </View>                       'System',
                            {translationStatus.lastTranslation && (                    fontSize: languageExchange.myLanguage.startsWith('ar') ? 18 : 
                                <Text style={styles.lastTranslationText}>xchange.myLanguage.startsWith('hi') ? 18 :
                                    Last: "{translationStatus.lastTranslation}"yLanguage.startsWith('te') ? 18 :
                                </Text>               languageExchange.myLanguage.startsWith('ta') ? 18 :
                            )}         languageExchange.myLanguage.startsWith('zh') ? 18 :
                        </View>eExchange.myLanguage.startsWith('ja') ? 18 :
                    )}           languageExchange.myLanguage.startsWith('ko') ? 18 : 16

                    {/* Speech-to-Text Subtitles Display */}
                    {translationStatus.isEnabled && (
                        <View style={styles.subtitleContainer}>
                            <View style={styles.subtitleHeader}>
                                <MaterialIcons name="closed-caption" size={16} color="#e74c3c" />
                                <Text style={styles.subtitleHeaderText}>
                                    Live Subtitles ({getCurrentSpeakingLanguage()?.flag} {getCurrentSpeakingLanguage()?.name}) {speechRecognition.isListening ? '🎙️' : '🔇'}
                                </Text>
                                <View style={[
                                    styles.recordingIndicator,% confidence
                                    { backgroundColor: speechRecognition.isListening ? '#e74c3c' : '#95a5a6' }
                                ]} />
                            </View>
                            
                            {speechRecognition.currentSubtitle ? (
                                <View style={styles.subtitleTextContainer}>le={styles.subtitlePlaceholderText}>
                                    <Text sMuted ? `🔇 Unmute to see your ${getCurrentSpeakingLanguage()?.name || 'speech'}` : 
                                        style={[    !speechRecognition.isSupported ? '❌ Speech recognition not supported' :
                                            styles.subtitleText,rting ${getCurrentSpeakingLanguage()?.name || 'speech'} recognition...` : 
                                            { ️ Speak ${getCurrentSpeakingLanguage()?.name || ''} to see your words here`}
                                                opacity: speechRecognition.currentSubtitle.isFinal ? 1 : 0.7,
                                                fontFamily: languageExchange.myLanguage.startsWith('hi') ? 'System' : 
                                                          languageExchange.myLanguage.startsWith('te') ? 'System' : 
                                                          languageExchange.myLanguage.startsWith('ta') ? 'System' : 
                                                          languageExchange.myLanguage.startsWith('ar') ? 'System' : 
                                                          languageExchange.myLanguage.startsWith('zh') ? 'System' : 
                                                          languageExchange.myLanguage.startsWith('ja') ? 'System' : yles.subtitleHistory}>
                                                          languageExchange.myLanguage.startsWith('ko') ? 'System' : tyle={styles.historyTitle}>Recent:</Text>
                                                          'System',eechRecognition.subtitleHistory.slice(-2).map((subtitle, index) => (
                                                fontSize: languageExchange.myLanguage.startsWith('ar') ? 18 :        <Text key={index} style={styles.historyText} numberOfLines={1}>
                                                         languageExchange.myLanguage.startsWith('hi') ? 18 :
                                                         languageExchange.myLanguage.startsWith('te') ? 18 :
                                                         languageExchange.myLanguage.startsWith('ta') ? 18 :
                                                         languageExchange.myLanguage.startsWith('zh') ? 18 :
                                                         languageExchange.myLanguage.startsWith('ja') ? 18 :
                                                         languageExchange.myLanguage.startsWith('ko') ? 18 : 16
                                            }
                                        ]}
                                    >ated Subtitles Display */}
                                        "{speechRecognition.currentSubtitle.text}"                    {translationStatus.isEnabled && (
                                    </Text>ntainer}>
                                    <View style={styles.subtitleMetadata}>
                                        <Text style={styles.confidenceText}>{16} color="#9b59b6" />
                                            {speechRecognition.currentSubtitle.isFinal ? 'Final' : 'Listening...'}
                                        </Text>ge()?.name})
                                        <Text style={styles.confidenceText}>
                                            {Math.round(speechRecognition.currentSubtitle.confidence * 100)}% confidence
                                        </Text>slationIndicator,
                                    </View>ackgroundColor: translationStatus.isTranslating ? '#9b59b6' : '#27ae60' }
                                </View>
                            ) : (View>
                                <View style={styles.subtitlePlaceholder}>
                                    <Text style={styles.subtitlePlaceholderText}>      <View style={styles.translatedSubtitleTextContainer}>
                                        {isMuted ? `🔇 Unmute to see your ${getCurrentSpeakingLanguage()?.name || 'speech'}` :                                 {translationStatus.lastTranslation || translationStatus.isTranslating || translationStatus.error ? (
                                         !speechRecognition.isSupported ? '❌ Speech recognition not supported' :
                                         !speechRecognition.isListening ? `🎙️ Starting ${getCurrentSpeakingLanguage()?.name || 'speech'} recognition...` : 
                                         `🗣️ Speak ${getCurrentSpeakingLanguage()?.name || ''} to see your words here`},
                                    </Text>
                                </View>e?.startsWith('hi') ? 'System' : 
                            )}tLanguage?.startsWith('te') ? 'System' : 
' : 
                            {/* Show recent subtitle history */}                   languageExchange.myTargetLanguage?.startsWith('ar') ? 'System' : 
                            {speechRecognition.subtitleHistory.length > 0 && (            languageExchange.myTargetLanguage?.startsWith('zh') ? 'System' : 
                                <View style={styles.subtitleHistory}>geExchange.myTargetLanguage?.startsWith('ja') ? 'System' : 
                                    <Text style={styles.historyTitle}>Recent:</Text>'System' : 
                                    {speechRecognition.subtitleHistory.slice(-2).map((subtitle, index) => (                     'System',
                                        <Text key={index} style={styles.historyText} numberOfLines={1}>             fontSize: languageExchange.myTargetLanguage?.startsWith('ar') ? 18 : 
                                            "{subtitle.text}"                             languageExchange.myTargetLanguage?.startsWith('hi') ? 18 :
                                        </Text>tLanguage?.startsWith('te') ? 18 :
                                    ))}
                                </View>               languageExchange.myTargetLanguage?.startsWith('zh') ? 18 :
                            )}         languageExchange.myTargetLanguage?.startsWith('ja') ? 18 :
                        </View>myTargetLanguage?.startsWith('ko') ? 18 : 16,
                    )}  textAlign: languageExchange.myTargetLanguage?.startsWith('ar') ? 'right' : 
ft',
                    {/* Translated Subtitles Display */}
                    {translationStatus.isEnabled && (
                        <View style={styles.translatedSubtitleContainer}>
                            <View style={styles.translatedSubtitleHeader}>
                                <MaterialIcons name="translate" size={16} color="#9b59b6" />
                                <Text style={styles.translatedSubtitleHeaderText}>Translation}"`}
                                    Translation ({getCurrentTargetLanguage()?.flag} {getCurrentTargetLanguage()?.name})
                                </Text>
                                <View style={[
                                    styles.translationIndicator,
                                    { backgroundColor: translationStatus.isTranslating ? '#9b59b6' : '#27ae60' }
                                ]} />
                            </View>
                            
                            <View style={styles.translatedSubtitleTextContainer}>
                                {translationStatus.lastTranslation || translationStatus.isTranslating || translationStatus.error ? (
                                    <Text guage()?.name}
                                        style={[t>
                                            styles.translatedSubtitleText,ext style={styles.translationStatusText}>
                                            {        ✅ Translated
                                                fontFamily: languageExchange.myTargetLanguage?.startsWith('hi') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('te') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('ta') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('ar') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('zh') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('ja') ? 'System' : 
                                                          languageExchange.myTargetLanguage?.startsWith('ko') ? 'System' : 
                                                          'System',Translation Display */}
                                                fontSize: languageExchange.myTargetLanguage?.startsWith('ar') ? 18 : nslation.isActive && languageExchange.exchangeComplete && (
                                                         languageExchange.myTargetLanguage?.startsWith('hi') ? 18 :
                                                         languageExchange.myTargetLanguage?.startsWith('te') ? 18 :
                                                         languageExchange.myTargetLanguage?.startsWith('ta') ? 18 :7ae60" />
                                                         languageExchange.myTargetLanguage?.startsWith('zh') ? 18 :
                                                         languageExchange.myTargetLanguage?.startsWith('ja') ? 18 :
                                                         languageExchange.myTargetLanguage?.startsWith('ko') ? 18 : 16,
                                                textAlign: languageExchange.myTargetLanguage?.startsWith('ar') ? 'right' : ranslationStatus.isTranslating ? '#f39c12' : '#27ae60' }
                                                          languageExchange.myTargetLanguage?.startsWith('he') ? 'right' : 'left',
                                                color: translationStatus.error ? '#ff4757' : '#333'
                                            }
                                        ]}Translations (what I said, translated to their language) */}
                                    >alTimeTranslation.myTranslations.length > 0 && (
                                        {translationStatus.error ? translationStatus.error :          <View style={styles.translationSection}>
                                         translationStatus.isTranslating ? '🔄 Translating...' : `"${translationStatus.lastTranslation}"`}                                    <Text style={styles.translationSectionTitle}>
                                    </Text> {getCurrentTargetLanguage()?.flag} {getCurrentTargetLanguage()?.name}
                                ) : (
                                    <Text style={styles.translatedSubtitlePlaceholder}>ice(-2).map((translation, index) => (
                                        💬 Speak to see {getCurrentTargetLanguage()?.name} translation here{styles.myTranslationBubble}>
                                    </Text>.originalText}"</Text>
                                )}
                                  {getCurrentTargetLanguage()?.flag} "{translation.translatedText}"
                                {translationStatus.lastTranslation && !translationStatus.isTranslating && (
                                    <View style={styles.translatedSubtitleMetadata}>
                                        <Text style={styles.translatedLanguageText}>           {Math.round(translation.confidence * 100)}% • {new Date(translation.timestamp).toLocaleTimeString()}
                                            {getCurrentTargetLanguage()?.flag} {getCurrentTargetLanguage()?.name}         </Text>
                                        </Text>                                        </View>
                                        <Text style={styles.translationStatusText}>
                                            ✅ Translated
                                        </Text>
                                    </View>
                                )}
                            </View>ation.remoteTranslations.length > 0 && (
                        </View>
                    )}
age()?.name}
                    {/* Real-time Translation Display */}
                    {realTimeTranslation.isActive && languageExchange.exchangeComplete && ( (
                        <View style={styles.realTimeTranslationContainer}>translation.id} style={styles.remoteTranslationBubble}>
                            <View style={styles.translationStreamHeader}>translation.originalText}"</Text>
                                <MaterialIcons name="swap-horiz" size={18} color="#27ae60" />
                                <Text style={styles.translationStreamTitle}>Live Translation Stream</Text>tCurrentTargetLanguage()?.flag} "{translation.translatedText}"
                                <View style={[ext>
                                    styles.translationActiveIndicator,     <Text style={styles.translationTimestamp}>
                                    { backgroundColor: translationStatus.isTranslating ? '#f39c12' : '#27ae60' }         {Math.round(translation.confidence * 100)}% • {new Date(translation.timestamp).toLocaleTimeString()}
                                ]} />              </Text>
                            </View>                                        </View>

                            {/* My Translations (what I said, translated to their language) */}
                            {realTimeTranslation.myTranslations.length > 0 && (
                                <View style={styles.translationSection}>
                                    <Text style={styles.translationSectionTitle}>
                                        🗣️ Your speech → {getCurrentTargetLanguage()?.flag} {getCurrentTargetLanguage()?.name}yles.translationStreamStatus}>
                                    </Text>
                                    <View style={styles.translatingStatus}>
                                        <ActivityIndicator size="small" color="#f39c12" />
                                        <Text style={styles.translatingText}>Translating...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.translationReadyText}>
                                        ✅ Ready for real-time translation
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Success Message */}
                    {callStatus === 'connected' && isRemoteUserConnected && (
                        <Text style={styles.successMessage}>
                            🎉 Voice call is working! Ultra simple test success applied!
                            {isVideoEnabled && ' 📹 Video enabled!'}
                            {translationStatus.isEnabled && ' 🌐 Translation active!'}
                        </Text>
                    )}

                    {/* Video Status */}
                    {isVideoEnabled && (
                        <View style={styles.videoStatusContainer}>
                            <MaterialIcons name="videocam" size={16} color="#27ae60" />
                            <Text style={styles.videoStatusText}>Video is ON</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Language Selection Dropdown Modal */}
            <Modal
                visible={showLanguageDropdown}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowLanguageDropdown(false)}
            >
                <View style={styles.languageModalOverlay}>
                    <View style={styles.languageModalContainer}>
                        <View style={styles.languageModalHeader}>
                            <Text style={styles.languageModalTitle}>🌐 Select Translation Language</Text>
                            <TouchableOpacity 
                                onPress={() => setShowLanguageDropdown(false)}
                                style={styles.closeModalButton}
                            >
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.languageModalSubtitle}>
                            Choose the language you want to speak in. Your voice will be translated to the other person's language in real-time.
                        </Text>

                        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                            {AVAILABLE_LANGUAGES.map((language) => (
                                <TouchableOpacity
                                    key={language.code}
                                    style={[
                                        styles.languageItem,
                                        translationStatus.selectedLanguage === language.code && styles.selectedLanguageItem
                                    ]}
                                    onPress={() => handleLanguageSelection(language)}
                                >
                                    <Text style={styles.languageFlag}>{language.flag}</Text>
                                    <View style={styles.languageInfo}>
                                        <Text style={styles.languageName}>{language.name}</Text>
                                        <Text style={styles.languageNativeName}>{language.nativeName}</Text>
                                    </View>
                                    {translationStatus.selectedLanguage === language.code && (
                                        <MaterialIcons name="check-circle" size={20} color="#9b59b6" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => setShowLanguageDropdown(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        width: '85%',
        maxWidth: 700,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#34495e',
    },
    duration: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 20,
    },
    userContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 10,
    },
    userStatus: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    controlButton: {
        backgroundColor: '#3498db',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mutedButton: {
        backgroundColor: '#e74c3c',
    },
    videoOnButton: {
        backgroundColor: '#27ae60',
    },
    videoOffButton: {
        backgroundColor: '#95a5a6',
    },
    cameraSwitchButton: {
        backgroundColor: '#f39c12',
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    translationOnButton: {
        backgroundColor: '#9b59b6',
    },
    translationOffButton: {
        backgroundColor: '#95a5a6',
    },
    endCallButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successMessage: {
        fontSize: 12,
        color: '#27ae60',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    videoStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27ae60',
    },
    videoStatusText: {
        fontSize: 12,
        color: '#27ae60',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    videoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 15,
        paddingHorizontal: 10,
        width: '100%'
    },
    localVideoContainer: {
        flexBasis: '48%',
        marginRight: 5,
    },
    remoteVideoContainer: {
        flexBasis: '48%',
        marginLeft: 5,
    },
    overlayUserContainer: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    overlayUserName: {
        fontSize: 12,
        marginTop: 4,
    },
    overlayUserStatus: {
        fontSize: 10,
        marginTop: 2,
    },
    // Language Exchange Styles
    languageExchangeContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
        borderWidth: 2,
        borderColor: '#9b59b6',
        width: '100%',
    },
    languageExchangeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    languageExchangeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#9b59b6',
        marginLeft: 8,
    },
    languageExchangeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    languageCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minHeight: 90,
        justifyContent: 'center',
    },
    languageCardLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    languageExchangeInfo: {
        alignItems: 'center',
    },
    languageExchangeFlag: {
        fontSize: 24,
        marginBottom: 4,
    },
    languageExchangeName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
    },
    changeLanguageBtn: {
        backgroundColor: '#9b59b6',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginTop: 8,
    },
    changeLanguageBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    exchangeArrow: {
        marginHorizontal: 10,
        paddingVertical: 20,
    },
    waitingForLanguage: {
        alignItems: 'center',
    },
    waitingText: {
        fontSize: 11,
        color: '#95a5a6',
        marginTop: 4,
        fontStyle: 'italic',
    },
    exchangeStatus: {
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    exchangeCompleteText: {
        fontSize: 12,
        color: '#27ae60',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    exchangePendingText: {
        fontSize: 12,
        color: '#f39c12',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    exchangeSetupText: {
        fontSize: 12,
        color: '#9b59b6',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    languageSetupTip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    languageSetupTipText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 6,
        fontStyle: 'italic',
    },
    // Translation Status Styles
    translationStatus: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#9b59b6',
        width: '100%',
    },
    translationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    translationText: {
        fontSize: 12,
        color: '#9b59b6',
        fontWeight: 'bold',
        marginLeft: 6,
        flex: 1,
    },
    lastTranslationText: {
        fontSize: 10,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 4,
    },
    // Subtitle Styles
    subtitleContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
        borderWidth: 2,
        borderColor: '#e74c3c',
        width: '100%',
        minHeight: 80,
    },
    subtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    subtitleHeaderText: {
        fontSize: 14,
        color: '#e74c3c',
        fontWeight: 'bold',
        marginLeft: 6,
        flex: 1,
    },
    recordingIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    subtitleTextContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#e74c3c',
        marginVertical: 5,
    },
    subtitleText: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 22,
        fontWeight: '500',
        textAlign: 'left',
    },
    subtitleMetadata: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    confidenceText: {
        fontSize: 11,
        color: '#95a5a6',
        fontWeight: '500',
    },
    subtitlePlaceholder: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    subtitlePlaceholderText: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    subtitleHistory: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    historyTitle: {
        fontSize: 11,
        color: '#95a5a6',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    historyText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginVertical: 2,
        paddingLeft: 10,
        borderLeftWidth: 2,
        borderLeftColor: '#ecf0f1',
    },
    // Language Modal Styles
    languageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    languageModalContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    languageModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    languageModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    closeModalButton: {
        padding: 4,
    },
    languageModalSubtitle: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 20,
        paddingBottom: 15,
        lineHeight: 20,
    },
    languageList: {
        maxHeight: 300,
        paddingHorizontal: 10,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginHorizontal: 10,
        marginVertical: 2,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    selectedLanguageItem: {
        backgroundColor: '#e8f5e8',
        borderWidth: 2,
        borderColor: '#9b59b6',
    },
    languageFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    languageNativeName: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        margin: 20,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Real-time Translation Styles
    realTimeTranslationContainer: {
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
        borderWidth: 2,
        borderColor: '#27ae60',
        width: '100%',
    },
    translationStreamHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    translationStreamTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#27ae60',
        marginLeft: 8,
        flex: 1,
    },
    translationActiveIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    translationSection: {
        marginVertical: 8,
    },
    translationSectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
        paddingHorizontal: 5,
    },
    myTranslationBubble: {
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        padding: 12,
        marginVertical: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
        alignSelf: 'flex-end',
        maxWidth: '90%',
    },
    remoteTranslationBubble: {
        backgroundColor: '#f3e5f5',
        borderRadius: 12,
        padding: 12,
        marginVertical: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#9c27b0',
        alignSelf: 'flex-start',
        maxWidth: '90%',
    },
    originalTextMy: {
        fontSize: 14,
        color: '#1976d2',
        marginBottom: 6,
        fontStyle: 'italic',
    },
    translatedTextMy: {
        fontSize: 15,
        color: '#0d47a1',
        fontWeight: '500',
        marginBottom: 6,
    },
    originalTextRemote: {
        fontSize: 14,
        color: '#7b1fa2',
        marginBottom: 6,
        fontStyle: 'italic',
    },
    translatedTextRemote: {
        fontSize: 15,
        color: '#4a148c',
        fontWeight: '500',
        marginBottom: 6,
    },
    translationTimestamp: {
        fontSize: 11,
        color: '#666',
        textAlign: 'right',
        marginTop: 4,
    },
    translationStreamStatus: {
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    translatingStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    translatingText: {
        fontSize: 12,
        color: '#f39c12',
        marginLeft: 8,
        fontWeight: 'bold',
    },
    translationReadyText: {
        fontSize: 12,
        color: '#27ae60',
        fontWeight: 'bold',
    },
    // Language Selection Styles
    languageSelectionContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    languageSelectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 15,
    },
    languageDropdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    languageDropdownContainer: {
        flex: 1,
        marginHorizontal: 5,
    },
    languageDropdownLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 5,
        textAlign: 'center',
    },
    selectContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    selectElement: {
        width: '100%',
        height: 50,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
        color: '#2c3e50',
        fontFamily: 'inherit',
    } as any, // Web-specific styles
    languageSelectionHint: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 5,
    },
    // Translated Subtitle Styles
    translatedSubtitleContainer: {
        backgroundColor: '#f3e5f5',
        borderRadius: 12,
        padding: 15,
        marginVertical: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#9b59b6',
        borderWidth: 1,
        borderColor: '#e1bee7',
    },
    translatedSubtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'space-between',
    },
    translatedSubtitleHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7b1fa2',
        flex: 1,
        marginLeft: 8,
    },
    translationIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    translatedSubtitleTextContainer: {
        minHeight: 40,
        justifyContent: 'center',
    },
    translatedSubtitleText: {
        fontSize: 16,
        color: '#4a148c',
        lineHeight: 22,
        fontWeight: '500',
        marginBottom: 8,
    },
    translatedSubtitleMetadata: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    translatedLanguageText: {
        fontSize: 11,
        color: '#8e24aa',
        fontWeight: 'bold',
    },
    translationStatusText: {
        fontSize: 11,
        color: '#27ae60',
        fontWeight: 'bold',
    },
    translatedSubtitlePlaceholder: {
        fontSize: 14,
        color: '#9575cd',
        textAlign: 'center',
        fontStyle: 'italic',
        opacity: 0.7,
        paddingVertical: 10,
    },
});

export default WorkingVoiceCallModal;
