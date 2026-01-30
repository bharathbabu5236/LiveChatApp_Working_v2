// Translation Controls Component for Live Voice Call Translation
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import liveTranslationService from '../services/liveTranslationService';
import { SUPPORTED_LANGUAGES } from '../translationService';

const TranslationControls = ({ 
    isVisible = true,
    isCallActive = false,
    onTranslationToggle,
    onLanguageChange,
    style = {}
}) => {
    const [isTranslationActive, setIsTranslationActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sourceLanguage, setSourceLanguage] = useState('en');
    const [targetLanguage, setTargetLanguage] = useState('es');
    const [translationHistory, setTranslationHistory] = useState([]);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [showTranslationHistory, setShowTranslationHistory] = useState(false);
    const [currentTranslation, setCurrentTranslation] = useState(null);

    useEffect(() => {
        // Set up translation service callbacks
        liveTranslationService.onTranslationResult = (result) => {
            console.log('📝 Translation result received:', result);
            setTranslationHistory(prev => [...prev, result]);
            setCurrentTranslation(result);
            
            // Auto-hide current translation after 5 seconds
            setTimeout(() => {
                setCurrentTranslation(null);
            }, 5000);
        };

        liveTranslationService.onTranslationError = (error) => {
            console.error('Translation error:', error);
            Alert.alert(
                'Translation Error',
                'There was an error with the translation. Please check your microphone and internet connection.',
                [{ text: 'OK' }]
            );
        };

        liveTranslationService.onStatusChange = (status) => {
            console.log('📊 Translation status changed:', status);
            setIsTranslationActive(status.isActive);
            setIsListening(status.isListening || false);
        };

        return () => {
            // Cleanup callbacks
            liveTranslationService.onTranslationResult = null;
            liveTranslationService.onTranslationError = null;
            liveTranslationService.onStatusChange = null;
        };
    }, []);

    const handleToggleTranslation = async () => {
        try {
            if (isTranslationActive) {
                // Stop translation
                const result = await liveTranslationService.stopLiveTranslation();
                if (result.success) {
                    setIsTranslationActive(false);
                    console.log('🛑 Translation stopped');
                }
            } else {
                // Start translation
                const result = await liveTranslationService.startLiveTranslation(sourceLanguage, targetLanguage);
                if (result.success) {
                    setIsTranslationActive(true);
                    console.log('🌍 Translation started');
                } else {
                    Alert.alert(
                        'Translation Failed',
                        result.error || 'Could not start translation. Please check your microphone permissions.',
                        [{ text: 'OK' }]
                    );
                }
            }
            
            // Notify parent component
            if (onTranslationToggle) {
                onTranslationToggle(isTranslationActive);
            }
        } catch (error) {
            console.error('Failed to toggle translation:', error);
            Alert.alert('Error', 'Failed to toggle translation. Please try again.');
        }
    };

    const handleLanguageChange = (type, language) => {
        if (type === 'source') {
            setSourceLanguage(language);
        } else {
            setTargetLanguage(language);
        }
        
        // Update service languages
        liveTranslationService.setLanguages(
            type === 'source' ? language : sourceLanguage,
            type === 'target' ? language : targetLanguage
        );
        
        // Notify parent
        if (onLanguageChange) {
            onLanguageChange(type, language);
        }
        
        setShowLanguageSelector(false);
    };

    const formatCallDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible || !isCallActive) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            {/* Main Translation Toggle */}
            <View style={styles.mainControls}>
                <TouchableOpacity
                    style={[
                        styles.translationToggle,
                        isTranslationActive ? styles.activeButton : styles.inactiveButton
                    ]}
                    onPress={handleToggleTranslation}
                >
                    <MaterialIcons
                        name={isTranslationActive ? "g-translate" : "translate"}
                        size={24}
                        color="white"
                    />
                    <Text style={styles.buttonText}>
                        {isTranslationActive ? 'Stop Translation' : 'Start Translation'}
                    </Text>
                    {isListening && (
                        <View style={styles.listeningIndicator}>
                            <MaterialIcons name="mic" size={16} color="white" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Language Settings Button */}
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => setShowLanguageSelector(true)}
                >
                    <MaterialIcons name="settings" size={20} color="#3498db" />
                </TouchableOpacity>

                {/* Translation History Button */}
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => setShowTranslationHistory(true)}
                >
                    <MaterialIcons name="history" size={20} color="#7f8c8d" />
                    {translationHistory.length > 0 && (
                        <View style={styles.historyBadge}>
                            <Text style={styles.historyBadgeText}>{translationHistory.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Current Translation Display */}
            {currentTranslation && (
                <View style={styles.currentTranslation}>
                    <View style={styles.translationItem}>
                        <Text style={styles.originalText}>
                            🎤 {SUPPORTED_LANGUAGES[currentTranslation.sourceLanguage]?.name}: {currentTranslation.originalText}
                        </Text>
                        <Text style={styles.translatedText}>
                            🔊 {SUPPORTED_LANGUAGES[currentTranslation.targetLanguage]?.name}: {currentTranslation.translatedText}
                        </Text>
                    </View>
                </View>
            )}

            {/* Translation Status */}
            {isTranslationActive && (
                <View style={styles.statusBar}>
                    <View style={styles.languageFlow}>
                        <Text style={styles.languageText}>
                            {SUPPORTED_LANGUAGES[sourceLanguage]?.name || sourceLanguage}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={16} color="#27ae60" />
                        <Text style={styles.languageText}>
                            {SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage}
                        </Text>
                    </View>
                    <View style={styles.statusIndicators}>
                        <View style={[styles.statusDot, isListening ? styles.activeDot : styles.inactiveDot]} />
                        <Text style={styles.statusText}>
                            {isListening ? 'Listening...' : 'Ready'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Language Selector Modal */}
            <Modal
                visible={showLanguageSelector}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLanguageSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.languageSelectorModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Languages</Text>
                            <TouchableOpacity
                                onPress={() => setShowLanguageSelector(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#7f8c8d" />
                            </TouchableOpacity>
                        </View>

                        {/* Source Language */}
                        <View style={styles.languageSection}>
                            <Text style={styles.sectionTitle}>Source Language (You speak):</Text>
                            <Text style={styles.currentLanguage}>
                                Current: {SUPPORTED_LANGUAGES[sourceLanguage]?.name}
                            </Text>
                            <View style={styles.languageGrid}>
                                {Object.entries(SUPPORTED_LANGUAGES).slice(0, 12).map(([code, info]) => (
                                    <TouchableOpacity
                                        key={`source-${code}`}
                                        style={[
                                            styles.languageButton,
                                            sourceLanguage === code ? styles.selectedLanguage : {}
                                        ]}
                                        onPress={() => handleLanguageChange('source', code)}
                                    >
                                        <Text style={[
                                            styles.languageButtonText,
                                            sourceLanguage === code ? styles.selectedLanguageText : {}
                                        ]}>
                                            {info.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Target Language */}
                        <View style={styles.languageSection}>
                            <Text style={styles.sectionTitle}>Target Language (Translation to):</Text>
                            <Text style={styles.currentLanguage}>
                                Current: {SUPPORTED_LANGUAGES[targetLanguage]?.name}
                            </Text>
                            <View style={styles.languageGrid}>
                                {Object.entries(SUPPORTED_LANGUAGES).slice(0, 12).map(([code, info]) => (
                                    <TouchableOpacity
                                        key={`target-${code}`}
                                        style={[
                                            styles.languageButton,
                                            targetLanguage === code ? styles.selectedLanguage : {}
                                        ]}
                                        onPress={() => handleLanguageChange('target', code)}
                                    >
                                        <Text style={[
                                            styles.languageButtonText,
                                            targetLanguage === code ? styles.selectedLanguageText : {}
                                        ]}>
                                            {info.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Translation History Modal */}
            <Modal
                visible={showTranslationHistory}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTranslationHistory(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.historyModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Translation History</Text>
                            <TouchableOpacity
                                onPress={() => setShowTranslationHistory(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#7f8c8d" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.historyList}>
                            {translationHistory.length === 0 ? (
                                <Text style={styles.noHistoryText}>No translations yet</Text>
                            ) : (
                                translationHistory.slice().reverse().map((item) => (
                                    <View key={item.id} style={styles.historyItem}>
                                        <Text style={styles.historyTimestamp}>
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </Text>
                                        <Text style={styles.historyOriginal}>
                                            🎤 {item.originalText}
                                        </Text>
                                        <Text style={styles.historyTranslated}>
                                            🔊 {item.translatedText}
                                        </Text>
                                        <Text style={styles.historyLanguages}>
                                            {SUPPORTED_LANGUAGES[item.sourceLanguage]?.name} → {SUPPORTED_LANGUAGES[item.targetLanguage]?.name}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {translationHistory.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearHistoryButton}
                                onPress={() => {
                                    setTranslationHistory([]);
                                    liveTranslationService.clearTranslationHistory();
                                }}
                            >
                                <Text style={styles.clearHistoryText}>Clear History</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    translationToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
    },
    activeButton: {
        backgroundColor: '#27ae60',
    },
    inactiveButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
        flex: 1,
    },
    listeningIndicator: {
        marginLeft: 8,
        animation: 'pulse 1s infinite',
    },
    settingsButton: {
        padding: 10,
        backgroundColor: '#e3f2fd',
        borderRadius: 6,
        marginRight: 5,
    },
    historyButton: {
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        position: 'relative',
    },
    historyBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#e74c3c',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    currentTranslation: {
        marginTop: 10,
        backgroundColor: '#e8f5e8',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#27ae60',
    },
    translationItem: {
        gap: 5,
    },
    originalText: {
        fontSize: 14,
        color: '#495057',
        fontStyle: 'italic',
    },
    translatedText: {
        fontSize: 14,
        color: '#27ae60',
        fontWeight: '600',
    },
    statusBar: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        padding: 8,
        borderRadius: 6,
    },
    languageFlow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageText: {
        fontSize: 12,
        color: '#27ae60',
        fontWeight: '600',
        marginHorizontal: 4,
    },
    statusIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    activeDot: {
        backgroundColor: '#27ae60',
    },
    inactiveDot: {
        backgroundColor: '#6c757d',
    },
    statusText: {
        fontSize: 11,
        color: '#6c757d',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageSelectorModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    historyModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#495057',
    },
    closeButton: {
        padding: 5,
    },
    languageSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 5,
    },
    currentLanguage: {
        fontSize: 14,
        color: '#27ae60',
        marginBottom: 10,
    },
    languageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageButton: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#dee2e6',
        minWidth: '30%',
        alignItems: 'center',
    },
    selectedLanguage: {
        backgroundColor: '#e8f5e8',
        borderColor: '#27ae60',
    },
    languageButtonText: {
        fontSize: 12,
        color: '#495057',
    },
    selectedLanguageText: {
        color: '#27ae60',
        fontWeight: 'bold',
    },
    historyList: {
        maxHeight: 400,
    },
    noHistoryText: {
        textAlign: 'center',
        color: '#6c757d',
        fontStyle: 'italic',
        padding: 20,
    },
    historyItem: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3498db',
    },
    historyTimestamp: {
        fontSize: 11,
        color: '#6c757d',
        marginBottom: 5,
    },
    historyOriginal: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 3,
    },
    historyTranslated: {
        fontSize: 14,
        color: '#27ae60',
        marginBottom: 3,
        fontWeight: '500',
    },
    historyLanguages: {
        fontSize: 11,
        color: '#6c757d',
        fontStyle: 'italic',
    },
    clearHistoryButton: {
        backgroundColor: '#e74c3c',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
    },
    clearHistoryText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default TranslationControls;
