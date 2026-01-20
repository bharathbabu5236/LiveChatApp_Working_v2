// Agora Configuration Types
export interface AudioProfile {
    sampleRate: number;
    stereo: boolean;
    bitrate: number;
}

export interface AgoraSettings {
    enableAudio: boolean;
    enableVideo: boolean;
    microphoneEnabled: boolean;
    speakerEnabled: boolean;
}

export interface AgoraConfig {
    APP_ID: string;
    CHANNEL_PREFIX: string;
    AUDIO_PROFILE: AudioProfile;
    DEFAULT_SETTINGS: AgoraSettings;
}

// Agora Configuration
export const AGORA_CONFIG: AgoraConfig = {
    // *** IMPORTANT: Replace with your actual Agora App ID ***
    // You can find your App ID in your Agora Console: https://console.agora.io/
    APP_ID: 'YOUR_AGORA_APP_ID_HERE', // Replace this with your actual App ID from Agora Console
    
    // Channel configurations
    CHANNEL_PREFIX: 'lbs_chat_', // Prefix for channel names
    
    // Audio configurations
    AUDIO_PROFILE: {
        sampleRate: 48000,
        stereo: false,
        bitrate: 128,
    },
    
    // Default settings
    DEFAULT_SETTINGS: {
        enableAudio: true,
        enableVideo: false, // Start with audio only
        microphoneEnabled: true,
        speakerEnabled: true,
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
