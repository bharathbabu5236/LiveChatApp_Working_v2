// LiveChatApp/screens/AgentChatListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db, appId, signOut } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDoc, setDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons'; // Added MaterialIcons import
import { getSupportedLanguagesArray, getLanguageName } from '../translationService';

const AgentChatListScreen = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agentLanguage, setAgentLanguage] = useState('en');
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const navigation = useNavigation();
    const currentAgentId = auth.currentUser?.uid;
    const currentAgentEmail = auth.currentUser?.email;

    const AGENT_DEPARTMENT_MAP = {
        'UVGDfqIPKYVblK3OhRfenFa0BVp2': 'doctor', // Doctor Agent's UID
        'WF7Q4sW6gnMqRRe2KT3igD4yEKn2': 'payments', // Payments Agent's UID
    };

    const currentAgentDepartment = AGENT_DEPARTMENT_MAP[currentAgentId];

    // Load supported languages and agent's language preference
    useEffect(() => {
        const loadLanguages = async () => {
            try {
                const languages = getSupportedLanguagesArray();
                setSupportedLanguages(languages);
                
                // Try to load agent's language preference from Firebase first
                if (currentAgentId) {
                    try {
                        const agentDocRef = doc(db, `artifacts/${appId}/public/data/agents`, currentAgentId);
                        const agentDoc = await getDoc(agentDocRef);
                        if (agentDoc.exists()) {
                            const agentData = agentDoc.data();
                            if (agentData.preferredLanguage) {
                                setAgentLanguage(agentData.preferredLanguage);
                                console.log(`AgentChatListScreen: Agent language preference loaded from Firebase: ${agentData.preferredLanguage}`);
                                return;
                            }
                        }
                    } catch (firebaseError) {
                        console.warn('Firebase permission error, trying localStorage fallback:', firebaseError.message);
                    }
                    
                    // Fallback to localStorage if Firebase fails
                    try {
                        const storedLanguage = localStorage.getItem(`agent_language_${currentAgentId}`);
                        if (storedLanguage) {
                            setAgentLanguage(storedLanguage);
                            console.log(`AgentChatListScreen: Agent language preference loaded from localStorage: ${storedLanguage}`);
                        } else {
                            console.log(`AgentChatListScreen: No language preference found, using default: en`);
                        }
                    } catch (localStorageError) {
                        console.error('Error loading from localStorage:', localStorageError);
                    }
                }
            } catch (error) {
                console.error('Error loading languages:', error);
            }
        };
        
        loadLanguages();
    }, [currentAgentId]);

    useEffect(() => {
        if (!currentAgentId) {
            navigation.replace('Login');
            return;
        }

        if (!currentAgentDepartment) {
            console.error("Agent's department not configured or found for UID:", currentAgentId);
            setLoading(false);
            Alert.alert("Configuration Error", "Your agent account is not assigned to a department. Please contact administrator.");
            return;
        }

        const chatsRef = collection(db, `artifacts/${appId}/public/data/chats`);
        
        const q = query(
            chatsRef,
            where('assignedDepartment', '==', currentAgentDepartment),
            where('status', '==', 'open'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastMessageAt: doc.data().lastMessageAt?.toDate(),
            }));
            setChats(loadedChats);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats for agent's department:", error);
            setLoading(false);
            Alert.alert("Error", "Failed to load chats: " + error.message);
        });

        return unsubscribe;
    }, [currentAgentId, currentAgentDepartment]);

    const handleLanguageSelect = async (languageCode) => {
        try {
            setAgentLanguage(languageCode);
            setShowLanguageModal(false);
            
            // Save agent's language preference to Firebase
            if (currentAgentId) {
                try {
                    const agentDocRef = doc(db, `artifacts/${appId}/public/data/agents`, currentAgentId);
                    await setDoc(agentDocRef, {
                        preferredLanguage: languageCode,
                        email: currentAgentEmail,
                        department: currentAgentDepartment,
                        lastUpdated: new Date().toISOString()
                    }, { merge: true });
                    console.log(`AgentChatListScreen: Language preference saved to Firebase: ${languageCode}`);
                } catch (firebaseError) {
                    console.warn('Firebase permission error, saving to localStorage:', firebaseError.message);
                }
                
                // Always save to localStorage as backup
                try {
                    localStorage.setItem(`agent_language_${currentAgentId}`, languageCode);
                    console.log(`AgentChatListScreen: Language preference saved to localStorage: ${languageCode}`);
                } catch (localStorageError) {
                    console.error('Error saving to localStorage:', localStorageError);
                }
            }
        } catch (error) {
            console.error('Error saving language preference:', error);
            Alert.alert('Error', 'Failed to save language preference');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigation.replace('InitialChoice');
        } catch (error) {
            console.error("Logout failed:", error.message);
            Alert.alert("Logout Error", "Failed to log out: " + error.message);
        }
    };

    const renderChatItem = ({ item }) => {
        let statusText = '';
        let statusColor = '';
        let chatBgColor = '#f8f8f8';

        if (item.status === 'open' && item.agentId === currentAgentId) {
            statusText = 'Your Chat';
            statusColor = 'blue';
            chatBgColor = '#e0f2fe';
        } else if (item.status === 'open' && item.agentId && item.agentId !== currentAgentId) {
            statusText = `Assigned to other agent`;
            statusColor = 'orange';
            chatBgColor = '#fffbe0';
        } else if (item.status === 'open' && !item.agentId) {
            statusText = 'New Chat (Unassigned)';
            statusColor = 'green';
            chatBgColor = '#e6ffe6';
        } else if (item.status === 'closed') {
            statusText = 'Closed';
            statusColor = 'red';
            chatBgColor = '#f3f4f6';
        }

        return (
            <TouchableOpacity
                style={[styles.chatItem, { backgroundColor: chatBgColor }]}
                onPress={() => navigation.navigate('AgentChat', { chatId: item.id, customerId: item.userId })}
                disabled={item.status === 'closed'}
            >
                <View>
                    <Text style={styles.chatItemTitle}>Chat with User ID: {item.userId.substring(0, 8)}...</Text>
                    <Text style={styles.chatItemDepartment}>Department: {item.assignedDepartment ? item.assignedDepartment.toUpperCase() : 'N/A'}</Text>
                    <Text style={[styles.chatItemStatus, { color: statusColor }]}>Status: {statusText}</Text>
                    {item.lastMessageAt && (
                        <Text style={styles.chatItemTimestamp}>
                            Last Message: {item.lastMessageAt.toLocaleString()}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading Chats...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Active Chats</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        onPress={() => setShowLanguageModal(true)} 
                        style={styles.languageButton}
                    >
                        <MaterialIcons name="language" size={20} color="white" />
                        <Text style={styles.languageButtonText}>
                            {getLanguageName(agentLanguage)}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <MaterialIcons name="logout" size={24} color="white" />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.agentInfo}>Logged in as: {currentAgentEmail || 'N/A'}</Text>
            <Text style={styles.agentInfo}>Agent ID: {currentAgentId || 'N/A'}</Text>
            {currentAgentDepartment && <Text style={styles.agentInfo}>Handling Department: {currentAgentDepartment.toUpperCase()}</Text>}


            {chats.length === 0 ? (
                <Text style={styles.noChatsText}>No active chats found for your department.</Text>
            ) : (
                <View style={styles.chatListContainer}>
                    <ScrollView
                        style={styles.chatList}
                        contentContainerStyle={styles.chatListContent}
                        showsVerticalScrollIndicator={true}
                        indicatorStyle="black"
                        scrollIndicatorInsets={{ right: 0 }}
                    >
                        {chats.map(item => renderChatItem({ item }))}
                    </ScrollView>
                </View>
            )}

            {/* Language Selection Modal */}
            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Your Language</Text>
                            <TouchableOpacity 
                                onPress={() => setShowLanguageModal(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.languageList}>
                            {supportedLanguages.map((language) => (
                                <TouchableOpacity
                                    key={language.code}
                                    style={[
                                        styles.languageItem,
                                        agentLanguage === language.code && styles.selectedLanguageItem
                                    ]}
                                    onPress={() => handleLanguageSelect(language.code)}
                                >
                                    <Text style={[
                                        styles.languageItemText,
                                        agentLanguage === language.code && styles.selectedLanguageItemText
                                    ]}>
                                        {language.name} ({language.nativeName})
                                    </Text>
                                    {agentLanguage === language.code && (
                                        <MaterialIcons name="check" size={20} color="#3498db" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#3498db',
        padding: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 15, // Adjust for status bar on Android
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2980b9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginRight: 10,
    },
    languageButtonText: {
        color: 'white',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: 'white',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    agentInfo: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginTop: 5,
    },
    chatListContent: {
        padding: 15,
        paddingBottom: 20,
    },
    chatListContainer: {
        flex: 1,
        backgroundColor: '#f0f4f8',
        marginTop: 10,
        maxHeight: '70%', // Add explicit height constraint
    },
    chatList: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    chatItem: {
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#eee',
    },
    chatItemTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    chatItemDepartment: { // New style for department display
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
        fontWeight: '500',
    },
    chatItemStatus: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 3,
    },
    chatItemTimestamp: {
        fontSize: 12,
        color: '#777',
    },
    noChatsText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        marginTop: 50,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    languageList: {
        maxHeight: 400,
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedLanguageItem: {
        backgroundColor: '#e3f2fd',
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
    },
    languageItemText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    selectedLanguageItemText: {
        color: '#3498db',
        fontWeight: 'bold',
    },
});

export default AgentChatListScreen;
