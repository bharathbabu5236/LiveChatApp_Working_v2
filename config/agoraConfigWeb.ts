// Agora Configuration for Web - Testing Mode (No Tokens Required)

export interface AudioProfile {
    sampleRate: number;
    stereo: boolean;
    bitrate: number;
}

export interface DefaultSettings {
    enableAudio: boolean;
    enableVideo: boolean;
    microphoneEnabled: boolean;
    speakerEnabled: boolean;
}

export interface ClientConfig {
    mode: 'rtc' | 'live';
    codec: 'vp8' | 'h264';
}

export interface TestingMode {
    enabled: boolean;
    allowAnonymousUsers: boolean;
    skipAuthentication: boolean;
}

export interface AgoraConfig {
    APP_ID: string;
    USE_TOKEN: boolean;
    TOKEN: string | null;
    CHANNEL_PREFIX: string;
    AUDIO_PROFILE: AudioProfile;
    DEFAULT_SETTINGS: DefaultSettings;
    CLIENT_CONFIG: ClientConfig;
    TESTING_MODE: TestingMode;
}

export const AGORA_CONFIG: AgoraConfig = {
    // *** IMPORTANT: Replace with your NEW TESTING PROJECT App ID ***
    // You can find your App ID in your Agora Console: https://console.agora.io/
    APP_ID: '3abcebb9062c4a0cb6e5967b1f028cd9', // NEW Testing Project App ID
    
    // Authentication mode
    USE_TOKEN: false, // Set to false for testing mode
    TOKEN: null, // No token needed for testing mode
    
    // Channel configurations
    CHANNEL_PREFIX: 'lbs_chat_', // Prefix for channel names
    
    // Audio configurations
    AUDIO_PROFILE: {
        sampleRate: 48000,
        stereo: false,
        bitrate: 128,
    },
    
    // Default settings for testing mode
    DEFAULT_SETTINGS: {
        enableAudio: true,
        enableVideo: false, // Start with audio only
        microphoneEnabled: true,
        speakerEnabled: true,
    },
    
    // Client configuration for testing mode
    CLIENT_CONFIG: {
        mode: 'rtc', // Use RTC mode for voice calls
        codec: 'vp8' // VP8 codec for better compatibility
    },
    
    // Testing mode specific settings
    TESTING_MODE: {
        enabled: true,
        allowAnonymousUsers: true,
        skipAuthentication: true
    }
};

// Generate unique channel name based on chat participants
export const generateChannelName = (userId1: string, userId2: string): string => {
    // Sort IDs to ensure same channel name regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    return `${AGORA_CONFIG.CHANNEL_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
};

// Generate unique user ID
export const generateUserId = (): string => {
    return Math.floor(Math.random() * 100000).toString();
};
