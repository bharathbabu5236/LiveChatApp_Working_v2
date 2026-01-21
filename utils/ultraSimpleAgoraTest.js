// Ultra Simple Agora Test - No Configuration Dependencies
import AgoraRTC from 'agora-rtc-sdk-ng';

export const ultraSimpleAgoraTest = async () => {
    console.log('🎯 Running ULTRA SIMPLE Agora test...');
    
    try {
        // Use your new testing App ID directly
        const APP_ID = '3abcebb9062c4a0cb6e5967b1f028cd9';
        
        console.log('📋 Direct Test Parameters:');
        console.log('- App ID:', APP_ID.substring(0, 8) + '...');
        console.log('- Mode: rtc (hardcoded)');
        console.log('- Codec: vp8 (hardcoded)');
        console.log('- Token: NULL (testing mode)');
        
        // Create client with hardcoded values
        console.log('🔧 Creating Agora client...');
        const client = AgoraRTC.createClient({ 
            mode: 'rtc', 
            codec: 'vp8' 
        });
        
        // Generate simple test parameters
        const testChannel = 'ultratest_' + Date.now();
        const testUID = Math.floor(Math.random() * 100000);
        
        console.log('🚀 Attempting to join channel...');
        console.log('- Channel:', testChannel);
        console.log('- UID:', testUID);
        
        // Join with timeout
        const joinPromise = client.join(APP_ID, testChannel, null, testUID);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ULTRA_SIMPLE_TIMEOUT')), 10000);
        });
        
        const result = await Promise.race([joinPromise, timeoutPromise]);
        
        console.log('🎉 ULTRA SIMPLE TEST SUCCESS!');
        console.log('- Assigned UID:', result);
        console.log('- Channel:', testChannel);
        
        // Quick microphone test
        try {
            console.log('🎤 Testing microphone...');
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            console.log('🎶 Microphone track created!');
            
            await client.publish([audioTrack]);
            console.log('📢 Audio published to channel!');
            
            // Cleanup
            audioTrack.stop();
            audioTrack.close();
            console.log('🧹 Audio track cleaned up');
            
        } catch (micError) {
            console.warn('⚠️ Microphone test failed:', micError.message);
        }
        
        // Leave channel
        await client.leave();
        console.log('👋 Left channel successfully');
        
        return {
            success: true,
            message: 'ULTRA SIMPLE TEST PASSED! 🎉',
            details: {
                appId: APP_ID.substring(0, 8) + '...',
                channel: testChannel,
                uid: result,
                microphoneTest: 'Completed'
            }
        };
        
    } catch (error) {
        console.error('❌ Ultra simple test failed:', error);
        
        let analysis = 'Unknown error';
        let solutions = ['Check console for details'];
        
        if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
            analysis = 'Cannot reach Agora servers - this is likely the project is still in secure mode or there are network issues';
            solutions = [
                'Verify the new testing project is actually in testing mode',
                'Check if Chat features are disabled in the testing project',
                'Try from a different network'
            ];
        } else if (error.code === 'INVALID_OPERATION') {
            analysis = 'Authentication error - project may still require tokens';
            solutions = [
                'Double-check the testing project has no primary certificate enabled',
                'Ensure no Chat/Signaling features are active'
            ];
        } else if (error.message?.includes('timeout')) {
            analysis = 'Connection timeout - slow network or server issues';
            solutions = [
                'Check internet connection',
                'Try again in a moment'
            ];
        }
        
        return {
            success: false,
            error: error.code || 'UNKNOWN',
            message: error.message,
            analysis: analysis,
            solutions: solutions
        };
    }
};
