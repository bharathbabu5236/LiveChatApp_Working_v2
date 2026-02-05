import React, { useState, useEffect, useRef, FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import workingVoiceCallService from '../services/workingVoiceCallService';
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
            
            // Set language based on selected translation language
            const selectedLang = getSelectedLanguageInfo();
            if (selectedLang) {
                recognition.lang = selectedLang.code;
                console.log(`🎤 Speech recognition set to: ${selectedLang.name} (${selectedLang.code})`);
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

                        // Trigger translation if languages are exchanged and text is meaningful
                        if (finalSubtitle.text.trim().length > 2 && languageExchange.exchangeComplete) {
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
            const selectedLang = getSelectedLanguageInfo();
            if (selectedLang && recognitionRef.current.lang !== selectedLang.code) {
                recognitionRef.current.lang = selectedLang.code;
                console.log(`🎤 Updated speech recognition language to: ${selectedLang.name}`);
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

    // Translation Functions - Web-compatible Google Translate API
    const translateText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> => {
        try {
            console.log(`🌐 Starting web translation: "${text}" from ${sourceLanguage} to ${targetLanguage}`);
            
            setTranslationStatus(prev => ({ ...prev, isTranslating: true }));
            
            // Map language codes for Google Translate API
            const mapLanguageCode = (lang: string): string => {
                const languageMap: { [key: string]: string } = {
                    'en-US': 'en', 'es-ES': 'es', 'es-MX': 'es', 'zh-CN': 'zh',
                    'hi-IN': 'hi', 'te-IN': 'te', 'tl-PH': 'tl', 'ta-IN': 'ta',
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

            // Use Google Translate REST API (web-compatible)
            const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || 'AIzaSyC-KeQ39iD_HAwGVbQt830FP8EzEY7Ez5s';
            const apiUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });

            if (!response.ok) {
                throw new Error(`Google Translate API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`API Error: ${data.error.message || 'Translation failed'}`);
            }

            const translatedText = data.data?.translations?.[0]?.translatedText;
            
            if (!translatedText) {
                throw new Error('No translation received from API');
            }

            console.log(`✅ Web translation successful: "${translatedText}"`);

            const result: TranslationResult = {
                success: true,
                translatedText,
                originalText: text,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            };
            
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: false,
                lastTranslation: translatedText
            }));
            
            return result;
        } catch (error) {
            console.error('❌ Web translation error:', error);
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
        if (!languageExchange.exchangeComplete || !languageExchange.remoteLanguage) {
            console.log('🌐 Translation skipped: Language exchange not complete');
            return;
        }

        try {
            const translationResult = await translateText(
                originalText,
                languageExchange.myLanguage,
                languageExchange.remoteLanguage
            );

            if (translationResult.success && translationResult.translatedText) {
                const translationMessage: TranslationMessage = {
                    id: `translation_${Date.now()}_${currentUserId}`,
                    originalText,
                    translatedText: translationResult.translatedText,
                    sourceLanguage: languageExchange.myLanguage,
                    targetLanguage: languageExchange.remoteLanguage,
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
            }
        } catch (error) {
            console.error('❌ Translation process failed:', error);
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
            if (languageExchange.exchangeComplete) {
                checkForRemoteTranslations();
            }
        }, 1000); // Check every second for real-time feel

        console.log('🔄 Translation polling started');
    };

    const stopTranslationPolling = (): void => {
        if (translationPollingRef.current) {
            clearInterval(translationPollingRef.current);
            translationPollingRef.current = null;
            console.log('⏹️ Translation polling stopped');
        }
    };

    // Health check to ensure speech recognition is running when it should be
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
    };

    const stopSpeechRecognitionHealthCheck = (): void => {
        if (speechRecognitionHealthCheckRef.current) {
            clearInterval(speechRecognitionHealthCheckRef.current);
            speechRecognitionHealthCheckRef.current = null;
            console.log('⏹️ Speech recognition health check stopped');
        }
    };

    const getStoredLanguagePreference = (): Language | null => {
        try {
            const stored = localStorage.getItem(`voiceCallLanguage_${currentUserId}`) || 
                          localStorage.getItem(`lastUsedLanguage`);
            if (stored) {
                const languageData = JSON.parse(stored);
                return AVAILABLE_LANGUAGES.find(l => l.code === languageData.code) || null;
            }
        } catch (error) {
            console.warn('Could not load language preference:', error);
        }
        return null;
    };

    const checkForRemoteLanguage = (): boolean => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_languages`;
            const callLanguages = JSON.parse(localStorage.getItem(channelKey) || '{}');
            
            const remoteLanguageData = callLanguages[targetUserId];
            if (remoteLanguageData) {
                setLanguageExchange(prev => ({
                    ...prev,
                    remoteLanguage: remoteLanguageData.code,
                    remoteLanguageName: remoteLanguageData.name,
                    isRemoteLanguageKnown: true,
                    exchangeComplete: prev.myLanguage !== 'en-US'
                }));
                
                console.log(`🎯 Remote language detected: ${remoteLanguageData.name} (${remoteLanguageData.code})`);
                return true;
            }
        } catch (error) {
            console.warn('Error checking for remote language:', error);
        }
        return false;
    };

    const startLanguagePolling = (): void => {
        const interval = setInterval(() => {
            const found = checkForRemoteLanguage();
            if (found && languageExchange.myLanguage !== 'en-US') {
                clearInterval(interval);
                showLanguageExchangeComplete();
            }
        }, 2000); // Check every 2 seconds

        // Clear interval after 2 minutes to avoid infinite polling
        setTimeout(() => clearInterval(interval), 120000);
    };

    const showLanguageExchangeComplete = (): void => {
        const myLang = getSelectedLanguageInfo();
        const remoteLang = AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage);
        
        if (myLang && remoteLang) {
            // Start real-time translation
            setRealTimeTranslation(prev => ({ ...prev, isActive: true }));
            startTranslationPolling();
            
            Alert.alert(
                '🌐 Translation Ready!',
                `Language Exchange Complete:\n\n🗣️ You: ${myLang.flag} ${myLang.name}\n🎧 Them: ${remoteLang.flag} ${remoteLang.name}\n\nReal-time translation is now active! Speak naturally and see live subtitles with translations.`,
                [{ text: 'Perfect!' }]
            );
        }
    };

    const announceMyLanguage = (language: Language): void => {
        Alert.alert(
            'Language Setup Complete! 🎉',
            `You're now speaking: ${language.flag} ${language.name}\n\nTo complete the setup:\n1. Let the other person know you selected ${language.name}\n2. Ask them to click the purple "translate" button\n3. Have them select their preferred language\n\nOnce both languages are set, you'll see a "Translation Ready!" confirmation.`,
            [
                { text: 'Got it!' },
                { 
                    text: 'Copy Instructions', 
                    onPress: () => {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(
                                `I've enabled translation and selected ${language.name}. Please click the purple translate button in your call controls and select your preferred language for real-time translation!`
                            );
                            Alert.alert('📋 Copied!', 'Instructions copied to clipboard. Share with the other person.');
                        }
                    }
                },
                {
                    text: 'Test Translation',
                    onPress: () => testGoogleTranslate(language.code)
                }
            ]
        );
    };

    // Test function to verify Google Translate Web API is working
    const testGoogleTranslate = async (sourceLanguage: string): Promise<void> => {
        try {
            console.log('🧪 Testing Google Translate Web API...');
            const testText = 'Hello world, this is a translation test!';
            const targetLanguage = sourceLanguage === 'en-US' ? 'es-ES' : 'en-US';
            
            const result = await translateText(testText, sourceLanguage, targetLanguage);
            
            if (result.success) {
                Alert.alert(
                    '✅ Translation Test Successful!',
                    `Original: "${result.originalText}"\nTranslated: "${result.translatedText}"\n\nGoogle Translate Web API is working correctly!`,
                    [{ text: 'Excellent!' }]
                );
            } else {
                Alert.alert(
                    '❌ Translation Test Failed',
                    `Error: ${result.error}\n\nPlease check:\n1. Internet connection\n2. Google Cloud API key\n3. Translation API enabled`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert(
                '❌ Translation Test Error', 
                `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis might be a network or CORS issue.`,
                [{ text: 'OK' }]
            );
        }
    };

    // Timer for call duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callStatus]);

    // Initialize call when modal becomes visible
    useEffect(() => {
        if (visible && currentUserId && targetUserId) {
            initializeWorkingCall();
        }
        
        return () => {
            if (visible) {
                endCall();
            }
        };
    }, [visible, currentUserId, targetUserId]);

    // Initialize speech recognition when modal becomes visible
    useEffect(() => {
        if (visible) {
            initializeSpeechRecognition();
        }
        
        return () => {
            // Cleanup speech recognition on unmount
            stopSpeechRecognition();
            stopTranslationPolling();
            stopSpeechRecognitionHealthCheck();
            if (subtitleTimeoutRef.current) {
                clearTimeout(subtitleTimeoutRef.current);
            }
        };
    }, [visible]);

    // Handle speech recognition based on translation status and mute state
    useEffect(() => {
        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
            startSpeechRecognition();
            startSpeechRecognitionHealthCheck(); // Start health monitoring
        } else {
            stopSpeechRecognition();
            stopSpeechRecognitionHealthCheck(); // Stop health monitoring
        }
    }, [translationStatus.isEnabled, callStatus, isMuted, speechRecognition.isSupported]);

    // Update speech recognition language when translation language changes
    useEffect(() => {
        if (speechRecognition.isListening && recognitionRef.current) {
            const selectedLang = getSelectedLanguageInfo();
            if (selectedLang && recognitionRef.current.lang !== selectedLang.code) {
                stopSpeechRecognition();
                setTimeout(() => {
                    if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                        startSpeechRecognition();
                    }
                }, 100);
            }
        }
    }, [translationStatus.selectedLanguage]);

    // Load stored language preference on component mount
    useEffect(() => {
        if (visible) {
            const storedLanguage = getStoredLanguagePreference();
            if (storedLanguage) {
                setTranslationStatus(prev => ({
                    ...prev,
                    selectedLanguage: storedLanguage.code,
                    isEnabled: true
                }));
                
                setLanguageExchange(prev => ({
                    ...prev,
                    myLanguage: storedLanguage.code,
                    myLanguageName: storedLanguage.name
                }));
                
                console.log(`🔄 Auto-loaded language: ${storedLanguage.name}`);
                
                // Check for remote language and start polling
                setTimeout(() => {
                    checkForRemoteLanguage();
                    startLanguagePolling();
                }, 2000);
            }
        }
    }, [visible]);

    const initializeWorkingCall = async (): Promise<void> => {
        try {
            console.log('🎤 Initializing working voice call...');
            setCallStatus('connecting');
            
            // Generate channel name (same as before)
            const channelName = `call_${[currentUserId, targetUserId].sort().join('_')}`;
            
            // Set up event listeners
            workingVoiceCallService.onUserJoined = (user: any) => {
                console.log('🎉 Remote user joined the call:', user.uid);
                setIsRemoteUserConnected(true);
                setCallStatus('connected');
            };

            workingVoiceCallService.onUserLeft = (user: any) => {
                console.log('👋 Remote user left the call:', user.uid);
                setIsRemoteUserConnected(false);
                setCallStatus('ended');
                setTimeout(() => {
                    endCall();
                }, 2000);
            };

            workingVoiceCallService.onError = (error: any) => {
                console.error('🚨 Voice call error:', error);
                Alert.alert(
                    'Voice Call Error',
                    'There was an issue with the voice call. Please try again.',
                    [{ text: 'OK', onPress: () => endCall() }]
                );
            };

            // Set up video event handlers
            workingVoiceCallService.onRemoteVideoAvailable = (videoTrack: any) => {
                console.log('📹 Remote video available');
                if (remoteVideoRef.current) {
                    try {
                        videoTrack.play(remoteVideoRef.current);
                        // Ensure injected <video> fills container
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder text
                        console.log('📺 Remote video playing');
                    } catch (error) {
                        console.error('Failed to play remote video:', error);
                    }
                }
            };

            workingVoiceCallService.onRemoteVideoUnavailable = () => {
                console.log('📹 Remote video unavailable');
                setIsRemoteVideoPlaying(false); // Show placeholder text again
                // Clear remote video view
                if (remoteVideoRef.current) {
                    // remove child nodes if any
                    try { remoteVideoRef.current.innerHTML = ''; } catch(e){}
                }
            };

            // Also handle local video preview callback
            workingVoiceCallService.onLocalVideoAvailable = (videoTrack: any) => {
                if (localVideoRef.current) {
                    try {
                        videoTrack.play(localVideoRef.current);
                        setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                        console.log('📹 Local preview playing');
                    } catch (e) {
                        console.error('Failed to play local preview', e);
                    }
                }
            };

            // Pre-request camera permissions for smoother video enabling
            try {
                workingVoiceCallService.checkCameraPermission().then((hasPermission: boolean) => {
                    if (!hasPermission) {
                        console.log('📹 Camera permission not granted, user will be prompted when enabling video');
                    } else {
                        console.log('📹 Camera permission already granted');
                    }
                });
            } catch (error) {
                console.log('📹 Could not check camera permission:', error);
            }

            // Start the call using our proven working method
            const result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);

            if (result.success) {
                console.log('✅ Working voice call started successfully!');
                // We're connected, waiting for the other user
                setCallStatus('connected');

                // If a remote video track was already published before UI mounted, play it
                const existing = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();
                if (existing && remoteVideoRef.current) {
                    try {
                        existing.play(remoteVideoRef.current);
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder text
                        console.log('📺 Played existing remote video track');
                    } catch (e) {
                        console.warn('Could not play existing remote video track', e);
                    }
                }

            } else {
                console.error('❌ Working voice call failed:', result);
                Alert.alert(
                    'Call Failed',
                    result.message || 'Unable to start voice call. Please try again.',
                    [{ text: 'OK', onPress: () => onClose() }]
                );
            }

        } catch (error) {
            console.error('❌ Working call initialization failed:', error);
            Alert.alert(
                'Call Failed',
                'Unable to initialize voice call. Please try again.',
                [{ text: 'OK', onPress: () => onClose() }]
            );
        }
    };

    const toggleMute = async (): Promise<void> => {
        const success = await workingVoiceCallService.setMicrophoneMuted(!isMuted);
        if (success) {
            setIsMuted(!isMuted);
            
            // Handle speech recognition based on mute state
            if (!isMuted) {
                // Was muted, now unmuted - start speech recognition if translation is enabled
                if (translationStatus.isEnabled && callStatus === 'connected' && speechRecognition.isSupported) {
                    setTimeout(() => startSpeechRecognition(), 100);
                }
            } else {
                // Was unmuted, now muted - stop speech recognition
                stopSpeechRecognition();
            }
        }
    };

    const toggleVideo = async (): Promise<void> => {
        if (isVideoEnabled) {
            // Disable video
            const result = await workingVoiceCallService.disableVideo();
            if (result.success) {
                setIsVideoEnabled(false);
                setIsRemoteVideoPlaying(false); // Reset remote video state
                // clear local preview
                if (localVideoRef.current) {
                    try { localVideoRef.current.innerHTML = ''; } catch(e){}
                }
            }
        } else {
            // Enable video
            const result = await workingVoiceCallService.enableVideo();
            if (result.success) {
                setIsVideoEnabled(true);
                // Start local video preview
                setTimeout(() => {
                    const videoTrack = workingVoiceCallService.getLocalVideoTrack();
                    if (videoTrack && localVideoRef.current) {
                        try {
                            videoTrack.play(localVideoRef.current);
                            setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                            console.log('📹 Local video preview started');
                        } catch (error) {
                            console.error('Failed to start local video preview:', error);
                        }
                    }

                    // If remote track already exists, play it into the remote container
                    const remoteTrack = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();
                    if (remoteTrack && remoteVideoRef.current) {
                        try {
                            remoteTrack.play(remoteVideoRef.current);
                            setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                            setIsRemoteVideoPlaying(true); // Hide placeholder text
                            console.log('📺 Remote video playing after enabling local video');
                        } catch (e) {
                            console.warn('Could not play remote track after enabling local video', e);
                        }
                    }
                }, 500);
            } else {
                // Show error if video failed to enable
                Alert.alert(
                    'Camera Error', 
                    result.error || 'Failed to enable camera. Please check your camera permissions.',
                    [
                        { text: 'OK' },
                        { 
                            text: 'Check Permissions', 
                            onPress: () => {
                                // Guide user to check browser permissions
                                Alert.alert(
                                    'Camera Permissions',
                                    'Please allow camera access in your browser settings and try again.\\n\\n1. Click the camera icon in your browser address bar\\n2. Allow camera access for this site\\n3. Refresh the page if needed',
                                    [{ text: 'OK' }]
                                );
                            }
                        }
                    ]
                );
            }
        }
    };

    const switchCamera = async (): Promise<void> => {
        const result = await workingVoiceCallService.switchCamera();
        if (!result.success) {
            Alert.alert('Camera Switch Failed', result.error || 'Failed to switch camera');
        }
    };

    const endCall = async (): Promise<void> => {
        console.log('📞 Ending working voice call...');
        stopTranslationPolling();
        await workingVoiceCallService.endCall();
        setCallStatus('ended');
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    // Translation Functions
    const toggleTranslation = (): void => {
        if (translationStatus.isEnabled) {
            // Disable translation
            setTranslationStatus(prev => ({
                ...prev,
                isEnabled: false,
                isTranslating: false
            }));
            console.log('🌐 Translation disabled');
        } else {
            // Show language dropdown to enable translation
            setShowLanguageDropdown(true);
        }
    };

    const handleLanguageSelection = (language: Language): void => {
        setTranslationStatus(prev => ({
            ...prev,
            isEnabled: true,
            selectedLanguage: language.code,
            isTranslating: false
        }));
        
        // Update language exchange state
        setLanguageExchange(prev => ({
            ...prev,
            myLanguage: language.code,
            myLanguageName: language.name,
            exchangeComplete: prev.isRemoteLanguageKnown
        }));
        
        setShowLanguageDropdown(false);
        
        // Save language preference locally
        saveLanguagePreference(language);
        
        console.log(`🌐 Translation enabled for: ${language.name} (${language.code})`);
        
        // Initialize speech recognition for the selected language
        if (callStatus === 'connected' && !isMuted && speechRecognition.isSupported) {
            stopSpeechRecognition();
            setTimeout(() => {
                startSpeechRecognition();
            }, 200);
        }
        
        // Start polling for remote user's language
        setTimeout(() => {
            checkForRemoteLanguage();
            startLanguagePolling();
        }, 1000);
        
        // Show announcement helper
        announceMyLanguage(language);
    };

    const getSelectedLanguageInfo = (): Language | undefined => {
        return AVAILABLE_LANGUAGES.find(lang => lang.code === translationStatus.selectedLanguage);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={endCall}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Voice Call</Text>
                        <Text style={styles.subtitle}>
                            {callStatus === 'connecting' && 'Connecting...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? `Connected to ${targetUserName}` : 'Waiting for other user...')}
                            {callStatus === 'ended' && 'Call Ended'}
                        </Text>
                    </View>

                    {/* Status Indicator */}
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusIndicator, {
                            backgroundColor: callStatus === 'connected' ? '#27ae60' : '#e74c3c'
                        }]} />
                        <Text style={styles.statusText}>
                            {callStatus === 'connecting' && 'Establishing connection...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? 'Call in progress' : 'Waiting for response...')}
                            {callStatus === 'ended' && 'Call ended'}
                        </Text>
                    </View>

                    {/* Call Duration */}
                    {callStatus === 'connected' && (
                        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
                    )}

                    {/* Video Preview Areas */}
                    {isVideoEnabled && (
                        <View style={styles.videoContainer}>
                            {/* Local Video Preview */}
                            <View style={styles.localVideoContainer}>
                                <div 
                                    ref={localVideoRef}
                                    style={{
                                        width: '100%',
                                        height: 150,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 8,
                                        border: '2px solid #27ae60',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 5,
                                        left: 5,
                                        fontSize: 10,
                                        color: '#666',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        zIndex: 10
                                    }}>
                                        Your Video
                                    </div>
                                </div>
                            </View>
                            
                            {/* Remote Video Area */}
                            <View style={styles.remoteVideoContainer}>
                                <div 
                                    ref={remoteVideoRef}
                                    style={{
                                        width: '100%',
                                        height: 150,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 8,
                                        border: '2px solid #3498db',
                                        position: 'relative',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 5,
                                        left: 5,
                                        fontSize: 10,
                                        color: '#666',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        zIndex: 10
                                    }}>
                                        Remote Video
                                    </div>
                                    {!isRemoteVideoPlaying && (
                                        <div style={{
                                            fontSize: 12,
                                            color: '#666',
                                            textAlign: 'center'
                                        }}>
                                            Waiting for remote video...
                                        </div>
                                    )}
                                </div>
                            </View>
                        </View>
                    )}

                    {/* Remote User Status - Show when video is off or as overlay */}
                    <View style={[styles.userContainer, isVideoEnabled && styles.overlayUserContainer]}>
                        <MaterialIcons 
                            name="account-circle" 
                            size={isVideoEnabled ? 40 : 80} 
                            color={isRemoteUserConnected ? '#27ae60' : '#95a5a6'} 
                        />
                        <Text style={[styles.userName, isVideoEnabled && styles.overlayUserName]}>{targetUserName}</Text>
                        <Text style={[styles.userStatus, isVideoEnabled && styles.overlayUserStatus]}>
                            {isRemoteUserConnected ? 'Connected' : 'Calling...'}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        {/* Mute Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, isMuted && styles.mutedButton]} 
                            onPress={toggleMute}
                        >
                            <MaterialIcons 
                                name={isMuted ? 'mic-off' : 'mic'} 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        {/* Video Toggle Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, isVideoEnabled ? styles.videoOnButton : styles.videoOffButton]} 
                            onPress={toggleVideo}
                        >
                            <MaterialIcons 
                                name={isVideoEnabled ? 'videocam' : 'videocam-off'} 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        {/* Translation Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, translationStatus.isEnabled ? styles.translationOnButton : styles.translationOffButton]} 
                            onPress={toggleTranslation}
                        >
                            <MaterialIcons 
                                name="translate" 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        {/* Camera Switch Button (only show when video is on) */}
                        {isVideoEnabled && (
                            <TouchableOpacity 
                                style={[styles.controlButton, styles.cameraSwitchButton]} 
                                onPress={switchCamera}
                            >
                                <MaterialIcons 
                                    name="flip-camera-ios" 
                                    size={20} 
                                    color="white" 
                                />
                            </TouchableOpacity>
                        )}

                        {/* End Call Button */}
                        <TouchableOpacity 
                            style={styles.endCallButton} 
                            onPress={endCall}
                        >
                            <MaterialIcons name="call-end" size={30} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Language Exchange Status */}
                    {(translationStatus.isEnabled || languageExchange.isRemoteLanguageKnown) && (
                        <View style={styles.languageExchangeContainer}>
                            <View style={styles.languageExchangeHeader}>
                                <MaterialIcons name="swap-horiz" size={18} color="#9b59b6" />
                                <Text style={styles.languageExchangeTitle}>Language Exchange</Text>
                            </View>
                            
                            <View style={styles.languageExchangeContent}>
                                {/* My Language */}
                                <View style={styles.languageCard}>
                                    <Text style={styles.languageCardLabel}>🗣️ You speak:</Text>
                                    <View style={styles.languageExchangeInfo}>
                                        <Text style={styles.languageExchangeFlag}>
                                            {getSelectedLanguageInfo()?.flag || '🇺🇸'}
                                        </Text>
                                        <Text style={styles.languageExchangeName}>
                                            {getSelectedLanguageInfo()?.name || 'English (US)'}
                                        </Text>
                                    </View>
                                    {!translationStatus.isEnabled && (
                                        <TouchableOpacity 
                                            style={styles.changeLanguageBtn}
                                            onPress={() => setShowLanguageDropdown(true)}
                                        >
                                            <Text style={styles.changeLanguageBtnText}>Select</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Exchange Arrow */}
                                <View style={styles.exchangeArrow}>
                                    <MaterialIcons 
                                        name={languageExchange.exchangeComplete ? "sync" : "sync-disabled"} 
                                        size={24} 
                                        color={languageExchange.exchangeComplete ? "#27ae60" : "#95a5a6"} 
                                    />
                                </View>

                                {/* Remote Language */}
                                <View style={styles.languageCard}>
                                    <Text style={styles.languageCardLabel}>🎧 They speak:</Text>
                                    {languageExchange.isRemoteLanguageKnown ? (
                                        <View style={styles.languageExchangeInfo}>
                                            <Text style={styles.languageExchangeFlag}>
                                                {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage)?.flag || '❓'}
                                            </Text>
                                            <Text style={styles.languageExchangeName}>
                                                {languageExchange.remoteLanguageName || 'Unknown'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.waitingForLanguage}>
                                            <ActivityIndicator size="small" color="#9b59b6" />
                                            <Text style={styles.waitingText}>Waiting...</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Exchange Status */}
                            <View style={styles.exchangeStatus}>
                                {languageExchange.exchangeComplete ? (
                                    <Text style={styles.exchangeCompleteText}>
                                        ✅ Translation Ready! Both languages set.
                                    </Text>
                                ) : translationStatus.isEnabled ? (
                                    <Text style={styles.exchangePendingText}>
                                        ⏳ Ask them to select their language
                                    </Text>
                                ) : (
                                    <Text style={styles.exchangeSetupText}>
                                        💡 Click translate button to select your language
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Quick Language Setup Tip - Only show if no translation active */}
                    {!translationStatus.isEnabled && !languageExchange.isRemoteLanguageKnown && callStatus === 'connected' && (
                        <TouchableOpacity 
                            style={styles.languageSetupTip}
                            onPress={() => setShowLanguageDropdown(true)}
                        >
                            <MaterialIcons name="translate" size={16} color="#9b59b6" />
                            <Text style={styles.languageSetupTipText}>
                                💡 Tap to speak in your native language
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Translation Status Display */}
                    {translationStatus.isEnabled && (
                        <View style={styles.translationStatus}>
                            <View style={styles.translationHeader}>
                                <MaterialIcons name="translate" size={16} color="#9b59b6" />
                                <Text style={styles.translationText}>
                                    Translation Active: {getSelectedLanguageInfo()?.flag} {getSelectedLanguageInfo()?.name}
                                </Text>
                                {translationStatus.isTranslating && (
                                    <ActivityIndicator size="small" color="#9b59b6" style={{ marginLeft: 8 }} />
                                )}
                            </View>
                            {translationStatus.lastTranslation && (
                                <Text style={styles.lastTranslationText}>
                                    Last: "{translationStatus.lastTranslation}"
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Speech-to-Text Subtitles Display */}
                    {translationStatus.isEnabled && (
                        <View style={styles.subtitleContainer}>
                            <View style={styles.subtitleHeader}>
                                <MaterialIcons name="closed-caption" size={16} color="#e74c3c" />
                                <Text style={styles.subtitleHeaderText}>
                                    Live Subtitles {speechRecognition.isListening ? '🎙️' : '🔇'}
                                </Text>
                                <View style={[
                                    styles.recordingIndicator,
                                    { backgroundColor: speechRecognition.isListening ? '#e74c3c' : '#95a5a6' }
                                ]} />
                            </View>
                            
                            {speechRecognition.currentSubtitle ? (
                                <View style={styles.subtitleTextContainer}>
                                    <Text 
                                        style={[
                                            styles.subtitleText,
                                            { 
                                                opacity: speechRecognition.currentSubtitle.isFinal ? 1 : 0.7,
                                                fontFamily: getSelectedLanguageInfo()?.code.startsWith('hi') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('te') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('ta') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('ar') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('zh') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('ja') ? 'System' : 
                                                          getSelectedLanguageInfo()?.code.startsWith('ko') ? 'System' : 
                                                          'System'
                                            }
                                        ]}
                                    >
                                        "{speechRecognition.currentSubtitle.text}"
                                    </Text>
                                    <View style={styles.subtitleMetadata}>
                                        <Text style={styles.confidenceText}>
                                            {speechRecognition.currentSubtitle.isFinal ? 'Final' : 'Listening...'}
                                        </Text>
                                        <Text style={styles.confidenceText}>
                                            {Math.round(speechRecognition.currentSubtitle.confidence * 100)}% confidence
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.subtitlePlaceholder}>
                                    <Text style={styles.subtitlePlaceholderText}>
                                        {isMuted ? '🔇 Unmute to see your speech' : 
                                         !speechRecognition.isSupported ? '❌ Speech recognition not supported' :
                                         !speechRecognition.isListening ? '🎙️ Starting speech recognition...' : 
                                         '🗣️ Speak to see your words here'}
                                    </Text>
                                </View>
                            )}

                            {/* Show recent subtitle history */}
                            {speechRecognition.subtitleHistory.length > 0 && (
                                <View style={styles.subtitleHistory}>
                                    <Text style={styles.historyTitle}>Recent:</Text>
                                    {speechRecognition.subtitleHistory.slice(-2).map((subtitle, index) => (
                                        <Text key={index} style={styles.historyText} numberOfLines={1}>
                                            "{subtitle.text}"
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Real-time Translation Display */}
                    {realTimeTranslation.isActive && languageExchange.exchangeComplete && (
                        <View style={styles.realTimeTranslationContainer}>
                            <View style={styles.translationStreamHeader}>
                                <MaterialIcons name="swap-horiz" size={18} color="#27ae60" />
                                <Text style={styles.translationStreamTitle}>Live Translation Stream</Text>
                                <View style={[
                                    styles.translationActiveIndicator,
                                    { backgroundColor: translationStatus.isTranslating ? '#f39c12' : '#27ae60' }
                                ]} />
                            </View>

                            {/* My Translations (what I said, translated to their language) */}
                            {realTimeTranslation.myTranslations.length > 0 && (
                                <View style={styles.translationSection}>
                                    <Text style={styles.translationSectionTitle}>
                                        🗣️ Your speech → {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage)?.flag} {languageExchange.remoteLanguageName}
                                    </Text>
                                    {realTimeTranslation.myTranslations.slice(-2).map((translation, index) => (
                                        <View key={translation.id} style={styles.myTranslationBubble}>
                                            <Text style={styles.originalTextMy}>"{translation.originalText}"</Text>
                                            <Text style={styles.translatedTextMy}>
                                                {AVAILABLE_LANGUAGES.find(l => l.code === languageExchange.remoteLanguage)?.flag} "{translation.translatedText}"
                                            </Text>
                                            <Text style={styles.translationTimestamp}>
                                                {Math.round(translation.confidence * 100)}% • {new Date(translation.timestamp).toLocaleTimeString()}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Remote Translations (what they said, translated to my language) */}
                            {realTimeTranslation.remoteTranslations.length > 0 && (
                                <View style={styles.translationSection}>
                                    <Text style={styles.translationSectionTitle}>
                                        🎧 Their speech → {getSelectedLanguageInfo()?.flag} {getSelectedLanguageInfo()?.name}
                                    </Text>
                                    {realTimeTranslation.remoteTranslations.slice(-2).map((translation, index) => (
                                        <View key={translation.id} style={styles.remoteTranslationBubble}>
                                            <Text style={styles.originalTextRemote}>"{translation.originalText}"</Text>
                                            <Text style={styles.translatedTextRemote}>
                                                {getSelectedLanguageInfo()?.flag} "{translation.translatedText}"
                                            </Text>
                                            <Text style={styles.translationTimestamp}>
                                                {Math.round(translation.confidence * 100)}% • {new Date(translation.timestamp).toLocaleTimeString()}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Translation Status */}
                            <View style={styles.translationStreamStatus}>
                                {translationStatus.isTranslating ? (
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
});

export default WorkingVoiceCallModal;
