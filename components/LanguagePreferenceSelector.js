// Language Preference Selector
// Simple component for users to select their preferred language

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import smartLanguageService from '../services/smartLanguageService';

const LanguagePreferenceSelector = ({ 
    visible, 
    onClose, 
    onLanguageSelected, 
    userType = 'user', // 'doctor', 'patient', 'user'
    currentUserId 
}) => {
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (visible) {
            loadAvailableLanguages();
        }
    }, [visible]);

    const loadAvailableLanguages = () => {
        const languages = smartLanguageService.getAvailableLanguages();
        setAvailableLanguages(languages);
    };

    const handleLanguageSelect = (languageInfo) => {
        setSelectedLanguage(languageInfo);
        setIsConfirming(true);
    };

    const confirmLanguageSelection = () => {
        if (selectedLanguage && currentUserId) {
            // Set in smart language service
            smartLanguageService.setParticipantLanguage(
                currentUserId, 
                selectedLanguage.code, 
                userType
            );

            // Notify parent
            if (onLanguageSelected) {
                onLanguageSelected(selectedLanguage.code, selectedLanguage);
            }

            console.log(`✅ ${userType} language preference set: ${selectedLanguage.name}`);
            
            setIsConfirming(false);
            setSelectedLanguage(null);
            onClose();
        }
    };

    const cancelSelection = () => {
        setIsConfirming(false);
        setSelectedLanguage(null);
    };

    const getLanguageEmoji = (code) => {
        const emojiMap = {
            'en': '🇺🇸',
            'es': '🇪🇸',
            'fr': '🇫🇷',
            'de': '🇩🇪',
            'it': '🇮🇹',
            'pt': '🇵🇹',
            'ru': '🇷🇺',
            'ja': '🇯🇵',
            'ko': '🇰🇷',
            'zh': '🇨🇳',
            'ar': '🇸🇦',
            'hi': '🇮🇳',
            'nl': '🇳🇱',
            'tr': '🇹🇷'
        };
        return emojiMap[code] || '🌍';
    };

    const getQualityBadge = (quality, medical) => {
        if (medical && (quality === 'excellent' || quality === 'very-good')) {
            return '🏥'; // Medical + High quality
        }
        if (quality === 'excellent') return '⭐';
        if (quality === 'very-good') return '✨';
        if (quality === 'good') return '👍';
        return '📝';
    };

    const getUserTypeTitle = () => {
        switch (userType) {
            case 'doctor':
                return 'Doctor Language Preference';
            case 'patient':
                return 'Patient Language Preference';
            default:
                return 'Language Preference';
        }
    };

    const getUserTypeDescription = () => {
        switch (userType) {
            case 'doctor':
                return 'Select your preferred language for consultation';
            case 'patient':
                return 'Select your preferred language for communication';
            default:
                return 'Select your preferred language';
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {!isConfirming ? (
                        <>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.title}>{getUserTypeTitle()}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <MaterialIcons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.description}>
                                {getUserTypeDescription()}
                            </Text>

                            {/* Recommended Languages */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🏥 Recommended for Medical Use</Text>
                                <ScrollView style={styles.languageList}>
                                    {availableLanguages
                                        .filter(lang => lang.recommended)
                                        .map((language) => (
                                            <TouchableOpacity
                                                key={language.code}
                                                style={[styles.languageItem, styles.recommendedItem]}
                                                onPress={() => handleLanguageSelect(language)}
                                            >
                                                <View style={styles.languageInfo}>
                                                    <Text style={styles.languageEmoji}>
                                                        {getLanguageEmoji(language.code)}
                                                    </Text>
                                                    <Text style={styles.languageName}>
                                                        {language.name}
                                                    </Text>
                                                    <Text style={styles.qualityBadge}>
                                                        {getQualityBadge(language.quality, language.medical)}
                                                    </Text>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={20} color="#007bff" />
                                            </TouchableOpacity>
                                        ))
                                    }
                                </ScrollView>
                            </View>

                            {/* Other Languages */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🌍 Other Languages</Text>
                                <ScrollView style={styles.languageList}>
                                    {availableLanguages
                                        .filter(lang => !lang.recommended)
                                        .map((language) => (
                                            <TouchableOpacity
                                                key={language.code}
                                                style={styles.languageItem}
                                                onPress={() => handleLanguageSelect(language)}
                                            >
                                                <View style={styles.languageInfo}>
                                                    <Text style={styles.languageEmoji}>
                                                        {getLanguageEmoji(language.code)}
                                                    </Text>
                                                    <Text style={styles.languageName}>
                                                        {language.name}
                                                    </Text>
                                                    <Text style={styles.qualityBadge}>
                                                        {getQualityBadge(language.quality, language.medical)}
                                                    </Text>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={20} color="#666" />
                                            </TouchableOpacity>
                                        ))
                                    }
                                </ScrollView>
                            </View>
                        </>
                    ) : (
                        /* Confirmation */
                        <View style={styles.confirmationContainer}>
                            <Text style={styles.confirmationTitle}>Confirm Language Preference</Text>
                            
                            <View style={styles.selectedLanguageDisplay}>
                                <Text style={styles.selectedEmoji}>
                                    {getLanguageEmoji(selectedLanguage?.code)}
                                </Text>
                                <Text style={styles.selectedLanguageName}>
                                    {selectedLanguage?.name}
                                </Text>
                                {selectedLanguage?.medical && (
                                    <Text style={styles.medicalBadge}>Medical Supported 🏥</Text>
                                )}
                            </View>

                            <Text style={styles.confirmationText}>
                                {userType === 'doctor' ? 'You will communicate in' : 'You will receive translations in'} {selectedLanguage?.name}.
                                {'\n\n'}The system will automatically translate between languages during the conversation.
                            </Text>

                            <View style={styles.confirmationButtons}>
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={cancelSelection}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.confirmButton}
                                    onPress={confirmLanguageSelection}
                                >
                                    <Text style={styles.confirmButtonText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#444',
        marginBottom: 10,
    },
    languageList: {
        maxHeight: 150,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    recommendedItem: {
        backgroundColor: '#e7f3ff',
        borderColor: '#007bff',
    },
    languageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    languageEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    languageName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    qualityBadge: {
        fontSize: 16,
        marginLeft: 8,
    },
    confirmationContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    selectedLanguageDisplay: {
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        width: '100%',
    },
    selectedEmoji: {
        fontSize: 40,
        marginBottom: 8,
    },
    selectedLanguageName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    medicalBadge: {
        fontSize: 12,
        color: '#007bff',
        fontWeight: '500',
    },
    confirmationText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
    },
    confirmationButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    cancelButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    confirmButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#007bff',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

export default LanguagePreferenceSelector;
