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

// Available languages for manual selection
const AVAILABLE_LANGUAGES: Language[] = [
    { code: 'en-US', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr-FR', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'de-DE', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'it-IT', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
    { code: 'ru-RU', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
    { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
    { code: 'ko-KR', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
    { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
    { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
    { code: 'te-IN', name: 'Telugu', flag: '🇮🇳', nativeName: 'తెలుగు' },
    { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
    { code: 'tl-PH', name: 'Filipino', flag: '🇵🇭', nativeName: 'Filipino' }
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
    
    // Language exchange state for manual selection
    const [languageExchange, setLanguageExchange] = useState<LanguageExchange>({
        myLanguage: 'en-US',
        myLanguageName: 'English',
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

    // Refs for managing intervals and speech recognition
    const callDurationRef = useRef<NodeJS.Timeout | null>(null);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const speechRecognitionHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
    const translationPollingRef = useRef<NodeJS.Timeout | null>(null);

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
                sourceLanguage: sourceLang,
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

    // Process speech recognition result and translate
    const processTranslationAndShare = async (originalText: string, confidence: number): Promise<void> => {
        if (!languageExchange.myTargetLanguage || !languageExchange.myTargetLanguageName) {
            console.log('🌐 Translation skipped: Target language not selected');
            return;
        }

        try {
            const translationResult = await translateText(
                originalText,
                languageExchange.myLanguage,
                languageExchange.myTargetLanguage
            );

            if (translationResult.success && translationResult.translatedText) {
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
                    myTranslations: [...prev.myTranslations.slice(-4), translationMessage],
                    lastTranslationId: translationMessage.id
                }));

                await shareTranslationMessage(translationMessage);
                console.log(`✅ Translation shared: "${translationMessage.translatedText}"`);
            }
        } catch (error) {
            console.error('❌ Translation process failed:', error);
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
            recognition.lang = languageExchange.myLanguage || 'en-US';

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
                
                // Auto-restart if translation is enabled
                if (translationStatus.isEnabled && callStatus === 'connected' && !isMuted) {
                    setTimeout(() => startSpeechRecognition(), 1000);
                }
            };

            speechRecognitionRef.current = recognition;
            setSpeechRecognition(prev => ({ ...prev, isSupported: true }));
            
            console.log('🎤 Speech recognition initialized');
        } else {
            console.warn('🎤 Speech recognition not supported');
            setSpeechRecognition(prev => ({ ...prev, isSupported: false }));
        }
    };

    // Start speech recognition
    const startSpeechRecognition = (): void => {
        if (speechRecognitionRef.current && !speechRecognition.isListening) {
            try {
                speechRecognitionRef.current.lang = languageExchange.myLanguage || 'en-US';
                speechRecognitionRef.current.start();
                setSpeechRecognition(prev => ({ ...prev, isListening: true }));
                console.log(`🎤 Speech recognition started in ${languageExchange.myLanguage}`);
            } catch (error) {
                console.error('🎤 Failed to start speech recognition:', error);
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

    // Toggle translation
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
    };

    // Test Google Translate API
    const testGoogleTranslate = async (): Promise<void> => {
        try {
            console.log('🧪 Testing Google Translate API...');
            const testText = 'Hello world, this is a translation test!';
            const targetLanguage = languageExchange.myLanguage === 'en-US' ? 'es-ES' : 'en-US';
            
            const result = await translateText(testText, languageExchange.myLanguage, targetLanguage);
            
            if (result.success) {
                Alert.alert(
                    '✅ Translation Test Successful!',
                    `Original: "${result.originalText}"\nTranslated: "${result.translatedText}"\n\nGoogle Translate API is working correctly!`,
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
            await workingVoiceCallService.initializeCall(currentUserId, targetUserId);
            setCallStatus('connected');
            setIsRemoteUserConnected(true);
            
            console.log('📞 Call connected successfully');
        } catch (error) {
            console.error('❌ Call failed:', error);
            setCallStatus('ended');
            Alert.alert('Call Failed', 'Could not establish the call. Please try again.');
        }
    };

    const endCall = (): void => {
        try {
            workingVoiceCallService.endCall();
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

    const toggleMute = (): void => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        workingVoiceCallService.toggleMute(newMuteState);
        
        if (newMuteState) {
            stopSpeechRecognition();
        } else if (translationStatus.isEnabled && callStatus === 'connected') {
            startSpeechRecognition();
        }
        
        console.log(`🎤 Microphone ${newMuteState ? 'muted' : 'unmuted'}`);
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
        } else {
            stopSpeechRecognition();
            
            if (translationPollingRef.current) {
                clearInterval(translationPollingRef.current);
                translationPollingRef.current = null;
            }
        }
        
        return () => {
            if (translationPollingRef.current) {
                clearInterval(translationPollingRef.current);
            }
        };
    }, [translationStatus.isEnabled, callStatus, isMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSpeechRecognition();
            if (callDurationRef.current) clearInterval(callDurationRef.current);
            if (translationPollingRef.current) clearInterval(translationPollingRef.current);
        };
    }, []);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.targetUserName}>{targetUserName}</Text>
                    <Text style={styles.callStatus}>
                        {callStatus === 'connecting' && '📞 Connecting...'}
                        {callStatus === 'connected' && `📞 Connected - ${formatDuration(callDuration)}`}
                        {callStatus === 'ended' && '📞 Call Ended'}
                    </Text>
                </View>

                {/* Video Area Placeholder */}
                <View style={styles.videoContainer}>
                    <View style={styles.localVideoPlaceholder}>
                        <MaterialIcons name="person" size={80} color="#666" />
                        <Text style={styles.videoPlaceholderText}>You</Text>
                    </View>
                    
                    <View style={styles.remoteVideoPlaceholder}>
                        <MaterialIcons name="person" size={100} color="#666" />
                        <Text style={styles.videoPlaceholderText}>{targetUserName}</Text>
                        {!isRemoteUserConnected && (
                            <Text style={styles.connectionStatus}>Waiting to connect...</Text>
                        )}
                    </View>
                </View>

                {/* Manual Language Selection */}
                <View style={styles.languageSelectionContainer}>
                    <Text style={styles.languageSelectionTitle}>🗣️ Language Settings</Text>
                    
                    <View style={styles.languageRow}>
                        <View style={styles.languageDropdown}>
                            <Text style={styles.languageLabel}>Speaking:</Text>
                            <select 
                                value={languageExchange.myLanguage} 
                                onChange={(e) => setLanguageExchange(prev => ({
                                    ...prev,
                                    myLanguage: e.target.value,
                                    myLanguageName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                }))}
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
                            <Text style={styles.languageLabel}>Translate to:</Text>
                            <select 
                                value={languageExchange.myTargetLanguage} 
                                onChange={(e) => setLanguageExchange(prev => ({
                                    ...prev,
                                    myTargetLanguage: e.target.value,
                                    myTargetLanguageName: AVAILABLE_LANGUAGES.find(l => l.code === e.target.value)?.name || 'Unknown'
                                }))}
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
                            size={24} 
                            color={translationStatus.isEnabled ? "#fff" : "#666"} 
                        />
                        <Text style={[styles.translationButtonText, translationStatus.isEnabled && styles.translationButtonTextActive]}>
                            {translationStatus.isEnabled ? 'Translation ON' : 'Translation OFF'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.testButton} onPress={testGoogleTranslate}>
                        <MaterialIcons name="science" size={20} color="#2196F3" />
                        <Text style={styles.testButtonText}>Test API</Text>
                    </TouchableOpacity>
                </View>

                {/* Speech-to-Text Subtitles */}
                {translationStatus.isEnabled && speechRecognition.currentSubtitle && (
                    <View style={styles.subtitleContainer}>
                        <View style={styles.subtitleHeader}>
                            <MaterialIcons name="mic" size={16} color="#2196F3" />
                            <Text style={styles.subtitleHeaderText}>
                                🗣️ Speaking ({getCurrentSpeakingLanguage()?.name})
                            </Text>
                        </View>
                        <View style={styles.subtitleTextContainer}>
                            <Text style={styles.subtitleText}>
                                "{speechRecognition.currentSubtitle.text}"
                            </Text>
                        </View>
                    </View>
                )}

                {/* Translated Subtitles */}
                {translationStatus.isEnabled && (
                    <View style={styles.translatedSubtitleContainer}>
                        <View style={styles.translatedSubtitleHeader}>
                            <MaterialIcons name="translate" size={16} color="#4CAF50" />
                            <Text style={styles.translatedSubtitleHeaderText}>
                                🎯 Translation ({getCurrentTargetLanguage()?.name})
                            </Text>
                        </View>
                        <View style={styles.translatedSubtitleTextContainer}>
                            {(translationStatus.lastTranslation || translationStatus.isTranslating || translationStatus.error) ? (
                                <Text 
                                    style={[
                                        styles.translatedSubtitleText,
                                        {
                                            color: translationStatus.error ? '#ff4757' : '#333'
                                        }
                                    ]}
                                >
                                    {translationStatus.error ? translationStatus.error :
                                     translationStatus.isTranslating ? '🔄 Translating...' : `"${translationStatus.lastTranslation}"`}
                                </Text>
                            ) : (
                                <Text style={styles.translatedSubtitlePlaceholder}>
                                    💬 Speak to see {getCurrentTargetLanguage()?.name} translation here
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Call Controls */}
                <View style={styles.callControls}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                        <MaterialIcons 
                            name={isMuted ? "mic-off" : "mic"} 
                            size={30} 
                            color={isMuted ? "#f44336" : "#666"} 
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
                        <MaterialIcons name="call-end" size={30} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton} onPress={() => setIsVideoEnabled(!isVideoEnabled)}>
                        <MaterialIcons 
                            name={isVideoEnabled ? "videocam" : "videocam-off"} 
                            size={30} 
                            color={isVideoEnabled ? "#4CAF50" : "#666"} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Translation Status */}
                {translationStatus.isEnabled && (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>
                            🎤 {speechRecognition.isListening ? 'Listening...' : 'Ready to listen'}
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'space-between',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    targetUserName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    callStatus: {
        color: '#ccc',
        fontSize: 16,
    },
    videoContainer: {
        flex: 1,
        position: 'relative',
        margin: 20,
    },
    remoteVideoPlaceholder: {
        flex: 1,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
    },
    localVideoPlaceholder: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 120,
        height: 160,
        backgroundColor: '#555',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        zIndex: 10,
    },
    videoPlaceholderText: {
        color: '#ccc',
        marginTop: 10,
        fontSize: 16,
    },
    connectionStatus: {
        color: '#ff9800',
        marginTop: 10,
        fontSize: 14,
    },
    languageSelectionContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        margin: 20,
        padding: 15,
        borderRadius: 10,
    },
    languageSelectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
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
        color: '#fff',
        fontSize: 14,
        marginBottom: 5,
    },
    select: {
        backgroundColor: '#333',
        color: '#fff',
        border: '1px solid #555',
        borderRadius: 5,
        padding: 8,
        fontSize: 14,
    } as any,
    translationControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        gap: 15,
    },
    translationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    translationButtonActive: {
        backgroundColor: '#4CAF50',
    },
    translationButtonText: {
        color: '#ccc',
        fontSize: 16,
        fontWeight: '600',
    },
    translationButtonTextActive: {
        color: '#fff',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 5,
    },
    testButtonText: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '600',
    },
    subtitleContainer: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        margin: 20,
        marginBottom: 10,
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    subtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    subtitleHeaderText: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '600',
    },
    subtitleTextContainer: {
        minHeight: 30,
        justifyContent: 'center',
    },
    subtitleText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    translatedSubtitleContainer: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        margin: 20,
        marginTop: 0,
        marginBottom: 10,
        padding: 15,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    translatedSubtitleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    translatedSubtitleHeaderText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    translatedSubtitleTextContainer: {
        minHeight: 30,
        justifyContent: 'center',
    },
    translatedSubtitleText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    translatedSubtitlePlaceholder: {
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
    },
    callControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 30,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f44336',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusContainer: {
        alignItems: 'center',
        paddingBottom: 10,
    },
    statusText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default WorkingVoiceCallModal;
