// Simplified Voice Call Modal using direct Agora calling
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import directCallService from '../services/directCallService';
import { testAgoraConnection } from '../services/agoraTest';

const DirectVoiceCallModal = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName,
    isInitiator = false // true if this user started the call
}) => {
    const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, disconnected
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(50);
    const [callDuration, setCallDuration] = useState(0);
    const [isRemoteUserConnected, setIsRemoteUserConnected] = useState(false);

    // Timer for call duration
    useEffect(() => {
        let interval;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callStatus]);

    // Initialize call when modal becomes visible
    useEffect(() => {
        if (visible && currentUserId && targetUserId) {
            initializeCall();
        }
        
        return () => {
            if (visible) {
                handleEndCall();
            }
        };
    }, [visible, currentUserId, targetUserId]);

    const initializeCall = async () => {
        try {
            console.log('DirectVoiceCall: Initializing call');
            setCallStatus('connecting');
            setIsRemoteUserConnected(false);
            setCallDuration(0);

            // First, test Agora connection
            console.log('🧪 Testing Agora connection before starting call...');
            const testResult = await testAgoraConnection();
            
            if (!testResult.success) {
                console.error('❌ Agora test failed:', testResult.error);
                
                let alertMessage = `Cannot connect to voice service: ${testResult.error}`;
                if (testResult.suggestions && testResult.suggestions.length > 0) {
                    alertMessage += '\n\nSuggestions:\n• ' + testResult.suggestions.join('\n• ');
                }
                
                Alert.alert(
                    'Voice Call Error', 
                    alertMessage,
                    [
                        { text: 'Try Again', onPress: () => initializeCall() },
                        { text: 'Close', onPress: () => onClose(), style: 'cancel' }
                    ]
                );
                return;
            }
            
            console.log('✅ Agora test passed, proceeding with call...');

            // Request microphone permission first
            try {
                console.log('🎤 Requesting microphone permission...');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // Clean up test stream
                console.log('✅ Microphone permission granted');
            } catch (permError) {
                console.error('❌ Microphone permission denied:', permError);
                Alert.alert(
                    'Microphone Required',
                    'Voice calls require microphone access. Please allow microphone permissions and try again.',
                    [{ text: 'OK', onPress: () => onClose() }]
                );
                return;
            }

            const callbacks = {
                onIncomingUser: (user) => {
                    console.log('DirectVoiceCall: Remote user joined:', user.uid);
                    setIsRemoteUserConnected(true);
                    setCallStatus('connected');
                },
                onUserLeft: (user) => {
                    console.log('DirectVoiceCall: Remote user left:', user.uid);
                    setIsRemoteUserConnected(false);
                    setCallStatus('disconnected');
                    setTimeout(() => {
                        handleEndCall();
                    }, 1000);
                },
                onCallEnded: (callInfo) => {
                    console.log('DirectVoiceCall: Call ended:', callInfo);
                    
                    if (callInfo && callInfo.error) {
                        // Handle call error
                        console.error('DirectVoiceCall: Call failed:', callInfo.error);
                        setCallStatus('disconnected');
                        Alert.alert(
                            'Voice Call Failed',
                            `Connection error: ${callInfo.error}\n\nThis might be due to:\n• Network connectivity\n• Microphone permissions\n• Agora service issue\n\nPlease try again.`,
                            [
                                { text: 'Try Again', onPress: () => initializeCall() },
                                { text: 'Close', onPress: () => onClose() }
                            ]
                        );
                    } else {
                        // Normal call end
                        setCallStatus('disconnected');
                        setTimeout(() => {
                            onClose();
                        }, 1000);
                    }
                }
            };

            const result = await directCallService.startCall(currentUserId, targetUserId, callbacks);

            if (result.success) {
                console.log('DirectVoiceCall: Call initialized successfully');
                if (isInitiator) {
                    // If we initiated the call, we're immediately connected (waiting for other user)
                    setCallStatus('connected');
                }
            } else {
                console.error('DirectVoiceCall: Failed to initialize call:', result.error);
                Alert.alert(
                    'Call Failed', 
                    `${result.error}\n\nPlease try again in a moment.`,
                    [
                        { text: 'Try Again', onPress: () => initializeCall() },
                        { text: 'Close', onPress: () => onClose() }
                    ]
                );
            }

        } catch (error) {
            console.error('DirectVoiceCall: Error initializing call:', error);
            Alert.alert(
                'Call Failed', 
                'Unable to start voice call. Please check your microphone permissions and try again.',
                [
                    { text: 'Try Again', onPress: () => initializeCall() },
                    { text: 'Close', onPress: () => onClose() }
                ]
            );
        }
    };

    const handleEndCall = async () => {
        console.log('DirectVoiceCall: Ending call');
        try {
            await directCallService.endCall();
        } catch (error) {
            console.error('DirectVoiceCall: Error ending call:', error);
        } finally {
            setCallStatus('disconnected');
            onClose();
        }
    };

    const toggleMute = async () => {
        try {
            const success = await directCallService.toggleMute();
            if (success) {
                setIsMuted(!isMuted);
            }
        } catch (error) {
            console.error('Error toggling mute:', error);
        }
    };

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'connecting':
                return isInitiator ? 'Calling...' : 'Connecting...';
            case 'connected':
                return isRemoteUserConnected ? `Connected - ${formatDuration(callDuration)}` : 'Waiting for response...';
            case 'disconnected':
                return 'Call ended';
            default:
                return 'Voice Call';
        }
    };

    const getStatusColor = () => {
        switch (callStatus) {
            case 'connecting':
                return '#ff9500';
            case 'connected':
                return isRemoteUserConnected ? '#34c759' : '#ff9500';
            case 'disconnected':
                return '#ff3b30';
            default:
                return '#007aff';
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View style={styles.header}>
                    <Text style={styles.title}>Voice Call</Text>
                    <Text style={styles.userName}>{targetUserName}</Text>
                    <Text style={[styles.status, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                </View>

                <View style={styles.avatar}>
                    <MaterialIcons name="person" size={80} color="#666" />
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity 
                        style={[styles.controlButton, isMuted && styles.mutedButton]} 
                        onPress={toggleMute}
                    >
                        <MaterialIcons 
                            name={isMuted ? "mic-off" : "mic"} 
                            size={30} 
                            color="white" 
                        />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.endButton} 
                        onPress={handleEndCall}
                    >
                        <MaterialIcons name="call-end" size={30} color="white" />
                    </TouchableOpacity>
                </View>

                {callStatus === 'connecting' && (
                    <Text style={styles.connectingText}>
                        {isInitiator ? 'Waiting for customer to answer...' : 'Joining call...'}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        minWidth: 300,
        maxWidth: 400,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    userName: {
        fontSize: 18,
        color: '#666',
        marginBottom: 10,
    },
    status: {
        fontSize: 16,
        fontWeight: '600',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007aff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mutedButton: {
        backgroundColor: '#ff3b30',
    },
    endButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectingText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default DirectVoiceCallModal;
