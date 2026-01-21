// Working Voice Call Modal - Based on Successful Test
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import workingVoiceCallService from '../services/workingVoiceCallService';

const WorkingVoiceCallModal = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName 
}) => {
    const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
    const [isMuted, setIsMuted] = useState(false);
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
            initializeWorkingCall();
        }
        
        return () => {
            if (visible) {
                endCall();
            }
        };
    }, [visible, currentUserId, targetUserId]);

    const initializeWorkingCall = async () => {
        try {
            console.log('🎤 Initializing working voice call...');
            setCallStatus('connecting');
            
            // Generate channel name (same as before)
            const channelName = `call_${[currentUserId, targetUserId].sort().join('_')}`;
            
            // Set up event listeners
            workingVoiceCallService.onUserJoined = (user) => {
                console.log('🎉 Remote user joined the call:', user.uid);
                setIsRemoteUserConnected(true);
                setCallStatus('connected');
            };

            workingVoiceCallService.onUserLeft = (user, reason) => {
                console.log('👋 Remote user left the call:', user.uid);
                setIsRemoteUserConnected(false);
                setCallStatus('ended');
                setTimeout(() => {
                    endCall();
                }, 2000);
            };

            workingVoiceCallService.onError = (error) => {
                console.error('🚨 Voice call error:', error);
                Alert.alert(
                    'Voice Call Error',
                    'There was an issue with the voice call. Please try again.',
                    [{ text: 'OK', onPress: () => endCall() }]
                );
            };

            // Start the call using our proven working method
            const result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);

            if (result.success) {
                console.log('✅ Working voice call started successfully!');
                // We're connected, waiting for the other user
                setCallStatus('connected');
            } else {
                console.error('❌ Working voice call failed:', result);
                Alert.alert(
                    'Call Failed',
                    result.message || 'Unable to start voice call. Please try again.',
                    [{ text: 'OK', onPress: () => onClose() }]
                );
            }

        } catch (error) {
            console.error('❌ Working call initialization failed:', error);
            Alert.alert(
                'Call Failed',
                'Unable to initialize voice call. Please try again.',
                [{ text: 'OK', onPress: () => onClose() }]
            );
        }
    };

    const toggleMute = async () => {
        const success = await workingVoiceCallService.setMicrophoneMuted(!isMuted);
        if (success) {
            setIsMuted(!isMuted);
        }
    };

    const endCall = async () => {
        console.log('📞 Ending working voice call...');
        await workingVoiceCallService.endVoiceCall();
        setCallStatus('ended');
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={endCall}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Voice Call</Text>
                        <Text style={styles.subtitle}>
                            {callStatus === 'connecting' && 'Connecting...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? `Connected to ${targetUserName}` : 'Waiting for other user...')}
                            {callStatus === 'ended' && 'Call Ended'}
                        </Text>
                    </View>

                    {/* Status Indicator */}
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusIndicator, {
                            backgroundColor: callStatus === 'connected' ? '#27ae60' : '#e74c3c'
                        }]} />
                        <Text style={styles.statusText}>
                            {callStatus === 'connecting' && 'Establishing connection...'}
                            {callStatus === 'connected' && (isRemoteUserConnected ? 'Call in progress' : 'Waiting for response...')}
                            {callStatus === 'ended' && 'Call ended'}
                        </Text>
                    </View>

                    {/* Call Duration */}
                    {callStatus === 'connected' && (
                        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
                    )}

                    {/* Remote User Status */}
                    <View style={styles.userContainer}>
                        <MaterialIcons 
                            name="account-circle" 
                            size={80} 
                            color={isRemoteUserConnected ? '#27ae60' : '#95a5a6'} 
                        />
                        <Text style={styles.userName}>{targetUserName}</Text>
                        <Text style={styles.userStatus}>
                            {isRemoteUserConnected ? 'Connected' : 'Calling...'}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        {/* Mute Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, isMuted && styles.mutedButton]} 
                            onPress={toggleMute}
                        >
                            <MaterialIcons 
                                name={isMuted ? 'mic-off' : 'mic'} 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        {/* End Call Button */}
                        <TouchableOpacity 
                            style={styles.endCallButton} 
                            onPress={endCall}
                        >
                            <MaterialIcons name="call-end" size={30} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Success Message */}
                    {callStatus === 'connected' && isRemoteUserConnected && (
                        <Text style={styles.successMessage}>
                            🎉 Voice call is working! Ultra simple test success applied!
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        width: '85%',
        maxWidth: 400,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#34495e',
    },
    duration: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 20,
    },
    userContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 10,
    },
    userStatus: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    controlButton: {
        backgroundColor: '#3498db',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mutedButton: {
        backgroundColor: '#e74c3c',
    },
    endCallButton: {
        backgroundColor: '#e74c3c',
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successMessage: {
        fontSize: 12,
        color: '#27ae60',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
});

export default WorkingVoiceCallModal;
