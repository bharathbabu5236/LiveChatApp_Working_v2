// Agora Token Configuration
export const AGORA_TOKEN_CONFIG = {
    // Your App ID (same as before)
    APP_ID: '1c6c3de34233498e941bee4e9e44a428',
    
    // Token configuration (for secure mode)
    USE_TOKEN: true,
    
    // Temporary token for testing
    // Get this from Agora Console > Generate Temp Token
    TEMP_TOKEN: 'PASTE_YOUR_TOKEN_HERE', // You'll paste the token here
    
    // Channel and User info used to generate the token
    TEST_CHANNEL: 'test_channel', // Must match what you used in token generation
    TEST_UID: 12345, // Must match what you used in token generation
    
    // Token expiry info
    TOKEN_EXPIRY: 24, // hours (typical temp token validity)
    
    // Channel configurations
    CHANNEL_PREFIX: 'lbs_chat_',
    
    // Audio configurations
    AUDIO_PROFILE: {
        sampleRate: 48000,
        stereo: false,
        bitrate: 128,
    },
    
    // Client configuration
    CLIENT_CONFIG: {
        mode: 'rtc',
        codec: 'vp8',
    }
};

// Generate channel name (for production, you'd generate tokens dynamically)
export const generateSecureChannelName = (userId1, userId2) => {
    const sortedIds = [userId1, userId2].sort();
    return `${AGORA_TOKEN_CONFIG.CHANNEL_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
};

// Token validation helper
export const validateToken = () => {
    if (!AGORA_TOKEN_CONFIG.USE_TOKEN) {
        return { valid: true, message: 'Token not required' };
    }
    
    if (!AGORA_TOKEN_CONFIG.TEMP_TOKEN || AGORA_TOKEN_CONFIG.TEMP_TOKEN === '') {
        return { 
            valid: false, 
            error: 'No token configured',
            solution: 'Generate temp token from Agora Console and add it to AGORA_TOKEN_CONFIG.TEMP_TOKEN'
        };
    }
    
    return { valid: true, message: 'Token configured' };
};
