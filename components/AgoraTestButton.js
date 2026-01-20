// Simple Agora Connection Test Component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { testAgoraConnection } from '../services/agoraTest';

const AgoraTestButton = () => {
    const [testing, setTesting] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const runTest = async () => {
        setTesting(true);
        console.log('🧪 Running Agora connection test...');
        
        try {
            const result = await testAgoraConnection();
            setLastResult(result);
            
            if (result.success) {
                console.log('✅ Agora test passed!');
                Alert.alert(
                    '✅ Agora Test Passed!', 
                    'Your Agora App ID is working correctly. Voice calls should work now.',
                    [{ text: 'Great!', style: 'default' }]
                );
            } else {
                console.error('❌ Agora test failed:', result.error);
                Alert.alert(
                    '❌ Agora Test Failed', 
                    `Error: ${result.error}\n\nPlease check:\n• Internet connection\n• Agora App ID validity\n• Firewall settings`,
                    [{ text: 'OK', style: 'destructive' }]
                );
            }
        } catch (error) {
            console.error('❌ Test exception:', error);
            Alert.alert('Test Error', 'Failed to run test: ' + error.message);
        }
        
        setTesting(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={runTest}
                disabled={testing}
            >
                <Text style={styles.testButtonText}>
                    {testing ? '🧪 Testing...' : '🧪 Test Agora'}
                </Text>
            </TouchableOpacity>
            
            {lastResult && (
                <Text style={[styles.resultText, lastResult.success ? styles.successText : styles.errorText]}>
                    {lastResult.success ? '✅ Connection OK' : `❌ ${lastResult.error}`}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        margin: 10,
    },
    testButton: {
        backgroundColor: '#ff9500',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
        marginBottom: 5,
    },
    testButtonDisabled: {
        backgroundColor: '#cccccc',
    },
    testButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    resultText: {
        fontSize: 10,
        textAlign: 'center',
    },
    successText: {
        color: '#27ae60',
    },
    errorText: {
        color: '#e74c3c',
    },
});

export default AgoraTestButton;
