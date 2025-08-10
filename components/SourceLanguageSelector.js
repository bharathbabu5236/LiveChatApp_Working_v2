// LiveChatApp/components/SourceLanguageSelector.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    Dimensions,
    TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SourceLanguageSelector = ({ 
    currentLanguage, 
    onLanguageSelect, 
    buttonStyle, 
    textStyle, 
    iconColor = '#2c3e50' 
}) => {
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Comprehensive list of available source languages
    const sourceLanguages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
        { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
        { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
        { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
        { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
        { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
        { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
        { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
        { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
        { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
        { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ' },
        { code: 'th', name: 'Thai', nativeName: 'ไทย' },
        { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
        { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
        { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
        { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
        { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
        { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
        { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
        { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
        { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
        { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
        { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
        { code: 'da', name: 'Danish', nativeName: 'Dansk' },
        { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
        { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
        { code: 'pl', name: 'Polish', nativeName: 'Polski' },
        { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
        { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
        { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
        { code: 'ro', name: 'Romanian', nativeName: 'Română' },
        { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
        { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
        { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
        { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
        { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
        { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
        { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
        { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
        { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
        { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
        { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
        { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
        { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
        { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
        { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
        { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' }
    ];

    // Filter languages based on search query
    const filteredLanguages = sourceLanguages.filter(language => 
        language.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        language.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLanguageSelect = (languageCode) => {
        setShowLanguageModal(false);
        setSearchQuery(''); // Clear search when closing
        if (languageCode !== currentLanguage) {
            onLanguageSelect(languageCode);
        }
    };

    const handleModalClose = () => {
        setShowLanguageModal(false);
        setSearchQuery(''); // Clear search when closing
    };

    const getCurrentLanguageName = () => {
        const lang = sourceLanguages.find(l => l.code === currentLanguage);
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
                onRequestClose={handleModalClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Source Language</Text>
                            <TouchableOpacity
                                onPress={handleModalClose}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#2c3e50" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <MaterialIcons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search languages..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#7f8c8d"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.clearButton}
                                >
                                    <MaterialIcons name="clear" size={18} color="#7f8c8d" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={true}>
                            {filteredLanguages.length > 0 ? (
                                filteredLanguages.map((language) => (
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
                                            <MaterialIcons name="check" size={20} color="#2196F3" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.noResultsContainer}>
                                    <MaterialIcons name="search-off" size={48} color="#bdc3c7" />
                                    <Text style={styles.noResultsText}>No languages found</Text>
                                    <Text style={styles.noResultsSubtext}>Try adjusting your search</Text>
                                </View>
                            )}
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
        backgroundColor: '#ecf0f1',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'space-between',
    },
    languageButtonText: {
        fontSize: 16,
        color: '#2c3e50',
        marginLeft: 8,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.9,
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        margin: 16,
        borderRadius: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    languageList: {
        maxHeight: 400,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedLanguageItem: {
        backgroundColor: '#e3f2fd',
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
        marginBottom: 2,
    },
    selectedLanguageName: {
        color: '#1976d2',
        fontWeight: '600',
    },
    languageEnglishName: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    selectedLanguageEnglishName: {
        color: '#1976d2',
    },
    noResultsContainer: {
        padding: 40,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#7f8c8d',
        marginTop: 16,
        marginBottom: 8,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#bdc3c7',
        textAlign: 'center',
    },
});

export default SourceLanguageSelector;
