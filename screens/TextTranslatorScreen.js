// LiveChatApp/screens/TextTranslatorScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    Alert,
    ActivityIndicator 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../context/TranslationContext';
import { useTextToSpeech } from '../context/TextToSpeechContext';
import { translateText } from '../translationService';
import LanguageSelector from '../components/LanguageSelector';
import GoogleSpeechToText from '../services/googleSpeechToText';

const TextTranslatorScreen = () => {
    const navigation = useNavigation();
    const { t, currentLanguage } = useTranslation();
    const { speak, stopSpeech, initializeAudioPermissions } = useTextToSpeech();
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const [audioInitialized, setAudioInitialized] = useState(false);
    const [sourceLanguage, setSourceLanguage] = useState('en');
    const [isListening, setIsListening] = useState(false);
    const [googleSTT, setGoogleSTT] = useState(null);
    const [speechSupported, setSpeechSupported] = useState(false);
    const inputRef = useRef(null);

    // Map language codes to speech recognition language codes
    const getRecognitionLanguage = (langCode) => {
        const languageMap = {
            'en': 'en-US',
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
            'te': 'te-IN',
            'ta': 'ta-IN',
            'bn': 'bn-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'or': 'or-IN',
            'pa': 'pa-IN',
            'ur': 'ur-IN',
            'ne': 'ne-NP',
            'si': 'si-LK',
            'my': 'my-MM',
            'th': 'th-TH',
            'vi': 'vi-VN',
            'id': 'id-ID',
            'ms': 'ms-MY',
            'tl': 'tl-PH',
            'sw': 'sw-KE',
            'am': 'am-ET',
            'tr': 'tr-TR',
            'fa': 'fa-IR',
            'he': 'he-IL',
            'nl': 'nl-NL',
            'sv': 'sv-SE',
            'da': 'da-DK',
            'no': 'no-NO',
            'fi': 'fi-FI',
            'pl': 'pl-PL',
            'cs': 'cs-CZ',
            'sk': 'sk-SK',
            'hu': 'hu-HU',
            'ro': 'ro-RO',
            'bg': 'bg-BG',
            'hr': 'hr-HR',
            'sr': 'sr-RS',
            'sl': 'sl-SI',
            'et': 'et-EE',
            'lv': 'lv-LV',
            'lt': 'lt-LT',
            'uk': 'uk-UA',
            'be': 'be-BY',
            'ka': 'ka-GE',
            'hy': 'hy-AM',
            'az': 'az-AZ',
            'kk': 'kk-KZ',
            'ky': 'ky-KG',
            'uz': 'uz-UZ',
            'mn': 'mn-MN'
        };
        return languageMap[langCode] || 'en-US';
    };

    // Get display name for language
    const getLanguageName = (langCode) => {
        const languageNames = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'te': 'Telugu',
            'ta': 'Tamil',
            'bn': 'Bengali',
            'mr': 'Marathi',
            'gu': 'Gujarati',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'or': 'Odia',
            'pa': 'Punjabi',
            'ur': 'Urdu',
            'ne': 'Nepali',
            'si': 'Sinhala',
            'my': 'Myanmar',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'id': 'Indonesian',
            'ms': 'Malay',
            'tl': 'Filipino',
            'sw': 'Swahili',
            'am': 'Amharic',
            'tr': 'Turkish',
            'fa': 'Persian',
            'he': 'Hebrew',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish',
            'pl': 'Polish',
            'cs': 'Czech',
            'sk': 'Slovak',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'bg': 'Bulgarian',
            'hr': 'Croatian',
            'sr': 'Serbian',
            'sl': 'Slovenian',
            'et': 'Estonian',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'uk': 'Ukrainian',
            'be': 'Belarusian',
            'ka': 'Georgian',
            'hy': 'Armenian',
            'az': 'Azerbaijani',
            'kk': 'Kazakh',
            'ky': 'Kyrgyz',
            'uz': 'Uzbek',
            'mn': 'Mongolian'
        };
        return languageNames[langCode] || langCode.toUpperCase();
    };

    // Initialize Speech Recognition with Web Speech API (more reliable)
    useEffect(() => {
        const initializeSpeechRecognition = () => {
            try {
                console.log('Initializing speech recognition...');
                
                // Primary: Web Speech API
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    
                    // Configuration
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    recognition.lang = getRecognitionLanguage(sourceLanguage);
                    
                    // Event handlers
                    recognition.onstart = () => {
                        console.log('Speech recognition started');
                        setIsListening(true);
                    };
                    
                    recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        const confidence = event.results[0][0].confidence;
                        
                        console.log('Speech recognized:', transcript, 'Confidence:', confidence);
                        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
                        setIsListening(false);
                    };
                    
                    recognition.onerror = (event) => {
                        console.error('Speech recognition error:', event.error);
                        setIsListening(false);
                        
                        if (event.error === 'not-allowed') {
                            Alert.alert('Microphone Access Denied', 'Please allow microphone access to use speech recognition.');
                        } else if (event.error === 'no-speech') {
                            Alert.alert('No Speech Detected', 'Please try speaking again.');
                        } else {
                            Alert.alert('Speech Recognition Error', `Error: ${event.error}`);
                        }
                    };
                    
                    recognition.onend = () => {
                        console.log('Speech recognition ended');
                        setIsListening(false);
                    };
                    
                    setGoogleSTT({ webSpeechAPI: recognition });
                    setSpeechSupported(true);
                    console.log('Web Speech API initialized successfully');
                    
                } else {
                    console.warn('Speech recognition not supported in this browser');
                    setSpeechSupported(false);
                    Alert.alert('Not Supported', 'Speech recognition is not supported in this browser. Please use Chrome or a compatible browser.');
                }
                
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                setSpeechSupported(false);
                Alert.alert('Initialization Error', 'Failed to initialize speech recognition.');
            }
        };

        initializeSpeechRecognition();
    }, [sourceLanguage]);

    const handleStartListening = async () => {
        if (!googleSTT || !googleSTT.webSpeechAPI) {
            Alert.alert('Error', 'Speech recognition not available. Please use a supported browser like Chrome.');
            return;
        }

        // Check if already listening
        if (isListening) {
            console.log('Already listening, ignoring start request');
            return;
        }

        try {
            console.log('Starting speech recognition for language:', sourceLanguage);
            
            // Update language before starting
            googleSTT.webSpeechAPI.lang = getRecognitionLanguage(sourceLanguage);
            
            // Start recognition
            googleSTT.webSpeechAPI.start();
            
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
            
            if (error.name === 'InvalidStateError') {
                Alert.alert('Speech Recognition Busy', 'Please wait a moment and try again.');
            } else {
                Alert.alert('Recording Error', `Failed to start recording: ${error.message}`);
            }
        }
    };

    const handleStopListening = async () => {
        if (!googleSTT || !googleSTT.webSpeechAPI || !isListening) {
            return;
        }

        try {
            console.log('Stopping speech recognition...');
            googleSTT.webSpeechAPI.stop();
            setIsListening(false);
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            setIsListening(false);
        }
    };

    const handleSourceLanguageToggle = () => {
        const commonLanguages = ['en', 'es', 'fr', 'de', 'it', 'hi', 'te', 'ta', 'ar', 'zh', 'ja'];
        const currentIndex = commonLanguages.indexOf(sourceLanguage);
        const nextIndex = (currentIndex + 1) % commonLanguages.length;
        setSourceLanguage(commonLanguages[nextIndex]);
    };

    const handleTranslate = async () => {
        if (!inputText.trim()) {
            Alert.alert('Error', 'Please enter some text to translate');
            return;
        }

        if (currentLanguage === sourceLanguage) {
            Alert.alert('Info', 'Source and target languages are the same');
            return;
        }

        setIsTranslating(true);
        try {
            const result = await translateText(inputText, currentLanguage, sourceLanguage);
            setTranslatedText(result.translatedText);
        } catch (error) {
            console.error('Translation error:', error);
            Alert.alert('Translation Error', 'Failed to translate text. Please try again.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleReadOriginal = async () => {
        if (!inputText.trim()) {
            Alert.alert('Error', 'No text to read');
            return;
        }

        if (!audioInitialized) {
            initializeAudioPermissions();
            setAudioInitialized(true);
        }

        if (isReading) {
            stopSpeech();
            setIsReading(false);
        } else {
            setIsReading(true);
            try {
                await speak(inputText, sourceLanguage);
                setIsReading(false);
            } catch (error) {
                console.error('TTS error:', error);
                setIsReading(false);
            }
        }
    };

    const handleReadTranslated = async () => {
        if (!translatedText.trim()) {
            Alert.alert('Error', 'No translated text to read. Please translate first.');
            return;
        }

        if (!audioInitialized) {
            initializeAudioPermissions();
            setAudioInitialized(true);
        }

        if (isReading) {
            stopSpeech();
            setIsReading(false);
        } else {
            setIsReading(true);
            try {
                await speak(translatedText, currentLanguage);
                setIsReading(false);
            } catch (error) {
                console.error('TTS error:', error);
                setIsReading(false);
            }
        }
    };

    const handleClearText = () => {
        setInputText('');
        setTranslatedText('');
        if (isReading) {
            stopSpeech();
            setIsReading(false);
        }
    };

    const handlePasteFromClipboard = async () => {
        // This would require expo-clipboard for full functionality
        // For now, we'll focus on manual text input
        inputRef.current?.focus();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <MaterialIcons name="arrow-back" size={24} color="#3498db" />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{t('text_translator_title')}</Text>
            
            {/* Language Selection */}
            <View style={styles.languageSection}>
                <View style={styles.languageRow}>
                    <Text style={styles.languageLabel}>{t('from_language')}</Text>
                    <TouchableOpacity 
                        style={styles.languageButton}
                        onPress={handleSourceLanguageToggle}
                    >
                        <Text style={styles.languageButtonText}>
                            {getLanguageName(sourceLanguage)}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <MaterialIcons name="swap-horiz" size={24} color="#3498db" style={styles.swapIcon} />
                
                <View style={styles.languageRow}>
                    <Text style={styles.languageLabel}>{t('to_language')}</Text>
                    <LanguageSelector buttonStyle={styles.languageButton} />
                </View>
            </View>

            {/* Input Text Section */}
            <View style={styles.textSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('original_text')}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handlePasteFromClipboard}
                        >
                            <MaterialIcons name="content-paste" size={20} color="#3498db" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.actionButton, 
                                isListening && styles.activeButton,
                                !speechSupported && styles.disabledButton
                            ]}
                            onPress={isListening ? handleStopListening : handleStartListening}
                            disabled={!speechSupported}
                        >
                            <MaterialIcons 
                                name={isListening ? "mic_off" : "mic"} 
                                size={20} 
                                color={
                                    !speechSupported ? "#bdc3c7" : 
                                    isListening ? "#e74c3c" : "#3498db"
                                } 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, isReading && styles.activeButton]}
                            onPress={handleReadOriginal}
                        >
                            <MaterialIcons 
                                name={isReading ? "volume_off" : "volume_up"} 
                                size={20} 
                                color={isReading ? "#e74c3c" : "#3498db"} 
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleClearText}
                        >
                            <MaterialIcons name="clear" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <TextInput
                    ref={inputRef}
                    style={[styles.textInput, isListening && styles.listeningInput]}
                    multiline
                    placeholder={
                        isListening 
                            ? `🎤 Listening in ${getLanguageName(sourceLanguage)}...` 
                            : t('paste_text_placeholder')
                    }
                    value={inputText}
                    onChangeText={setInputText}
                    textAlignVertical="top"
                />
            </View>

            {/* Translate Button */}
            <TouchableOpacity
                style={[styles.translateButton, isTranslating && styles.disabledButton]}
                onPress={handleTranslate}
                disabled={isTranslating}
            >
                {isTranslating ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <MaterialIcons name="translate" size={24} color="#fff" />
                )}
                <Text style={styles.translateButtonText}>
                    {isTranslating ? t('translating_button') : t('translate_button')}
                </Text>
            </TouchableOpacity>

            {/* Translated Text Section */}
            <View style={styles.textSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('translated_text')}</Text>
                    <TouchableOpacity
                        style={[styles.actionButton, isReading && styles.activeButton]}
                        onPress={handleReadTranslated}
                        disabled={!translatedText.trim()}
                    >
                        <MaterialIcons 
                            name={isReading ? "volume_off" : "volume_up"} 
                            size={20} 
                            color={translatedText.trim() ? (isReading ? "#e74c3c" : "#3498db") : "#bdc3c7"} 
                        />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.translatedTextContainer}>
                    <Text style={[styles.translatedText, !translatedText && styles.placeholderText]}>
                        {translatedText || t('translated_text_placeholder')}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
    },
    backButtonText: {
        fontSize: 16,
        color: '#3498db',
        marginLeft: 8,
        fontWeight: '500',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 30,
    },
    languageSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    languageLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        width: 60,
    },
    languageButton: {
        flex: 1,
        backgroundColor: '#ecf0f1',
        padding: 12,
        borderRadius: 8,
        marginLeft: 10,
    },
    languageButtonText: {
        fontSize: 16,
        color: '#2c3e50',
        textAlign: 'center',
    },
    swapIcon: {
        alignSelf: 'center',
        marginVertical: 5,
    },
    textSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#ecf0f1',
    },
    activeButton: {
        backgroundColor: '#fee',
    },
    disabledButton: {
        backgroundColor: '#f8f9fa',
        opacity: 0.5,
    },
    textInput: {
        minHeight: 150,
        maxHeight: 300,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    listeningInput: {
        borderColor: '#e74c3c',
        borderWidth: 2,
        backgroundColor: '#fff5f5',
    },
    translateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    translateButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    translatedTextContainer: {
        minHeight: 150,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 15,
        backgroundColor: '#fafafa',
    },
    translatedText: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 24,
    },
    placeholderText: {
        color: '#7f8c8d',
        fontStyle: 'italic',
    },
});

export default TextTranslatorScreen;