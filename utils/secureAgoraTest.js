// Secure Agora Test with Token Authentication
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_TOKEN_CONFIG, validateToken } from '../config/agoraTokenConfig';

export const secureAgoraTest = async (customToken = null, customChannel = null, customUID = null) => {
    console.log('🔐 Running secure Agora test with token authentication...');
    
    try {
        // Validate token configuration
        const tokenValidation = validateToken();
        if (!tokenValidation.valid) {
            return {
                success: false,
                error: 'Token Configuration Error',
                details: tokenValidation.error,
                solution: tokenValidation.solution
            };
        }
        
        // Use provided values or defaults from config
        const token = customToken || AGORA_TOKEN_CONFIG.TEMP_TOKEN;
        const channel = customChannel || AGORA_TOKEN_CONFIG.TEST_CHANNEL;
        const uid = customUID || AGORA_TOKEN_CONFIG.TEST_UID;
        
        console.log('🔑 Using token:', token ? token.substring(0, 20) + '...' : 'None');
        console.log('📺 Channel:', channel);
        console.log('👤 UID:', uid);
        
        // Create client
        console.log('Creating secure client...');
        const client = AgoraRTC.createClient({ 
            mode: AGORA_TOKEN_CONFIG.CLIENT_CONFIG.mode, 
            codec: AGORA_TOKEN_CONFIG.CLIENT_CONFIG.codec 
        });
        
        // Join with token
        console.log('🚀 Attempting secure join...');
        const joinPromise = client.join(
            AGORA_TOKEN_CONFIG.APP_ID,
            channel,
            token, // Now using the token!
            uid
        );
        
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SECURE_JOIN_TIMEOUT')), 8000);
        });
        
        const result = await Promise.race([joinPromise, timeoutPromise]);
        
        console.log('🎉 SECURE CONNECTION SUCCESSFUL!');
        console.log('Join result:', result);
        
        // Test audio track creation
        try {
            console.log('🎤 Testing audio track creation...');
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await client.publish([audioTrack]);
            console.log('🎶 Audio published successfully!');
            
            // Cleanup
            audioTrack.stop();
            audioTrack.close();
        } catch (audioError) {
            console.warn('⚠️ Audio test failed:', audioError.message);
        }
        
        // Leave channel
        await client.leave();
        console.log('👋 Left channel successfully');
        
        return {
            success: true,
            message: 'Secure Agora connection successful!',
            details: {
                channel: channel,
                uid: result, // The actual UID assigned
                tokenUsed: token ? 'Yes' : 'No',
                audioTest: 'Completed'
            }
        };
        
    } catch (error) {
        console.error('❌ Secure test failed:', error);
        
        return {
            success: false,
            error: error.code || 'UNKNOWN_ERROR',
            message: error.message,
            analysis: analyzeSecureError(error)
        };
    }
};

const analyzeSecureError = (error) => {
    const code = error.code;
    const message = error.message;
    
    if (code === 'INVALID_PARAMS') {
        return {
            issue: 'Invalid token or parameters',
            causes: ['Token expired', 'Token generated for different channel/UID', 'Invalid App ID'],
            solutions: ['Generate new temp token', 'Check channel name matches', 'Verify UID matches']
        };
    } else if (code === 'CAN_NOT_GET_GATEWAY_SERVER') {
        return {
            issue: 'Still cannot reach gateway (even with token)',
            causes: ['Network firewall issues', 'Agora service problems', 'Wrong data center'],
            solutions: ['Check network connectivity', 'Try different data center', 'Contact Agora support']
        };
    } else if (message?.includes('token')) {
        return {
            issue: 'Token authentication problem',
            causes: ['Invalid token format', 'Token expired', 'Token-channel-UID mismatch'],
            solutions: ['Regenerate token', 'Check token expiry', 'Verify all parameters match']
        };
    } else {
        return {
            issue: `Secure connection error: ${code || 'Unknown'}`,
            causes: [`Error message: ${message}`],
            solutions: ['Check Agora Console logs', 'Verify project settings']
        };
    }
};
