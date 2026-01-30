// Translation Debug Console
// Real-time monitoring and debugging for translation APIs

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import translationAPITester, { quickHealthCheck } from '../utils/translationAPITester';
import liveTranslationService from '../services/liveTranslationService';

const TranslationDebugConsole = ({ visible, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [isHealthy, setIsHealthy] = useState(null);
    const [serviceStatus, setServiceStatus] = useState({});
    const [isRunningTests, setIsRunningTests] = useState(false);
    const scrollViewRef = useRef(null);

    // Initialize console
    useEffect(() => {
        if (visible) {
            initializeDebugConsole();
            startHealthMonitoring();
        }
        
        return () => {
            stopHealthMonitoring();
        };
    }, [visible]);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (scrollViewRef.current && logs.length > 0) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [logs]);

    const initializeDebugConsole = () => {
        addLog('🚀 Translation Debug Console Started', 'system');
        addLog('📊 Initializing API monitoring...', 'info');
        
        // Get initial service status
        updateServiceStatus();
        
        // Hook into translation service events
        setupTranslationServiceMonitoring();
    };

    const setupTranslationServiceMonitoring = () => {
        // Monitor translation events
        const originalTranslate = liveTranslationService.translateText;
        liveTranslationService.translateText = async (text, sourceLanguage, targetLanguage) => {
            addLog(`🌍 Translation Request: "${text}" (${sourceLanguage} → ${targetLanguage})`, 'translation');
            
            try {
                const result = await originalTranslate.call(liveTranslationService, text, sourceLanguage, targetLanguage);
                
                if (result.success) {
                    addLog(`✅ Translation Success: "${result.translatedText}"`, 'success');
                } else {
                    addLog(`❌ Translation Failed: ${result.error}`, 'error');
                }
                
                return result;
            } catch (error) {
                addLog(`❌ Translation Error: ${error.message}`, 'error');
                throw error;
            }
        };

        // Monitor speech recognition events
        const originalStartListening = liveTranslationService.startListening;
        liveTranslationService.startListening = () => {
            addLog('🎤 Speech Recognition Started', 'speech');
            return originalStartListening.call(liveTranslationService);
        };

        const originalStopListening = liveTranslationService.stopListening;
        liveTranslationService.stopListening = () => {
            addLog('🛑 Speech Recognition Stopped', 'speech');
            return originalStopListening.call(liveTranslationService);
        };
    };

    const updateServiceStatus = () => {
        try {
            const status = liveTranslationService.getStatus();
            setServiceStatus(status);
            addLog(`📈 Service Status: ${status.isActive ? 'Active' : 'Inactive'} | Languages: ${status.sourceLanguage} → ${status.targetLanguage}`, 'info');
        } catch (error) {
            addLog(`❌ Failed to get service status: ${error.message}`, 'error');
        }
    };

    const startHealthMonitoring = () => {
        // Initial health check
        performHealthCheck();
        
        // Periodic health checks every 30 seconds
        const healthCheckInterval = setInterval(performHealthCheck, 30000);
        
        return () => clearInterval(healthCheckInterval);
    };

    const stopHealthMonitoring = () => {
        // Clean up monitoring
        addLog('🛑 Debug Console Stopped', 'system');
    };

    const performHealthCheck = async () => {
        try {
            const health = await quickHealthCheck();
            setIsHealthy(health.healthy);
            
            if (health.healthy) {
                addLog('💚 Health Check: All systems operational', 'success');
            } else {
                addLog('💔 Health Check: Issues detected', 'warning');
                health.checks?.forEach(check => {
                    if (check.status !== 'OK') {
                        addLog(`  ⚠️ ${check.name}: ${check.details}`, 'warning');
                    }
                });
            }
        } catch (error) {
            setIsHealthy(false);
            addLog(`❌ Health Check Failed: ${error.message}`, 'error');
        }
    };

    const runFullTests = async () => {
        if (isRunningTests) return;
        
        setIsRunningTests(true);
        addLog('🧪 Starting comprehensive API tests...', 'test');
        
        try {
            const results = await translationAPITester.runAllTests();
            
            if (results.success) {
                addLog(`✅ All tests passed! (${results.summary.passed}/${results.summary.total})`, 'success');
            } else {
                addLog(`⚠️ Some tests failed. Pass rate: ${results.summary.passRate}%`, 'warning');
                
                // Log failed tests
                results.results.filter(r => r.status === 'FAIL').forEach(test => {
                    addLog(`  ❌ ${test.test}: ${test.details}`, 'error');
                });
            }
        } catch (error) {
            addLog(`❌ Test execution failed: ${error.message}`, 'error');
        } finally {
            setIsRunningTests(false);
        }
    };

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp,
            message,
            type
        };
        
        setLogs(prevLogs => {
            const newLogs = [...prevLogs, logEntry];
            // Keep only last 100 logs to prevent memory issues
            return newLogs.slice(-100);
        });
        
        // Also log to browser console for debugging
        const consoleMessage = `[${timestamp}] ${message}`;
        switch (type) {
            case 'error':
                console.error(consoleMessage);
                break;
            case 'warning':
                console.warn(consoleMessage);
                break;
            case 'success':
                console.log(`%c${consoleMessage}`, 'color: green');
                break;
            default:
                console.log(consoleMessage);
        }
    };

    const clearLogs = () => {
        setLogs([]);
        addLog('🧹 Console cleared', 'system');
    };

    const getLogStyle = (type) => {
        switch (type) {
            case 'error':
                return { color: '#ff4444' };
            case 'warning':
                return { color: '#ff8800' };
            case 'success':
                return { color: '#00cc44' };
            case 'translation':
                return { color: '#4488ff' };
            case 'speech':
                return { color: '#ff44aa' };
            case 'test':
                return { color: '#aa44ff' };
            case 'system':
                return { color: '#888888', fontWeight: 'bold' };
            default:
                return { color: '#ffffff' };
        }
    };

    const getHealthIndicator = () => {
        if (isHealthy === null) return { color: '#888888', text: '⚪ Unknown' };
        return isHealthy 
            ? { color: '#00cc44', text: '🟢 Healthy' }
            : { color: '#ff4444', text: '🔴 Issues' };
    };

    if (!visible) return null;

    const healthIndicator = getHealthIndicator();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Translation Debug Console</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.statusBar}>
                <Text style={[styles.statusText, { color: healthIndicator.color }]}>
                    {healthIndicator.text}
                </Text>
                <Text style={styles.statusText}>
                    Service: {serviceStatus.isActive ? '🟢 Active' : '⚪ Inactive'}
                </Text>
                <Text style={styles.statusText}>
                    Lang: {serviceStatus.sourceLanguage || '?'} → {serviceStatus.targetLanguage || '?'}
                </Text>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity 
                    style={[styles.button, styles.testButton]} 
                    onPress={runFullTests}
                    disabled={isRunningTests}
                >
                    <Text style={styles.buttonText}>
                        {isRunningTests ? '🧪 Testing...' : '🧪 Run Tests'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.healthButton]} 
                    onPress={performHealthCheck}
                >
                    <Text style={styles.buttonText}>💊 Health Check</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.statusButton]} 
                    onPress={updateServiceStatus}
                >
                    <Text style={styles.buttonText}>📊 Refresh Status</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.clearButton]} 
                    onPress={clearLogs}
                >
                    <Text style={styles.buttonText}>🧹 Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                style={styles.logContainer}
                showsVerticalScrollIndicator={true}
            >
                {logs.map(log => (
                    <View key={log.id} style={styles.logEntry}>
                        <Text style={styles.timestamp}>{log.timestamp}</Text>
                        <Text style={[styles.logMessage, getLogStyle(log.type)]}>
                            {log.message}
                        </Text>
                    </View>
                ))}
                
                {logs.length === 0 && (
                    <Text style={styles.emptyMessage}>
                        No logs yet. Start using translation features to see activity.
                    </Text>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        bottom: 100,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        padding: 12,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    title: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
        backgroundColor: '#ff4444',
        borderRadius: 4,
    },
    closeButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#333333',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#444444',
    },
    statusText: {
        color: '#cccccc',
        fontSize: 12,
        fontWeight: '500',
    },
    controls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#444444',
        gap: 4,
    },
    button: {
        flex: 1,
        minWidth: 80,
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },
    testButton: {
        backgroundColor: '#4488ff',
    },
    healthButton: {
        backgroundColor: '#00cc44',
    },
    statusButton: {
        backgroundColor: '#ff8800',
    },
    clearButton: {
        backgroundColor: '#888888',
    },
    logContainer: {
        flex: 1,
        padding: 8,
    },
    logEntry: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingVertical: 2,
    },
    timestamp: {
        color: '#888888',
        fontSize: 10,
        width: 60,
        marginRight: 8,
        fontFamily: 'monospace',
    },
    logMessage: {
        flex: 1,
        fontSize: 11,
        fontFamily: 'monospace',
    },
    emptyMessage: {
        color: '#666666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    },
});

export default TranslationDebugConsole;
