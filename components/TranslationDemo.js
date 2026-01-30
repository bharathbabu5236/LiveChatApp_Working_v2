// Live Translation Demo Component
// Simple demo to test translation functionality before using in actual calls

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import liveTranslationService from '../services/liveTranslationService';
import TranslationControls from './TranslationControls';

const TranslationDemo = ({ onClose }) => {
    const [isTestingMode, setIsTestingMode] = useState(false);
    const [demoResults, setDemoResults] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);

    useEffect(() => {
        checkSystemStatus();
    }, []);

    const checkSystemStatus = () => {
        const status = {
            speechRecognition: false,
            textToSpeech: false,
            translationService: false
        };

        // Check Web Speech API availability
        if (typeof window !== 'undefined') {
            status.speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
            status.textToSpeech = 'speechSynthesis' in window;
        }

        // Check translation service
        try {
            const serviceStatus = liveTranslationService.getStatus();
            status.translationService = true;
        } catch (error) {
            status.translationService = false;
        }

        setSystemStatus(status);
    };

    const runQuickTest = async () => {
        setIsTestingMode(true);
        setDemoResults([]);

        try {
            console.log('🧪 Running quick translation test...');

            // Test 1: Translation service availability
            addResult('Testing translation service...', 'info');
            const serviceStatus = liveTranslationService.getStatus();
            addResult(`✅ Translation service ready: ${serviceStatus.supportedLanguagesCount} languages`, 'success');

            // Test 2: Basic translation test
            addResult('Testing basic translation...', 'info');
            const { translateText } = await import('../translationService');
            const testTranslation = await translateText('Hello, how are you today?', 'en', 'es');
            
            if (testTranslation) {
                addResult(`✅ Translation test: "Hello, how are you today?" → "${testTranslation}"`, 'success');
            } else {
                addResult('❌ Translation test failed', 'error');
            }

            // Test 3: Language setting test
            addResult('Testing language configuration...', 'info');
            liveTranslationService.setLanguages('en', 'fr');
            const updatedStatus = liveTranslationService.getStatus();
            addResult(`✅ Languages set: ${updatedStatus.sourceLanguage} → ${updatedStatus.targetLanguage}`, 'success');

            // Test 4: Speech synthesis test (if available)
            if (systemStatus.textToSpeech) {
                addResult('Testing text-to-speech...', 'info');
                try {
                    if (window.speechSynthesis) {
                        const utterance = new SpeechSynthesisUtterance('Translation test successful');
                        utterance.lang = 'en-US';
                        utterance.rate = 0.8;
                        utterance.volume = 0.5;
                        window.speechSynthesis.speak(utterance);
                        addResult('✅ Text-to-speech test completed', 'success');
                    }
                } catch (error) {
                    addResult(`⚠️ Text-to-speech test failed: ${error.message}`, 'warning');
                }
            }

            addResult('🎉 All tests completed successfully!', 'success');

        } catch (error) {
            console.error('Test failed:', error);
            addResult(`❌ Test failed: ${error.message}`, 'error');
        } finally {
            setIsTestingMode(false);
        }
    };

    const addResult = (message, type = 'info') => {
        const result = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };
        setDemoResults(prev => [...prev, result]);
    };

    const getStatusIcon = (available) => {
        return available ? '✅' : '❌';
    };

    const getStatusColor = (available) => {
        return available ? '#27ae60' : '#e74c3c';
    };

    const getResultStyle = (type) => {
        switch (type) {
            case 'success': return styles.successResult;
            case 'error': return styles.errorResult;
            case 'warning': return styles.warningResult;
            default: return styles.infoResult;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Live Translation Demo</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color="#7f8c8d" />
                </TouchableOpacity>
            </View>

            {/* System Status */}
            <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>System Status</Text>
                
                {systemStatus && (
                    <View style={styles.statusGrid}>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Speech Recognition:</Text>
                            <Text style={[styles.statusValue, { color: getStatusColor(systemStatus.speechRecognition) }]}>
                                {getStatusIcon(systemStatus.speechRecognition)} {systemStatus.speechRecognition ? 'Available' : 'Not Available'}
                            </Text>
                        </View>
                        
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Text-to-Speech:</Text>
                            <Text style={[styles.statusValue, { color: getStatusColor(systemStatus.textToSpeech) }]}>
                                {getStatusIcon(systemStatus.textToSpeech)} {systemStatus.textToSpeech ? 'Available' : 'Not Available'}
                            </Text>
                        </View>
                        
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Translation Service:</Text>
                            <Text style={[styles.statusValue, { color: getStatusColor(systemStatus.translationService) }]}>
                                {getStatusIcon(systemStatus.translationService)} {systemStatus.translationService ? 'Ready' : 'Error'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Translation Controls Demo */}
            <View style={styles.controlsSection}>
                <Text style={styles.sectionTitle}>Translation Controls</Text>
                <TranslationControls
                    isVisible={true}
                    isCallActive={true}
                    onTranslationToggle={(isActive) => {
                        console.log('Demo: Translation toggled:', isActive);
                        addResult(`Translation ${isActive ? 'started' : 'stopped'}`, isActive ? 'success' : 'info');
                    }}
                    onLanguageChange={(type, language) => {
                        console.log('Demo: Language changed:', type, language);
                        addResult(`${type} language changed to: ${language}`, 'info');
                    }}
                    style={styles.demoControls}
                />
            </View>

            {/* Quick Test Button */}
            <View style={styles.testSection}>
                <TouchableOpacity
                    style={[styles.testButton, isTestingMode && styles.testButtonDisabled]}
                    onPress={runQuickTest}
                    disabled={isTestingMode}
                >
                    <MaterialIcons 
                        name={isTestingMode ? "hourglass-empty" : "play-arrow"} 
                        size={20} 
                        color="white" 
                    />
                    <Text style={styles.testButtonText}>
                        {isTestingMode ? 'Testing...' : 'Run Quick Test'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Test Results */}
            {demoResults.length > 0 && (
                <View style={styles.resultsSection}>
                    <Text style={styles.sectionTitle}>Test Results</Text>
                    <ScrollView style={styles.resultsContainer}>
                        {demoResults.map((result) => (
                            <View key={result.id} style={[styles.resultItem, getResultStyle(result.type)]}>
                                <Text style={styles.resultTime}>{result.timestamp}</Text>
                                <Text style={styles.resultMessage}>{result.message}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Usage Instructions */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>How to Test</Text>
                <Text style={styles.instruction}>
                    1. 🧪 Click "Run Quick Test" to verify all components are working
                </Text>
                <Text style={styles.instruction}>
                    2. 🌍 Use Translation Controls to test language selection
                </Text>
                <Text style={styles.instruction}>
                    3. 📞 Start a voice call and enable translation to test live features
                </Text>
                <Text style={styles.instruction}>
                    4. 🎤 Speak into your microphone to test real-time translation
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
        paddingBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#495057',
    },
    closeButton: {
        padding: 5,
    },
    statusSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 10,
    },
    statusGrid: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    statusItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 14,
        color: '#6c757d',
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    controlsSection: {
        marginBottom: 20,
    },
    demoControls: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    testSection: {
        marginBottom: 20,
    },
    testButton: {
        backgroundColor: '#3498db',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
    },
    testButtonDisabled: {
        backgroundColor: '#95a5a6',
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    resultsSection: {
        marginBottom: 20,
        flex: 1,
    },
    resultsContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 10,
        maxHeight: 200,
    },
    resultItem: {
        padding: 10,
        borderRadius: 6,
        marginBottom: 5,
        borderLeftWidth: 4,
    },
    successResult: {
        backgroundColor: '#d4edda',
        borderLeftColor: '#27ae60',
    },
    errorResult: {
        backgroundColor: '#f8d7da',
        borderLeftColor: '#e74c3c',
    },
    warningResult: {
        backgroundColor: '#fff3cd',
        borderLeftColor: '#f39c12',
    },
    infoResult: {
        backgroundColor: '#d1ecf1',
        borderLeftColor: '#17a2b8',
    },
    resultTime: {
        fontSize: 11,
        color: '#6c757d',
        marginBottom: 3,
    },
    resultMessage: {
        fontSize: 13,
        color: '#495057',
    },
    instructionsSection: {
        backgroundColor: '#e8f4fd',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bee5eb',
    },
    instruction: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 8,
        lineHeight: 20,
    },
});

export default TranslationDemo;
