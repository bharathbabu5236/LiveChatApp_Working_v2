import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import workingVoiceCallService from '../services/workingVoiceCallService';
import TranslationControls from './TranslationControls';
import LanguagePreferenceSelector from './LanguagePreferenceSelector';
import smartLanguageService from '../services/smartLanguageService';
import liveTranslationService from '../services/liveTranslationService';
import agoraAudioTranslationService from '../services/agoraAudioTranslationService';
// import TranslationDebugConsole from './TranslationDebugConsole';
// import { quickHealthCheck } from '../utils/translationAPITester';

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
    const [isRemoteVideoPlaying, setIsRemoteVideoPlaying] = useState(false);
    
    // Translation states
    const [isTranslationActive, setIsTranslationActive] = useState(false);
    const [translationLanguages, setTranslationLanguages] = useState({
        source: 'en',
        target: 'es'
    });
    
    // Smart language states
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [currentUserLanguage, setCurrentUserLanguage] = useState(null);
    const [targetUserLanguage, setTargetUserLanguage] = useState(null);
    const [languageSetupComplete, setLanguageSetupComplete] = useState(false);
    const [lastTranslation, setLastTranslation] = useState('');
    
    // Debug console state (temporarily disabled)
    const [showDebugConsole, setShowDebugConsole] = useState(false);
    const [translationHealth, setTranslationHealth] = useState({ healthy: true });
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // helper to apply sizing to any injected <video> elements
    const applyVideoElementStyles = (container) => {
        if (!container) return;
        // If Agora injected a <video> element, ensure it fills the container
        try {
            const videoEl = container.querySelector ? container.querySelector('video') : (container.getElementsByTagName ? container.getElementsByTagName('video')[0] : null);
            if (videoEl) {
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.style.display = 'block';
            }
        } catch (e) {
            // ignore DOM access errors
            console.warn('Could not apply video element styles', e);
        }
    };

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
            initializeSmartLanguageSystem();
        }
        
        return () => {
            if (visible) {
                endCall();
                cleanupSmartLanguageSystem();
            }
        };
    }, [visible, currentUserId, targetUserId]);

    // Initialize smart language system
    const initializeSmartLanguageSystem = () => {
        console.log('🧠 Initializing smart language system...');
        
        // Reset smart language service
        smartLanguageService.reset();
        
        // Check if user already has a language preference
        const existingLanguage = smartLanguageService.getParticipantLanguage(currentUserId);
        if (!existingLanguage) {
            // Show language selector for current user
            setShowLanguageSelector(true);
        } else {
            setCurrentUserLanguage(existingLanguage);
        }
    };

    // Cleanup smart language system
    const cleanupSmartLanguageSystem = () => {
        console.log('🧹 Cleaning up smart language system');
        setLanguageSetupComplete(false);
        setCurrentUserLanguage(null);
        setTargetUserLanguage(null);
    };

    // Handle language selection with Agora Audio Translation
    const handleLanguageSelected = (languageCode, languageInfo) => {
        setShowLanguageSelector(false);
        
        // Set up current user's language
        console.log(`✅ User ${currentUserId} selected language: ${languageInfo.name}`);
        setCurrentUserLanguage(languageCode);
        
        // For demo, simulate the partner selecting a different language
        // In production, this would come from the actual partner's selection
        const demoTargetLanguage = languageCode === 'en' ? 'hi' : 'en';
        setTargetUserLanguage(demoTargetLanguage);
        
        // Update Agora Audio Translation Service
        agoraAudioTranslationService.setUserLanguages(languageCode, demoTargetLanguage);
        
        setLanguageSetupComplete(true);
        
        Alert.alert(
            'Audio Translation Ready! 🎵',
            `✅ Your language: ${languageInfo.name}\n✅ Partner language: ${demoTargetLanguage.toUpperCase()}\n\n🎵 When you speak, your voice will be translated and sent as audio via Agora!\n\nClick "Start Translation" to begin live audio translation!`,
            [{ text: 'Start Audio Translation', onPress: () => handleTranslationToggle(true) }]
        );
    };

    // Initialize translation system and perform health check
    const initializeTranslationSystem = async () => {
        // Temporarily disabled
        console.log('🌍 Translation system temporarily disabled for debugging');
        setTranslationHealth({ healthy: true });
    };

    // Cleanup translation system
    const cleanupTranslationSystem = () => {
        // Temporarily disabled
        console.log('🧹 Translation cleanup temporarily disabled');
    };

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
                        // Ensure injected <video> fills container
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder text
                        console.log('📺 Remote video playing');
                    } catch (error) {
                        console.error('Failed to play remote video:', error);
                    }
                }
            };

            workingVoiceCallService.onRemoteVideoUnavailable = () => {
                console.log('📹 Remote video unavailable');
                setIsRemoteVideoPlaying(false); // Show placeholder text again
                // Clear remote video view
                if (remoteVideoRef.current) {
                    // remove child nodes if any
                    try { remoteVideoRef.current.innerHTML = ''; } catch(e){}
                }
            };

            // Also handle local video preview callback
            workingVoiceCallService.onLocalVideoAvailable = (videoTrack) => {
                if (localVideoRef.current) {
                    try {
                        videoTrack.play(localVideoRef.current);
                        setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                        console.log('📹 Local preview playing');
                    } catch (e) {
                        console.error('Failed to play local preview', e);
                    }
                }
            };

        // Pre-request camera permissions for smoother video enabling
        try {
            workingVoiceCallService.checkCameraPermission().then(hasPermission => {
                if (!hasPermission) {
                    console.log('📹 Camera permission not granted, user will be prompted when enabling video');
                } else {
                    console.log('📹 Camera permission already granted');
                }
            });
        } catch (error) {
            console.log('📹 Could not check camera permission:', error);
        }

        // Start the call using our proven working method
            const result = await workingVoiceCallService.startVoiceCall(channelName, currentUserId);

            if (result.success) {
                console.log('✅ Working voice call started successfully!');
                // We're connected, waiting for the other user
                setCallStatus('connected');

                // If a remote video track was already published before UI mounted, play it
                const existing = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();
                if (existing && remoteVideoRef.current) {
                    try {
                        existing.play(remoteVideoRef.current);
                        setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                        setIsRemoteVideoPlaying(true); // Hide placeholder text
                        console.log('📺 Played existing remote video track');
                    } catch (e) {
                        console.warn('Could not play existing remote video track', e);
                    }
                }

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
            const result = await workingVoiceCallService.disableVideo();
            if (result.success) {
                setIsVideoEnabled(false);
                setIsRemoteVideoPlaying(false); // Reset remote video state
                // clear local preview
                if (localVideoRef.current) {
                    try { localVideoRef.current.innerHTML = ''; } catch(e){}
                }
            }
        } else {
            // Enable video
            const result = await workingVoiceCallService.enableVideo();
            if (result.success) {
                setIsVideoEnabled(true);
                // Start local video preview
                setTimeout(() => {
                    const videoTrack = workingVoiceCallService.getLocalVideoTrack();
                    if (videoTrack && localVideoRef.current) {
                        try {
                            videoTrack.play(localVideoRef.current);
                            setTimeout(() => applyVideoElementStyles(localVideoRef.current), 50);
                            console.log('📹 Local video preview started');
                        } catch (error) {
                            console.error('Failed to start local video preview:', error);
                        }
                    }

                    // If remote track already exists, play it into the remote container
                    const remoteTrack = workingVoiceCallService.getRemoteVideoTrack && workingVoiceCallService.getRemoteVideoTrack();
                    if (remoteTrack && remoteVideoRef.current) {
                        try {
                            remoteTrack.play(remoteVideoRef.current);
                            setTimeout(() => applyVideoElementStyles(remoteVideoRef.current), 50);
                            setIsRemoteVideoPlaying(true); // Hide placeholder text
                            console.log('📺 Remote video playing after enabling local video');
                        } catch (e) {
                            console.warn('Could not play remote track after enabling local video', e);
                        }
                    }
                }, 500);
            } else {
                // Show error if video failed to enable
                Alert.alert(
                    'Camera Error', 
                    result.error || 'Failed to enable camera. Please check your camera permissions.',
                    [
                        { text: 'OK' },
                        { 
                            text: 'Check Permissions', 
                            onPress: () => {
                                // Guide user to check browser permissions
                                Alert.alert(
                                    'Camera Permissions',
                                    'Please allow camera access in your browser settings and try again.\n\n1. Click the camera icon in your browser address bar\n2. Allow camera access for this site\n3. Refresh the page if needed',
                                    [{ text: 'OK' }]
                                );
                            }
                        }
                    ]
                );
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
        
        // Stop translation if active
        if (isTranslationActive) {
            try {
                const liveTranslationService = (await import('../services/liveTranslationService')).default;
                await liveTranslationService.stopLiveTranslation();
                setIsTranslationActive(false);
            } catch (error) {
                console.error('Error stopping translation:', error);
            }
        }
        
        await workingVoiceCallService.endVoiceCall();
        setCallStatus('ended');
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    // Translation event handlers - Updated for Agora Audio Translation
    const handleTranslationToggle = async (isActive) => {
        console.log(`� Agora Audio Translation toggle: ${isActive ? 'ON' : 'OFF'}`);
        
        if (!languageSetupComplete) {
            Alert.alert(
                'Language Setup Required',
                'Please select your preferred language first.',
                [{ text: 'Select Language', onPress: () => setShowLanguageSelector(true) }]
            );
            return;
        }

        try {
            if (isActive) {
                // Initialize Agora Audio Translation
                const agoraClient = workingVoiceCallService.getAgoraClient?.();
                if (!agoraClient) {
                    throw new Error('Agora client not available');
                }

                // Initialize the audio translation service
                const initResult = await agoraAudioTranslationService.initialize(
                    agoraClient,
                    currentUserLanguage,
                    targetUserLanguage
                );
                
                console.log('🎯 Initialize result:', initResult);

                // Start audio translation
                const startResult = await agoraAudioTranslationService.startAudioTranslation();
                
                console.log('🎯 Start result:', startResult);
                
                if (startResult) {
                    setIsTranslationActive(true);
                    console.log('✅ Agora Audio Translation started successfully');
                    
                    Alert.alert(
                        '🎵 Audio Translation Active!',
                        `✅ Your speech (${currentUserLanguage.toUpperCase()}) will be translated to ${targetUserLanguage.toUpperCase()} and sent as audio\n✅ Partner's speech will be translated to ${currentUserLanguage.toUpperCase()}`,
                        [{ text: 'Great!' }]
                    );
                } else {
                    throw new Error('Failed to start audio translation');
                }
            } else {
                // Stop audio translation
                await agoraAudioTranslationService.stopAudioTranslation();
                setIsTranslationActive(false);
                setLastTranslation('');
                console.log('🛑 Agora Audio Translation stopped');
            }
        } catch (error) {
            console.error('❌ Audio Translation toggle error:', error);
            Alert.alert('Error', `Failed to ${isActive ? 'start' : 'stop'} audio translation: ${error.message}`);
        }
    };

    const handleLanguageChange = (type, language) => {
        setTranslationLanguages(prev => ({
            ...prev,
            [type]: language
        }));
        
        console.log(`🌍 ${type} language changed to: ${language}`);
    };

    // Test audio translation
    const testSmartTranslation = async () => {
        if (!currentUserLanguage || !targetUserLanguage) {
            Alert.alert('Error', 'Languages not set up properly');
            return;
        }

        const testTexts = [
            'Hello, how are you feeling today?',
            'I need to check your blood pressure',
            'Do you have any allergies to medications?',
            'Please describe your symptoms'
        ];

        const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];

        try {
            console.log('🎵 Testing audio translation...');
            
            // Test the translation pipeline
            await agoraAudioTranslationService.translateAndSendAudio(
                randomText, 
                currentUserLanguage, 
                targetUserLanguage
            );

            Alert.alert(
                'Audio Translation Test Success! 🎵',
                `✅ Original: "${randomText}"\n🌍 Language: ${currentUserLanguage.toUpperCase()} → ${targetUserLanguage.toUpperCase()}\n🎵 Translated audio sent via Agora!`,
                [{ text: 'Excellent!' }]
            );
        } catch (error) {
            Alert.alert('Translation Test Failed', error.message);
        }
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

                    {/* Call Durationnn */}
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
                                        height: 150,
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
                                        height: 150,
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
                                    {!isRemoteVideoPlaying && (
                                        <div style={{
                                            fontSize: 12,
                                            color: '#666',
                                            textAlign: 'center'
                                        }}>
                                            Waiting for remote video...
                                        </div>
                                    )}
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

                        {/* Debug Console Toggle Button */}
                        <TouchableOpacity 
                            style={[styles.controlButton, styles.debugButton, showDebugConsole && styles.debugButtonActive]} 
                            onPress={() => setShowDebugConsole(!showDebugConsole)}
                        >
                            <MaterialIcons 
                                name="bug-report" 
                                size={20} 
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

                    {/* Smart Language Selection - Only if languages not set up */}
                    {!languageSetupComplete && (
                        <TouchableOpacity 
                            style={styles.smartTranslationButton}
                            onPress={() => setShowLanguageSelector(true)}
                        >
                            <MaterialIcons name="language" size={20} color="white" />
                            <Text style={styles.smartTranslationButtonText}>
                                🧠 Select Your Language
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Old Translation Controls - Temporarily Hidden */}
                    {false && (
                        <TranslationControls
                            isVisible={true}
                            isCallActive={callStatus === 'connected' && isRemoteUserConnected}
                            onTranslationToggle={handleTranslationToggle}
                            onLanguageChange={handleLanguageChange}
                            style={styles.translationContainer}
                        />
                    )}

                    {/* Smart Translation Status and Controls */}
                    {languageSetupComplete && (
                        <View style={styles.smartTranslationStatus}>
                            <Text style={styles.smartTranslationTitle}>🎵 Agora Audio Translation Ready</Text>
                            <Text style={styles.languageStatus}>
                                Your voice: {currentUserLanguage?.toUpperCase()} → Partner hears: {targetUserLanguage?.toUpperCase()}
                                {targetUserLanguage && (
                                    <>
                                        {'\n'}
                                        Partner voice: {targetUserLanguage?.toUpperCase()} → You hear: {currentUserLanguage?.toUpperCase()}
                                    </>
                                )}
                            </Text>
                            
                            {/* Start/Stop Audio Translation Toggle */}
                            <TouchableOpacity 
                                style={[styles.translationToggleButton, isTranslationActive && styles.translationToggleButtonActive]}
                                onPress={() => handleTranslationToggle(!isTranslationActive)}
                            >
                                <MaterialIcons 
                                    name={isTranslationActive ? "stop" : "record-voice-over"} 
                                    size={20} 
                                    color="white" 
                                />
                                <Text style={styles.translationToggleText}>
                                    {isTranslationActive ? "🛑 Stop Audio Translation" : "🎵 Start Audio Translation"}
                                </Text>
                            </TouchableOpacity>

                            {/* Test Translation Button */}
                            <TouchableOpacity 
                                style={styles.testButton}
                                onPress={() => testSmartTranslation()}
                            >
                                <MaterialIcons name="hearing" size={16} color="white" />
                                <Text style={styles.testButtonText}>Test Audio Translation</Text>
                            </TouchableOpacity>

                            {/* Live Translation Display */}
                            {isTranslationActive && (
                                <View style={styles.liveTranslationDisplay}>
                                    <Text style={styles.liveTranslationTitle}>🎵 Audio Translation Active</Text>
                                    <Text style={styles.liveTranslationText}>
                                        Speak in {currentUserLanguage?.toUpperCase()} - Your partner will hear translated audio in {targetUserLanguage?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

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

                    {/* Translation Health Indicator */}
                    {translationHealth && (
                        <View style={styles.translationHealthContainer}>
                            <MaterialIcons 
                                name={translationHealth.healthy ? 'check-circle' : 'error'} 
                                size={14} 
                                color={translationHealth.healthy ? '#27ae60' : '#e74c3c'} 
                            />
                            <Text style={[
                                styles.translationHealthText,
                                { color: translationHealth.healthy ? '#27ae60' : '#e74c3c' }
                            ]}>
                                Translation: {translationHealth.healthy ? 'Ready' : 'Issues Detected'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Debug Console - Temporarily disabled */}
                {/* 
                <TranslationDebugConsole
                    visible={showDebugConsole}
                    onClose={() => setShowDebugConsole(false)}
                />
                */}

                {/* Language Preference Selector */}
                <LanguagePreferenceSelector
                    visible={showLanguageSelector}
                    onClose={() => setShowLanguageSelector(false)}
                    onLanguageSelected={handleLanguageSelected}
                    userType="doctor" // You can make this dynamic
                    currentUserId={currentUserId}
                />
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
        maxWidth: 700, // increase to accommodate video without forcing shrink
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
        width: '100%'
    },
    localVideoContainer: {
        flexBasis: '48%',
        marginRight: 5,
    },
    remoteVideoContainer: {
        flexBasis: '48%',
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
    translationContainer: {
        marginTop: 15,
        width: '100%',
    },
    debugButton: {
        backgroundColor: '#9b59b6',
    },
    debugButtonActive: {
        backgroundColor: '#8e44ad',
        transform: [{ scale: 1.1 }],
    },
    translationHealthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
    },
    translationHealthText: {
        fontSize: 11,
        marginLeft: 4,
        fontWeight: '500',
    },
    smartTranslationStatus: {
        backgroundColor: '#e7f3ff',
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#007bff',
    },
    smartTranslationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007bff',
        textAlign: 'center',
        marginBottom: 5,
    },
    languageStatus: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007bff',
        padding: 8,
        borderRadius: 6,
        gap: 5,
    },
    testButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    smartTranslationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        gap: 8,
    },
    smartTranslationButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    translationToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        gap: 6,
    },
    translationToggleButtonActive: {
        backgroundColor: '#dc3545',
    },
    translationToggleText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '500',
    },
    liveTranslationDisplay: {
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        padding: 10,
        marginTop: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#28a745',
    },
    liveTranslationTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#28a745',
        marginBottom: 5,
    },
    liveTranslationText: {
        fontSize: 11,
        color: '#333',
        lineHeight: 16,
        fontStyle: 'italic',
    },
});

export default WorkingVoiceCallModal;
