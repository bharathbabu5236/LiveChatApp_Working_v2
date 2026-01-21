// Direct Agora App ID Validator
export const validateAgoraAppID = async (appId) => {
    console.log('🔍 Validating Agora App ID:', appId);
    
    // Test 1: App ID format validation
    if (!appId || typeof appId !== 'string' || appId.length !== 32) {
        return {
            valid: false,
            error: 'Invalid App ID format',
            details: `Expected 32 character string, got: ${typeof appId} length ${appId?.length || 0}`
        };
    }
    
    // Test 2: Character validation (should be hex)
    const hexPattern = /^[a-f0-9]{32}$/i;
    if (!hexPattern.test(appId)) {
        return {
            valid: false,
            error: 'Invalid App ID characters',
            details: 'App ID should contain only hexadecimal characters (0-9, a-f)'
        };
    }
    
    console.log('✅ App ID format is valid');
    
    // Test 3: Try a minimal Agora SDK test
    try {
        const AgoraRTC = await import('agora-rtc-sdk-ng');
        
        const testClient = AgoraRTC.default.createClient({ mode: 'rtc', codec: 'vp8' });
        
        // Try to join with a very short timeout to test App ID validity
        const quickTestChannel = `validation_test_${Date.now()}`;
        const quickTestUID = Math.floor(Math.random() * 100000);
        
        console.log('🧪 Testing App ID with Agora servers...');
        
        try {
            // Very quick test - if App ID is invalid, this should fail immediately
            const joinPromise = testClient.join(appId, quickTestChannel, null, quickTestUID);
            const quickTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Quick validation timeout')), 3000);
            });
            
            await Promise.race([joinPromise, quickTimeout]);
            
            // If we get here, App ID is likely valid
            await testClient.leave();
            
            return {
                valid: true,
                message: 'App ID appears to be valid',
                details: 'Successfully connected to Agora servers'
            };
            
        } catch (joinError) {
            console.error('App ID validation join error:', joinError);
            
            // Analyze specific error codes
            if (joinError.code === 'INVALID_OPERATION' || joinError.message?.includes('invalid appid')) {
                return {
                    valid: false,
                    error: 'Invalid App ID rejected by Agora',
                    details: 'App ID was rejected by Agora servers - please verify in Agora Console'
                };
            } else if (joinError.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
                return {
                    valid: 'unknown',
                    error: 'Cannot reach Agora gateway servers',
                    details: 'Network/firewall issue preventing connection to Agora. App ID format is correct but cannot test validity.',
                    suggestions: [
                        'Check if corporate firewall blocks Agora servers',
                        'Try from a different network',
                        'Verify no VPN is interfering'
                    ]
                };
            } else if (joinError.message?.includes('timeout')) {
                return {
                    valid: 'unknown',
                    error: 'Connection timeout to Agora servers',
                    details: 'App ID format is correct but connection is timing out',
                    suggestions: [
                        'Network connection may be slow or unstable',
                        'Try again in a moment',
                        'Check internet connection speed'
                    ]
                };
            } else {
                return {
                    valid: 'unknown',
                    error: `Agora connection error: ${joinError.message}`,
                    details: `Error code: ${joinError.code || 'UNKNOWN'}`,
                    suggestions: ['Check Agora Console for project status', 'Verify project is not suspended']
                };
            }
        }
        
    } catch (sdkError) {
        return {
            valid: false,
            error: 'Agora SDK error',
            details: `SDK loading failed: ${sdkError.message}`
        };
    }
};
