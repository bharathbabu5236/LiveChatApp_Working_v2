// Simple Agora Test with enhanced diagnostics
import AgoraRTC from 'agora-rtc-sdk-ng';

export const testAgoraConnection = async () => {
    let client = null;
    
    try {
        console.log('🧪 Testing Agora connection...');
        console.log('📍 Testing with your App ID: 1c6c3de34233498e941bee4e9e44a428');
        
        // First, check if SDK is properly loaded
        if (!AgoraRTC) {
            throw new Error('Agora SDK not loaded - please refresh the page');
        }
        
        // Check network connectivity first
        console.log('🌐 Checking network connectivity...');
        try {
            await fetch('https://web-rtc-api.agora.io/v2/check', { 
                method: 'GET',
                mode: 'no-cors' 
            });
            console.log('✅ Network connection to Agora servers OK');
        } catch (netError) {
            console.warn('⚠️ Network check failed, but continuing test...', netError);
        }
        
        // Create a test client
        client = AgoraRTC.createClient({ 
            mode: 'rtc', 
            codec: 'vp8' 
        });
        
        console.log('✅ Agora client created successfully');
        
        // Try to enable cloud proxy for better connectivity
        try {
            console.log('🌐 Enabling cloud proxy for test...');
            await client.startProxyServer(3);
            console.log('✅ Cloud proxy enabled for better connectivity');
        } catch (proxyError) {
            console.warn('⚠️ Cloud proxy setup failed, continuing without proxy:', proxyError.message);
        }
        
        // Test App ID - your actual App ID
        const APP_ID = '1c6c3de34233498e941bee4e9e44a428';
        const TEST_CHANNEL = 'test_channel_' + Date.now();
        const TEST_UID = Math.floor(Math.random() * 100000);
        
        console.log('🔗 Attempting to join test channel...');
        console.log('App ID:', APP_ID?.substring(0, 8) + '...');
        console.log('Channel:', TEST_CHANNEL);
        console.log('UID:', TEST_UID);
        
        // Add timeout for join operation
        const joinPromise = client.join(
            APP_ID,
            TEST_CHANNEL,
            null, // No token for testing
            TEST_UID
        );
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Join timeout after 8 seconds')), 8000);
        });
        
        await Promise.race([joinPromise, timeoutPromise]);
        
        console.log('🎉 Successfully joined Agora channel!');
        console.log('📞 Your Agora App ID is working correctly!');
        
        // Test microphone access
        try {
            console.log('🎤 Testing microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Microphone access granted');
        } catch (micError) {
            console.warn('⚠️ Microphone test failed:', micError.message);
        }
        
        // Leave the test channel
        await client.leave();
        console.log('👋 Left test channel');
        
        return { success: true, message: 'Agora connection test passed! Voice calls should work.' };
        
    } catch (error) {
        console.error('❌ Agora test failed:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name
        });
        
        let errorMessage = 'Unknown error';
        let suggestions = [];
        
        if (error.code === 'INVALID_PARAMS') {
            errorMessage = 'Invalid App ID';
            suggestions = [
                'Check if App ID is correct: 1c6c3de34233498e941bee4e9e44a428',
                'Verify App ID in Agora Console'
            ];
        } else if (error.code === 'UNEXPECTED_RESPONSE' || error.message?.includes('invalid appid')) {
            errorMessage = 'App ID rejected by Agora servers';
            suggestions = [
                'Check if your Agora project is enabled',
                'Verify authentication mode (should be testing mode)',
                'Check if project has geographic restrictions',
                'Ensure project is not suspended'
            ];
        } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Network connection error';
            suggestions = [
                'Check internet connection',
                'Check firewall settings',
                'Try different network'
            ];
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        console.log('💡 Suggestions to fix:', suggestions);
        
        return { 
            success: false, 
            error: errorMessage,
            code: error.code || 'UNKNOWN',
            suggestions
        };
    }
};
