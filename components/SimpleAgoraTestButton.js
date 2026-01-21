// Simple Agora Test Button
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { simpleAgoraTest } from '../utils/simpleAgoraTest';

const SimpleAgoraTestButton = () => {
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);

    const runSimpleTest = async () => {
        setTesting(true);
        setResult(null);
        
        console.log('🚀 Starting simple Agora test...');
        
        try {
            const testResult = await simpleAgoraTest();
            setResult(testResult);
            
            if (testResult.success) {
                Alert.alert(
                    '🎉 Success!',
                    `Agora connection works!\nChannel: ${testResult.channel}\nUID: ${testResult.uid}`,
                    [{ text: 'Great!', style: 'default' }]
                );
            } else {
                const analysis = testResult.analysis;
                Alert.alert(
                    '❌ Connection Failed',
                    `Error: ${testResult.errorMessage}\n\nIssue: ${analysis.issue}\n\nPossible Solutions:\n• ${analysis.solutions.join('\n• ')}`,
                    [{ text: 'OK', style: 'destructive' }]
                );
            }
        } catch (error) {
            setResult({ success: false, error: error.message });
            Alert.alert('Test Error', 'Failed to run test: ' + error.message);
        }
        
        setTesting(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.testButton, testing && styles.testButtonDisabled]}
                onPress={runSimpleTest}
                disabled={testing}
            >
                <Text style={styles.testButtonText}>
                    {testing ? '⏳ Testing...' : '🚀 Simple Agora Test'}
                </Text>
            </TouchableOpacity>
            
            {result && (
                <View style={styles.resultContainer}>
                    <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
                        {result.success ? 
                            `✅ Success: ${result.message}` : 
                            `❌ Failed: ${result.errorCode || result.error}`
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
        backgroundColor: '#28a745',
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

export default SimpleAgoraTestButton;
