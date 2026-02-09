import React, { useState, useEffect, useRef, FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import workingVoiceCallService from '../services/workingVoiceCallService';
import { translateText as translateTextService } from '../translationService';

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

// Text-to-Speech status interface
interface TextToSpeechStatus {
    isSupported: boolean;
    isSpeaking: boolean;
    isEnabled: boolean;
    currentVoice: SpeechSynthesisVoice | null;
    availableVoices: SpeechSynthesisVoice[];
}

// Language exchange interface (keeping for compatibility)
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

// Customer to Agent Translation interface
interface CustomerToAgentTranslation {
    customerSpeaking: string;
    customerSpeakingName: string;
    agentReceives: string;
    agentReceivesName: string;
    isEnabled: boolean;
}

// Agent to Customer Translation interface  
interface AgentToCustomerTranslation {
    agentSpeaking: string;
    agentSpeakingName: string;
    customerReceives: string;
    customerReceivesName: string;
    isEnabled: boolean;
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

// Available languages for manual selection (using Google Translate compatible codes)
const AVAILABLE_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳', nativeName: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
    { code: 'fil', name: 'Filipino', flag: '🇵🇭', nativeName: 'Filipino' }
];

const WorkingVoiceCallModal: FC<WorkingVoiceCallModalProps> = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName 
}) => {
    // Basic call states
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
        lastTranslation: '',
        error: undefined
    });
    
    // Speech recognition and subtitle states
    const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognitionStatus>({
        isListening: false,
        isSupported: false,
        currentSubtitle: null,
        subtitleHistory: []
    });

    // Text-to-speech states
    const [textToSpeech, setTextToSpeech] = useState<TextToSpeechStatus>({
        isSupported: false,
        isSpeaking: false,
        isEnabled: true, // Enable by default
        currentVoice: null,
        availableVoices: []
    });

    // Audio context refs for TTS audio routing
    const audioContextRef = useRef<AudioContext | null>(null);
    const destinationStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    
    // Language exchange state for manual selection (keeping for compatibility)
    const [languageExchange, setLanguageExchange] = useState<LanguageExchange>({
        myLanguage: 'te',
        myLanguageName: 'Telugu',
        myTargetLanguage: 'hi',
        myTargetLanguageName: 'Hindi',
        remoteLanguage: null,
        remoteLanguageName: null,
        isRemoteLanguageKnown: false,
        exchangeComplete: false
    });

    // Customer to Agent Translation Settings
    const [customerToAgent, setCustomerToAgent] = useState<CustomerToAgentTranslation>({
        customerSpeaking: 'te',
        customerSpeakingName: 'Telugu',
        agentReceives: 'hi',
        agentReceivesName: 'Hindi',
        isEnabled: false
    });

    // Agent to Customer Translation Settings  
    const [agentToCustomer, setAgentToCustomer] = useState<AgentToCustomerTranslation>({
        agentSpeaking: 'hi',
        agentSpeakingName: 'Hindi',
        customerReceives: 'te',
        customerReceivesName: 'Telugu',
        isEnabled: false
    });
    
    // Real-time translation state
    const [realTimeTranslation, setRealTimeTranslation] = useState<RealTimeTranslation>({
        isActive: false,
        myTranslations: [],
        remoteTranslations: [],
        lastTranslationId: null
    });

    // Refs for managing intervals and speech recognition
    const callDurationRef = useRef<NodeJS.Timeout | null>(null);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const speechRecognitionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
    const translationPollingRef = useRef<NodeJS.Timeout | null>(null);
    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);

    // Get current language helper functions
    const getCurrentSpeakingLanguage = (): Language | undefined => {
        return AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myLanguage);
    };

    const getCurrentTargetLanguage = (): Language | undefined => {
        return AVAILABLE_LANGUAGES.find(lang => lang.code === languageExchange.myTargetLanguage);
    };

    // Translation function using Google Translate API
    const translateText = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> => {
        try {
            console.log(`🌐 Starting translation: "${text}" from ${sourceLanguage} to ${targetLanguage}`);
            
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: true,
                error: undefined
            }));
            
            // Languages are already in the correct format for Google Translate API
            const sourceLang = sourceLanguage;
            const targetLang = targetLanguage;

            // Skip translation if languages are the same
            if (sourceLang === targetLang) {
                setTranslationStatus(prev => ({ 
                    ...prev, 
                    isTranslating: false,
                    lastTranslation: text,
                    error: undefined
                }));
                return {
                    success: true,
                    translatedText: text,
                    originalText: text,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang
                };
            }

            // Use the translation service
            const translationResult = await translateTextService(text, targetLang, sourceLang);
            
            if (translationResult.error) {
                throw new Error(translationResult.error);
            }
            
            console.log(`✅ Translation successful: "${translationResult.translatedText}"`);

            const result: TranslationResult = {
                success: true,
                translatedText: translationResult.translatedText,
                originalText: text,
                sourceLanguage: translationResult.detectedLanguage || sourceLang,
                targetLanguage: targetLang
            };
            
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: false,
                lastTranslation: translationResult.translatedText,
                error: undefined
            }));
            
            return result;
            
        } catch (error) {
            console.error('❌ Translation failed:', error);
            setTranslationStatus(prev => ({ 
                ...prev, 
                isTranslating: false,
                error: error instanceof Error ? error.message : 'Translation failed'
            }));
            
            return {
                success: false,
                translatedText: text,
                originalText: text,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                error: error instanceof Error ? error.message : 'Translation failed'
            };
        }
    };

    // Process speech recognition result and translate (updated for bidirectional translation)
    const processTranslationAndShare = async (originalText: string, confidence: number): Promise<void> => {
        // Determine which translation direction to use based on who is speaking (this user)
        let sourceLanguage: string;
        let targetLanguage: string;
        let translationDirection: string;

        // Determine user type and appropriate translation direction
        if (agentToCustomer.isEnabled && customerToAgent.isEnabled) {
            // Both directions enabled - need to determine user type
            // If both are enabled, this is likely the agent speaking
            // Agent speaks their language and translates to customer's language
            sourceLanguage = agentToCustomer.agentSpeaking;
            targetLanguage = agentToCustomer.customerReceives;
            translationDirection = 'Agent→Customer';
            console.log('🎯 Both translations enabled - processing as agent speech');
        } else if (agentToCustomer.isEnabled) {
            // Only agent→customer enabled - this user is the agent
            sourceLanguage = agentToCustomer.agentSpeaking;
            targetLanguage = agentToCustomer.customerReceives;
            translationDirection = 'Agent→Customer';
        } else if (customerToAgent.isEnabled) {
            // Only customer→agent enabled - this user is the customer
            sourceLanguage = customerToAgent.customerSpeaking;
            targetLanguage = customerToAgent.agentReceives;
            translationDirection = 'Customer→Agent';
        } else {
            // Fallback to old behavior for backward compatibility
            sourceLanguage = languageExchange.myLanguage;
            targetLanguage = languageExchange.myTargetLanguage;
            translationDirection = 'Legacy';
            console.log('⚠️ No specific translation direction enabled, using legacy mode');
        }

        if (!targetLanguage) {
            console.log(`🌐 Translation skipped: No target language set for ${translationDirection}`);
            return;
        }

        try {
            console.log(`🎯 Processing ${translationDirection} translation: ${sourceLanguage} → ${targetLanguage}`);
            
            const translationResult = await translateText(
                originalText,
                sourceLanguage,
                targetLanguage
            );

            if (translationResult.success && translationResult.translatedText) {
                const translationMessage: TranslationMessage = {
                    id: `translation_${Date.now()}_${currentUserId}`,
                    originalText,
                    translatedText: translationResult.translatedText,
                    sourceLanguage,
                    targetLanguage,
                    timestamp: Date.now(),
                    userId: currentUserId,
                    userName: 'You',
                    confidence
                };

                // Add to my translations
                setRealTimeTranslation(prev => ({
                    ...prev,
                    myTranslations: [...prev.myTranslations.slice(-4), translationMessage],
                    lastTranslationId: translationMessage.id
                }));

                await shareTranslationMessage(translationMessage);
                console.log(`✅ ${translationDirection} translation shared: "${translationMessage.translatedText}"`);

                // Convert translated text to speech and transmit through call
                if (textToSpeech.isEnabled && callStatus === 'connected') {
                    console.log('🗣️ Auto-transmitting TTS for translation...');
                    speakTranslatedTextForCallTransmission(translationResult.translatedText, targetLanguage);
                }
            }
        } catch (error) {
            console.error(`❌ ${translationDirection} translation process failed:`, error);
        }
    };

    // Share translation message via localStorage
    const shareTranslationMessage = async (message: TranslationMessage): Promise<void> => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_translations`;
            const existingTranslations = JSON.parse(localStorage.getItem(channelKey) || '[]');
            
            existingTranslations.push(message);
            const recentTranslations = existingTranslations.slice(-20);
            localStorage.setItem(channelKey, JSON.stringify(recentTranslations));
            
            console.log(`💬 Translation message shared to channel: ${channelKey}`);
        } catch (error) {
            console.error('❌ Failed to share translation message:', error);
        }
    };

    // Share my language preference with the remote user
    const shareLanguagePreference = async (): Promise<void> => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_language_prefs`;
            const languagePreference = {
                userId: currentUserId,
                userName: 'You',
                myLanguage: languageExchange.myLanguage,
                myLanguageName: languageExchange.myLanguageName,
                timestamp: Date.now()
            };
            
            localStorage.setItem(`${channelKey}_${currentUserId}`, JSON.stringify(languagePreference));
            console.log(`🗣️ Shared language preference: I speak ${languageExchange.myLanguageName} (${languageExchange.myLanguage})`);
        } catch (error) {
            console.error('❌ Failed to share language preference:', error);
        }
    };

    // Check for remote user's language preference
    const checkRemoteLanguagePreference = (): void => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_language_prefs`;
            const remotePreferenceKey = `${channelKey}_${targetUserId}`;
            const remotePreference = localStorage.getItem(remotePreferenceKey);
            
            if (remotePreference) {
                const preference = JSON.parse(remotePreference);
                
                if (preference.userId === targetUserId && !languageExchange.isRemoteLanguageKnown) {
                    // The other person speaks X, so I should translate TO X (their language)
                    setLanguageExchange(prev => ({
                        ...prev,
                        remoteLanguage: preference.myLanguage,
                        remoteLanguageName: preference.myLanguageName,
                        myTargetLanguage: preference.myLanguage, // I want to translate TO their language
                        myTargetLanguageName: preference.myLanguageName,
                        isRemoteLanguageKnown: true,
                        exchangeComplete: true
                    }));
                    
                    console.log(`🎯 Language exchange established: I speak ${languageExchange.myLanguageName} → translate to ${preference.myLanguageName} (what they speak)`);
                }
            }
        } catch (error) {
            console.error('❌ Error checking remote language preference:', error);
        }
    };

    // Handle language preference change
    const handleMyLanguageChange = (newLanguage: string): void => {
        const languageInfo = AVAILABLE_LANGUAGES.find(lang => lang.code === newLanguage);
        if (languageInfo) {
            setLanguageExchange(prev => ({
                ...prev,
                myLanguage: newLanguage,
                myLanguageName: languageInfo.name,
                // Reset exchange status when changing my language
                exchangeComplete: false
            }));
            
            // Share the updated preference immediately
            setTimeout(shareLanguagePreference, 100);
        }
    };

    // Check for remote translations
    const checkForRemoteTranslations = (): void => {
        try {
            const channelKey = `call_${[currentUserId, targetUserId].sort().join('_')}_translations`;
            const allTranslations = JSON.parse(localStorage.getItem(channelKey) || '[]');
            
            const remoteTranslations = allTranslations.filter((t: TranslationMessage) => 
                t.userId === targetUserId && t.id !== realTimeTranslation.lastTranslationId
            );

            if (remoteTranslations.length > 0) {
                setRealTimeTranslation(prev => ({
                    ...prev,
                    remoteTranslations: remoteTranslations.slice(-5),
                    lastTranslationId: remoteTranslations[remoteTranslations.length - 1].id
                }));
                
                console.log(`📥 Received ${remoteTranslations.length} remote translations`);
            }
        } catch (error) {
            console.error('❌ Error checking for remote translations:', error);
        }
    };

    // Initialize speech recognition
    const initializeSpeechRecognition = (): void => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            // Use the selected language directly (already in correct format)
            recognition.lang = languageExchange.myLanguage === 'zh' ? 'zh-CN' : 
                              languageExchange.myLanguage === 'fil' ? 'tl-PH' : 
                              languageExchange.myLanguage + '-' + (languageExchange.myLanguage === 'en' ? 'US' : 
                                                                  languageExchange.myLanguage === 'es' ? 'ES' :
                                                                  languageExchange.myLanguage === 'hi' ? 'IN' :
                                                                  languageExchange.myLanguage === 'te' ? 'IN' :
                                                                  languageExchange.myLanguage === 'ta' ? 'IN' : 'US');

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence || 0.8;

                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        
                        const finalSubtitle: SubtitleData = {
                            text: transcript.trim(),
                            timestamp: Date.now(),
                            isFinal: true,
                            confidence: confidence
                        };

                        setSpeechRecognition(prev => ({
                            ...prev,
                            currentSubtitle: finalSubtitle,
                            subtitleHistory: [...prev.subtitleHistory.slice(-9), finalSubtitle]
                        }));

                        // Trigger translation
                        processTranslationAndShare(finalSubtitle.text.trim(), finalSubtitle.confidence);
                    } else {
                        interimTranscript += transcript;
                        
                        setSpeechRecognition(prev => ({
                            ...prev,
                            currentSubtitle: {
                                text: interimTranscript.trim(),
                                timestamp: Date.now(),
                                isFinal: false,
                                confidence: confidence
                            }
                        }));
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.error('🎤 Speech recognition error:', event.error);
                setSpeechRecognition(prev => ({ ...prev, isListening: false }));
            };

            recognition.onend = () => {
                console.log('🎤 Speech recognition ended');
                setSpeechRecognition(prev => ({ ...prev, isListening: false }));
                
                // Auto-restart if translation is enabled and call is connected
                if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                    console.log('🔄 Auto-restarting speech recognition...');
                    setTimeout(() => {
                        startSpeechRecognition();
                    }, 100); // Small delay to prevent conflicts
                }
            };

            recognition.onstart = () => {
                console.log('🎤 Speech recognition started successfully');
                setSpeechRecognition(prev => ({ ...prev, isListening: true }));
            };

            speechRecognitionRef.current = recognition;
            setSpeechRecognition(prev => ({ ...prev, isSupported: true }));
            
            console.log('🎤 Speech recognition initialized');
        } else {
            console.warn('🎤 Speech recognition not supported');
            setSpeechRecognition(prev => ({ ...prev, isSupported: false }));
        }
    };

    // Initialize text-to-speech
    const initializeTextToSpeech = (): void => {
        if ('speechSynthesis' in window) {
            setTextToSpeech(prev => ({ ...prev, isSupported: true }));
            console.log('🗣️ Speech synthesis API is supported');
            
            // Load available voices
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                console.log(`🗣️ Loading ${voices.length} voices...`);
                
                if (voices.length > 0) {
                    setTextToSpeech(prev => ({
                        ...prev,
                        availableVoices: voices,
                        currentVoice: voices.find(voice => voice.default) || voices[0] || null
                    }));
                    
                    console.log('🗣️ Available voices:');
                    voices.forEach(voice => {
                        console.log(`  - ${voice.name} (${voice.lang}) ${voice.default ? '[DEFAULT]' : ''}`);
                    });
                    
                    console.log(`🗣️ Text-to-speech initialized with ${voices.length} voices`);
                } else {
                    console.log('🗣️ No voices available yet, will retry...');
                }
            };

            // Load voices immediately
            loadVoices();
            
            // Some browsers load voices asynchronously, so we need to listen for changes
            speechSynthesis.onvoiceschanged = () => {
                console.log('🗣️ Voices changed, reloading...');
                loadVoices();
            };
            
            // Force reload voices after a delay (some browsers need this)
            setTimeout(() => {
                if (textToSpeech.availableVoices.length === 0) {
                    console.log('🗣️ Force reloading voices...');
                    loadVoices();
                }
            }, 1000);
        } else {
            console.warn('🗣️ Text-to-speech not supported');
            setTextToSpeech(prev => ({ ...prev, isSupported: false }));
        }
    };

    // Start speech recognition (updated for bidirectional translation)
    const startSpeechRecognition = (): void => {
        if (speechRecognitionRef.current && !speechRecognition.isListening) {
            try {
                // Determine which language to listen for based on who is speaking (this user)
                let listeningLanguage = languageExchange.myLanguage; // fallback
                
                // Determine if current user is customer or agent based on translation settings
                // Agent users typically have agentToCustomer enabled for their own speech
                // Customer users typically have customerToAgent enabled for their own speech
                
                if (agentToCustomer.isEnabled && customerToAgent.isEnabled) {
                    // Both directions enabled - need to determine user type
                    // If both are enabled, prioritize the agent's language (agentSpeaking)
                    // since agents typically control both translation directions
                    listeningLanguage = agentToCustomer.agentSpeaking;
                    console.log(`🎯 Both translations enabled - listening for agent language: ${listeningLanguage}`);
                } else if (agentToCustomer.isEnabled) {
                    // Only agent→customer enabled - this user is the agent
                    listeningLanguage = agentToCustomer.agentSpeaking;
                    console.log(`🎯 Agent mode - listening for agent language: ${listeningLanguage}`);
                } else if (customerToAgent.isEnabled) {
                    // Only customer→agent enabled - this user is the customer
                    listeningLanguage = customerToAgent.customerSpeaking;
                    console.log(`🎯 Customer mode - listening for customer language: ${listeningLanguage}`);
                } else {
                    // Fallback to legacy mode
                    console.log(`🎯 Legacy mode - listening for: ${listeningLanguage}`);
                }

                // Set the correct language for speech recognition
                const speechLang = listeningLanguage === 'zh' ? 'zh-CN' : 
                                  listeningLanguage === 'fil' ? 'tl-PH' : 
                                  listeningLanguage + '-' + (listeningLanguage === 'en' ? 'US' : 
                                                             listeningLanguage === 'es' ? 'ES' :
                                                             listeningLanguage === 'hi' ? 'IN' :
                                                             listeningLanguage === 'te' ? 'IN' :
                                                             listeningLanguage === 'ta' ? 'IN' : 'US');
                speechRecognitionRef.current.lang = speechLang;
                speechRecognitionRef.current.start();
                console.log(`🎤 Starting speech recognition in ${speechLang} (Google Translate: ${listeningLanguage})`);
            } catch (error) {
                console.error('🎤 Failed to start speech recognition:', error);
                // If it fails, try again after a delay
                setTimeout(() => {
                    if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                        startSpeechRecognition();
                    }
                }, 500);
            }
        }
    };

    // Stop speech recognition
    const stopSpeechRecognition = (): void => {
        if (speechRecognitionRef.current && speechRecognition.isListening) {
            speechRecognitionRef.current.stop();
            setSpeechRecognition(prev => ({ ...prev, isListening: false }));
            console.log('🎤 Speech recognition stopped');
        }
    };

    // Force restart speech recognition (for debugging/manual control)
    const restartSpeechRecognition = (): void => {
        console.log('🔄 Force restarting speech recognition...');
        stopSpeechRecognition();
        setTimeout(() => {
            if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                startSpeechRecognition();
            }
        }, 200);
    };

    // Disable translation when language settings change
    const disableTranslationOnLanguageChange = (): void => {
        if (translationStatus.isEnabled) {
            console.log('🔄 Language setting changed - disabling translation');
            setTranslationStatus(prev => ({ 
                ...prev, 
                isEnabled: false,
                error: undefined,
                lastTranslation: ''
            }));
            stopSpeechRecognition();
            
            // Show a brief feedback message
            setTranslationStatus(prev => ({
                ...prev,
                lastTranslation: '⚠️ Language changed - Please turn translation ON again'
            }));
            
            // Clear the message after 3 seconds
            setTimeout(() => {
                setTranslationStatus(prev => ({
                    ...prev,
                    lastTranslation: ''
                }));
            }, 3000);
        }
    };

    // Initialize audio context for TTS routing
    const initializeAudioContext = async (): Promise<void> => {
        try {
            console.log('🔊 Initializing audio context for TTS routing...');
            
            // Create audio context
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Get user's microphone stream
            const micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            micStreamRef.current = micStream;
            
            // Create destination stream that will be sent through the call
            const destination = audioContextRef.current.createMediaStreamDestination();
            destinationStreamRef.current = destination.stream;
            
            // Connect microphone to destination (for normal speech)
            const micSource = audioContextRef.current.createMediaStreamSource(micStream);
            micSource.connect(destination);
            
            console.log('🔊 ✅ Audio context initialized successfully');
            
        } catch (error) {
            console.error('🔊 ❌ Failed to initialize audio context:', error);
        }
    };

    // Helper function to create TTS blob for enhanced audio routing
    const createTTSBlob = async (utterance: SpeechSynthesisUtterance): Promise<Blob | null> => {
        try {
            // This is a simplified approach - in practice, we'll use the standard speechSynthesis
            // but this function is here for future enhancement with Web Audio API recording
            return null; // For now, return null to use fallback
        } catch (error) {
            console.error('🗣️ Failed to create TTS blob:', error);
            return null;
        }
    };

    // Simplified TTS for call transmission using voice call service direct injection
    const speakTranslatedTextForCallTransmission = async (text: string, targetLanguage: string): Promise<void> => {
        if (!textToSpeech.isSupported || !textToSpeech.isEnabled || !text.trim()) {
            Alert.alert('TTS Not Available', 'Text-to-Speech is not supported or enabled.');
            return;
        }

        console.log(`🗣️ 📞 Speaking TTS through call using voice service injection: "${text}"`);

        try {
            setTextToSpeech(prev => ({ ...prev, isSpeaking: true }));

            // Enhanced voice selection
            let selectedVoice = textToSpeech.availableVoices.find(voice => 
                voice.lang.toLowerCase() === targetLanguage.toLowerCase()
            ) || textToSpeech.availableVoices.find(voice => 
                voice.lang.toLowerCase().startsWith(targetLanguage.toLowerCase() + '-')
            ) || textToSpeech.availableVoices[0];

            // Use the voice call service's direct TTS injection method
            const success = await workingVoiceCallService.speakTextThroughCall(text, {
                voice: selectedVoice || undefined,
                lang: targetLanguage,
                rate: 0.9, // Clear speech rate
                pitch: 1.0,
                volume: 1.0
            });

            if (success) {
                console.log('🗣️ ✅ TTS successfully transmitted through call');
            } else {
                console.log('🗣️ ⚠️ TTS transmission failed, falling back to local playback');
                // Fallback to local TTS if injection fails
                speakTranslatedText(text, targetLanguage);
            }

        } catch (error) {
            console.error('🗣️ ❌ Error in call TTS transmission:', error);
            // Fallback to local TTS
            speakTranslatedText(text, targetLanguage);
        } finally {
            setTextToSpeech(prev => ({ ...prev, isSpeaking: false }));
        }
    };

    // Convert text to speech and route through call audio (NEW DIRECT INJECTION METHOD)
    const speakTranslatedTextThroughCall = async (text: string, targetLanguage: string): Promise<void> => {
        if (!textToSpeech.isSupported || !textToSpeech.isEnabled || !text.trim()) {
            console.log('🗣️ TTS skipped - not supported, disabled, or empty text');
            return;
        }

        try {
            console.log(`🗣️ 📞 Using direct TTS injection through call: "${text}" in language: ${targetLanguage}`);
            
            // Use the new direct injection method from voice call service
            await speakTranslatedTextForCallTransmission(text, targetLanguage);
            
        } catch (error) {
            console.error('🗣️ ❌ Failed to transmit TTS through call:', error);
        }
    };
    const speakTranslatedText = (text: string, targetLanguage: string): void => {
        if (!textToSpeech.isSupported || !textToSpeech.isEnabled || !text.trim()) {
            console.log('🗣️ TTS skipped - not supported, disabled, or empty text');
            return;
        }

        try {
            console.log(`🗣️ Attempting to speak: "${text}" in language: ${targetLanguage}`);
            console.log(`🗣️ Available voices: ${textToSpeech.availableVoices.length}`);
            
            // Stop any ongoing speech
            speechSynthesis.cancel();

            // Wait a moment for cancel to complete
            setTimeout(() => {
                // Create speech synthesis utterance
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Enhanced voice selection with fallbacks
                let selectedVoice = null;
                
                // First try: exact language match
                selectedVoice = textToSpeech.availableVoices.find(voice => 
                    voice.lang.toLowerCase() === targetLanguage.toLowerCase()
                );
                
                // Second try: language prefix match (e.g., 'hi' matches 'hi-IN')
                if (!selectedVoice) {
                    selectedVoice = textToSpeech.availableVoices.find(voice => 
                        voice.lang.toLowerCase().startsWith(targetLanguage.toLowerCase() + '-') ||
                        voice.lang.toLowerCase().startsWith(targetLanguage.toLowerCase())
                    );
                }
                
                // Third try: reverse prefix match (e.g., 'hi-IN' matches 'hi')
                if (!selectedVoice) {
                    selectedVoice = textToSpeech.availableVoices.find(voice => 
                        targetLanguage.toLowerCase().startsWith(voice.lang.toLowerCase())
                    );
                }
                
                // Fourth try: use default voice or first available
                if (!selectedVoice) {
                    selectedVoice = textToSpeech.availableVoices.find(voice => voice.default) || 
                                  textToSpeech.availableVoices[0] || 
                                  null;
                }

                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                    console.log(`🗣️ Selected voice: ${selectedVoice.name} (${selectedVoice.lang}) for target: ${targetLanguage}`);
                } else {
                    console.log(`🗣️ No specific voice found for ${targetLanguage}, using default`);
                }

                // Configure speech parameters
                utterance.rate = 0.8; // Slower for better clarity
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = selectedVoice?.lang || targetLanguage;

                // Handle speech events
                utterance.onstart = () => {
                    setTextToSpeech(prev => ({ ...prev, isSpeaking: true }));
                    console.log('🗣️ ✅ Started speaking translated text');
                };

                utterance.onend = () => {
                    setTextToSpeech(prev => ({ ...prev, isSpeaking: false }));
                    console.log('🗣️ ✅ Finished speaking translated text');
                };

                utterance.onerror = (event) => {
                    setTextToSpeech(prev => ({ ...prev, isSpeaking: false }));
                    console.error('🗣️ ❌ Speech synthesis error:', event.error, event);
                };

                // Check if speechSynthesis is ready
                if (speechSynthesis.pending) {
                    console.log('🗣️ Speech synthesis is busy, waiting...');
                    speechSynthesis.cancel();
                }

                // Speak the text
                console.log('🗣️ 🔊 Calling speechSynthesis.speak()...');
                speechSynthesis.speak(utterance);
                
                // Verify it started
                setTimeout(() => {
                    if (speechSynthesis.speaking) {
                        console.log('🗣️ ✅ Speech synthesis is active');
                    } else {
                        console.log('🗣️ ⚠️ Speech synthesis did not start - checking voices...');
                        console.log('Available voices:', textToSpeech.availableVoices.map(v => `${v.name} (${v.lang})`));
                    }
                }, 100);
                
            }, 100);
            
        } catch (error) {
            console.error('🗣️ ❌ Failed to speak translated text:', error);
            setTextToSpeech(prev => ({ ...prev, isSpeaking: false }));
        }
    };

    // Test speaking a specific translated text
    const testSpeakTranslation = (text: string): void => {
        if (!textToSpeech.isSupported || !textToSpeech.isEnabled) {
            Alert.alert('TTS Not Available', 'Text-to-Speech is not supported or enabled. Please enable TTS first.');
            return;
        }

        if (!text || text.trim() === '') {
            Alert.alert('No Text', 'No translated text available to speak.');
            return;
        }

        console.log(`🧪 Testing TTS for translated text: "${text}"`);

        // Determine target language
        let targetLanguage = 'en'; // fallback
        
        if (agentToCustomer.isEnabled && customerToAgent.isEnabled) {
            targetLanguage = agentToCustomer.customerReceives;
        } else if (agentToCustomer.isEnabled) {
            targetLanguage = agentToCustomer.customerReceives;
        } else if (customerToAgent.isEnabled) {
            targetLanguage = customerToAgent.agentReceives;
        } else {
            targetLanguage = languageExchange.myTargetLanguage;
        }

        // Use the simpler local TTS for testing
        speakTranslatedText(text, targetLanguage);
    };

    // Toggle text-to-speech
    const toggleTextToSpeech = (): void => {
        setTextToSpeech(prev => ({ 
            ...prev, 
            isEnabled: !prev.isEnabled 
        }));
        
        // If disabling, stop any ongoing speech
        if (textToSpeech.isEnabled && textToSpeech.isSpeaking) {
            speechSynthesis.cancel();
            setTextToSpeech(prev => ({ ...prev, isSpeaking: false }));
        }
        
        console.log(`🗣️ Text-to-speech ${!textToSpeech.isEnabled ? 'enabled' : 'disabled'}`);
    };

    // Test the new direct TTS injection method
    const testDirectTTSInjection = (): void => {
        console.log('🧪 Testing direct TTS injection...');
        
        if (!textToSpeech.isSupported) {
            Alert.alert('TTS Test Failed', 'Text-to-Speech is not supported in this browser.');
            return;
        }
        
        if (!textToSpeech.isEnabled) {
            Alert.alert('TTS Test', 'Text-to-Speech is disabled. Please enable it first.');
            return;
        }
        
        if (callStatus !== 'connected') {
            Alert.alert('TTS Test', 'Please start a voice call first to test TTS transmission.');
            return;
        }
        
        // Test with a simple English phrase
        const testText = 'Hello, this is a direct TTS injection test. The remote user should hear this clearly through the voice call without any microphone setup needed.';
        const testLanguage = 'en';
        
        console.log(`🧪 Testing direct TTS injection with: "${testText}" in ${testLanguage}`);
        
        Alert.alert(
            '🚀 Audio Signal Test', 
            'Testing DIRECT audio injection into voice call.\n\nThis will generate audio tones that represent the translated text and inject them DIRECTLY into the call stream.\n\nThe remote user should hear distinct beeps/tones through the call.\n\nReady to test?',
            [
                { text: 'Cancel' },
                { 
                    text: 'Send Audio Signal', 
                    onPress: () => {
                        speakTranslatedTextForCallTransmission(testText, testLanguage);
                    }
                }
            ]
        );
    };

    // Toggle translation (now handles both directions)
    const toggleTranslation = (): void => {
        const newState = !translationStatus.isEnabled;
        
        setTranslationStatus(prev => ({ 
            ...prev, 
            isEnabled: newState,
            error: undefined
        }));
        
        if (newState && callStatus === 'connected' && !isMuted) {
            startSpeechRecognition();
        } else {
            stopSpeechRecognition();
        }
        
        console.log(`🌐 Translation ${newState ? 'enabled' : 'disabled'}`);
        console.log(`📊 Customer→Agent: ${customerToAgent.isEnabled}, Agent→Customer: ${agentToCustomer.isEnabled}`);
    };

    // Test Google Translate API
    const testGoogleTranslate = async (): Promise<void> => {
        try {
            console.log('🧪 Testing Google Translate API...');
            const testText = 'Hello world, this is a translation test!';
            const targetLanguage = languageExchange.myLanguage === 'en' ? 'es' : 'en';
            
            const result = await translateText(testText, languageExchange.myLanguage, targetLanguage);
            
            if (result.success) {
                Alert.alert(
                    '✅ Translation Test Successful!',
                    `Original: "${result.originalText}"\nTranslated: "${result.translatedText}"\nSource: ${result.sourceLanguage} → Target: ${result.targetLanguage}\n\nGoogle Translate API is working correctly!`,
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

    // Call control functions
    const handleCall = async (): Promise<void> => {
        try {
            setCallStatus('connecting');
            
            // Set up event listeners
            workingVoiceCallService.onUserJoined = (user: any) => {
                console.log('🎉 Remote user joined the call:', user.uid);
                setIsRemoteUserConnected(true);
                setCallStatus('connected');
            };

            workingVoiceCallService.onUserLeft = (user: any, reason: any) => {
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
                console.log('📺 Remote video track available');
                if (remoteVideoRef.current && videoTrack) {
                    try {
                        videoTrack.play(remoteVideoRef.current);
                        setIsRemoteVideoPlaying(true);
                        console.log('📺 Remote video playing successfully');
                    } catch (error) {
                        console.error('Failed to play remote video:', error);
                    }
                }
            };

            const result = await workingVoiceCallService.startVoiceCall(`call_${[currentUserId, targetUserId].sort().join('_')}`, currentUserId);
            
            if (result.success) {
                console.log('📞 Call connected successfully');
            } else {
                throw new Error(result.error || 'Failed to start call');
            }
        } catch (error) {
            console.error('❌ Call failed:', error);
            setCallStatus('ended');
            Alert.alert('Call Failed', 'Could not establish the call. Please try again.');
        }
    };

    const endCall = async (): Promise<void> => {
        try {
            const result = await workingVoiceCallService.endCall();
            setCallStatus('ended');
            stopSpeechRecognition();
            
            if (callDurationRef.current) {
                clearInterval(callDurationRef.current);
            }
            
            console.log('📞 Call ended');
            onClose();
        } catch (error) {
            console.error('❌ Error ending call:', error);
            onClose();
        }
    };

    const toggleMute = async (): Promise<void> => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        
        try {
            await workingVoiceCallService.setMicrophoneMuted(newMuteState);
            
            if (newMuteState) {
                stopSpeechRecognition();
            } else if (translationStatus.isEnabled && callStatus === 'connected') {
                startSpeechRecognition();
            }
            
            console.log(`🎤 Microphone ${newMuteState ? 'muted' : 'unmuted'}`);
        } catch (error) {
            console.error('❌ Failed to toggle mute:', error);
            // Revert state if operation failed
            setIsMuted(!newMuteState);
        }
    };

    const toggleVideo = async (): Promise<void> => {
        const newVideoState = !isVideoEnabled;
        
        try {
            if (!newVideoState) {
                // Disable video
                const result = await workingVoiceCallService.disableVideo();
                if (result.success) {
                    setIsVideoEnabled(false);
                    setIsRemoteVideoPlaying(false);
                    // Clear local preview
                    if (localVideoRef.current) {
                        try { 
                            localVideoRef.current.innerHTML = ''; 
                        } catch(e) {
                            console.warn('Could not clear local video preview:', e);
                        }
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
                                setIsRemoteVideoPlaying(true);
                                console.log('📺 Remote video playing after enabling local video');
                            } catch (e) {
                                console.warn('Could not play remote track after enabling local video', e);
                            }
                        }
                    }, 500);
                } else {
                    Alert.alert(
                        'Camera Error', 
                        result.error || 'Failed to enable camera. Please check your camera permissions.',
                        [
                            { text: 'OK' },
                            { 
                                text: 'Check Permissions', 
                                onPress: () => {
                                    Alert.alert(
                                        'Camera Permissions',
                                        'Please allow camera access in your browser settings and try again.\n\n1. Click the camera icon in your browser address bar\n2. Allow camera access for this site\n3. Refresh the page if needed',
                                        [{ text: 'OK' }]
                                    );
                                }
                            }
                        ]
                    );
                }
            }
        } catch (error) {
            console.error('❌ Failed to toggle video:', error);
            Alert.alert('Video Error', 'Failed to toggle video. Please try again.');
        }
    };

    // Format call duration
    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Effects
    useEffect(() => {
        if (visible && currentUserId && targetUserId) {
            handleCall();
            initializeSpeechRecognition();
            initializeTextToSpeech();
        }
    }, [visible, currentUserId, targetUserId]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
            callDurationRef.current = interval;
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callStatus]);

    useEffect(() => {
        if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
            startSpeechRecognition();
            
            // Start translation polling
            translationPollingRef.current = setInterval(() => {
                checkForRemoteTranslations();
            }, 1000);

            // Speech recognition health check - restart if it stops unexpectedly
            speechRecognitionHealthCheckRef.current = setInterval(() => {
                if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted && !speechRecognition.isListening) {
                    console.log('🔧 Speech recognition health check: restarting...');
                    startSpeechRecognition();
                }
            }, 2000); // Check every 2 seconds
        } else {
            stopSpeechRecognition();
            
            if (translationPollingRef.current) {
                clearInterval(translationPollingRef.current);
                translationPollingRef.current = null;
            }
            
            if (speechRecognitionHealthCheckRef.current) {
                clearInterval(speechRecognitionHealthCheckRef.current);
                speechRecognitionHealthCheckRef.current = null;
            }
        }
        
        return () => {
            if (translationPollingRef.current) {
                clearInterval(translationPollingRef.current);
            }
            if (speechRecognitionHealthCheckRef.current) {
                clearInterval(speechRecognitionHealthCheckRef.current);
            }
        };
    }, [translationStatus.isEnabled, callStatus, isMuted, speechRecognition.isListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSpeechRecognition();
            // Stop any ongoing text-to-speech
            if (textToSpeech.isSpeaking) {
                speechSynthesis.cancel();
            }
            if (callDurationRef.current) clearInterval(callDurationRef.current);
            if (translationPollingRef.current) clearInterval(translationPollingRef.current);
        };
    }, []);

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={endCall}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <ScrollView
                        style={styles.scrollContainer}
                        contentContainerStyle={styles.scrollContentContainer}
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                    >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Doctor</Text>
                        <Text style={styles.subtitle}>
                            {callStatus === 'connecting' && 'Connecting...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? `Connected - ${formatDuration(callDuration)}` : 'Waiting for other user...')}
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

                    {/* Bidirectional Translation Settings */}
                    <View style={styles.translationSectionsContainer}>
                        <Text style={styles.translationMainTitle}>🌐 Translation Settings</Text>
                        
                        {/* Customer to Agent Translation */}
                        <View style={styles.translationSection}>
                            <View style={styles.translationSectionHeader}>
                                <MaterialIcons name="arrow-forward" size={16} color="#2196F3" />
                                <Text style={styles.translationSectionTitle}>Customer → Agent</Text>
                            </View>
                            <View style={styles.languageRow}>
                                <View style={styles.languageDropdown}>
                                    <Text style={styles.languageLabel}>Customer speaks:</Text>
                                    <select 
                                        value={customerToAgent.customerSpeaking} 
                                        onChange={(e) => {
                                            disableTranslationOnLanguageChange();
                                            setCustomerToAgent(prev => ({
                                                ...prev,
                                                customerSpeaking: e.target.value,
                                                customerSpeakingName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                            }));
                                        }}
                                        style={styles.select}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </View>
                                
                                <View style={styles.languageDropdown}>
                                    <Text style={styles.languageLabel}>Agent receives:</Text>
                                    <select 
                                        value={customerToAgent.agentReceives} 
                                        onChange={(e) => {
                                            disableTranslationOnLanguageChange();
                                            setCustomerToAgent(prev => ({
                                                ...prev,
                                                agentReceives: e.target.value,
                                                agentReceivesName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                            }));
                                        }}
                                        style={styles.select}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.translationToggle, customerToAgent.isEnabled && styles.translationToggleActive]}
                                onPress={() => setCustomerToAgent(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                            >
                                <MaterialIcons 
                                    name={customerToAgent.isEnabled ? "toggle-on" : "toggle-off"} 
                                    size={24} 
                                    color={customerToAgent.isEnabled ? "#4CAF50" : "#666"} 
                                />
                                <Text style={[styles.translationToggleText, customerToAgent.isEnabled && styles.translationToggleTextActive]}>
                                    {customerToAgent.isEnabled ? 'Enabled' : 'Disabled'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Agent to Customer Translation */}
                        <View style={styles.translationSection}>
                            <View style={styles.translationSectionHeader}>
                                <MaterialIcons name="arrow-back" size={16} color="#FF9800" />
                                <Text style={styles.translationSectionTitle}>Agent → Customer</Text>
                            </View>
                            <View style={styles.languageRow}>
                                <View style={styles.languageDropdown}>
                                    <Text style={styles.languageLabel}>Agent speaks:</Text>
                                    <select 
                                        value={agentToCustomer.agentSpeaking} 
                                        onChange={(e) => {
                                            disableTranslationOnLanguageChange();
                                            setAgentToCustomer(prev => ({
                                                ...prev,
                                                agentSpeaking: e.target.value,
                                                agentSpeakingName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                            }));
                                        }}
                                        style={styles.select}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </View>
                                
                                <View style={styles.languageDropdown}>
                                    <Text style={styles.languageLabel}>Customer receives:</Text>
                                    <select 
                                        value={agentToCustomer.customerReceives} 
                                        onChange={(e) => {
                                            disableTranslationOnLanguageChange();
                                            setAgentToCustomer(prev => ({
                                                ...prev,
                                                customerReceives: e.target.value,
                                                customerReceivesName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                            }));
                                        }}
                                        style={styles.select}
                                    >
                                        {AVAILABLE_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.translationToggle, agentToCustomer.isEnabled && styles.translationToggleActive]}
                                onPress={() => setAgentToCustomer(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                            >
                                <MaterialIcons 
                                    name={agentToCustomer.isEnabled ? "toggle-on" : "toggle-off"} 
                                    size={24} 
                                    color={agentToCustomer.isEnabled ? "#4CAF50" : "#666"} 
                                />
                                <Text style={[styles.translationToggleText, agentToCustomer.isEnabled && styles.translationToggleTextActive]}>
                                    {agentToCustomer.isEnabled ? 'Enabled' : 'Disabled'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Translation Controls */}
                    <View style={styles.translationControls}>
                        <TouchableOpacity
                            style={[styles.translationButton, translationStatus.isEnabled && styles.translationButtonActive]}
                            onPress={toggleTranslation}
                            disabled={!speechRecognition.isSupported}
                        >
                            <MaterialIcons 
                                name="translate" 
                                size={20} 
                                color={translationStatus.isEnabled ? "#fff" : "#666"} 
                            />
                            <Text style={[styles.translationButtonText, translationStatus.isEnabled && styles.translationButtonTextActive]}>
                                {translationStatus.isEnabled ? 'Translation ON' : 'Translation OFF'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.testButton} onPress={testGoogleTranslate}>
                            <MaterialIcons name="science" size={16} color="#2196F3" />
                            <Text style={styles.testButtonText}>Test API</Text>
                        </TouchableOpacity>

                        {/* Test TTS Button */}
                        {textToSpeech.isSupported && (
                            <TouchableOpacity style={[styles.testButton, { borderColor: '#FF9800', backgroundColor: '#fff3e0' }]} onPress={testDirectTTSInjection}>
                                <MaterialIcons name="phone-in-talk" size={16} color="#FF9800" />
                                <Text style={[styles.testButtonText, { color: '#FF9800' }]}>Test Direct TTS</Text>
                            </TouchableOpacity>
                        )}

                        {/* Text-to-Speech Toggle */}
                        {textToSpeech.isSupported && (
                            <TouchableOpacity
                                style={[styles.ttsButton, textToSpeech.isEnabled && styles.ttsButtonActive]}
                                onPress={toggleTextToSpeech}
                            >
                                <MaterialIcons 
                                    name={textToSpeech.isEnabled ? "volume-up" : "volume-off"} 
                                    size={16} 
                                    color={textToSpeech.isEnabled ? "#4CAF50" : "#666"} 
                                />
                                <Text style={[styles.ttsButtonText, textToSpeech.isEnabled && styles.ttsButtonTextActive]}>
                                    {textToSpeech.isEnabled 
                                        ? (callStatus === 'connected' ? 'TTS→Call' : 'TTS→Local')
                                        : 'TTS OFF'
                                    }
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Speech Recognition Status & Manual Restart */}
                        {translationStatus.isEnabled && (
                            <TouchableOpacity 
                                style={[styles.micStatusButton, speechRecognition.isListening && styles.micStatusButtonActive]} 
                                onPress={restartSpeechRecognition}
                            >
                                <MaterialIcons 
                                    name={speechRecognition.isListening ? "mic" : "mic-off"} 
                                    size={16} 
                                    color={speechRecognition.isListening ? "#4CAF50" : "#ff4757"} 
                                />
                                <Text style={[styles.micStatusText, speechRecognition.isListening && styles.micStatusTextActive]}>
                                    {speechRecognition.isListening ? 'Listening' : 'Restart Mic'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Speech-to-Text Subtitles */}
                    {translationStatus.isEnabled && speechRecognition.currentSubtitle && (
                        <View style={styles.subtitleContainer}>
                            <View style={styles.subtitleHeader}>
                                <MaterialIcons name="mic" size={14} color="#2196F3" />
                                <Text style={styles.subtitleHeaderText}>
                                    🗣️ Speaking ({getCurrentSpeakingLanguage()?.name})
                                </Text>
                            </View>
                            <Text style={styles.subtitleText}>
                                "{speechRecognition.currentSubtitle.text}"
                            </Text>
                        </View>
                    )}

                    {/* Translated Subtitles */}
                    {translationStatus.isEnabled && (
                        <View style={styles.translatedSubtitleContainer}>
                            <View style={styles.translatedSubtitleHeader}>
                                <MaterialIcons name="translate" size={14} color="#4CAF50" />
                                <Text style={styles.translatedSubtitleHeaderText}>
                                    🎯 Translation ({getCurrentTargetLanguage()?.name})
                                </Text>
                            </View>
                            {(translationStatus.lastTranslation || translationStatus.isTranslating || translationStatus.error) ? (
                                <View style={styles.translatedTextRow}>
                                    <Text 
                                        style={[
                                            styles.translatedSubtitleText,
                                            {
                                                color: translationStatus.error ? '#ff4757' : '#2c3e50',
                                                flex: 1
                                            }
                                        ]}
                                    >
                                        {translationStatus.error ? translationStatus.error :
                                         translationStatus.isTranslating ? '🔄 Translating...' : `"${translationStatus.lastTranslation}"`}
                                    </Text>
                                    
                                    {/* Speaker buttons for testing TTS */}
                                    {translationStatus.lastTranslation && !translationStatus.isTranslating && !translationStatus.error && (
                                        <View style={styles.speakerButtons}>
                                            {/* Local TTS Test Button */}
                                            <TouchableOpacity
                                                style={[styles.speakerButton, { marginRight: 4 }]}
                                                onPress={() => testSpeakTranslation(translationStatus.lastTranslation)}
                                                disabled={textToSpeech.isSpeaking}
                                            >
                                                <MaterialIcons 
                                                    name={textToSpeech.isSpeaking ? "volume-up" : "play-circle-outline"} 
                                                    size={18} 
                                                    color={textToSpeech.isSpeaking ? "#FF9800" : "#4CAF50"} 
                                                />
                                            </TouchableOpacity>
                                            
                                            {/* Call Transmission Button - Direct Audio Injection */}
                                            {callStatus === 'connected' && (
                                                <TouchableOpacity
                                                    style={[styles.speakerButton, styles.callSpeakerButton]}
                                                    onPress={() => {
                                                        // Determine target language
                                                        let targetLanguage = 'en';
                                                        if (agentToCustomer.isEnabled && customerToAgent.isEnabled) {
                                                            targetLanguage = agentToCustomer.customerReceives;
                                                        } else if (agentToCustomer.isEnabled) {
                                                            targetLanguage = agentToCustomer.customerReceives;
                                                        } else if (customerToAgent.isEnabled) {
                                                            targetLanguage = customerToAgent.agentReceives;
                                                        } else {
                                                            targetLanguage = languageExchange.myTargetLanguage;
                                                        }
                                                        
                                                        // Use the new direct audio injection method
                                                        speakTranslatedTextForCallTransmission(translationStatus.lastTranslation, targetLanguage);
                                                    }}
                                                    disabled={textToSpeech.isSpeaking}
                                                >
                                                    <MaterialIcons 
                                                        name="phone" 
                                                        size={16} 
                                                        color={textToSpeech.isSpeaking ? "#FF9800" : "#2196F3"} 
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text style={styles.translatedSubtitlePlaceholder}>
                                    💬 Speak to see {getCurrentTargetLanguage()?.name} translation here
                                </Text>
                            )}
                        </View>
                    )}

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

                        {/* End Call Button */}
                        <TouchableOpacity 
                            style={styles.endCallButton} 
                            onPress={endCall}
                        >
                            <MaterialIcons name="call-end" size={30} color="white" />
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
                    </View>

                    {/* Success Message */}
                    {callStatus === 'connected' && isRemoteUserConnected && (
                        <Text style={styles.successMessage}>
                            🎉 Voice call is working! Translation is active!
                            {translationStatus.isEnabled && ' 🌐 Translation enabled!'}
                            {isVideoEnabled && ' 📹 Video enabled!'}
                        </Text>
                    )}

                    {/* Video Status */}
                    {isVideoEnabled && (
                        <View style={styles.translationStatusContainer}>
                            <MaterialIcons name="videocam" size={16} color="#27ae60" />
                            <Text style={[styles.translationStatusText, { color: '#27ae60' }]}>
                                Video is ON
                            </Text>
                        </View>
                    )}

                    {/* Translation Status */}
                    {translationStatus.isEnabled && (customerToAgent.isEnabled || agentToCustomer.isEnabled) && (
                        <View style={styles.translationStatusContainer}>
                            <MaterialIcons name="translate" size={16} color="#4CAF50" />
                            <Text style={styles.translationStatusText}>
                                {speechRecognition.isListening ? 
                                 `🎤 Listening for ${customerToAgent.isEnabled ? customerToAgent.customerSpeakingName : agentToCustomer.agentSpeakingName}...` : 
                                 '⚠️ Speech recognition stopped - click "Restart Mic" above'}
                            </Text>
                        </View>
                    )}

                    {/* Text-to-Speech Status */}
                    {textToSpeech.isEnabled && textToSpeech.isSpeaking && (
                        <View style={styles.translationStatusContainer}>
                            <MaterialIcons name="volume-up" size={16} color="#FF9800" />
                            <Text style={[styles.translationStatusText, { color: '#FF9800' }]}>
                                🗣️ {callStatus === 'connected' ? 'Transmitting translated speech through call...' : 'Speaking translated text...'}
                            </Text>
                        </View>
                    )}

                    {/* TTS Instructions */}
                    {textToSpeech.isEnabled && callStatus === 'connected' && (
                        <View style={[styles.translationStatusContainer, { backgroundColor: '#e8f4fd' }]}>
                            <MaterialIcons name="info" size={16} color="#1976D2" />
                            <Text style={[styles.translationStatusText, { color: '#1976D2', fontSize: 11 }]}>
                                💡 Use the 📞 button next to translations to test call transmission
                            </Text>
                        </View>
                    )}

                    {/* Show active translation directions */}
                    {(customerToAgent.isEnabled || agentToCustomer.isEnabled) && (
                        <View style={styles.activeTranslationsContainer}>
                            <Text style={styles.activeTranslationsTitle}>Active Translations:</Text>
                            {customerToAgent.isEnabled && (
                                <Text style={styles.activeTranslationItem}>
                                    → Customer ({customerToAgent.customerSpeakingName}) to Agent ({customerToAgent.agentReceivesName})
                                </Text>
                            )}
                            {agentToCustomer.isEnabled && (
                                <Text style={styles.activeTranslationItem}>
                                    ← Agent ({agentToCustomer.agentSpeakingName}) to Customer ({agentToCustomer.customerReceivesName})
                                </Text>
                            )}
                        </View>
                    )}
                    </ScrollView>
                </View>
            </View>
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
        width: '85%',
        maxWidth: 700,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        padding: 30,
        alignItems: 'center',
        minHeight: '100%',
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
        marginBottom: 20,
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
    languageSelectionContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        width: '100%',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    languageSelectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 12,
        textAlign: 'center',
    },
    languageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    languageDropdown: {
        flex: 1,
    },
    languageLabel: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 5,
        fontWeight: '500',
    },
    select: {
        backgroundColor: '#fff',
        border: '1px solid #ced4da',
        borderRadius: 5,
        padding: 8,
        fontSize: 14,
        color: '#495057',
    } as any,
    translationControls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    translationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9ecef',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    translationButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    translationButtonText: {
        color: '#6c757d',
        fontSize: 14,
        fontWeight: '600',
    },
    translationButtonTextActive: {
        color: '#fff',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        gap: 4,
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    testButtonText: {
        color: '#2196F3',
        fontSize: 12,
        fontWeight: '600',
    },
    micStatusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        gap: 4,
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    micStatusButtonActive: {
        backgroundColor: '#d4edda',
        borderColor: '#4CAF50',
    },
    micStatusText: {
        color: '#856404',
        fontSize: 12,
        fontWeight: '600',
    },
    micStatusTextActive: {
        color: '#155724',
    },
    ttsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3e5f5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        gap: 4,
        borderWidth: 1,
        borderColor: '#9c27b0',
    },
    ttsButtonActive: {
        backgroundColor: '#e8f5e8',
        borderColor: '#4CAF50',
    },
    ttsButtonText: {
        color: '#9c27b0',
        fontSize: 12,
        fontWeight: '600',
    },
    ttsButtonTextActive: {
        color: '#4CAF50',
    },
    translationSectionsContainer: {
        width: '100%',
        marginBottom: 15,
    },
    translationMainTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 12,
        textAlign: 'center',
    },
    translationSection: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    translationSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    translationSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#495057',
    },
    translationToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 6,
    },
    translationToggleActive: {
        // No additional styles needed as the toggle icon changes color
    },
    translationToggleText: {
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '600',
    },
    translationToggleTextActive: {
        color: '#4CAF50',
    },
    subtitleContainer: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        width: '100%',
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    subtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    subtitleHeaderText: {
        color: '#1976D2',
        fontSize: 12,
        fontWeight: '600',
    },
    subtitleText: {
        color: '#2c3e50',
        fontSize: 14,
        lineHeight: 18,
    },
    translatedSubtitleContainer: {
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        width: '100%',
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: '#4CAF50',
    },
    translatedSubtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    translatedSubtitleHeaderText: {
        color: '#388E3C',
        fontSize: 12,
        fontWeight: '600',
    },
    translatedSubtitleText: {
        color: '#2c3e50',
        fontSize: 14,
        lineHeight: 18,
    },
    translatedTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    speakerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    speakerButton: {
        padding: 6,
        borderRadius: 15,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 1,
        borderColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 32,
        minHeight: 32,
    },
    callSpeakerButton: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderColor: '#2196F3',
    },
    translatedSubtitlePlaceholder: {
        color: '#9e9e9e',
        fontSize: 12,
        fontStyle: 'italic',
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
    translationStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    translationStatusText: {
        fontSize: 12,
        color: '#4CAF50',
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
    activeTranslationsContainer: {
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#c8e6c9',
    },
    activeTranslationsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2e7d32',
        marginBottom: 6,
    },
    activeTranslationItem: {
        fontSize: 13,
        color: '#388e3c',
        marginBottom: 3,
        paddingLeft: 8,
    },
});

export default WorkingVoiceCallModal;
