const express = require('express');
const cors = require('cors');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003; // Voice Live on different port

// Enable CORS for all origins in development
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// Azure Speech Translation configuration - True single API approach
let speechTranslationConfig = null;

if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    console.warn('⚠️  Azure credentials not found in .env.azure');
    console.warn('⚠️  Voice Live server will start but will return demo responses');
} else {
    try {
        // Speech Translation Config (Audio → Translated Text)
        speechTranslationConfig = sdk.SpeechTranslationConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );
        console.log('✅ Azure Speech Translation Config initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Azure Speech Translation Config:', error.message);
        speechTranslationConfig = null;
    }
}

// Voice mapping for output TTS
const voiceMap = {
    'en-US': 'en-US-AriaNeural',
    'en': 'en-US-AriaNeural',
    'hi-IN': 'hi-IN-SwaraNeural',
    'hi': 'hi-IN-SwaraNeural',
    'te-IN': 'te-IN-ShrutiNeural',
    'te': 'te-IN-ShrutiNeural',
    'ta-IN': 'ta-IN-PallaviNeural',
    'ta': 'ta-IN-PallaviNeural',
    'fil-PH': 'fil-PH-AngeloNeural',
    'fil': 'fil-PH-AngeloNeural',
    'zh-CN': 'zh-CN-XiaoxiaoNeural',
    'zh': 'zh-CN-XiaoxiaoNeural'
};

// Language mapping for speech recognition
const speechLanguageMap = {
    'en': 'en-US',
    'hi': 'hi-IN', 
    'te': 'te-IN',
    'ta': 'ta-IN',
    'fil': 'fil-PH',
    'zh': 'zh-CN'
};

// 🚀 SINGLE API ENDPOINT: Audio → Translated Audio
app.post('/api/azure-voice-translate', async (req, res) => {
    try {
        const { 
            audioData,           // Base64 audio data
            sourceLanguage,      // e.g., "te" (Telugu)
            targetLanguage,      // e.g., "hi" (Hindi)
            inputFormat = 'wav'  // Input audio format
        } = req.body;
        
        console.log(`🎤→🗣️ Voice Translation: ${sourceLanguage} → ${targetLanguage}`);
        
        if (!audioData || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ 
                error: 'Missing required parameters: audioData, sourceLanguage, targetLanguage' 
            });
        }

        // Check if Azure is properly configured
        if (!speechTranslationConfig) {
            console.log('⚠️ Azure Speech Translation not configured, returning demo response');
            return res.status(503).json({ 
                error: 'Azure Speech Translation service unavailable',
                message: 'Azure credentials not configured - falling back to multi-step approach'
            });
        }

        // Step 1: Configure Speech Translation (Audio → Translated Text)
        const sourceLangCode = speechLanguageMap[sourceLanguage] || sourceLanguage;
        const targetLangCode = speechLanguageMap[targetLanguage] || targetLanguage;
        
        speechTranslationConfig.speechRecognitionLanguage = sourceLangCode;
        speechTranslationConfig.addTargetLanguage(targetLanguage); // Google Translate style codes
        
        // Step 2: Process audio input
        // Convert base64 to audio buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        // Create audio input stream
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const audioInputStream = sdk.AudioInputStream.createPushStream(audioFormat);
        audioInputStream.write(audioBuffer);
        audioInputStream.close();
        
        // Create audio config
        const audioConfig = sdk.AudioConfig.fromStreamInput(audioInputStream);
        
        // Create speech translation recognizer
        const recognizer = new sdk.TranslationRecognizer(speechTranslationConfig, audioConfig);
        
        // Step 3: Perform speech translation (Audio → Translated Text)
        const translationResult = await new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync(
                (result) => {
                    if (result.reason === sdk.ResultReason.TranslatedSpeech) {
                        console.log(`✅ Speech recognized: "${result.text}"`);
                        console.log(`✅ Translated: "${result.translations.get(targetLanguage)}"`);
                        resolve(result);
                    } else {
                        reject(new Error(`Speech translation failed: ${result.errorDetails}`));
                    }
                    recognizer.close();
                },
                (error) => {
                    console.error('❌ Speech translation error:', error);
                    reject(error);
                    recognizer.close();
                }
            );
        });
        
        const translatedText = translationResult.translations.get(targetLanguage);
        
        // Step 4: Convert translated text to speech (TTS)
        const speechConfig = sdk.SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );
        
        const targetVoice = voiceMap[targetLangCode] || voiceMap[targetLanguage] || 'en-US-AriaNeural';
        speechConfig.speechSynthesisVoiceName = targetVoice;
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
        
        // Generate audio from translated text
        const synthResult = await new Promise((resolve, reject) => {
            synthesizer.speakTextAsync(
                translatedText,
                (result) => {
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        console.log(`✅ TTS completed: ${result.audioData.byteLength} bytes`);
                        resolve(result);
                    } else {
                        reject(new Error(`TTS failed: ${result.errorDetails}`));
                    }
                    synthesizer.close();
                },
                (error) => {
                    reject(error);
                    synthesizer.close();
                }
            );
        });
        
        // Return the complete result
        res.set({
            'Content-Type': 'audio/mpeg',
            'X-Original-Text': translationResult.text,
            'X-Translated-Text': translatedText,
            'X-Source-Language': sourceLangCode,
            'X-Target-Language': targetLangCode,
            'X-Voice-Used': targetVoice
        });
        
        // Send audio data
        const audioOutput = Buffer.from(synthResult.audioData);
        res.send(audioOutput);
        
        console.log(`✅ Complete voice translation: ${sourceLangCode} → ${targetLangCode}`);
        
    } catch (error) {
        console.error('❌ Voice translation failed:', error);
        res.status(500).json({ 
            error: 'Voice translation failed',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/azure-voice-health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Azure Voice Live Translation',
        timestamp: new Date().toISOString(),
        azure_configured: !!speechTranslationConfig
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Azure Voice Live Translation Server running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/azure-voice-translate - Audio → Translated Audio`);
    console.log(`   GET /api/azure-voice-health - Health check`);
    console.log(`🔑 Azure Region: ${process.env.AZURE_SPEECH_REGION || 'Not configured'}`);
    console.log(`🔑 Azure Key: ${process.env.AZURE_SPEECH_KEY ? 'Configured' : 'Not configured'}`);
});

module.exports = app;
