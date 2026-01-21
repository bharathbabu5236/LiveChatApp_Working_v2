// Minimal Agora Connection Test - Testing Mode (No Tokens)
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agoraConfigWeb';

export const simpleAgoraTest = async () => {
    console.log('🧪 Running minimal Agora test in TESTING MODE (no tokens)...');
    
    try {
        // Use configuration from our config file
        const APP_ID = AGORA_CONFIG.APP_ID;
        
        console.log('📋 Test Configuration:');
        console.log('- App ID:', APP_ID?.substring(0, 8) + '...');
        console.log('- Mode:', AGORA_CONFIG.CLIENT_CONFIG?.mode || 'rtc');
        console.log('- Codec:', AGORA_CONFIG.CLIENT_CONFIG?.codec || 'vp8');
        console.log('- Token Required:', AGORA_CONFIG.USE_TOKEN ? 'YES' : 'NO');
        
        console.log('🔧 Creating client for testing mode...');
        const client = AgoraRTC.createClient({ 
            mode: AGORA_CONFIG.CLIENT_CONFIG?.mode || 'rtc', 
            codec: AGORA_CONFIG.CLIENT_CONFIG?.codec || 'vp8'
        });
        
        // Generate test parameters
        const testChannel = 'test_' + Math.floor(Date.now() / 1000);
        const testUID = Math.floor(Math.random() * 100000);
        
        console.log('🚀 Joining channel in testing mode...');
        console.log('- Channel:', testChannel);
        console.log('- UID:', testUID);
        console.log('- Token:', AGORA_CONFIG.USE_TOKEN ? 'Using token' : 'NULL (testing mode)');
        
        // Join WITHOUT token (testing mode)
        const joinPromise = client.join(
            APP_ID,
            testChannel,
            null, // NULL token for testing mode
            testUID
        );
        
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TESTING_MODE_TIMEOUT')), 8000);
        });
        
        const result = await Promise.race([joinPromise, timeoutPromise]);
        
        console.log('🎉 SUCCESS! Testing mode connection established!');
        console.log('Join result UID:', result);
        
        // Test microphone in testing mode
        try {
            console.log('🎤 Testing microphone access...');
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: 'music_standard'
            });
            
            console.log('📢 Publishing audio track...');
            await client.publish([audioTrack]);
            
            console.log('✅ Audio published successfully in testing mode!');
            
            // Cleanup
            audioTrack.stop();
            audioTrack.close();
            
        } catch (audioError) {
            console.warn('⚠️ Audio test failed (not critical):', audioError.message);
        }
        
        // Clean up
        await client.leave();
        console.log('👋 Left channel successfully');
        
        return {
            success: true,
            message: 'Testing mode connection successful! 🎉',
            details: {
                mode: 'Testing (No Tokens)',
                channel: testChannel,
                uid: result,
                audioTest: 'Completed',
                appId: APP_ID?.substring(0, 8) + '...'
            }
        };
        
    } catch (error) {
        console.error('❌ Testing mode failed:', error);
        
        return {
            success: false,
            errorCode: error.code,
            errorMessage: error.message,
            analysis: analyzeTestingModeError(error)
        };
    }
};

const analyzeTestingModeError = (error) => {
    const code = error.code;
    const message = error.message;
    
    if (code === 'CAN_NOT_GET_GATEWAY_SERVER') {
        return {
            issue: 'Still cannot reach gateway in testing mode',
            possibleCauses: [
                'Project is not in testing mode in Agora Console',
                'Chat/Signaling features still enabled (require tokens)',
                'App ID from secure-mode project',
                'Regional/network restrictions'
            ],
            solutions: [
                'Disable Chat/Signaling in Agora Console',
                'Set project to Testing Mode',
                'Create new RTC-only project',
                'Try different network/VPN'
            ]
        };
    } else if (code === 'INVALID_OPERATION' || message?.includes('certificate') || message?.includes('token')) {
        return {
            issue: 'Project still requires authentication',
            possibleCauses: [
                'Primary certificate still enabled',
                'Project not switched to testing mode',
                'Secure features still active'
            ],
            solutions: [
                'Disable primary certificate in Agora Console',
                'Switch to testing mode',
                'Create new testing-mode project'
            ]
        };
    } else {
        return {
            issue: `Testing mode error: ${code || 'Unknown'}`,
            possibleCauses: [`Error: ${message}`],
            solutions: [
                'Check Agora Console project settings',
                'Verify testing mode is enabled',
                'Contact Agora support if needed'
            ]
        };
    }
};
