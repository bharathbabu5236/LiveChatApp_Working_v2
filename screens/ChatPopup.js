// LiveChatApp/screens/ChatPopup.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth, appId, authReadyPromise, signInAnonymously } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { translateMessage, getSupportedLanguagesArray, getNativeLanguageName, testTranslation } from '../translationService';

const ChatPopup = ({ visible, onClose, onAgentSelect }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [userId, setUserId] = useState(null);
    const [chatId, setChatId] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [userType, setUserType] = useState(null); // 'customer' or 'agent'
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
    const [botStep, setBotStep] = useState('welcome'); // 'welcome', 'askName', 'askPhone', 'askLanguage', 'departmentSelection', 'chat'
    const [loadingChatSetup, setLoadingChatSetup] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [translatedCustomerMessages, setTranslatedCustomerMessages] = useState({});
    const [translatedBotMessages, setTranslatedBotMessages] = useState({});
    const flatListRef = useRef(null);

    // Test translation service on component mount
    useEffect(() => {
        testTranslation().then(result => {
            if (result) {
                console.log('ChatPopup: Translation service test successful');
            } else {
                console.error('ChatPopup: Translation service test failed');
            }
        });
    }, []);

    // Load supported languages
    useEffect(() => {
        const loadLanguages = async () => {
            try {
                const languages = getSupportedLanguagesArray();
                setSupportedLanguages(languages);
            } catch (error) {
                console.error('Error loading languages:', error);
            }
        };
        
        loadLanguages();
    }, []);

    // Agent UIDs - replace with actual UIDs from Firebase Authentication
    const AGENT_DOCTOR_UID = 'UVGDfqIPKYVblK3OhRfenFa0BVp2';
    const AGENT_PAYMENTS_UID = 'WF7Q4sW6gnMqRRe2KT3igD4yEKn2';

    // Function to translate bot messages to customer's selected language
    const translateBotMessage = async (messageId, englishText, targetLanguage) => {
        try {
            if (targetLanguage === 'en') {
                // If customer prefers English, no translation needed
                setTranslatedBotMessages(prev => ({
                    ...prev,
                    [messageId]: englishText
                }));
                return englishText;
            }

            console.log(`ChatPopup: Translating bot message "${englishText}" to ${targetLanguage}`);
            const translation = await translateMessage(englishText, targetLanguage, 'en');
            console.log(`ChatPopup: Bot message translation result:`, translation);
            
            setTranslatedBotMessages(prev => ({
                ...prev,
                [messageId]: translation.translatedText
            }));
            
            return translation.translatedText;
        } catch (error) {
            console.error('Error translating bot message:', error);
            return englishText; // Return original text if translation fails
        }
    };

    // Function to get bot message in customer's language
    const getBotMessageInLanguage = (messageId, englishText) => {
        if (!selectedLanguage || selectedLanguage === 'en') {
            return englishText;
        }
        
        if (translatedBotMessages[messageId]) {
            return translatedBotMessages[messageId];
        }
        
        // Quick translations for common placeholders
        if (messageId === 'placeholder-name' && selectedLanguage === 'es') {
            return 'Ingresa tu nombre...';
        }
        if (messageId === 'placeholder-phone' && selectedLanguage === 'es') {
            return 'Ingresa tu número de teléfono...';
        }
        if (messageId === 'department-instruction' && selectedLanguage === 'es') {
            return `¡Hola ${customerInfo.name}! Por favor selecciona un departamento para comenzar a chatear con el próximo agente disponible.`;
        }
        if (messageId === 'welcome-message' && selectedLanguage === 'es') {
            return '¡Hola! Bienvenido a HealthBuddy. Estoy aquí para ayudarte a conectarte con nuestro equipo de soporte. Para comenzar, ¿podrías decirme tu nombre?';
        }
        if (messageId.includes('bot') && selectedLanguage === 'es') {
            // Handle dynamic bot messages
            if (englishText.includes("Nice to meet you") && englishText.includes("What's your phone number")) {
                const name = englishText.match(/Nice to meet you, (.*?)!/)?.[1] || 'there';
                return `¡Encantado de conocerte, ${name}! ¿Cuál es tu número de teléfono?`;
            }
            if (englishText.includes("Thank you") && englishText.includes("select your preferred language")) {
                return '¡Gracias! Por favor selecciona tu idioma preferido del menú desplegable en el encabezado de arriba, luego te conectaré con un agente.';
            }
            if (englishText.includes("Great! I'll connect you with an agent who speaks")) {
                const languageName = englishText.match(/speaks (.*?)\./)?.[1] || 'Spanish';
                return `¡Excelente! Te conectaré con un agente que habla ${languageName}. Ahora, por favor selecciona un departamento:`;
            }
        }
        
        // Trigger translation if not already translated
        translateBotMessage(messageId, englishText, selectedLanguage);
        return englishText; // Return English while translating
    };

    useEffect(() => {
        if (visible && !userType) {
            // Reset state when popup opens
            setMessages([]);
            setInputText('');
            setChatId(null);
            setUserId(null);
            setSelectedDepartment(null);
            setSelectedLanguage(null);
            setCustomerInfo({ name: '', phone: '' });
            setBotStep('welcome');
            setTranslatedBotMessages({});
        }
    }, [visible]);

    useEffect(() => {
        if (userType === 'agent') {
            // Close popup and call the callback to handle agent navigation
            onClose();
            if (onAgentSelect) {
                onAgentSelect();
            }
        } else if (userType === 'customer') {
            // Start bot flow for customer
            setBotStep('askName');
            // Add initial bot welcome message
            const welcomeMessageId = 'welcome-message';
            const welcomeText = 'Hello! Welcome to HealthBuddy. I\'m here to help you connect with our support team. To get started, could you please tell me your name?';
            
            setMessages([{
                id: welcomeMessageId,
                senderType: 'bot',
                text: welcomeText,
                timestamp: new Date().toLocaleString(),
            }]);
            
            // If language is already selected, translate the welcome message
            if (selectedLanguage && selectedLanguage !== 'en') {
                translateBotMessage(welcomeMessageId, welcomeText, selectedLanguage);
            }
        }
    }, [userType, onClose, onAgentSelect]);

    useEffect(() => {
        const setupChat = async () => {
            if (!selectedDepartment || !selectedLanguage) return;
            
            console.log("ChatPopup: Setting up chat...");
            setLoadingChatSetup(true);

            await authReadyPromise;

            let currentUser = auth.currentUser;
            if (!currentUser || (currentUser.isAnonymous === false && currentUser.email)) {
                try {
                    console.log("ChatPopup: Signing in anonymously for customer...");
                    await signInAnonymously(auth);
                    currentUser = auth.currentUser;
                    console.log("ChatPopup: Anonymous user signed in:", currentUser.uid);
                } catch (error) {
                    console.error("ChatPopup: Error signing in anonymously:", error);
                    Alert.alert("Error", "Failed to connect to chat services. Please try again later.");
                    setLoadingChatSetup(false);
                    return;
                }
            }

            if (currentUser) {
                setUserId(currentUser.uid);
                console.log("ChatPopup: Customer User ID set:", currentUser.uid);

                const chatsRef = collection(db, `artifacts/${appId}/public/data/chats`);
                let assignedAgentId = null;

                if (selectedDepartment === 'doctor') {
                    assignedAgentId = AGENT_DOCTOR_UID;
                } else if (selectedDepartment === 'payments') {
                    assignedAgentId = AGENT_PAYMENTS_UID;
                }

                if (!assignedAgentId || assignedAgentId.startsWith('YOUR_AGENT')) {
                    console.error("ChatPopup: Assigned agent UID is missing or is a placeholder for selected department:", selectedDepartment);
                    Alert.alert("Configuration Error", "Agent for this department is not configured. Please contact support.");
                    setLoadingChatSetup(false);
                    return;
                }

                const q = query(
                    chatsRef,
                    where('userId', '==', currentUser.uid),
                    where('status', '==', 'open'),
                    where('assignedDepartment', '==', selectedDepartment),
                    where('customerLanguage', '==', selectedLanguage),
                    orderBy('createdAt', 'desc')
                );

                let foundChatId = null;
                try {
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        foundChatId = querySnapshot.docs[0].id;
                        console.log("ChatPopup: Found existing open chat:", foundChatId);
                    }
                } catch (error) {
                    console.error("ChatPopup: Error searching for existing chats:", error);
                }

                if (foundChatId) {
                    setChatId(foundChatId);
                    console.log("ChatPopup: Joined existing chat:", foundChatId);
                    setBotStep('chat');
                } else {
                    console.log("ChatPopup: Creating new chat...");
                    
                    const newChatRef = await addDoc(chatsRef, {
                        userId: currentUser.uid,
                        agentId: assignedAgentId,
                        status: 'open',
                        assignedDepartment: selectedDepartment,
                        customerLanguage: selectedLanguage,
                        customerName: customerInfo.name,
                        customerPhone: customerInfo.phone,
                        createdAt: serverTimestamp(),
                        lastMessageAt: serverTimestamp(),
                    });
                    setChatId(newChatRef.id);
                    console.log("ChatPopup: Created new chat:", newChatRef.id);
                    setBotStep('chat');
                }
            } else {
                console.error("ChatPopup: User not authenticated after setup attempt.");
                Alert.alert("Authentication Error", "Could not authenticate. Please restart the app.");
            }
            setLoadingChatSetup(false);
        };

        if (selectedDepartment && selectedLanguage) {
            setupChat();
        }
    }, [selectedDepartment, selectedLanguage]);

    // Auto-proceed to department selection when language is selected from header during bot flow
    useEffect(() => {
        if (botStep === 'askLanguageFromHeader' && selectedLanguage) {
            setBotStep('departmentSelection');
            // Add bot confirmation message
            setTimeout(() => {
                const messageId = Date.now().toString() + 'bot';
                const botText = `Great! I'll connect you with an agent who speaks ${getNativeLanguageName(selectedLanguage)}. Now, please select a department:`;
                setMessages(prevMessages => [...prevMessages, {
                    id: messageId,
                    senderType: 'bot',
                    text: botText,
                    timestamp: new Date().toLocaleString(),
                }]);
                if (selectedLanguage !== 'en') {
                    translateBotMessage(messageId, botText, selectedLanguage);
                }
            }, 500);
        }
    }, [selectedLanguage, botStep]);

    // Re-translate customer messages when their language changes
    useEffect(() => {
        if (selectedLanguage && messages.length > 0) {
            console.log(`ChatPopup: Customer language changed to ${selectedLanguage}, re-translating messages`);
            messages.forEach(message => {
                if (message.senderId === userId) {
                    // Translate customer's own messages to their selected language
                    const messageContent = message.originalText || message.text || message.translatedText;
                    if (messageContent) {
                        translateCustomerMessageToDisplayLanguage(message.id, messageContent);
                    }
                } else if (message.senderType === 'bot') {
                    // Re-translate bot messages to customer's selected language
                    translateBotMessage(message.id, message.text, selectedLanguage);
                }
            });
        }
    }, [selectedLanguage, messages, userId]);

    useEffect(() => {
        if (chatId) {
            console.log("ChatPopup: Listening for messages in chat:", chatId);
            const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
            const q = query(messagesRef, orderBy('timestamp', 'asc'));

            const unsubscribeMessages = onSnapshot(q, (snapshot) => {
                const loadedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleString(),
                }));
                setMessages(loadedMessages);
                console.log("ChatPopup: Messages loaded:", loadedMessages.length);
                console.log("ChatPopup: Message details:", loadedMessages.map(msg => ({
                    id: msg.id,
                    senderId: msg.senderId,
                    senderType: msg.senderType,
                    hasOriginalText: !!msg.originalText,
                    hasTranslatedText: !!msg.translatedText,
                    hasText: !!msg.text,
                    originalText: msg.originalText,
                    translatedText: msg.translatedText,
                    text: msg.text
                })));
                // Scroll to bottom when new messages arrive
                if (flatListRef.current) {
                    setTimeout(() => {
                        if (flatListRef.current) {
                            flatListRef.current.scrollToEnd({ animated: true });
                        }
                    }, 100);
                }
            }, (error) => {
                console.error("ChatPopup: Error fetching messages:", error);
            });

            return () => {
                console.log("ChatPopup: Unsubscribing from messages for chat:", chatId);
                unsubscribeMessages();
            };
        }
    }, [chatId]);

    const handleSendMessage = async () => {
        console.log("ChatPopup: Send button pressed.");
        console.log("ChatPopup: Input Text:", inputText.trim());
        console.log("ChatPopup: Current Chat ID:", chatId);
        console.log("ChatPopup: Current User ID:", userId);
        console.log("ChatPopup: Selected Language:", selectedLanguage);

        if (inputText.trim() === '' || !chatId || !userId || !selectedLanguage) {
            console.warn("ChatPopup: Cannot send message: Input empty, chatId, userId or selectedLanguage missing.");
            return;
        }

        try {
            let translatedTextEn = inputText.trim();
            let originalText = inputText.trim();

            // If customer is using non-English, translate to English for agent
            if (selectedLanguage !== 'en') {
                console.log(`ChatPopup: Translating from ${selectedLanguage} to English...`);
                const translation = await translateMessage(inputText.trim(), 'en', selectedLanguage);
                translatedTextEn = translation.translatedText;
                console.log("ChatPopup: Translation result:", translation);
            }

            const messagesRef = collection(db, `artifacts/${appId}/public/data/chats/${chatId}/messages`);
            await addDoc(messagesRef, {
                senderId: userId,
                senderType: 'user',
                originalText: originalText,
                translatedTextEn: translatedTextEn,
                language: selectedLanguage,
                timestamp: serverTimestamp(),
            });
            setInputText('');
            console.log("ChatPopup: Message sent successfully!");

            const chatDocRef = doc(db, `artifacts/${appId}/public/data/chats`, chatId);
            await updateDoc(chatDocRef, {
                lastMessageAt: serverTimestamp(),
            });
            console.log("ChatPopup: Chat lastMessageAt updated.");

        } catch (error) {
            console.error("ChatPopup: Error sending message:", error);
            Alert.alert("Error", "Failed to send message: " + error.message);
        }
    };

    const handleBotInput = () => {
        if (inputText.trim() === '') return;

        // Add user's bot input to messages for display
        setMessages(prevMessages => [...prevMessages, {
            id: Date.now().toString(),
            senderType: 'user',
            text: inputText.trim(),
            timestamp: new Date().toLocaleString(),
        }]);

        if (botStep === 'askName') {
            setCustomerInfo(prev => ({ ...prev, name: inputText.trim() }));
            setBotStep('askPhone');
            setInputText('');
            // Simulate bot response
            setTimeout(() => {
                const messageId = Date.now().toString() + 'bot';
                const botText = `Nice to meet you, ${inputText.trim()}! What's your phone number?`;
                setMessages(prevMessages => [...prevMessages, {
                    id: messageId,
                    senderType: 'bot',
                    text: botText,
                    timestamp: new Date().toLocaleString(),
                }]);
                if (selectedLanguage !== 'en') {
                    translateBotMessage(messageId, botText, selectedLanguage);
                }
            }, 500);
        } else if (botStep === 'askPhone') {
            setCustomerInfo(prev => ({ ...prev, phone: inputText.trim() }));
            setBotStep('askLanguageFromHeader');
            setInputText('');
            // Simulate bot response
            setTimeout(() => {
                const messageId = Date.now().toString() + 'bot';
                const botText = `Thank you! Please select your preferred language from the dropdown in the header above, then I'll connect you with an agent.`;
                setMessages(prevMessages => [...prevMessages, {
                    id: messageId,
                    senderType: 'bot',
                    text: botText,
                    timestamp: new Date().toLocaleString(),
                }]);
                if (selectedLanguage !== 'en') {
                    translateBotMessage(messageId, botText, selectedLanguage);
                }
            }, 500);
        }
    };

    const handleKeyPress = (event) => {
        // Handle Enter key (send message)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (botStep === 'askName' || botStep === 'askPhone') {
                handleBotInput();
            } else if (botStep === 'chat') {
                handleSendMessage();
            }
        }
        // Handle Shift+Enter (new line) - let it pass through naturally
        // No need to prevent default for Shift+Enter as it should create a new line
    };

    const handleLanguageSelection = (language) => {
        setSelectedLanguage(language);
        setBotStep('departmentSelection');
        // Add bot confirmation message
        setTimeout(() => {
            const messageId = Date.now().toString() + 'bot';
            const botText = `Great! I'll connect you with an agent who speaks ${getNativeLanguageName(language)}. Now, please select a department:`;
            setMessages(prevMessages => [...prevMessages, {
                id: messageId,
                senderType: 'bot',
                text: botText,
                timestamp: new Date().toLocaleString(),
            }]);
            if (language !== 'en') {
                translateBotMessage(messageId, botText, language);
            }
        }, 500);
    };

    // Handle language change in active chat
    const handleLanguageChange = async (languageCode) => {
        try {
            setSelectedLanguage(languageCode);
            setShowLanguageModal(false);
            
            // Update the chat document with the new customer language
            if (chatId) {
                const chatDocRef = doc(db, `artifacts/${appId}/public/data/chats`, chatId);
                await updateDoc(chatDocRef, {
                    customerLanguage: languageCode,
                    lastUpdated: serverTimestamp()
                });
                console.log(`ChatPopup: Customer language updated to: ${languageCode}`);
            }
        } catch (error) {
            console.error('Error updating customer language:', error);
            Alert.alert('Error', 'Failed to update language preference');
        }
    };

    const handleScrollToBottom = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    // Function to translate customer's own messages to their selected language for display
    const translateCustomerMessageToDisplayLanguage = async (messageId, originalText) => {
        try {
            if (selectedLanguage === 'en') {
                // If customer prefers English, no translation needed for display
                setTranslatedCustomerMessages(prev => ({
                    ...prev,
                    [messageId]: originalText
                }));
                return originalText;
            }

            console.log(`ChatPopup: Translating customer's message "${originalText}" to ${selectedLanguage} for display`);
            // Use 'auto' to detect the source language
            const translation = await translateMessage(originalText, selectedLanguage, 'auto');
            console.log(`ChatPopup: Customer message translation result:`, translation);
            
            setTranslatedCustomerMessages(prev => ({
                ...prev,
                [messageId]: translation.translatedText
            }));
            
            return translation.translatedText;
        } catch (error) {
            console.error('Error translating customer message to display language:', error);
            return originalText; // Return original text if translation fails
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

    const toggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    if (!visible) return null;

    // User type selection view
    if (!userType) {
        return (
            <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="smart-toy" size={24} color="#3498db" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Welcome to HealthBuddy</Text>
                            <Text style={styles.headerSubtitle}>Our AI assistant can help you through the process.</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.popupBody}>
                    <Text style={styles.instructionText}>
                        Hi! Please select your role to start chatting.
                    </Text>
                    
                    <TouchableOpacity
                        style={styles.departmentButton}
                        onPress={() => setUserType('customer')}
                    >
                        <MaterialIcons name="person" size={20} color="white" />
                        <Text style={styles.departmentButtonText}>I'm a Customer</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.departmentButton, styles.agentButton]}
                        onPress={() => setUserType('agent')}
                    >
                        <MaterialIcons name="support-agent" size={20} color="white" />
                        <Text style={styles.departmentButtonText}>I'm an Agent</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.popupFooter}>
                    <Text style={styles.footerText}>Powered By AI</Text>
                </View>
            </View>
        );
    }

    // Bot conversation views (for customers)
    if (userType === 'customer' && (botStep === 'askName' || botStep === 'askPhone' || botStep === 'askLanguageFromHeader')) {
        return (
            <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="smart-toy" size={24} color="#3498db" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>AI Assistant</Text>
                            <Text style={styles.headerSubtitle}>Collecting your information</Text>
                        </View>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity 
                            onPress={() => setShowLanguageModal(true)} 
                            style={styles.languageButton}
                        >
                            <MaterialIcons name="language" size={16} color="white" />
                            <Text style={styles.languageButtonText}>
                                {selectedLanguage ? getNativeLanguageName(selectedLanguage) : 'Select Language'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setUserType(null)} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={20} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.popupBody}>
                    <ScrollView 
                        ref={flatListRef}
                        style={styles.messagesWrapper}
                        onScroll={handleScroll}
                    >
                        <View style={styles.messagesList}>
                            {messages.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>Starting conversation...</Text>
                                </View>
                            ) : (
                                messages.map(message => {
                                    // Handle bot message translation
                                    let messageText = message.text;
                                    if (message.senderType === 'bot') {
                                        messageText = getBotMessageInLanguage(message.id, message.text);
                                    }
                                    
                                    return (
                                        <View key={message.id} style={[
                                            styles.messageBubble,
                                            message.senderType === 'user' ? styles.myMessage : styles.botMessage
                                        ]}>
                                            <Text style={styles.messageText}>{messageText}</Text>
                                            <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                                         </ScrollView>
                 </View>
                
                {(botStep === 'askName' || botStep === 'askPhone') && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={
                                selectedLanguage === 'en' 
                                    ? (botStep === 'askName' ? "Enter your name..." : "Enter your phone number...")
                                    : (botStep === 'askName' 
                                        ? getBotMessageInLanguage('placeholder-name', "Enter your name...")
                                        : getBotMessageInLanguage('placeholder-phone', "Enter your phone number..."))
                            }
                            multiline
                            onKeyPress={handleKeyPress}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleBotInput}>
                            <MaterialIcons name="send" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                                 )}

                 <View style={styles.popupFooter}>
                     <Text style={styles.footerText}>Powered By AI</Text>
                 </View>

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
                             <ScrollView style={styles.languageListContainer}>
                                 {supportedLanguages.map((lang) => (
                                     <TouchableOpacity
                                         key={lang.code}
                                         style={[
                                             styles.languageOption,
                                             selectedLanguage === lang.code && styles.selectedLanguageOption
                                         ]}
                                         onPress={() => {
                                             setSelectedLanguage(lang.code);
                                             setShowLanguageModal(false);
                                         }}
                                     >
                                         <Text style={styles.languageOptionText}>
                                             {lang.nativeName} ({lang.name})
                                         </Text>
                                         {selectedLanguage === lang.code && (
                                             <MaterialIcons name="check" size={20} color="#2ecc71" />
                                         )}
                                     </TouchableOpacity>
                                 ))}
                             </ScrollView>
                         </View>
                     </View>
                 </Modal>
             </View>
         );
     }

    // Department selection view (for customers after bot conversation)
    if (userType === 'customer' && botStep === 'departmentSelection' && !selectedDepartment) {
        return (
            <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="smart-toy" size={24} color="#3498db" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Welcome to HealthBuddy</Text>
                            <Text style={styles.headerSubtitle}>Our AI assistant can help you through the process.</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setBotStep('askLanguage')} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.popupBody}>
                    <ScrollView 
                        ref={flatListRef}
                        style={styles.messagesWrapper}
                        onScroll={handleScroll}
                    >
                        <View style={styles.messagesList}>
                            {messages.map(message => {
                                // Handle bot message translation
                                let messageText = message.text;
                                if (message.senderType === 'bot') {
                                    messageText = getBotMessageInLanguage(message.id, message.text);
                                }
                                
                                return (
                                    <View key={message.id} style={[
                                        styles.messageBubble,
                                        message.senderType === 'user' ? styles.myMessage : styles.botMessage
                                    ]}>
                                        <Text style={styles.messageText}>{messageText}</Text>
                                        <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                    
                                         <Text style={styles.instructionText}>
                         {getBotMessageInLanguage('department-instruction', `Hi ${customerInfo.name}! Please select a department to start chatting with the next available agent.`)}
                     </Text>
                    
                                         <TouchableOpacity
                         style={styles.departmentButton}
                         onPress={() => setSelectedDepartment('doctor')}
                     >
                         <MaterialIcons name="local-hospital" size={20} color="white" />
                         <Text style={styles.departmentButtonText}>
                             {selectedLanguage === 'es' ? 'Departamento Médico' : 'Doctor Department'}
                         </Text>
                     </TouchableOpacity>
                     
                     <TouchableOpacity
                         style={[styles.departmentButton, styles.paymentsButton]}
                         onPress={() => setSelectedDepartment('payments')}
                     >
                         <MaterialIcons name="payment" size={20} color="white" />
                         <Text style={styles.departmentButtonText}>
                             {selectedLanguage === 'es' ? 'Departamento de Pagos' : 'Payments Department'}
                         </Text>
                     </TouchableOpacity>
                </View>
                
                <View style={styles.popupFooter}>
                    <Text style={styles.footerText}>Powered By AI</Text>
                </View>
            </View>
        );
    }

    // Loading chat setup view
    if (loadingChatSetup) {
        return (
            <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="sync" size={24} color="#3498db" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Connecting...</Text>
                            <Text style={styles.headerSubtitle}>Setting up your chat</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
                <View style={[styles.popupBody, styles.loadingContainer]}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Connecting to chat...</Text>
                </View>
                <View style={styles.popupFooter}>
                    <Text style={styles.footerText}>Powered By AI</Text>
                </View>
            </View>
        );
    }

    // Minimized view
    if (isMinimized) {
        return (
            <View style={styles.minimizedContainer}>
                <TouchableOpacity onPress={toggleMinimize} style={styles.minimizedButton}>
                    <MaterialIcons name="chat" size={24} color="white" />
                    <Text style={styles.minimizedText}>Chat</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Full chat view (only for customers with selected department and language)
    if (userType === 'customer' && selectedDepartment && selectedLanguage && botStep === 'chat') {
        return (
            <View style={styles.popupContainer}>
                <View style={styles.popupHeader}>
                    <View style={styles.headerContent}>
                        <MaterialIcons name="chat" size={24} color="#3498db" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Live Chat - {selectedDepartment.toUpperCase()}</Text>
                            <Text style={styles.headerSubtitle}>Connected to agent ({selectedLanguage.toUpperCase()})</Text>
                        </View>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity onPress={toggleMinimize} style={styles.minimizeButton}>
                            <MaterialIcons name="remove" size={20} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.popupBody}>
                    <ScrollView 
                        ref={flatListRef}
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
                                    console.log(`ChatPopup: Processing message:`, {
                                        id: message.id,
                                        senderId: message.senderId,
                                        senderType: message.senderType,
                                        userId: userId,
                                        hasText: !!message.text,
                                        hasOriginalText: !!message.originalText,
                                        hasTranslatedText: !!message.translatedText,
                                        text: message.text,
                                        originalText: message.originalText,
                                        translatedText: message.translatedText
                                    });

                                    if (message.text) {
                                        // Bot messages (local state)
                                        messageText = message.text;
                                        console.log(`ChatPopup: Using bot message text: "${messageText}"`);
                                    } else if (message.senderId === userId) {
                                        // Customer's own messages - show translated version in customer's selected language
                                        if (selectedLanguage === 'en') {
                                            // Customer prefers English - show original text
                                            messageText = message.originalText || 'Message content not available';
                                            console.log(`ChatPopup: Customer message (English) - showing original: "${messageText}"`);
                                        } else {
                                            // Customer prefers another language - show translated version
                                            if (translatedCustomerMessages[message.id]) {
                                                messageText = translatedCustomerMessages[message.id];
                                                console.log(`ChatPopup: Customer message - showing translated: "${messageText}"`);
                                            } else {
                                                // Trigger translation for display
                                                const messageContent = message.originalText || message.text || message.translatedText;
                                                console.log(`ChatPopup: Triggering customer message translation for display`);
                                                translateCustomerMessageToDisplayLanguage(message.id, messageContent);
                                                messageText = messageContent || 'Message content not available';
                                                console.log(`ChatPopup: Customer message - showing original while translating: "${messageText}"`);
                                            }
                                        }
                                    } else {
                                        // Agent messages - show translated text to customer
                                        console.log(`ChatPopup: Processing agent message:`, {
                                            senderType: message.senderType,
                                            hasTranslatedText: !!message.translatedText,
                                            translatedText: message.translatedText,
                                            originalText: message.originalText,
                                            text: message.text,
                                            language: message.language
                                        });
                                        
                                        // Check if this is an agent message and has translated text
                                        if (message.senderType === 'agent' && message.translatedText) {
                                            messageText = message.translatedText;
                                            console.log(`ChatPopup: Using agent's translated text: "${messageText}"`);
                                        } else if (message.originalText) {
                                            messageText = message.originalText;
                                            console.log(`ChatPopup: Using agent's original text (no translation): "${messageText}"`);
                                        } else if (message.text) {
                                            messageText = message.text;
                                            console.log(`ChatPopup: Using agent's text field: "${messageText}"`);
                                        } else {
                                            messageText = 'Message content not available';
                                            console.log(`ChatPopup: No message content available`);
                                        }
                                        console.log(`ChatPopup: Final message text: "${messageText}"`);
                                    }

                                    return (
                                        <View key={message.id} style={[
                                            styles.messageBubble,
                                            message.senderId === userId ? styles.myMessage : styles.otherMessage
                                        ]}>
                                            <Text style={styles.messageText}>{messageText}</Text>
                                            <Text style={styles.messageTimestamp}>{message.timestamp}</Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </ScrollView>

                    {showScrollButton && (
                        <TouchableOpacity
                            style={styles.scrollToBottomButton}
                            onPress={handleScrollToBottom}
                        >
                            <MaterialIcons name="keyboard-arrow-down" size={16} color="white" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={`Type your message in ${getNativeLanguageName(selectedLanguage)}...`}
                        multiline
                        onKeyPress={handleKeyPress}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                        <MaterialIcons name="send" size={16} color="white" />
                    </TouchableOpacity>
                                 </View>
             </View>
         );
     }

    // If we reach here, something went wrong - return null
    return null;
};

const styles = StyleSheet.create({
    popupContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 350,
        height: 500,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
        overflow: 'hidden',
    },
    minimizedContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
    },
    minimizedButton: {
        backgroundColor: '#3498db',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    minimizedText: {
        color: 'white',
        fontSize: 10,
        marginTop: 2,
    },
    popupHeader: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 2,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    minimizeButton: {
        padding: 5,
        marginRight: 5,
    },
    closeButton: {
        padding: 5,
    },
    backButton: {
        padding: 5,
        marginRight: 5,
    },
    popupBody: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        position: 'relative',
    },
    instructionText: {
        fontSize: 14,
        color: '#495057',
        textAlign: 'center',
        padding: 20,
        lineHeight: 20,
    },
    departmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginHorizontal: 20,
        marginBottom: 10,
        justifyContent: 'center',
    },
    paymentsButton: {
        backgroundColor: '#9b59b6',
    },
    agentButton: {
        backgroundColor: '#e74c3c',
    },
    departmentButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    languageSelectionContainer: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        backgroundColor: '#fff',
    },
    languageSelectionText: {
        fontSize: 14,
        color: '#495057',
        textAlign: 'center',
        marginBottom: 15,
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 10,
        justifyContent: 'center',
    },
    spanishButton: {
        backgroundColor: '#e74c3c',
    },
    languageButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    popupFooter: {
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#6c757d',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#6c757d',
    },
    messagesWrapper: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    messagesList: {
        padding: 10,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 8,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#dcf8c6',
        borderBottomRightRadius: 4,
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#e9f5ff',
        borderBottomLeftRadius: 4,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#333',
    },
    messageTimestamp: {
        fontSize: 10,
        color: '#777',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        backgroundColor: '#fff',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        maxHeight: 80,
    },
    sendButton: {
        backgroundColor: '#2ecc71',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollToBottomButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#3498db',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
    },
    languageScrollView: {
        maxHeight: 200,
    },
    selectedLanguageButton: {
        backgroundColor: '#27ae60',
        borderWidth: 2,
        borderColor: '#2ecc71',
    },
    // Language button in header
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    languageButtonText: {
        color: 'white',
        marginLeft: 4,
        fontWeight: 'bold',
        fontSize: 10,
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
    languageListContainer: {
        maxHeight: 400,
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedLanguageOption: {
        backgroundColor: '#f8f9fa',
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
    },
    languageOptionText: {
        fontSize: 16,
        color: '#333',
    },
});

export default ChatPopup; 