import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import agoraVoiceService from '../services/agoraVoiceService';
import { generateChannelName } from '../config/agoraConfig';

const VoiceCallModal = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName = 'User',
    isIncomingCall = false,
    onCallEnd 
}) => {
    const [callState, setCallState] = useState('connecting'); // connecting, connected, ended
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [remoteUserConnected, setRemoteUserConnected] = useState(false);
    
    const callTimer = useRef(null);
    const channelName = generateChannelName(currentUserId, targetUserId);

    useEffect(() => {
        if (visible && Platform.OS === 'web') {
            initializeCall();
        }
        
        return () => {
            cleanup();
        };
    }, [visible]);

    useEffect(() => {
        if (callState === 'connected') {
            // Start call timer
            callTimer.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            // Clear timer
            if (callTimer.current) {
                clearInterval(callTimer.current);
                callTimer.current = null;
            }
        }

        return () => {
            if (callTimer.current) {
                clearInterval(callTimer.current);
                callTimer.current = null;
            }
        };
    }, [callState]);

    const initializeCall = async () => {
        try {
            // Set up event callbacks
            agoraVoiceService.onUserJoined = (user) => {
                console.log('Remote user joined call:', user.uid);
                setRemoteUserConnected(true);
                setCallState('connected');
            };

            agoraVoiceService.onUserLeft = (user, reason) => {
                console.log('Remote user left call:', user.uid, reason);
                setRemoteUserConnected(false);
                if (reason === 'Quit') {
                    endCall();
                }
            };

            agoraVoiceService.onConnectionStateChanged = (newState, oldState) => {
                console.log('Connection state changed:', newState);
                if (newState === 'DISCONNECTED') {
                    endCall();
                }
            };

            agoraVoiceService.onError = (error) => {
                console.error('Agora error:', error);
                Alert.alert('Call Error', error);
                endCall();
            };

            // Join the voice channel
            const result = await agoraVoiceService.joinChannel(channelName, currentUserId);
            
            if (result.success) {
                console.log('Successfully joined voice channel:', result.channel);
                // If no one else joins within 30 seconds, consider it a failed call
                setTimeout(() => {
                    if (!remoteUserConnected && callState === 'connecting') {
                        Alert.alert('Call Failed', 'Unable to connect to the other user.');
                        endCall();
                    }
                }, 30000);
            } else {
                Alert.alert('Call Failed', 'Unable to start voice call. Please try again.');
                onClose();
            }
        } catch (error) {
            console.error('Error initializing call:', error);
            Alert.alert('Call Error', 'Failed to initialize voice call.');
            onClose();
        }
    };

    const cleanup = async () => {
        if (callTimer.current) {
            clearInterval(callTimer.current);
            callTimer.current = null;
        }
        
        if (Platform.OS === 'web') {
            await agoraVoiceService.leaveChannel();
        }
        
        setCallState('ended');
        setCallDuration(0);
        setRemoteUserConnected(false);
        setIsMuted(false);
    };

    const endCall = async () => {
        await cleanup();
        if (onCallEnd) onCallEnd();
        onClose();
    };

    const toggleMute = async () => {
        if (Platform.OS === 'web') {
            const newMuteState = await agoraVoiceService.toggleMicrophone();
            setIsMuted(!newMuteState);
        }
    };

    const toggleSpeaker = () => {
        // Speaker toggle logic (for native implementation)
        setIsSpeakerOn(!isSpeakerOn);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallStatusText = () => {
        switch (callState) {
            case 'connecting':
                return isIncomingCall ? 'Incoming call...' : 'Connecting...';
            case 'connected':
                return `Connected - ${formatDuration(callDuration)}`;
            case 'ended':
                return 'Call ended';
            default:
                return 'Voice call';
        }
    };

    if (Platform.OS !== 'web') {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.callContainer}>
                        <Text style={styles.errorText}>
                            Voice calling is currently only available on web
                        </Text>
                        <TouchableOpacity style={styles.endButton} onPress={onClose}>
                            <MaterialIcons name="close" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.callContainer}>
                    {/* User Info */}
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <MaterialIcons name="person" size={60} color="#fff" />
                        </View>
                        <Text style={styles.userName}>{targetUserName}</Text>
                        <Text style={styles.callStatus}>{getCallStatusText()}</Text>
                    </View>

                    {/* Call Controls */}
                    <View style={styles.controlsContainer}>
                        {callState === 'connected' && (
                            <View style={styles.controls}>
                                {/* Mute Button */}
                                <TouchableOpacity
                                    style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                                    onPress={toggleMute}
                                >
                                    <MaterialIcons 
                                        name={isMuted ? "mic_off" : "mic"} 
                                        size={28} 
                                        color={isMuted ? "#e74c3c" : "#fff"} 
                                    />
                                </TouchableOpacity>

                                {/* Speaker Button */}
                                <TouchableOpacity
                                    style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                                    onPress={toggleSpeaker}
                                >
                                    <MaterialIcons 
                                        name={isSpeakerOn ? "volume_up" : "volume_down"} 
                                        size={28} 
                                        color="#fff" 
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* End Call Button */}
                        <TouchableOpacity
                            style={styles.endButton}
                            onPress={endCall}
                        >
                            <MaterialIcons name="call_end" size={30} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Connection Status */}
                    {callState === 'connecting' && (
                        <View style={styles.statusContainer}>
                            <View style={styles.loadingDots}>
                                <View style={[styles.dot, styles.dot1]} />
                                <View style={[styles.dot, styles.dot2]} />
                                <View style={[styles.dot, styles.dot3]} />
                            </View>
                        </View>
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
    callContainer: {
        backgroundColor: '#2c3e50',
        width: '90%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#34495e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#3498db',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
    },
    callStatus: {
        fontSize: 16,
        color: '#bdc3c7',
        textAlign: 'center',
    },
    controlsContainer: {
        alignItems: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
        gap: 20,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#34495e',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    controlButtonActive: {
        backgroundColor: '#e74c3c',
    },
    endButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#e74c3c',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    statusContainer: {
        marginTop: 20,
    },
    loadingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3498db',
        marginHorizontal: 3,
    },
    dot1: {
        // Animation would be added here for native
    },
    dot2: {
        // Animation would be added here for native
    },
    dot3: {
        // Animation would be added here for native
    },
    errorText: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
    },
});

export default VoiceCallModal;
