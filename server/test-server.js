// Quick test script for the TTS server
const express = require('express');

// Simple test without Google Cloud credentials
const app = express();
app.use(express.json());

app.post('/api/tts', (req, res) => {
    console.log('TTS Request received:', req.body);
    
    // For testing purposes, return a simple response
    res.json({ 
        message: 'TTS server is working! (Google Cloud credentials needed for actual TTS)',
        receivedText: req.body.text,
        receivedLanguage: req.body.languageCode 
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'TTS Server (Test Mode)',
        timestamp: new Date().toISOString(),
        note: 'Add Google Cloud credentials for full functionality'
    });
});

app.listen(3001, () => {
    console.log('🚀 TTS Server (Test Mode) running on http://localhost:3001');
    console.log('📝 Add Google Cloud credentials to tts-server.js for full functionality');
});
