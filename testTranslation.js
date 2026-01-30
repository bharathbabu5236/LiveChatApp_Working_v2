// Quick Translation Test Runner
// Use this file to test the new translation APIs

import translationAPITester from './utils/translationAPITester';
import liveTranslationService from './services/liveTranslationService';

// Test the new translation system
async function runTranslationTests() {
    console.log('🚀 Starting Translation System Tests\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Quick health check first
        console.log('1️⃣ Running quick health check...');
        const health = await translationAPITester.quickHealthCheck();
        
        if (!health.healthy) {
            console.error('❌ System is not healthy. Stopping tests.');
            console.error('Issues:', health.checks?.filter(c => c.status !== 'OK'));
            return;
        }
        
        console.log('✅ System is healthy! Continuing with full tests...\n');
        
        // 2. Run comprehensive tests
        console.log('2️⃣ Running comprehensive API tests...');
        const results = await translationAPITester.runAllTests();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
        if (results.success) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log(`✅ Success Rate: ${results.summary.passRate}%`);
            console.log(`📈 Passed: ${results.summary.passed}/${results.summary.total}`);
            
            console.log('\n3️⃣ Testing live translation workflow...');
            await testLiveTranslationWorkflow();
            
        } else {
            console.log('⚠️ Some tests failed');
            console.log(`📊 Pass Rate: ${results.summary.passRate}%`);
            console.log(`✅ Passed: ${results.summary.passed}`);
            console.log(`❌ Failed: ${results.summary.failed}`);
            console.log(`⚠️ Warnings: ${results.summary.warnings}`);
            
            // Show failed tests
            const failures = results.results.filter(r => r.status === 'FAIL');
            if (failures.length > 0) {
                console.log('\n❌ Failed Tests:');
                failures.forEach(f => console.log(`  • ${f.test}: ${f.details}`));
            }
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Testing Complete');
    console.log('='.repeat(50));
}

// Test the live translation workflow
async function testLiveTranslationWorkflow() {
    try {
        console.log('\n🌍 Testing Live Translation Service...');
        
        // Test 1: Set languages
        console.log('Setting languages (English → Spanish)...');
        liveTranslationService.setLanguages('en', 'es');
        
        const status = liveTranslationService.getStatus();
        console.log('✅ Languages set:', status.sourceLanguage, '→', status.targetLanguage);
        
        // Test 2: Check supported languages
        const supportedLangs = liveTranslationService.getSupportedLanguages();
        console.log('✅ Supported languages count:', Object.keys(supportedLangs).length);
        
        // Test 3: Test text translation
        console.log('\nTesting text translation...');
        const testPhrases = [
            'Hello, how are you today?',
            'Good morning, nice to meet you.',
            'Thank you for your help.'
        ];
        
        for (const phrase of testPhrases) {
            try {
                const result = await liveTranslationService.translateText(phrase, 'en', 'es');
                if (result.success) {
                    console.log(`✅ "${phrase}" → "${result.translatedText}"`);
                } else {
                    console.log(`❌ Translation failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`❌ Translation error: ${error.message}`);
            }
        }
        
        console.log('\n✅ Live translation workflow test completed!');
        
    } catch (error) {
        console.error('❌ Live translation workflow test failed:', error);
    }
}

// Function to test individual APIs
async function testIndividualAPI(apiName) {
    console.log(`🧪 Testing ${apiName}...`);
    
    try {
        switch (apiName.toLowerCase()) {
            case 'speech':
            case 'stt':
                const speechAPI = await import('./api/speechToTextAPI');
                const sttResult = await speechAPI.default.testAPI();
                console.log('Speech-to-Text result:', sttResult);
                break;
                
            case 'translation':
            case 'translate':
                const translateAPI = await import('./api/textTranslationAPI');
                const translateResult = await translateAPI.default.testAPI();
                console.log('Translation result:', translateResult);
                break;
                
            case 'tts':
            case 'speech-synthesis':
                const ttsAPI = await import('./api/textToSpeechAPI');
                const ttsResult = await ttsAPI.default.testAPI();
                console.log('Text-to-Speech result:', ttsResult);
                break;
                
            case 'audio':
            case 'processing':
                const audioAPI = await import('./api/audioProcessingAPI');
                const audioResult = await audioAPI.default.testAPI();
                console.log('Audio Processing result:', audioResult);
                break;
                
            default:
                console.log('❌ Unknown API. Available: speech, translation, tts, audio');
        }
        
    } catch (error) {
        console.error(`❌ Failed to test ${apiName}:`, error);
    }
}

// Manual test functions that can be called from console
window.translationTest = {
    runAll: runTranslationTests,
    testAPI: testIndividualAPI,
    healthCheck: () => translationAPITester.quickHealthCheck(),
    workflow: testLiveTranslationWorkflow,
    status: () => liveTranslationService.getStatus(),
    setLanguages: (from, to) => liveTranslationService.setLanguages(from, to),
    translate: (text, from, to) => liveTranslationService.translateText(text, from, to)
};

console.log('🧪 Translation Test Runner Loaded!');
console.log('📋 Available commands:');
console.log('  • translationTest.runAll() - Run all tests');
console.log('  • translationTest.healthCheck() - Quick health check');
console.log('  • translationTest.testAPI("speech") - Test individual API');
console.log('  • translationTest.workflow() - Test translation workflow');
console.log('  • translationTest.status() - Get service status');
console.log('  • translationTest.translate("text", "en", "es") - Test translation');
console.log('');
console.log('🚀 Run translationTest.runAll() to start testing!');

// Auto-run health check on load
(async () => {
    try {
        console.log('\n🏥 Running automatic health check...');
        const health = await translationAPITester.quickHealthCheck();
        
        if (health.healthy) {
            console.log('🟢 System is ready for testing!');
        } else {
            console.log('🔴 System has issues. Check the output above.');
        }
    } catch (error) {
        console.error('❌ Auto health check failed:', error);
    }
})();

export default {
    runAllTests: runTranslationTests,
    testIndividualAPI,
    testLiveTranslationWorkflow
};
