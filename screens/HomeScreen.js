// LiveChatApp/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons'; // For the chat icon
import ChatPopup from './ChatPopup';
import LanguageSelector from '../components/LanguageSelector';
import TTSSettings from '../components/TTSSettings';
import SpeakableText from '../components/SpeakableText';
import { useTranslation } from '../context/TranslationContext';
import { useTextToSpeech } from '../context/TextToSpeechContext';

const { width } = Dimensions.get('window'); // Get screen width for responsive image sizing

const HomeScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { initializeAudioPermissions, speak, stopSpeech } = useTextToSpeech();
    const [showChatPopup, setShowChatPopup] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [audioInitialized, setAudioInitialized] = useState(false);
    const [isReading, setIsReading] = useState(false);

    useEffect(() => {
        console.log('HomeScreen mounted');
    }, []);

    const handleChatPress = () => {
        console.log('Chat button pressed, opening chat popup');
        // Initialize audio permissions on first user interaction
        if (!audioInitialized) {
            initializeAudioPermissions();
            setAudioInitialized(true);
        }
        setShowChatPopup(true);
    };

    const handleAgentSelect = () => {
        console.log('Agent selected, navigating to AgentStack');
        navigation.navigate('AgentStack');
    };

    const handleMenuPress = () => {
        setShowMenu(true);
    };

    const handleAdminPress = () => {
        setShowMenu(false);
        navigation.navigate('Admin');
    };

    const handleReviewsPress = () => {
        setShowMenu(false);
        navigation.navigate('Reviews');
    };

    const handleCloseMenu = () => {
        setShowMenu(false);
    };

    const handleReadPage = async () => {
        console.log('🔊 Volume button clicked! isReading:', isReading);
        
        if (!audioInitialized) {
            console.log('🔊 Initializing audio permissions...');
            initializeAudioPermissions();
            setAudioInitialized(true);
        }

        if (isReading) {
            // Stop reading
            console.log('🔊 Stopping speech...');
            stopSpeech();
            setIsReading(false);
        } else {
            // Start reading the entire page
            console.log('🔊 Starting to read page...');
            setIsReading(true);
            
            const pageContent = [
                t('welcome_title'),
                t('welcome_subtitle'),
                t('care_services_title'),
                t('care_services_description')
            ].join('. ');

            console.log('🔊 Page content to read:', pageContent.substring(0, 100) + '...');

            try {
                await speak(pageContent);
                setIsReading(false);
            } catch (error) {
                console.error('🔊 Error reading page:', error);
                setIsReading(false);
            }
        }
    };

    return (
        <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            indicatorStyle="default"
        >
            {/* Language Selector and Volume Button */}
            <View style={styles.topRightControls}>
                <TouchableOpacity
                    style={[styles.volumeButton, isReading && styles.volumeButtonActive]}
                    onPress={handleReadPage}
                >
                    <MaterialIcons 
                        name={isReading ? "volume_off" : "volume_up"} 
                        size={24} 
                        color={isReading ? "#e74c3c" : "#2c3e50"} 
                    />
                </TouchableOpacity>
                <LanguageSelector />
            </View>

            {/* Hamburger Menu Button */}
            <TouchableOpacity
                style={styles.menuButton}
                onPress={handleMenuPress}
            >
                <MaterialIcons name="menu" size={30} color="#2c3e50" />
            </TouchableOpacity>

            {/* Live Base Services Logo */}
            <Image
                source={require('../lbs_header_logo2.png')} // LBS header logo
                style={styles.logo}
                resizeMode="contain" // Changed back to contain for logo display
                onError={(error) => console.error('Image loading error:', error)}
                onLoad={() => console.log('Logo loaded successfully')}
            />

            <Text style={styles.title}>
                {t('welcome_title')}
            </Text>
            <Text style={styles.description}>
                {t('welcome_subtitle')}
            </Text>

            {/* Care Services Content */}
            <View style={styles.servicesContainer}>
                {/* Single Comprehensive Care Services Section */}
                <View style={styles.serviceSection}>
                    <Text style={styles.serviceTitle}>
                        {t('care_services_title')}
                    </Text>
                    <Text style={styles.serviceDescription}>
                        {t('care_services_description')}
                    </Text>
                </View>
            </View>

            {/* Floating Action Button for Chat */}
            <TouchableOpacity
                style={styles.chatButton}
                onPress={handleChatPress}
            >
                <MaterialIcons name="chat" size={30} color="white" />
            </TouchableOpacity>

            {/* Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseMenu}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={handleCloseMenu}
                >
                    <View style={styles.menuContainer}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleAdminPress}
                        >
                            <MaterialIcons name="admin-panel-settings" size={24} color="#2c3e50" />
                            <Text style={styles.menuItemText}>
                                {t('admin')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.lastMenuItem]}
                            onPress={handleReviewsPress}
                        >
                            <MaterialIcons name="rate-review" size={24} color="#2c3e50" />
                            <Text style={styles.menuItemText}>
                                {t('reviews')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Chat Popup */}
            <ChatPopup 
                visible={showChatPopup} 
                onClose={() => setShowChatPopup(false)} 
                onAgentSelect={handleAgentSelect}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f0f4f8', // Light background
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        padding: 20,
        paddingTop: 100, // Account for top controls
        paddingBottom: 100, // Account for floating chat button
    },
    logo: {
        width: width * 0.4, // Reduced from 0.7 to 0.4 (40% of screen width)
        height: width * 0.2, // Reduced from 0.35 to 0.2 (maintain aspect ratio)
        marginBottom: 20, // Reduced margin
        borderRadius: 10, // Slightly smaller border radius
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
    },
    title: {
        fontSize: 24, // Slightly smaller
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#2c3e50',
        textAlign: 'center',
    },
    description: {
        fontSize: 14, // Slightly smaller
        textAlign: 'center',
        lineHeight: 20,
        color: '#34495e',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    servicesContainer: {
        width: '100%',
        maxWidth: 800, // Limit width on larger screens
    },
    serviceSection: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#3498db', // Blue accent
    },
    serviceTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 12,
        textAlign: 'left',
    },
    serviceDescription: {
        fontSize: 14,
        lineHeight: 22,
        color: '#5a6c7d',
        marginBottom: 10,
        textAlign: 'left',
    },
    topRightControls: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1000,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    volumeButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    volumeButtonActive: {
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 2,
        borderColor: '#e74c3c',
    },
    menuButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 1000,
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    chatButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#2ecc71',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginTop: 100,
        marginLeft: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        minWidth: 150,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 12,
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
});

export default HomeScreen;
