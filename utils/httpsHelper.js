// HTTPS Detection and Microphone Permission Helper
export const checkHTTPSAndMicrophone = async () => {
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    
    console.log('Protocol check:', {
        protocol: location.protocol,
        hostname: location.hostname,
        isHTTPS: isHTTPS,
        allowsMicrophone: isHTTPS
    });

    // Check if microphone API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            success: false,
            error: 'Microphone API not supported in this browser',
            canRetry: false
        };
    }

    // For localhost HTTP, browsers usually allow microphone access
    // For remote HTTP, they don't
    if (!isHTTPS && location.hostname !== 'localhost') {
        return {
            success: false,
            error: 'HTTPS required for microphone access on remote servers',
            suggestion: 'Please use HTTPS or test on localhost',
            canRetry: false
        };
    }

    // Test microphone access
    try {
        console.log('Testing microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        // Get microphone info
        const tracks = stream.getAudioTracks();
        const deviceInfo = tracks.length > 0 ? {
            label: tracks[0].label,
            kind: tracks[0].kind,
            enabled: tracks[0].enabled
        } : 'No audio tracks';
        
        // Clean up immediately
        stream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Microphone access granted:', deviceInfo);
        
        return {
            success: true,
            deviceInfo: deviceInfo,
            protocol: location.protocol
        };
        
    } catch (error) {
        console.error('❌ Microphone access denied:', error);
        
        let errorMessage = 'Microphone access denied';
        let suggestion = 'Please allow microphone permissions and try again';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Microphone permission denied by user';
            suggestion = 'Click the microphone icon in your browser address bar and allow access';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No microphone device found';
            suggestion = 'Please connect a microphone and try again';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Microphone not supported on this device';
            suggestion = 'Try using a different browser or device';
        }
        
        return {
            success: false,
            error: errorMessage,
            suggestion: suggestion,
            canRetry: true,
            protocol: location.protocol
        };
    }
};

export const isSecureContext = () => {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
};
