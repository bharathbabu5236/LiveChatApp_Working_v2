// Ultra Simple Test Button
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ultraSimpleAgoraTest } from '../utils/ultraSimpleAgoraTest';

const UltraSimpleTestButton = () => {
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);

    const runUltraSimpleTest = async () => {
        setTesting(true);
        setResult(null);
        
        console.log('🎯 Starting ultra simple Agora test...');
        
        try {
            const testResult = await ultraSimpleAgoraTest();
            setResult(testResult);
            
            if (testResult.success) {
                Alert.alert(
                    '🎉 SUCCESS!',
                    `Ultra simple test passed!\n\nChannel: ${testResult.details.channel}\nUID: ${testResult.details.uid}\n\nVoice calls should work now!`,
                    [{ text: 'Awesome!', style: 'default' }]
                );
            } else {
                Alert.alert(
                    '❌ Test Failed',
                    `Error: ${testResult.error}\n\nAnalysis: ${testResult.analysis}\n\nSolutions:\n• ${testResult.solutions.join('\n• ')}`,
                    [{ text: 'OK', style: 'destructive' }]
                );
            }
        } catch (error) {
            setResult({ success: false, error: error.message });
            Alert.alert('Test Error', 'Failed to run ultra simple test: ' + error.message);
        }
        
        setTesting(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={runUltraSimpleTest}
                disabled={testing}
            >
                <Text style={styles.testButtonText}>
                    {testing ? '⏳ Testing...' : '🎯 Ultra Simple Test'}
                </Text>
            </TouchableOpacity>
            
            {result && (
                <View style={styles.resultContainer}>
                    <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
                        {result.success ? 
                            `✅ ${result.message}` : 
                            `❌ ${result.error}: ${result.analysis}`
                        }
                    </Text>
                </View>
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
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    testButtonDisabled: {
        backgroundColor: '#cccccc',
    },
    testButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    resultContainer: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 8,
        maxWidth: 300,
    },
    resultText: {
        fontSize: 12,
        textAlign: 'center',
    },
    successText: {
        color: '#28a745',
    },
    errorText: {
        color: '#dc3545',
    },
});

export default UltraSimpleTestButton;
