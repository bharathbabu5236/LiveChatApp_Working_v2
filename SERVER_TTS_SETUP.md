# Server-Side TTS Setup Guide

## Overview

This implementation uses **Google Cloud Text-to-Speech API** on a Node.js server to generate high-quality speech audio that can be injected directly into voice calls. This solves the browser security limitations that prevent direct capture of browser TTS audio.

## Architecture

```
React App → Node.js TTS Server → Google Cloud TTS → Audio Blob → Agora Call Stream
```

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Configure Google Cloud TTS

#### Option A: Service Account Key (Recommended for development)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Text-to-Speech API
4. Create a service account and download the JSON key file
5. Place the key file in the `server/` directory
6. Update `tts-server.js` to use the key file:

```javascript
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: 'path/to/your/service-account-key.json'
});
```

#### Option B: Application Default Credentials (Recommended for production)
1. Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
```

### 3. Start the TTS Server

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

### 4. Test the Integration

1. Start your React app
2. Initiate a voice call
3. Click "Server Health" button to verify server connection
4. Click "Test Server TTS" to test audio injection
5. Enable translation and speak - your translated text will be converted to high-quality speech and transmitted through the call!

## API Endpoints

### POST /api/tts
Generate speech from text
```json
{
    "text": "Hello, world!",
    "languageCode": "en-US",
    "voiceName": "en-US-Wavenet-D",
    "audioEncoding": "MP3"
}
```

### GET /api/voices
Get available voices grouped by language

### GET /api/health
Health check endpoint

## Features

✅ **High-Quality Audio**: Uses Google Cloud TTS for professional-grade speech synthesis
✅ **Multi-Language Support**: Supports 100+ languages and voices
✅ **Direct Audio Injection**: Bypasses browser security limitations
✅ **Real-Time Processing**: Low-latency audio generation and injection
✅ **Automatic Fallback**: Falls back to local TTS if server is unavailable
✅ **Voice Selection**: Automatic voice selection based on target language
✅ **Audio Mixing**: Preserves microphone audio while injecting TTS

## Troubleshooting

### Server Connection Issues
- Ensure server is running on `http://localhost:3001`
- Check CORS configuration in `tts-server.js`
- Verify Google Cloud credentials

### Audio Quality Issues
- Check audio encoding (MP3 vs WAV)
- Adjust sample rate for voice calls (16kHz recommended)
- Verify audio context configuration

### Google Cloud API Issues
- Verify Text-to-Speech API is enabled
- Check service account permissions
- Monitor API quotas and billing

## Cost Considerations

Google Cloud Text-to-Speech pricing:
- Standard voices: $4.00 per 1 million characters
- WaveNet voices: $16.00 per 1 million characters
- Neural2 voices: $16.00 per 1 million characters

**Typical usage**: A 10-second translation (50 characters) costs approximately $0.0008 with WaveNet voices.

## Security Notes

- Never commit service account keys to version control
- Use environment variables in production
- Implement rate limiting for production deployments
- Consider user authentication for the TTS endpoint

## Production Deployment

For production deployment:
1. Deploy the TTS server to a cloud platform (Google Cloud Run, AWS Lambda, etc.)
2. Use environment variables for credentials
3. Configure proper CORS for your domain
4. Implement authentication and rate limiting
5. Monitor costs and usage
6. Set up error monitoring and logging
