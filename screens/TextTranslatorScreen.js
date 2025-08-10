// LiveChatApp/screens/TextTranslatorScreen.js
import React, { useState, useRef } from 'react';
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
    const inputRef = useRef(null);

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
                        onPress={() => {/* Could implement source language selector */}}
                    >
                        <Text style={styles.languageButtonText}>
                            {sourceLanguage === 'en' ? t('english') : sourceLanguage.toUpperCase()}
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
                    style={styles.textInput}
                    multiline
                    placeholder={t('paste_text_placeholder')}
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
    disabledButton: {
        backgroundColor: '#bdc3c7',
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
