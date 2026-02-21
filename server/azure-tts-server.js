const express = require('express');
const cors = require('cors');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002; // Different port to run alongside Google server

// Enable CORS for all origins in development
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// Azure Speech configuration - with fallback for missing credentials
let speechConfig = null;

if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    console.warn('⚠️  Azure credentials not found in .env.azure');
    console.warn('⚠️  Server will start but will return demo responses');
    console.warn('⚠️  To use real Azure TTS, add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env.azure');
} else {
    try {
        speechConfig = sdk.SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        console.log('✅ Azure Speech Config initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Azure Speech Config:', error.message);
        speechConfig = null;
    }
}

// Voice mapping for better quality
const voiceMap = {
    'en-US': 'en-US-AriaNeural',
    'en': 'en-US-AriaNeural',
    'hi-IN': 'hi-IN-SwaraNeural',
    'hi': 'hi-IN-SwaraNeural',
    'te-IN': 'te-IN-ShrutiNeural',
    'te': 'te-IN-ShrutiNeural', 
    'ta-IN': 'ta-IN-PallaviNeural',
    'ta': 'ta-IN-PallaviNeural',
    'es-ES': 'es-ES-ElviraNeural',
    'es': 'es-ES-ElviraNeural',
    'fr-FR': 'fr-FR-DeniseNeural',
    'fr': 'fr-FR-DeniseNeural',
    'de-DE': 'de-DE-KatjaNeural',
    'de': 'de-DE-KatjaNeural',
    'zh-CN': 'zh-CN-XiaoxiaoNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
    'fil-PH': 'fil-PH-AngeloNeural',
    'fil': 'fil-PH-AngeloNeural'
};

app.post('/api/azure-tts', async (req, res) => {
    try {
        const { text, languageCode, audioEncoding = 'MP3' } = req.body;
        
        console.log(`🗣️ Azure TTS Request: "${text}" in ${languageCode}`);
        
        if (!text || !languageCode) {
            return res.status(400).json({ 
                error: 'Missing required parameters: text and languageCode' 
            });
        }

        // Check if Azure is properly configured
        if (!speechConfig) {
            console.log('⚠️ Azure TTS not configured, returning demo response');
            // Return a demo error that signals to client to try fallback
            return res.status(503).json({ 
                error: 'Azure TTS service unavailable',
                message: 'Azure credentials not configured - falling back to Google TTS'
            });
        }

        // Configure speech synthesis
        const normalizedLangCode = languageCode.toLowerCase();
        const voiceName = voiceMap[normalizedLangCode] || voiceMap[normalizedLangCode.split('-')[0]] || 'en-US-AriaNeural';
        
        speechConfig.speechSynthesisLanguage = languageCode;
        speechConfig.speechSynthesisVoiceName = voiceName;
        
        // Set output format based on request
        if (audioEncoding === 'WAV') {
            speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoPcm;
        } else {
            speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        }
        
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
        
        // Use promise wrapper for better error handling
        const synthesizeAsync = () => {
            return new Promise((resolve, reject) => {
                synthesizer.speakTextAsync(text, 
                    (result) => {
                        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                            console.log(`✅ Azure TTS: Generated ${result.audioData.byteLength} bytes with voice: ${voiceName}`);
                            resolve(result);
                        } else {
                            console.error('❌ Azure TTS synthesis failed:', result.errorDetails);
                            reject(new Error(result.errorDetails || 'Speech synthesis failed'));
                        }
                        synthesizer.close();
                    }, 
                    (error) => {
                        console.error('❌ Azure TTS error:', error);
                        synthesizer.close();
                        reject(error);
                    }
                );
            });
        };

        const result = await synthesizeAsync();
        
        const contentType = audioEncoding === 'WAV' ? 'audio/wav' : 'audio/mpeg';
        res.set({
            'Content-Type': contentType,
            'Content-Length': result.audioData.byteLength,
            'X-Azure-Voice': voiceName,
            'X-Audio-Format': audioEncoding
        });
        
        res.send(Buffer.from(result.audioData));
        
    } catch (error) {
        console.error('❌ Azure TTS server error:', error);
        res.status(500).json({ 
            error: error.message || 'Internal server error',
            service: 'Azure TTS'
        });
    }
});

// Get available voices endpoint
app.get('/api/azure-voices', async (req, res) => {
    try {
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
        
        const getVoicesAsync = () => {
            return new Promise((resolve, reject) => {
                synthesizer.getVoicesAsync((result) => {
                    const voices = result.voices.map(voice => ({
                        name: voice.name,
                        displayName: voice.localName,
                        gender: voice.gender,
                        locale: voice.locale,
                        styleList: voice.styleList || []
                    }));
                    
                    synthesizer.close();
                    resolve(voices);
                }, (error) => {
                    synthesizer.close();
                    reject(error);
                });
            });
        };

        const voices = await getVoicesAsync();
        res.json({ 
            success: true, 
            voices,
            count: voices.length 
        });
        
    } catch (error) {
        console.error('❌ Failed to get Azure voices:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/azure-health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Azure TTS Server',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Test endpoint for debugging
app.post('/api/azure-test', async (req, res) => {
    try {
        const testText = "Hello from Azure Cognitive Services!";
        const testLanguage = "en-US";
        
        console.log(`🧪 Testing Azure TTS with: "${testText}"`);
        
        speechConfig.speechSynthesisLanguage = testLanguage;
        speechConfig.speechSynthesisVoiceName = 'en-US-AriaNeural';
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
        
        const result = await new Promise((resolve, reject) => {
            synthesizer.speakTextAsync(testText, 
                (result) => {
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        resolve(result);
                    } else {
                        reject(new Error(result.errorDetails));
                    }
                    synthesizer.close();
                }, 
                (error) => {
                    synthesizer.close();
                    reject(error);
                }
            );
        });
        
        res.json({
            success: true,
            message: 'Azure TTS test successful',
            audioSize: result.audioData.byteLength,
            voice: 'en-US-AriaNeural'
        });
        
    } catch (error) {
        console.error('❌ Azure TTS test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Azure TTS test failed'
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Azure TTS Server running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/azure-tts - Generate speech from text`);
    console.log(`   GET /api/azure-voices - List available voices`);
    console.log(`   GET /api/azure-health - Health check`);
    console.log(`   POST /api/azure-test - Test Azure TTS functionality`);
    console.log(`🔑 Azure Region: ${process.env.AZURE_SPEECH_REGION || 'Not configured'}`);
    console.log(`🔑 Azure Key: ${process.env.AZURE_SPEECH_KEY ? 'Configured' : 'Not configured'}`);
});

module.exports = app;
