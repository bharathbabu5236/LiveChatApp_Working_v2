// Agora Configuration for Web with enhanced settings
export const AGORA_CONFIG = {
    // *** IMPORTANT: Replace with your actual Agora App ID ***
    // You can find your App ID in your Agora Console: https://console.agora.io/
    APP_ID: '1c6c3de34233498e941bee4e9e44a428', // Replace this with your actual App ID from Agora Console
    
    // Channel configurations
    CHANNEL_PREFIX: 'lbs_chat_', // Prefix for channel names
    
    // Audio configurations
    AUDIO_PROFILE: {
        sampleRate: 48000,
        stereo: false,
        bitrate: 128,
    },
    
    // Default settings with enhanced configuration
    DEFAULT_SETTINGS: {
        enableAudio: true,
        enableVideo: false, // Start with audio only
        microphoneEnabled: true,
        speakerEnabled: true,
    },
    
    // Client configuration for better connectivity
    CLIENT_CONFIG: {
        mode: 'rtc',
        codec: 'vp8',
        // Add cloud proxy settings for better connectivity
        turnServer: {
            turnServerURL: 'stun:stun.l.google.com:19302',
            username: '',
            password: ''
        }
    }
};

// Generate unique channel name based on chat participants
export const generateChannelName = (userId1, userId2) => {
    // Sort IDs to ensure same channel name regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    return `${AGORA_CONFIG.CHANNEL_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
};

// Generate unique user ID
export const generateUserId = () => {
    return Math.floor(Math.random() * 100000).toString();
};
