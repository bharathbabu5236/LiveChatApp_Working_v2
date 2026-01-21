// Voice Call Debug Component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfigWeb';
import alternativeAgoraService from '../services/alternativeAgoraService';
import { checkHTTPSAndMicrophone, isSecureContext } from '../utils/httpsHelper';
import regionalAgoraHelper from '../services/regionalAgoraHelper';
import { validateAgoraAppID } from '../utils/agoraValidator';
import { debugAppId } from '../utils/debugAppId';

const VoiceCallDebug = () => {
    const [debugInfo, setDebugInfo] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const runDiagnostics = async () => {
        setIsRunning(true);
        const info = {
            timestamp: new Date().toISOString(),
            checks: []
        };

        try {
            // Debug App ID configuration first
            console.log('🔍 Starting comprehensive diagnostics...');
            debugAppId();
            
            // Check 1: SDK Availability
            info.checks.push({
                name: 'Agora SDK',
                status: AgoraRTC ? '✅ Loaded' : '❌ Not Available',
                details: AgoraRTC ? `Version: ${AgoraRTC.VERSION || 'Unknown'}` : 'SDK not imported properly'
            });

            // Check 2: App ID Validation
            console.log('🔑 Validating Agora App ID...');
            const appIdValidation = await validateAgoraAppID(AGORA_CONFIG?.APP_ID);
            info.checks.push({
                name: 'App ID Validation',
                status: appIdValidation.valid === true ? '✅ Valid' : 
                       appIdValidation.valid === false ? '❌ Invalid' : '⚠️ Unknown',
                details: appIdValidation.valid === true ? appIdValidation.message :
                        appIdValidation.error + (appIdValidation.suggestions ? 
                        '\nSuggestions: ' + appIdValidation.suggestions.join(', ') : '')
            });

            // Check 3: App ID Configuration
            info.checks.push({
                name: 'App ID Config',
                status: AGORA_CONFIG?.APP_ID ? '✅ Present' : '❌ Missing',
                details: AGORA_CONFIG?.APP_ID ? 
                    `ID: ${AGORA_CONFIG.APP_ID.substring(0, 8)}...` : 
                    'No App ID configured'
            });

            // Check 4: Security Context
            const isSecure = isSecureContext();
            info.checks.push({
                name: 'Security Context',
                status: isSecure ? '✅ Secure' : '⚠️ Insecure',
                details: `Protocol: ${location.protocol}, Secure Context: ${window.isSecureContext}, Hostname: ${location.hostname}`
            });

            // Check 5: Enhanced Microphone Test
            const micTest = await checkHTTPSAndMicrophone();
            info.checks.push({
                name: 'Microphone Access',
                status: micTest.success ? '✅ Available' : '❌ Not Available',
                details: micTest.success ? 
                    `Device: ${micTest.deviceInfo?.label || 'Default'}` : 
                    `${micTest.error}. ${micTest.suggestion || ''}`
            });

            // Check 6: Network Connectivity
            try {
                const startTime = Date.now();
                await fetch('https://web-rtc-api.agora.io/v2/check', { 
                    method: 'GET',
                    mode: 'no-cors',
                    timeout: 5000 
                });
                const latency = Date.now() - startTime;
                info.checks.push({
                    name: 'Agora Network',
                    status: '✅ Reachable',
                    details: `Latency: ~${latency}ms`
                });
            } catch (netError) {
                info.checks.push({
                    name: 'Agora Network',
                    status: '⚠️ Check Failed',
                    details: `Error: ${netError.message}`
                });
            }

            // Check 6: Agora Client Test
            try {
                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                info.checks.push({
                    name: 'Client Creation',
                    status: '✅ Success',
                    details: 'Agora client created successfully'
                });

                // Test join (quick)
                const testChannel = `debug_test_${Date.now()}`;
                const testUID = Math.floor(Math.random() * 100000);
                
                const joinPromise = client.join(
                    AGORA_CONFIG.APP_ID,
                    testChannel,
                    null,
                    testUID
                );

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000);
                });

                await Promise.race([joinPromise, timeoutPromise]);
                
                info.checks.push({
                    name: 'Standard Join Test',
                    status: '✅ Success',
                    details: `Joined ${testChannel} successfully with standard RTC mode`
                });

                await client.leave();
                
            } catch (clientError) {
                info.checks.push({
                    name: 'Standard Join Test',
                    status: '❌ Failed',
                    details: `Error: ${clientError.message} (Code: ${clientError.code || 'N/A'})`
                });

                // Try alternative approach if standard fails
                console.log('🔄 Trying alternative Agora connection...');
                try {
                    const altResult = await alternativeAgoraService.testAlternativeConnection();
                    info.checks.push({
                        name: 'Alternative Join Test',
                        status: altResult.success ? '✅ Success' : '❌ Failed',
                        details: altResult.success ? 
                            `Alternative method worked: ${altResult.method}` : 
                            `Alternative failed: ${altResult.error}`
                    });
                } catch (altError) {
                    info.checks.push({
                        name: 'Alternative Join Test',
                        status: '❌ Failed',
                        details: `Alternative error: ${altError.message}`
                    });
                }

                // Try regional connection testing
                console.log('🌍 Testing regional Agora connections...');
                try {
                    const regionalResults = await regionalAgoraHelper.testConnectionMethods(AGORA_CONFIG.APP_ID);
                    const workingMethod = regionalResults.find(r => r.success);
                    
                    info.checks.push({
                        name: 'Regional Connection Test',
                        status: workingMethod ? '✅ Found Working Method' : '❌ All Methods Failed',
                        details: workingMethod ? 
                            `Working method: ${workingMethod.method}` : 
                            `All methods failed: ${regionalResults.map(r => r.method + ':' + r.error).join(', ')}`
                    });
                } catch (regionalError) {
                    info.checks.push({
                        name: 'Regional Connection Test',
                        status: '❌ Test Failed',
                        details: `Regional test error: ${regionalError.message}`
                    });
                }

                // Perform advanced network diagnostics
                console.log('🔍 Running network diagnostics...');
                try {
                    const networkDiag = await regionalAgoraHelper.performNetworkDiagnostics();
                    networkDiag.forEach((diag, index) => {
                        info.checks.push({
                            name: `Network: ${diag.test}`,
                            status: diag.result === 'SUCCESS' ? '✅ Success' : '❌ Failed',
                            details: diag.details
                        });
                    });
                } catch (diagError) {
                    info.checks.push({
                        name: 'Network Diagnostics',
                        status: '❌ Failed',
                        details: `Diagnostic error: ${diagError.message}`
                    });
                }
            }

        } catch (error) {
            info.checks.push({
                name: 'Diagnostics Error',
                status: '❌ Failed',
                details: error.message
            });
        }

        setDebugInfo(info);
        setIsRunning(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.button, isRunning && styles.buttonDisabled]}
                onPress={runDiagnostics}
                disabled={isRunning}
            >
                <Text style={styles.buttonText}>
                    {isRunning ? '🔍 Running Diagnostics...' : '🔍 Run Voice Call Diagnostics'}
                </Text>
            </TouchableOpacity>

            {debugInfo && (
                <ScrollView style={styles.debugContainer}>
                    <Text style={styles.title}>Voice Call Diagnostics</Text>
                    <Text style={styles.timestamp}>{debugInfo.timestamp}</Text>
                    
                    {debugInfo.checks.map((check, index) => (
                        <View key={index} style={styles.checkItem}>
                            <Text style={styles.checkName}>{check.name}</Text>
                            <Text style={styles.checkStatus}>{check.status}</Text>
                            <Text style={styles.checkDetails}>{check.details}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    debugContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        maxHeight: 400,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
        marginBottom: 15,
    },
    checkItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 10,
    },
    checkName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    checkStatus: {
        fontSize: 14,
        marginBottom: 2,
    },
    checkDetails: {
        fontSize: 12,
        color: '#666',
    },
});

export default VoiceCallDebug;
