import express, { Request, Response } from 'express';
import cors from 'cors';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.azure' });

const app = express();
const port = process.env.AZURE_VOICE_LIVE_PORT || 3003;

// Enable CORS for all origins in development
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increase limit for audio data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Types
interface VoiceTranslationRequest {
    audioData?: string;          // Base64 encoded audio
    text?: string;               // Text to translate and speak (fallback)
    sourceLanguage: string;      // Source language code
    targetLanguage: string;      // Target language code
    audioFormat?: string;        // Input audio format
    outputFormat?: string;       // Output audio format
}

interface VoiceTranslationResponse {
    success: boolean;
    originalText?: string;
    translatedText?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    voiceUsed?: string;
    latency?: number;
    method?: string;
    error?: string;
}

// Azure Voice Live configuration
let speechConfig: sdk.SpeechConfig | null = null;
let voiceLiveConfig: any = null; // Voice Live specific config

if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    console.warn('⚠️  Azure credentials not found in .env.azure');
    console.warn('⚠️  Voice Live server will start but will return demo responses');
} else {
    try {
        // Initialize Speech Config for Voice Live
        speechConfig = sdk.SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );
        
        // Configure for real-time, low-latency processing
        speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "500");
        speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "1000");
        speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "500");
        
        console.log('✅ Azure Voice Live Config initialized successfully');
    } catch (error: any) {
        console.error('❌ Failed to initialize Azure Voice Live Config:', error.message);
        speechConfig = null;
    }
}

// Enhanced voice mapping with neural voices for Voice Live
const neuralVoiceMap: Record<string, string> = {
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
    'zh': 'zh-CN-XiaoxiaoNeural',
    'es-ES': 'es-ES-ElviraNeural',
    'es': 'es-ES-ElviraNeural',
    'fr-FR': 'fr-FR-DeniseNeural',
    'fr': 'fr-FR-DeniseNeural',
    'de-DE': 'de-DE-KatjaNeural',
    'de': 'de-DE-KatjaNeural',
    'ja-JP': 'ja-JP-NanamiNeural',
    'ja': 'ja-JP-NanamiNeural',
    'ko-KR': 'ko-KR-SunHiNeural',
    'ko': 'ko-KR-SunHiNeural'
};

// Language mapping for speech recognition
const speechLanguageMap: Record<string, string> = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'te': 'te-IN',
    'ta': 'ta-IN',
    'fil': 'fil-PH',
    'zh': 'zh-CN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'ja': 'ja-JP',
    'ko': 'ko-KR'
};

// 🚀 AZURE VOICE LIVE: Real-time Speech-to-Speech Translation (Single API)
app.post('/api/azure-voice-live', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        const {
            audioData,
            text,
            sourceLanguage,
            targetLanguage,
            audioFormat = 'wav',
            outputFormat = 'mp3'
        }: VoiceTranslationRequest = req.body;
        
        console.log(`🎤→🗣️ Voice Live: ${sourceLanguage} → ${targetLanguage}`);
        
        if (!sourceLanguage || !targetLanguage) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: sourceLanguage, targetLanguage'
            } as VoiceTranslationResponse);
        }

        // Check if Azure Voice Live is configured
        if (!speechConfig) {
            console.log('⚠️ Azure Voice Live not configured, returning demo response');
            return res.status(503).json({
                success: false,
                error: 'Azure Voice Live service unavailable',
                method: 'demo'
            } as VoiceTranslationResponse);
        }

        // Prepare language codes
        const sourceLangCode = speechLanguageMap[sourceLanguage] || sourceLanguage;
        const targetLangCode = speechLanguageMap[targetLanguage] || targetLanguage;
        const targetVoice = neuralVoiceMap[targetLangCode] || neuralVoiceMap[targetLanguage] || 'en-US-AriaNeural';

        console.log(`🎯 Language mapping: ${sourceLanguage} (${sourceLangCode}) → ${targetLanguage} (${targetLangCode})`);
        console.log(`🗣️ Target voice: ${targetVoice}`);

        let translatedText: string = '';
        let originalText: string = '';
        let method: string = '';

        // Method 1: Voice Live with Audio Input (Real-time Audio → Audio)
        if (audioData) {
            console.log('🎤 Processing audio input with Voice Live...');
            method = 'voice-live-audio';
            
            try {
                // Configure speech translation
                const speechTranslationConfig = sdk.SpeechTranslationConfig.fromSubscription(
                    process.env.AZURE_SPEECH_KEY!,
                    process.env.AZURE_SPEECH_REGION!
                );
                
                speechTranslationConfig.speechRecognitionLanguage = sourceLangCode;
                speechTranslationConfig.addTargetLanguage(targetLanguage);
                
                // Set Voice Live optimizations
                speechTranslationConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "300");
                speechTranslationConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "500");
                
                // Process audio input
                const audioBuffer = Buffer.from(audioData, 'base64');
                const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
                const audioInputStream = sdk.AudioInputStream.createPushStream(audioFormat);
                
                audioInputStream.write(audioBuffer.buffer as ArrayBuffer);
                audioInputStream.close();
                
                const audioConfig = sdk.AudioConfig.fromStreamInput(audioInputStream);
                const recognizer = new sdk.TranslationRecognizer(speechTranslationConfig, audioConfig);
                
                // Perform real-time speech translation
                const translationResult = await new Promise<any>((resolve, reject) => {
                    recognizer.recognizeOnceAsync(
                        (result) => {
                            if (result.reason === sdk.ResultReason.TranslatedSpeech) {
                                console.log(`✅ Speech recognized: "${result.text}"`);
                                const translation = result.translations.get(targetLanguage);
                                console.log(`✅ Translation: "${translation}"`);
                                resolve(result);
                            } else if (result.reason === sdk.ResultReason.NoMatch) {
                                reject(new Error('No speech detected in audio'));
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
                
                originalText = translationResult.text;
                translatedText = translationResult.translations.get(targetLanguage) || '';
                
            } catch (audioError: any) {
                console.log('⚠️ Audio processing failed, falling back to text mode:', audioError.message);
                // Fall back to text processing
                if (text) {
                    translatedText = text; // For now, we'd need to add translation service
                    originalText = text;
                    method = 'voice-live-text-fallback';
                } else {
                    throw new Error('Audio processing failed and no text provided');
                }
            }
        }
        // Method 2: Text Input (Text → Audio)
        else if (text) {
            console.log('📝 Processing text input with Voice Live...');
            method = 'voice-live-text';
            originalText = text;
            
            // For now, we'll use the text as-is (you can add translation here)
            // In a real implementation, you'd use Azure Translator here
            translatedText = text;
        } else {
            return res.status(400).json({
                success: false,
                error: 'Either audioData or text must be provided'
            } as VoiceTranslationResponse);
        }

        // Convert translated text to neural voice (TTS)
        console.log('🗣️ Generating neural voice...');
        
        const ttsConfig = sdk.SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY!,
            process.env.AZURE_SPEECH_REGION!
        );
        
        ttsConfig.speechSynthesisVoiceName = targetVoice;
        ttsConfig.speechSynthesisOutputFormat = outputFormat === 'wav' 
            ? sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm
            : sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        
        // Optimize for low latency
        ttsConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "500");
        
        const synthesizer = new sdk.SpeechSynthesizer(ttsConfig);
        
        const synthResult = await new Promise<any>((resolve, reject) => {
            synthesizer.speakTextAsync(
                translatedText,
                (result) => {
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        console.log(`✅ Neural TTS completed: ${result.audioData.byteLength} bytes`);
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
        
        const latency = Date.now() - startTime;
        console.log(`⚡ Total latency: ${latency}ms`);
        
        // Return the complete result
        res.set({
            'Content-Type': outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg',
            'X-Original-Text': originalText,
            'X-Translated-Text': translatedText,
            'X-Source-Language': sourceLangCode,
            'X-Target-Language': targetLangCode,
            'X-Voice-Used': targetVoice,
            'X-Latency': latency.toString(),
            'X-Method': method,
            'Cache-Control': 'no-cache'
        });
        
        // Send audio data
        const audioOutput = Buffer.from(synthResult.audioData);
        res.send(audioOutput);
        
        console.log(`✅ Voice Live completed: ${sourceLangCode} → ${targetLangCode} (${latency}ms)`);
        
    } catch (error: any) {
        const latency = Date.now() - startTime;
        console.error('❌ Voice Live failed:', error);
        res.status(500).json({
            success: false,
            error: 'Voice Live translation failed',
            details: error.message,
            latency,
            method: 'error'
        } as VoiceTranslationResponse);
    }
});

// 🧪 Test endpoint for Voice Live
app.post('/api/azure-voice-test', async (req: Request, res: Response) => {
    try {
        const testText = req.body.text || "Hello! This is a test of Azure Voice Live neural speech synthesis.";
        const language = req.body.language || "en";
        
        const result = await fetch(`http://localhost:${port}/api/azure-voice-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: testText,
                sourceLanguage: language,
                targetLanguage: language,
                outputFormat: 'mp3'
            })
        });
        
        if (result.ok) {
            res.set(result.headers);
            const audioBuffer = await result.arrayBuffer();
            res.send(Buffer.from(audioBuffer));
        } else {
            const error = await result.json();
            res.status(500).json(error);
        }
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: 'Test failed', 
            details: error.message 
        });
    }
});

// 📊 Available voices endpoint
app.get('/api/azure-voices', (req: Request, res: Response) => {
    const availableVoices = Object.entries(neuralVoiceMap).map(([lang, voice]) => ({
        language: lang,
        voice: voice,
        type: 'Neural',
        quality: 'High'
    }));
    
    res.json({
        success: true,
        voices: availableVoices,
        total: availableVoices.length
    });
});

// 💚 Health check endpoint
app.get('/api/azure-voice-health', (req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'healthy',
        service: 'Azure Voice Live',
        timestamp: new Date().toISOString(),
        azure_configured: !!speechConfig,
        region: process.env.AZURE_SPEECH_REGION || 'Not configured',
        version: '1.0.0',
        features: {
            voice_live: !!speechConfig,
            neural_voices: true,
            real_time_translation: !!speechConfig,
            low_latency: true
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Azure Voice Live Server running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/azure-voice-live - Real-time Voice Translation`);
    console.log(`   POST /api/azure-voice-test - Test Voice Live`);
    console.log(`   GET /api/azure-voices - Available Neural Voices`);
    console.log(`   GET /api/azure-voice-health - Health Check`);
    console.log(`🔑 Azure Region: ${process.env.AZURE_SPEECH_REGION || 'Not configured'}`);
    console.log(`🔑 Azure Key: ${process.env.AZURE_SPEECH_KEY ? 'Configured ✅' : 'Not configured ❌'}`);
    console.log(`⚡ Features: Voice Live, Neural Voices, Real-time Translation`);
});

export default app;
