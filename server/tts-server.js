const express = require('express');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Configure CORS for your React Native app
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true
}));

app.use(express.json());

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: './google-tts-key.json', // Place your downloaded JSON key file here
    // Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
});

// TTS endpoint
app.post('/api/tts', async (req, res) => {
    try {
        const { text, languageCode, voiceName, audioEncoding = 'MP3' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log(`🗣️ TTS Request: "${text}" in ${languageCode || 'en-US'}`);

        // Construct the TTS request
        const request = {
            input: { text: text },
            voice: {
                languageCode: languageCode || 'en-US',
                name: voiceName || undefined, // Let Google pick the best voice if not specified
                ssmlGender: 'NEUTRAL'
            },
            audioConfig: {
                audioEncoding: audioEncoding,
                sampleRateHertz: 16000, // Optimized for voice calls
                pitch: 0.0,
                speakingRate: 0.9 // Slightly slower for clarity
            }
        };

        // Perform the text-to-speech request
        const [response] = await ttsClient.synthesizeSpeech(request);

        // Set response headers for audio
        res.set({
            'Content-Type': audioEncoding === 'MP3' ? 'audio/mpeg' : 'audio/wav',
            'Content-Length': response.audioContent.length,
            'Cache-Control': 'no-cache'
        });

        // Send the audio content as response
        res.send(response.audioContent);

        console.log(`✅ TTS Generated: ${response.audioContent.length} bytes`);

    } catch (error) {
        console.error('❌ TTS Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate speech',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'TTS Server',
        timestamp: new Date().toISOString()
    });
});

// Available voices endpoint
app.get('/api/voices', async (req, res) => {
    try {
        const [result] = await ttsClient.listVoices({});
        const voices = result.voices;

        // Group voices by language
        const voicesByLanguage = {};
        voices.forEach(voice => {
            voice.languageCodes.forEach(langCode => {
                if (!voicesByLanguage[langCode]) {
                    voicesByLanguage[langCode] = [];
                }
                voicesByLanguage[langCode].push({
                    name: voice.name,
                    gender: voice.ssmlGender,
                    naturalSampleRateHertz: voice.naturalSampleRateHertz
                });
            });
        });

        res.json({
            totalVoices: voices.length,
            voicesByLanguage: voicesByLanguage
        });

        console.log(`📋 Listed ${voices.length} available voices`);
    } catch (error) {
        console.error('❌ Error fetching voices:', error);
        res.status(500).json({ error: 'Failed to fetch voices' });
    }
});

app.listen(port, () => {
    console.log(`🚀 TTS Server running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/tts - Generate speech from text`);
    console.log(`   GET /api/voices - List available voices`);
    console.log(`   GET /api/health - Health check`);
});

module.exports = app;
