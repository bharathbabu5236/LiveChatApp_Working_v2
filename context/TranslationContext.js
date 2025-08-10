// LiveChatApp/context/TranslationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateText } from '../translationService';

const TranslationContext = createContext();

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
};

// UI text translations
const UI_TRANSLATIONS = {
    // Home Screen
    'welcome_title': 'welcome to live chat',
    'welcome_subtitle': 'Get instant help from our professional support team. We are here to assist you 24/7 with any questions or concerns you may have.',
    'start_chat': 'Start Chat',
    'admin': 'Admin',
    'reviews': 'Reviews',
    
    // Care Services
    'care_services_title': 'Our Comprehensive Care Services',
    'care_services_description': 'Our dedicated caregivers help seniors maintain dignity and independence by providing essential daily support. We assist with bathing and hygiene to promote cleanliness and comfort while preventing skin infections. Dressing and grooming assistance ensures individuals look and feel their best, including clothing selection, hair care, and personal grooming. We also offer mobility support, helping seniors move safely whether walking, transferring, or using mobility aids like walkers or wheelchairs. Additionally, our caregivers emphasize fall prevention and safety, ensuring a secure home environment by monitoring surroundings and minimizing risks. We provide friendly conversation, hobby engagement, and emotional support to keep seniors socially active and engaged. Our caring companions foster meaningful conversations, reminiscing on past experiences, and sharing stories to keep minds stimulated. We also encourage hobbies, games, and light physical activities to promote social interaction and well-being. Our caregivers accompany seniors on walks, errands, and medical appointments, ensuring they feel supported and connected to their community. Additionally, we offer emotional reassurance, providing a comforting presence to reduce feelings of loneliness, anxiety, or depression, helping seniors maintain a positive outlook on life. Our caregivers ensure medications are taken on time, in the correct dosage, and as prescribed by healthcare professionals. They provide gentle reminders, assist with medication organization, and track health changes to ensure proper care. We also monitor for side effects, prioritizing safety and well-being. Additionally, our caregivers coordinate with families and healthcare providers, reporting any concerns or necessary adjustments to promote effective medication management and overall health stability.',
    
    // Reviews Screen
    'customer_reviews': 'Customer Reviews',
    'share_experience': 'Share Your Experience',
    'your_name': 'Your Name',
    'rate_experience': 'Rate your experience:',
    'write_review': 'Write your review here...',
    'submit_review': 'Submit Review',
    'submitting': 'Submitting...',
    'verified': 'Verified',
    'error': 'Error',
    'success': 'Success',
    'review_required': 'Please enter a review comment.',
    'name_required': 'Please enter your name.',
    'review_success': 'Thank you for your review! It has been submitted successfully.',
    'review_added': 'Thank you for your review! It has been added.',
    'translating': 'Translating',
    'translated_from_original': 'Translated from original language',
    
    // Text Translator Screen
    'text_translator': 'Text Translator',
    'text_translator_title': 'Text Translator & Reader',
    'original_text': 'Original Text',
    'translated_text': 'Translated Text',
    'paste_text_placeholder': 'Paste, type, or use voice input...',
    'translated_text_placeholder': 'Translated text will appear here...',
    'translate_button': 'Translate',
    'translating_button': 'Translating...',
    'from_language': 'From:',
    'to_language': 'To:',
    'english': 'English',
    'listening_placeholder': 'Listening for speech...',
    'speech_not_supported': 'Speech recognition not supported',
    
    // Language Selection
    'select_language': 'Select Language',
    'search_languages': 'Search languages...',
    'no_languages_found': 'No languages found',
    'try_different_search': 'Try a different search term',
    
    // Chat Screen
    'live_chat_support': 'Live Chat Support',
    'type_message': 'Type your message...',
    'send': 'Send',
    'connecting': 'Connecting...',
    'connected': 'Connected',
    'disconnected': 'Disconnected',
    'chat_ended': 'Chat Ended',
    'agent_typing': 'Agent is typing...',
    
    // Login Screen
    'agent_login': 'Agent Login',
    'email': 'Email',
    'password': 'Password',
    'login': 'Login',
    'login_failed': 'Login failed',
    
    // Admin Screen
    'admin_dashboard': 'Admin Dashboard',
    'active_users': 'Active Users',
    'total_chats': 'Total Chats',
    'online_agents': 'Online Agents',
    'quick_actions': 'Quick Actions',
    'view_analytics': 'View Analytics',
    'manage_agents': 'Manage Agents',
    'system_settings': 'System Settings',
    'export_data': 'Export Data',
    
    // Agent Screens
    'agent_dashboard': 'Agent Dashboard',
    'active_chats': 'Active Chats',
    'waiting_customers': 'Waiting Customers',
    'chat_history': 'Chat History',
    'customer_info': 'Customer Information',
    'end_chat': 'End Chat',
    'transfer_chat': 'Transfer Chat',
    
    // Common
    'back': 'Back',
    'cancel': 'Cancel',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'close': 'Close',
    'loading': 'Loading...',
    'retry': 'Retry',
    'language': 'Language',
    'select_language': 'Select Language',
    'change_language': 'Change Language',
    
    // Chat Popup
    'how_can_help': 'How can we help you today?',
    'choose_department': 'Please choose a department:',
    'doctor': 'Doctor',
    'payments': 'Payments',
    'general_support': 'General Support',
    'enter_name': 'Please enter your name:',
    'enter_phone': 'Please enter your phone number:',
    'choose_language': 'Please choose your preferred language:',
    'chat_minimized': 'Chat minimized',
    'chat_restored': 'Chat restored',
    
    // Departments
    'doctor_support': 'Doctor Support',
    'payment_support': 'Payment Support',
    'technical_support': 'Technical Support',
    
    // Time and dates
    'today': 'Today',
    'yesterday': 'Yesterday',
    'online': 'Online',
    'offline': 'Offline',
    'last_seen': 'Last seen',
    'typing': 'typing...',
    
    // Notifications
    'new_message': 'New message',
    'chat_request': 'New chat request',
    'agent_joined': 'Agent joined the chat',
    'agent_left': 'Agent left the chat',
    'customer_joined': 'Customer joined the chat',
    'customer_left': 'Customer left the chat',
    
    // Text-to-Speech
    'text_to_speech_settings': 'Text-to-Speech Settings',
    'enable_text_to_speech': 'Enable Text-to-Speech',
    'speech_rate': 'Speech Rate',
    'speech_pitch': 'Speech Pitch',
    'speech_volume': 'Volume',
    'slow': 'Slow',
    'fast': 'Fast',
    'low': 'Low',
    'high': 'High',
    'quiet': 'Quiet',
    'loud': 'Loud',
    'test_speech': 'Test Speech',
    'stop_test': 'Stop Test',
    'stop': 'Stop',
    'how_to_use': 'How to Use',
    'hover_to_speak_instructions': 'Hover your mouse over any text to hear it read aloud. Text will be spoken in your selected language.',
};

export const TranslationProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const [translations, setTranslations] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Load saved language preference
    useEffect(() => {
        loadLanguagePreference();
    }, []);

    // Translate UI when language changes
    useEffect(() => {
        if (currentLanguage !== 'en') {
            translateUI();
        } else {
            setTranslations({});
        }
    }, [currentLanguage]);

    const loadLanguagePreference = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('userLanguagePreference');
            if (savedLanguage) {
                setCurrentLanguage(savedLanguage);
            }
        } catch (error) {
            console.error('Error loading language preference:', error);
        }
    };

    const saveLanguagePreference = async (languageCode) => {
        try {
            await AsyncStorage.setItem('userLanguagePreference', languageCode);
        } catch (error) {
            console.error('Error saving language preference:', error);
        }
    };

    const translateUI = async () => {
        if (currentLanguage === 'en') {
            setTranslations({});
            return;
        }

        setIsLoading(true);
        const newTranslations = {};

        try {
            // Translate all UI texts in batches to optimize API calls
            const keys = Object.keys(UI_TRANSLATIONS);
            const batchSize = 10; // Translate 10 strings at once

            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                const batchPromises = batch.map(async (key) => {
                    try {
                        const result = await translateText(UI_TRANSLATIONS[key], currentLanguage, 'en');
                        return { key, translation: result.translatedText };
                    } catch (error) {
                        console.error(`Error translating ${key}:`, error);
                        return { key, translation: UI_TRANSLATIONS[key] }; // Fallback to original
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ key, translation }) => {
                    newTranslations[key] = translation;
                });

                // Small delay between batches to avoid rate limiting
                if (i + batchSize < keys.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            setTranslations(newTranslations);
        } catch (error) {
            console.error('Error translating UI:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const changeLanguage = async (languageCode) => {
        setCurrentLanguage(languageCode);
        await saveLanguagePreference(languageCode);
    };

    const t = (key) => {
        if (currentLanguage === 'en') {
            return UI_TRANSLATIONS[key] || key;
        }
        return translations[key] || UI_TRANSLATIONS[key] || key;
    };

    const value = {
        currentLanguage,
        changeLanguage,
        t,
        isLoading,
        UI_TRANSLATIONS
    };

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
};

export default TranslationContext;
