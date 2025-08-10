// LiveChatApp/config/ttsConfig.js
// Google Cloud Text-to-Speech API Configuration

// Replace 'YOUR_ACTUAL_API_KEY_HERE' with your actual Google Cloud TTS API key
// Get your API key from: https://console.cloud.google.com/
export const GOOGLE_TTS_CONFIG = {
    API_KEY: 'AIzaSyBU4mlwG3hMan-yPDFtbpaT2gnh5Xo6nqI',
    ENDPOINT: 'https://texttospeech.googleapis.com/v1/text:synthesize',
    ENABLED: true, // Google TTS enabled for premium voices
    DEBUG: true, // Enable debug logging
};

// Instructions:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable "Cloud Text-to-Speech API"
// 4. Go to "Credentials" → "Create Credentials" → "API Key"
// 5. Copy your API key and replace 'YOUR_ACTUAL_API_KEY_HERE' above
// 6. Set ENABLED to true
// 7. For security, restrict your API key to only Text-to-Speech API

export default GOOGLE_TTS_CONFIG;
