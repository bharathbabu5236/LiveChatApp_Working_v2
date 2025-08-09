// LiveChatApp/components/LanguageSelector.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../context/TranslationContext';
import { getSupportedLanguagesArray, getNativeLanguageName } from '../translationService';

const { width } = Dimensions.get('window');

const LanguageSelector = ({ buttonStyle, textStyle, iconColor = '#2c3e50' }) => {
    const { currentLanguage, changeLanguage, t } = useTranslation();
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [supportedLanguages] = useState(getSupportedLanguagesArray());

    const handleLanguageSelect = async (languageCode) => {
        setShowLanguageModal(false);
        if (languageCode !== currentLanguage) {
            await changeLanguage(languageCode);
        }
    };

    const getCurrentLanguageName = () => {
        const lang = supportedLanguages.find(l => l.code === currentLanguage);
        return lang ? lang.nativeName : 'English';
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.languageButton, buttonStyle]}
                onPress={() => setShowLanguageModal(true)}
            >
                <MaterialIcons name="language" size={20} color={iconColor} />
                <Text style={[styles.languageButtonText, textStyle]}>
                    {getCurrentLanguageName()}
                </Text>
                <MaterialIcons name="expand-more" size={16} color={iconColor} />
            </TouchableOpacity>

            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('select_language')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowLanguageModal(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#2c3e50" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                            {supportedLanguages.map((language) => (
                                <TouchableOpacity
                                    key={language.code}
                                    style={[
                                        styles.languageItem,
                                        currentLanguage === language.code && styles.selectedLanguageItem
                                    ]}
                                    onPress={() => handleLanguageSelect(language.code)}
                                >
                                    <View style={styles.languageInfo}>
                                        <Text style={[
                                            styles.languageName,
                                            currentLanguage === language.code && styles.selectedLanguageName
                                        ]}>
                                            {language.nativeName}
                                        </Text>
                                        <Text style={[
                                            styles.languageEnglishName,
                                            currentLanguage === language.code && styles.selectedLanguageEnglishName
                                        ]}>
                                            {language.name}
                                        </Text>
                                    </View>
                                    {currentLanguage === language.code && (
                                        <MaterialIcons name="check" size={24} color="#3498db" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    languageButtonText: {
        marginLeft: 6,
        marginRight: 4,
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    closeButton: {
        padding: 5,
    },
    languageList: {
        paddingHorizontal: 20,
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        borderRadius: 8,
        marginVertical: 2,
    },
    selectedLanguageItem: {
        backgroundColor: '#e3f2fd',
        borderBottomColor: '#bbdefb',
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    selectedLanguageName: {
        color: '#1976d2',
    },
    languageEnglishName: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    selectedLanguageEnglishName: {
        color: '#1976d2',
    },
});

export default LanguageSelector;
