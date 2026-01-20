// Voice Call Debug Component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfigWeb';
import alternativeAgoraService from '../services/alternativeAgoraService';

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
            // Check 1: SDK Availability
            info.checks.push({
                name: 'Agora SDK',
                status: AgoraRTC ? '✅ Loaded' : '❌ Not Available',
                details: AgoraRTC ? `Version: ${AgoraRTC.VERSION || 'Unknown'}` : 'SDK not imported properly'
            });

            // Check 2: App ID Configuration
            info.checks.push({
                name: 'App ID Config',
                status: AGORA_CONFIG?.APP_ID ? '✅ Present' : '❌ Missing',
                details: AGORA_CONFIG?.APP_ID ? 
                    `ID: ${AGORA_CONFIG.APP_ID.substring(0, 8)}...` : 
                    'No App ID configured'
            });

            // Check 3: Browser Compatibility
            const isWebRTCSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            info.checks.push({
                name: 'WebRTC Support',
                status: isWebRTCSupported ? '✅ Supported' : '❌ Not Supported',
                details: `getUserMedia: ${!!navigator.mediaDevices?.getUserMedia}`
            });

            // Check 4: Network Connectivity
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

            // Check 5: Microphone Access
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const tracks = stream.getAudioTracks();
                stream.getTracks().forEach(track => track.stop());
                info.checks.push({
                    name: 'Microphone',
                    status: '✅ Available',
                    details: `Device: ${tracks[0]?.label || 'Default'}`
                });
            } catch (micError) {
                info.checks.push({
                    name: 'Microphone',
                    status: '❌ Not Available',
                    details: `Error: ${micError.message}`
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
