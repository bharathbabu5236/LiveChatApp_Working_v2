// LiveChatApp/screens/AgentChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth, appId } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { translateMessage, testTranslation } from '../translationService';

const AgentChatScreen = ({ route, navigation }) => {
    const { chatId, customerId } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [chatStatus, setChatStatus] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [agentLanguage, setAgentLanguage] = useState('en');
    const [translatedMessages, setTranslatedMessages] = useState({});
    const [agentMessageTranslations, setAgentMessageTranslations] = useState({});
    const scrollViewRef = useRef(null);
    const currentAgentId = auth.currentUser?.uid;

    // Load agent's language preference
    useEffect(() => {
        const loadAgentLanguage = async () => {
            try {
                if (currentAgentId) {
                    // Try to load from Firebase first
                    try {
                        const agentDocRef = doc(db, `artifacts/${appId}/public/data/agents`, currentAgentId);
                        const agentDoc = await getDoc(agentDocRef);
                        if (agentDoc.exists()) {
                            const agentData = agentDoc.data();
                            if (agentData.preferredLanguage) {
                                setAgentLanguage(agentData.preferredLanguage);
                                console.log(`AgentChatScreen: Agent language preference loaded from Firebase: ${agentData.preferredLanguage}`);
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
                            console.log(`AgentChatScreen: Agent language preference loaded from localStorage: ${storedLanguage}`);
                        } else {
                            console.log(`AgentChatScreen: No language preference found, using default: en`);
                        }
                    } catch (localStorageError) {
                        console.error('Error loading from localStorage:', localStorageError);
                    }
                }
            } catch (error) {
                console.error('Error loading agent language preference:', error);
            }
        };
        
        loadAgentLanguage();
    }, [currentAgentId]);

    // Re-translate messages when agent language changes
    useEffect(() => {
        if (agentLanguage !== 'en' && messages.length > 0) {
            console.log(`AgentChatScreen: Agent language changed to ${agentLanguage}, re-translating messages`);
            messages.forEach(message => {
                if (message.senderId !== currentAgentId && message.originalText) {
                    translateCustomerMessageToAgentLanguage(message.id, message.originalText);
                }
                if (message.senderId === currentAgentId) {
                    // Translate all agent messages to their selected language
                    const messageContent = message.originalText || message.text || message.translatedText;
                    if (messageContent) {
                        translateAgentMessageToDisplayLanguage(message.id, messageContent);
                    }
                }
            });
        } else if (agentLanguage === 'en' && messages.length > 0) {
            // Clear translations when agent switches back to English
            console.log(`AgentChatScreen: Agent switched to English, clearing translations`);
            setTranslatedMessages({});
            setAgentMessageTranslations({});
        }
    }, [agentLanguage, messages]);

    // Debug: Log when translatedMessages changes
    useEffect(() => {
        console.log(`AgentChatScreen: translatedMessages state updated:`, translatedMessages);
    }, [translatedMessages]);

    // Test translation service on component mount
    useEffect(() => {
        testTranslation().then(result => {
            if (result) {
                console.log('AgentChatScreen: Translation service test successful');
            } else {
                console.error('AgentChatScreen: Translation service test failed');
            }
        });
    }, []);

    const handleScrollToBottom = () => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    };

    const handleScroll = (event) => {
        // React Native ScrollView event structure is different from web
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const scrollTop = contentOffset.y;
        const scrollHeight = contentSize.height;
        const clientHeight = layoutMeasurement.height;
        const isCloseToBottom = scrollTop + clientHeight >= scrollHeight - 20;
        setShowScrollButton(!isCloseToBottom);
    };

    useEffect(() => {
        if (!chatId) {
            console.error("Chat ID is missing for AgentChatScreen.");
            navigation.goBack();
            return;
        }

        // Listen for chat status changes
        const chatDocRef = doc(db, `artifacts/${appId}/public/data/chats`, chatId);
        const unsubscribeChatStatus = onSnapshot(chatDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setChatStatus(docSnapshot.data().status);
            }
        }, (error) => {
            console.error("Error fetching chat status:", error);
        });

        // Listen for messages
        const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const loadedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate().toLocaleString(),
            }));
            setMessages(loadedMessages);
            
            // Trigger translation for new customer messages if agent prefers non-English
            if (agentLanguage !== 'en') {
                loadedMessages.forEach(message => {
                    if (message.senderId !== currentAgentId && message.originalText && !translatedMessages[message.id]) {
                        console.log(`AgentChatScreen: New message detected, triggering translation for ${message.id}`);
                        translateCustomerMessageToAgentLanguage(message.id, message.originalText);
                    }
                });
            }
            
            // Scroll to bottom when new messages arrive
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }
        }, (error) => {
            console.error("Error fetching messages:", error);
        });

        return () => {
            unsubscribeChatStatus();
            unsubscribeMessages(); // Cleanup both listeners on unmount
        };
    }, [chatId]);

    const handleSendMessage = async () => {
        if (inputText.trim() === '' || !chatId || !currentAgentId) return;
        if (chatStatus === 'closed') {
            Alert.alert("Chat Closed", "This chat has been closed and no new messages can be sent.");
            setInputText('');
            return;
        }

        try {
            // Get the customer's language from the chat document
            const chatDocRef = doc(db, `artifacts/${appId}/public/data/chats`, chatId);
            const chatDoc = await getDoc(chatDocRef);
            const customerLanguage = chatDoc.data()?.customerLanguage || 'en';

            console.log(`AgentChatScreen: Starting message send process...`);
            console.log(`AgentChatScreen: Customer language: ${customerLanguage}`);
            console.log(`AgentChatScreen: Input text: "${inputText.trim()}"`);

            let translatedText = inputText.trim();
            let originalText = inputText.trim();

            // If customer is not using the same language as agent, translate agent's message to customer's language
            if (customerLanguage !== agentLanguage) {
                console.log(`AgentChatScreen: Translating from ${agentLanguage} to ${customerLanguage}...`);
                const translation = await translateMessage(inputText.trim(), customerLanguage, agentLanguage);
                translatedText = translation.translatedText;
                console.log("AgentChatScreen: Translation result:", translation);
                console.log(`AgentChatScreen: Final translated text: "${translatedText}"`);
            } else {
                console.log(`AgentChatScreen: No translation needed (customer and agent use same language)`);
            }

            const messageData = {
                senderId: currentAgentId,
                senderType: 'agent',
                originalText: originalText,
                translatedText: translatedText,
                language: customerLanguage,
                timestamp: serverTimestamp(),
            };

            console.log(`AgentChatScreen: Storing message with data:`, messageData);

            const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
            await addDoc(messagesRef, messageData);
            setInputText('');

            // Update lastMessageAt in the chat document
            await updateDoc(chatDocRef, {
                lastMessageAt: serverTimestamp(),
            });

            console.log(`AgentChatScreen: Message sent successfully`);

        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message: " + error.message);
        }
    };

    const handleKeyPress = (event) => {
        // Handle Enter key (send message)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
        // Handle Shift+Enter (new line) - let it pass through naturally
        // No need to prevent default for Shift+Enter as it should create a new line
    };

    // Function to translate customer messages to agent's preferred language
    const translateCustomerMessage = async (customerMessage, customerLanguage) => {
        try {
            // If agent's language is different from customer's language, translate
            if (agentLanguage !== customerLanguage && customerLanguage !== 'en') {
                console.log(`AgentChatScreen: Translating customer message from ${customerLanguage} to ${agentLanguage}`);
                const translation = await translateMessage(customerMessage, agentLanguage, customerLanguage);
                return translation.translatedText;
            }
            return customerMessage; // No translation needed
        } catch (error) {
            console.error('Error translating customer message:', error);
            return customerMessage; // Return original message if translation fails
        }
    };

    // Function to translate customer messages to agent's preferred language in real-time
    const translateCustomerMessageToAgentLanguage = async (messageId, originalText) => {
        try {
            if (agentLanguage === 'en') {
                console.log(`AgentChatScreen: No translation needed - agent prefers English`);
                setTranslatedMessages(prev => ({
                    ...prev,
                    [messageId]: originalText // Store original text if no translation needed
                }));
                return originalText; // No translation needed if agent prefers English
            }

            console.log(`AgentChatScreen: Starting translation of "${originalText}" to ${agentLanguage}`);
            // Fix: Translate from 'auto' (detect language) to agent's preferred language
            const translation = await translateMessage(originalText, agentLanguage, 'auto');
            console.log(`AgentChatScreen: Translation result:`, translation);
            
            setTranslatedMessages(prev => ({
                ...prev,
                [messageId]: translation.translatedText
            }));
            
            return translation.translatedText;
        } catch (error) {
            console.error('Error translating customer message to agent language:', error);
            return originalText; // Return original text if translation fails
        }
    };

    // Function to translate agent's own messages to their selected language for display
    const translateAgentMessageToDisplayLanguage = async (messageId, originalText) => {
        try {
            if (agentLanguage === 'en') {
                // If agent prefers English, no translation needed for display
                setAgentMessageTranslations(prev => ({
                    ...prev,
                    [messageId]: originalText
                }));
                return originalText;
            }

            console.log(`AgentChatScreen: Translating agent's message "${originalText}" to ${agentLanguage} for display`);
            // Use 'auto' to detect the source language instead of assuming it's English
            const translation = await translateMessage(originalText, agentLanguage, 'auto');
            console.log(`AgentChatScreen: Agent message translation result:`, translation);
            
            setAgentMessageTranslations(prev => ({
                ...prev,
                [messageId]: translation.translatedText
            }));
            
            return translation.translatedText;
        } catch (error) {
            console.error('Error translating agent message to display language:', error);
            return originalText; // Return original text if translation fails
        }
    };


// Inside LiveChatApp/screens/AgentChatScreen.js

const handleCloseChat = () => {
    console.log("Close button pressed. Navigating back to Agent Chats.");
    navigation.goBack();
};
  
    // Remove the old renderMessage function since we're using direct mapping now

    // Conditionally render department selection or chat interface
    if (!chatId) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Chat ID is missing. Please go back and try again.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chat with User: {customerId?.substring(0, 8)}...</Text>
                <View style={styles.headerButtons}>
                    <Text style={[styles.chatStatusText, chatStatus === 'closed' ? styles.statusClosed : styles.statusOpen]}>
                        Status: {chatStatus.charAt(0).toUpperCase() + chatStatus.slice(1)}
                    </Text>
                    <TouchableOpacity onPress={handleCloseChat} style={styles.closeChatButton}>
                        <MaterialIcons name="close" size={24} color="white" />
                        <Text style={styles.closeChatButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.chatArea}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesWrapper}
                    onScroll={handleScroll}
                >
                    <View style={styles.messagesList}>
                        {messages.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
                            </View>
                        ) : (
                            messages.map(message => {
                                // Handle different message formats
                                let messageText = '';
                                console.log(`AgentChatScreen: Processing message ${message.id}:`, {
                                    senderId: message.senderId,
                                    currentAgentId,
                                    agentLanguage,
                                    originalText: message.originalText,
                                    hasTranslation: !!translatedMessages[message.id],
                                    translation: translatedMessages[message.id]
                                });

                                if (message.senderId === currentAgentId) {
                                    // Agent's own messages - show translated version in agent's selected language
                                    if (agentLanguage === 'en') {
                                        // Agent prefers English - show original text
                                        messageText = message.originalText || message.text || 'Message content not available';
                                        console.log(`AgentChatScreen: Agent message (English) - showing original: "${messageText}"`);
                                    } else {
                                        // Agent prefers another language - show translated version
                                        if (agentMessageTranslations[message.id]) {
                                            messageText = agentMessageTranslations[message.id];
                                            console.log(`AgentChatScreen: Agent message - showing translated: "${messageText}"`);
                                        } else {
                                            // Trigger translation for display - use any available text
                                            const messageContent = message.originalText || message.text || message.translatedText;
                                            console.log(`AgentChatScreen: Triggering agent message translation for display`);
                                            translateAgentMessageToDisplayLanguage(message.id, messageContent);
                                            messageText = messageContent || 'Message content not available';
                                            console.log(`AgentChatScreen: Agent message - showing original while translating: "${messageText}"`);
                                        }
                                    }
                                } else {
                                    // Customer messages - show translated version based on agent's language preference
                                    if (agentLanguage === 'en') {
                                        // Agent prefers English - show English translation
                                        messageText = message.translatedTextEn || message.originalText || message.text || 'Message content not available';
                                        console.log(`AgentChatScreen: Agent prefers English - showing: "${messageText}"`);
                                                                         } else {
                                         // Agent prefers another language - translate customer messages to agent's language
                                         if (message.originalText && message.senderId !== currentAgentId) {
                                             // Check if we already have a translation for this message
                                             if (translatedMessages[message.id]) {
                                                 messageText = translatedMessages[message.id];
                                                 console.log(`AgentChatScreen: Using cached translation: "${messageText}"`);
                                             } else {
                                                 // Trigger real-time translation
                                                 console.log(`AgentChatScreen: Triggering translation for message ${message.id}`);
                                                 translateCustomerMessageToAgentLanguage(message.id, message.originalText);
                                                 messageText = message.originalText; // Show original while translating
                                                 console.log(`AgentChatScreen: Showing original while translating: "${messageText}"`);
                                             }
                                         } else if (message.translatedTextEn) {
                                             messageText = message.translatedTextEn;
                                             console.log(`AgentChatScreen: Using existing English translation: "${messageText}"`);
                                         } else if (message.translatedText) {
                                             messageText = message.translatedText;
                                             console.log(`AgentChatScreen: Using existing translation: "${messageText}"`);
                                         } else {
                                             messageText = message.text || 'Message content not available';
                                             console.log(`AgentChatScreen: Using fallback text: "${messageText}"`);
                                         }
                                     }
                                }

                                return (
                                    <View key={message.id} style={[
                                        styles.messageBubble,
                                        message.senderId === currentAgentId ? styles.myMessage : styles.otherMessage
                                    ]}>
                                        <Text style={styles.messageSender}>
                                            {message.senderId === currentAgentId ? 'You' : 'Customer'}
                                        </Text>
                                        <Text style={styles.messageText}>{messageText}</Text>
                                        <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={chatStatus === 'closed' ? "Chat is closed" : "Type your reply..."}
                    multiline
                    editable={chatStatus !== 'closed'}
                    onKeyPress={handleKeyPress}
                />
                <TouchableOpacity
                    style={[styles.sendButton, chatStatus === 'closed' && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={chatStatus === 'closed'}
                >
                    <MaterialIcons name="send" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#3498db',
        padding: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 15,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        height: 80,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        flexShrink: 1, // Allow text to shrink
        marginRight: 10,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    chatStatusText: {
        fontSize: 14,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
    },
    statusOpen: {
        backgroundColor: '#2ecc71', // Green for open
        color: 'white',
    },
    statusClosed: {
        backgroundColor: '#e74c3c', // Red for closed
        color: 'white',
    },
    closeChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginLeft: 10,
    },
    closeChatButtonText: {
        color: 'white',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    messagesList: {
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#dcf8c6', // Light green for agent's messages
        borderBottomRightRadius: 5,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff', // White for customer's messages
        borderBottomLeftRadius: 5,
    },
    messageSender: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 3,
    },
    messageText: {
        fontSize: 16,
        color: '#333',
    },
    messageTimestamp: {
        fontSize: 10,
        color: '#777',
        alignSelf: 'flex-end',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#fff',
        height: 70,
        minHeight: 70,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sendButton: {
        backgroundColor: '#2ecc71',
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#a0a0a0', // Grey out when disabled
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    errorText: {
        fontSize: 18,
        color: '#e74c3c',
        textAlign: 'center',
        padding: 20,
    },
    chatArea: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    messagesWrapper: {
        height: 'calc(100vh - 150px)',
        overflow: 'auto',
        backgroundColor: '#f0f4f8',
        ...(Platform.OS === 'web' && {
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: '#3498db #f0f4f8',
        }),
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
});

export default AgentChatScreen;
