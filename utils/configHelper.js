// Configuration Helper for Setting Up Translation APIs

// Quick setup function for Google Translate API
export function setGoogleTranslateKey(apiKey) {
    if (typeof window !== 'undefined') {
        // For web apps, you can set this temporarily
        window.GOOGLE_TRANSLATE_API_KEY = apiKey;
        console.log('✅ Google Translate API key set temporarily');
        console.log('🔄 Refresh the debug console to see updated status');
        return true;
    }
    return false;
}

// Check current configuration status
export function checkConfiguration() {
    const config = {
        googleTranslateKey: !!(process.env.GOOGLE_TRANSLATE_API_KEY || window.GOOGLE_TRANSLATE_API_KEY),
        myMemoryAvailable: true, // Always available as free service
        browserSupport: {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            speechSynthesis: 'speechSynthesis' in window,
            mediaRecorder: 'MediaRecorder' in window,
            getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        }
    };

    const allSupported = Object.values(config.browserSupport).every(Boolean);
    const hasTranslation = config.googleTranslateKey || config.myMemoryAvailable;

    console.log('🔍 Current Configuration:');
    console.log('  📊 Google Translate API:', config.googleTranslateKey ? '✅ Configured' : '❌ Not configured');
    console.log('  🆓 MyMemory API:', config.myMemoryAvailable ? '✅ Available' : '❌ Not available');
    console.log('  🌐 Browser Support:', allSupported ? '✅ Full support' : '⚠️ Limited support');
    
    Object.entries(config.browserSupport).forEach(([feature, supported]) => {
        console.log(`    • ${feature}:`, supported ? '✅' : '❌');
    });

    const status = hasTranslation && allSupported ? 'READY' : 
                   hasTranslation ? 'PARTIAL' : 'NEEDS_SETUP';

    console.log('  🎯 Overall Status:', 
        status === 'READY' ? '🟢 READY FOR USE' :
        status === 'PARTIAL' ? '🟡 WORKING WITH LIMITATIONS' :
        '🔴 NEEDS CONFIGURATION');

    return {
        ...config,
        status,
        canWork: hasTranslation,
        recommendations: getRecommendations(config)
    };
}

function getRecommendations(config) {
    const recommendations = [];

    if (!config.googleTranslateKey) {
        recommendations.push({
            type: 'setup',
            priority: 'medium',
            title: 'Configure Google Translate API',
            description: 'For best translation quality and higher rate limits',
            action: 'Follow the setup guide in GOOGLE_SETUP_GUIDE.md'
        });
    }

    if (!config.browserSupport.speechRecognition) {
        recommendations.push({
            type: 'browser',
            priority: 'high',
            title: 'Use a supported browser',
            description: 'Speech recognition requires Chrome, Edge, or Safari',
            action: 'Switch to a compatible browser'
        });
    }

    if (!config.browserSupport.getUserMedia) {
        recommendations.push({
            type: 'permissions',
            priority: 'high',
            title: 'Allow microphone access',
            description: 'Required for speech recognition',
            action: 'Grant microphone permissions when prompted'
        });
    }

    return recommendations;
}

// Quick test function
export function quickTest() {
    console.log('🧪 Running quick configuration test...');
    
    const config = checkConfiguration();
    
    if (config.status === 'READY') {
        console.log('🎉 System is ready! You can start using translation features.');
    } else if (config.status === 'PARTIAL') {
        console.log('⚠️ System will work with limitations. Consider the recommendations above.');
    } else {
        console.log('🔧 Setup required. Follow the recommendations to get started.');
    }

    return config;
}

// Make functions available globally for console use
if (typeof window !== 'undefined') {
    window.translationConfig = {
        setGoogleKey: setGoogleTranslateKey,
        check: checkConfiguration,
        test: quickTest
    };

    console.log('🛠️ Translation Configuration Helper Loaded');
    console.log('📋 Available commands:');
    console.log('  • translationConfig.check() - Check current setup');
    console.log('  • translationConfig.test() - Run quick test');
    console.log('  • translationConfig.setGoogleKey("your-key") - Set API key temporarily');
}

export default {
    setGoogleTranslateKey,
    checkConfiguration,
    quickTest
};
