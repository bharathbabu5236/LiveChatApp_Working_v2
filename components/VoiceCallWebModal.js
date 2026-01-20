import React, { useState, useEffect, useRef } from 'react';
import agoraWebVoiceService from '../services/agoraWebVoiceService';
import callSignalingService from '../services/callSignalingService';
import { generateChannelName } from '../config/agoraConfigWeb';
import './VoiceCallModal.css';

const VoiceCallWebModal = ({ 
    visible, 
    onClose, 
    currentUserId, 
    targetUserId, 
    targetUserName = 'User',
    isIncomingCall = false,
    callId = null,
    onCallEnd 
}) => {
    const [callState, setCallState] = useState('connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [remoteUserConnected, setRemoteUserConnected] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState('good');
    const [errorMessage, setErrorMessage] = useState('');
    const [activeCallId, setActiveCallId] = useState(callId);
    
    const callTimer = useRef(null);
    const channelName = generateChannelName(currentUserId, targetUserId);

    useEffect(() => {
        if (visible) {
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
            setErrorMessage('');
            
            // Check and request microphone permissions
            const hasPermission = await agoraWebVoiceService.checkMicrophonePermission();
            if (!hasPermission) {
                const granted = await agoraWebVoiceService.requestMicrophonePermission();
                if (!granted) {
                    setErrorMessage('Microphone access is required for voice calls');
                    return;
                }
            }

            // Set up event callbacks
            agoraWebVoiceService.onUserJoined = (user) => {
                console.log('Remote user joined call:', user.uid);
                setRemoteUserConnected(true);
                setCallState('connected');
            };

            agoraWebVoiceService.onUserLeft = (user, reason) => {
                console.log('Remote user left call:', user.uid, reason);
                setRemoteUserConnected(false);
                if (reason === 'Quit') {
                    endCall();
                }
            };

            agoraWebVoiceService.onConnectionStateChanged = (newState, oldState) => {
                console.log('Connection state changed:', newState);
                
                switch (newState) {
                    case 'CONNECTED':
                        setConnectionQuality('good');
                        break;
                    case 'RECONNECTING':
                        setConnectionQuality('poor');
                        break;
                    case 'DISCONNECTED':
                        setConnectionQuality('lost');
                        endCall();
                        break;
                    default:
                        setConnectionQuality('good');
                }
            };

            agoraWebVoiceService.onError = (error) => {
                console.error('Agora error:', error);
                setErrorMessage(error);
                setTimeout(() => endCall(), 3000);
            };

            // Join the voice channel
            const result = await agoraWebVoiceService.joinChannel(channelName, currentUserId);
            
            if (result.success) {
                console.log('Successfully joined voice channel:', result.channel);
                // If no one else joins within 30 seconds, consider it a failed call
                setTimeout(() => {
                    if (!remoteUserConnected && callState === 'connecting') {
                        setErrorMessage('Unable to connect to the other user.');
                        setTimeout(() => endCall(), 3000);
                    }
                }, 30000);
            } else {
                setErrorMessage('Unable to start voice call. Please try again.');
                setTimeout(() => onClose(), 3000);
            }
        } catch (error) {
            console.error('Error initializing call:', error);
            setErrorMessage('Failed to initialize voice call.');
            setTimeout(() => onClose(), 3000);
        }
    };

    const cleanup = async () => {
        if (callTimer.current) {
            clearInterval(callTimer.current);
            callTimer.current = null;
        }
        
        await agoraWebVoiceService.leaveChannel();
        
        setCallState('ended');
        setCallDuration(0);
        setRemoteUserConnected(false);
        setIsMuted(false);
        setErrorMessage('');
    };

    const endCall = async () => {
        try {
            // End call in signaling service if we have an active call ID
            if (activeCallId) {
                await callSignalingService.endCall(activeCallId);
            }
        } catch (error) {
            console.error('Error ending call in signaling service:', error);
        }
        
        await cleanup();
        if (onCallEnd) onCallEnd();
        onClose();
    };

    const toggleMute = async () => {
        const newMuteState = await agoraWebVoiceService.toggleMicrophone();
        setIsMuted(!newMuteState);
    };

    const adjustVolume = async (volume) => {
        await agoraWebVoiceService.setVolume(volume);
        setIsSpeakerOn(volume > 50);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallStatusText = () => {
        if (errorMessage) return errorMessage;
        
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

    const getConnectionQualityIcon = () => {
        switch (connectionQuality) {
            case 'good':
                return '📶';
            case 'poor':
                return '📶';
            case 'lost':
                return '❌';
            default:
                return '📶';
        }
    };

    if (!visible) return null;

    return (
        <div className="voice-call-overlay">
            <div className="voice-call-container">
                {/* Connection Quality Indicator */}
                <div className="connection-indicator">
                    <span className={`quality-icon ${connectionQuality}`}>
                        {getConnectionQualityIcon()}
                    </span>
                </div>

                {/* User Info */}
                <div className="user-info">
                    <div className="avatar">
                        <span className="avatar-icon">👤</span>
                    </div>
                    <h2 className="user-name">{targetUserName}</h2>
                    <p className={`call-status ${errorMessage ? 'error' : ''}`}>
                        {getCallStatusText()}
                    </p>
                </div>

                {/* Call Controls */}
                <div className="controls-container">
                    {callState === 'connected' && !errorMessage && (
                        <div className="controls">
                            {/* Mute Button */}
                            <button
                                className={`control-button ${isMuted ? 'active' : ''}`}
                                onClick={toggleMute}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                <span className="icon">
                                    {isMuted ? '🔇' : '🎤'}
                                </span>
                            </button>

                            {/* Volume Control */}
                            <div className="volume-control">
                                <button
                                    className="control-button"
                                    onClick={() => adjustVolume(isSpeakerOn ? 50 : 100)}
                                    title="Adjust Volume"
                                >
                                    <span className="icon">
                                        {isSpeakerOn ? '🔊' : '🔉'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* End Call Button */}
                    <button
                        className="end-call-button"
                        onClick={endCall}
                        title="End Call"
                    >
                        <span className="icon">📞</span>
                    </button>
                </div>

                {/* Connection Status */}
                {callState === 'connecting' && !errorMessage && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Establishing connection...</p>
                    </div>
                )}

                {/* Error Display */}
                {errorMessage && (
                    <div className="error-container">
                        <p className="error-text">{errorMessage}</p>
                        <button onClick={endCall} className="error-close-button">
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceCallWebModal;
