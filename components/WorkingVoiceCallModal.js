import React, { useState, useEffect, useRef } from 'react';
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
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isRemoteUserConnected, setIsRemoteUserConnected] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

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

        // Set up video event handlers
        workingVoiceCallService.onRemoteVideoAvailable = (videoTrack) => {
            console.log('📹 Remote video available');
            if (remoteVideoRef.current) {
                try {
                    videoTrack.play(remoteVideoRef.current);
                    console.log('📺 Remote video playing');
                } catch (error) {
                    console.error('Failed to play remote video:', error);
                }
            }
        };

        workingVoiceCallService.onRemoteVideoUnavailable = () => {
            console.log('📹 Remote video unavailable');
            // Clear remote video view
        };            // Start the call using our proven working method
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

    const toggleVideo = async () => {
        if (isVideoEnabled) {
            // Disable video
            const success = await workingVoiceCallService.disableVideo();
            if (success) {
                setIsVideoEnabled(false);
            }
        } else {
            // Enable video
            const success = await workingVoiceCallService.enableVideo();
            if (success) {
                setIsVideoEnabled(true);
                // Start local video preview
                setTimeout(() => {
                    const videoTrack = workingVoiceCallService.getLocalVideoTrack();
                    if (videoTrack && localVideoRef.current) {
                        try {
                            videoTrack.play(localVideoRef.current);
                            console.log('📹 Local video preview started');
                        } catch (error) {
                            console.error('Failed to start local video preview:', error);
                        }
                    }
                }, 500);
            }
        }
    };

    const switchCamera = async () => {
        const result = await workingVoiceCallService.switchCamera();
        if (!result.success) {
            Alert.alert('Camera Switch Failed', result.error || 'Failed to switch camera');
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

                    {/* Video Preview Areas */}
                    {isVideoEnabled && (
                        <View style={styles.videoContainer}>
                            {/* Local Video Preview */}
                            <View style={styles.localVideoContainer}>
                                <div 
                                    ref={localVideoRef}
                                    style={{
                                        width: '100%',
                                        height: 120,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 8,
                                        border: '2px solid #27ae60',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 5,
                                        left: 5,
                                        fontSize: 10,
                                        color: '#666',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        zIndex: 10
                                    }}>
                                        Your Video
                                    </div>
                                </div>
                            </View>
                            
                            {/* Remote Video Area */}
                            <View style={styles.remoteVideoContainer}>
                                <div 
                                    ref={remoteVideoRef}
                                    style={{
                                        width: '100%',
                                        height: 120,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: 8,
                                        border: '2px solid #3498db',
                                        position: 'relative',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 5,
                                        left: 5,
                                        fontSize: 10,
                                        color: '#666',
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        zIndex: 10
                                    }}>
                                        Remote Video
                                    </div>
                                    <div style={{
                                        fontSize: 12,
                                        color: '#666',
                                        textAlign: 'center'
                                    }}>
                                        Waiting for remote video...
                                    </div>
                                </div>
                            </View>
                        </View>
                    )}

                    {/* Remote User Status - Show when video is off or as overlay */}
                    <View style={[styles.userContainer, isVideoEnabled && styles.overlayUserContainer]}>
                        <MaterialIcons 
                            name="account-circle" 
                            size={isVideoEnabled ? 40 : 80} 
                            color={isRemoteUserConnected ? '#27ae60' : '#95a5a6'} 
                        />
                        <Text style={[styles.userName, isVideoEnabled && styles.overlayUserName]}>{targetUserName}</Text>
                        <Text style={[styles.userStatus, isVideoEnabled && styles.overlayUserStatus]}>
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

                        {/* Video Toggle Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, isVideoEnabled ? styles.videoOnButton : styles.videoOffButton]} 
                            onPress={toggleVideo}
                        >
                            <MaterialIcons 
                                name={isVideoEnabled ? 'videocam' : 'videocam-off'} 
                                size={24} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        {/* Camera Switch Button (only show when video is on) */}
                        {isVideoEnabled && (
                            <TouchableOpacity 
                                style={[styles.controlButton, styles.cameraSwitchButton]} 
                                onPress={switchCamera}
                            >
                                <MaterialIcons 
                                    name="flip-camera-ios" 
                                    size={20} 
                                    color="white" 
                                />
                            </TouchableOpacity>
                        )}

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
                            {isVideoEnabled && ' 📹 Video enabled!'}
                        </Text>
                    )}

                    {/* Video Status */}
                    {isVideoEnabled && (
                        <View style={styles.videoStatusContainer}>
                            <MaterialIcons name="videocam" size={16} color="#27ae60" />
                            <Text style={styles.videoStatusText}>Video is ON</Text>
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
    videoOnButton: {
        backgroundColor: '#27ae60',
    },
    videoOffButton: {
        backgroundColor: '#95a5a6',
    },
    cameraSwitchButton: {
        backgroundColor: '#f39c12',
        width: 40,
        height: 40,
        borderRadius: 20,
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
    videoStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27ae60',
    },
    videoStatusText: {
        fontSize: 12,
        color: '#27ae60',
        marginLeft: 5,
        fontWeight: 'bold',
    },
    videoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 15,
        paddingHorizontal: 10,
    },
    localVideoContainer: {
        flex: 1,
        marginRight: 5,
    },
    remoteVideoContainer: {
        flex: 1,
        marginLeft: 5,
    },
    videoLabel: {
        position: 'absolute',
        top: 5,
        left: 5,
        fontSize: 10,
        color: '#666',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 10,
    },
    overlayUserContainer: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    overlayUserName: {
        fontSize: 12,
        marginTop: 4,
    },
    overlayUserStatus: {
        fontSize: 10,
        marginTop: 2,
    },
});

export default WorkingVoiceCallModal;
