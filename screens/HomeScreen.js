// LiveChatApp/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons'; // For the chat icon
import ChatPopup from './ChatPopup';

const { width } = Dimensions.get('window'); // Get screen width for responsive image sizing

const HomeScreen = () => {
    const navigation = useNavigation();
    const [showChatPopup, setShowChatPopup] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        console.log('HomeScreen mounted');
    }, []);

    const handleChatPress = () => {
        console.log('Chat button pressed, opening chat popup');
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

    const handleCloseMenu = () => {
        setShowMenu(false);
    };

    return (
        <View style={styles.container}>
            {/* Hamburger Menu Button */}
            <TouchableOpacity
                style={styles.menuButton}
                onPress={handleMenuPress}
            >
                <MaterialIcons name="menu" size={30} color="#2c3e50" />
            </TouchableOpacity>

            {/* Live Base Services Logo */}
            <Image
                source={{ uri: 'https://placehold.co/300x150/007bff/ffffff?text=Live+Best+Service' }} // Placeholder logo URL
                style={styles.logo}
                resizeMode="contain" // Ensures the entire logo is visible within its bounds
                onError={(error) => console.error('Image loading error:', error)}
                onLoad={() => console.log('Logo loaded successfully')}
            />

            <Text style={styles.title}>Live Best Service</Text>
            <Text style={styles.description}>
                Welcome to Live Best Services! We are dedicated to providing you with top-notch healthcare support.
                Our team is here to assist you with any queries or concerns you may have.
            </Text>

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
                            <Text style={styles.menuItemText}>Admin</Text>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f0f4f8', // Light background
    },
    logo: {
        width: width * 0.7, // 70% of screen width for responsiveness
        height: width * 0.35, // Maintain aspect ratio (e.g., if logo is 300x150)
        marginBottom: 30,
        borderRadius: 15, // Rounded corners for the logo container
        overflow: 'hidden', // Ensures content respects border radius
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10, // Android shadow
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2c3e50', // Dark text
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        color: '#34495e',
        marginBottom: 40,
        paddingHorizontal: 10, // Add some horizontal padding for better readability
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
        backgroundColor: '#2ecc71', // Green chat button
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowColor: '#000', // iOS shadow
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
});

export default HomeScreen;
