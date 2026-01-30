// Test Live Translation Integration
// Simple test to verify the translation services are working

import liveTranslationService from '../services/liveTranslationService';
import { translateText } from '../translationService';

class TranslationTester {
    constructor() {
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Starting Live Translation Tests...\n');

        // Test 1: Basic translation service
        await this.testBasicTranslation();

        // Test 2: Live translation service initialization
        await this.testServiceInitialization();

        // Test 3: Language setting
        await this.testLanguageSettings();

        // Test 4: Translation functionality (mock)
        await this.testTranslationFunctionality();

        // Print results
        this.printResults();
    }

    async testBasicTranslation() {
        console.log('📝 Test 1: Basic Translation Service');
        try {
            const result = await translateText('Hello world', 'en', 'es');
            if (result) {
                console.log(`✅ Translation successful: "Hello world" → "${result}"`);
                this.testResults.push({ test: 'Basic Translation', status: 'PASS', result });
            } else {
                throw new Error('Translation returned null');
            }
        } catch (error) {
            console.log(`❌ Translation failed: ${error.message}`);
            this.testResults.push({ test: 'Basic Translation', status: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testServiceInitialization() {
        console.log('🔧 Test 2: Live Translation Service Initialization');
        try {
            const status = liveTranslationService.getStatus();
            console.log('✅ Service initialized:', status);
            this.testResults.push({ test: 'Service Initialization', status: 'PASS', result: status });
        } catch (error) {
            console.log(`❌ Service initialization failed: ${error.message}`);
            this.testResults.push({ test: 'Service Initialization', status: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testLanguageSettings() {
        console.log('🌍 Test 3: Language Settings');
        try {
            liveTranslationService.setLanguages('en', 'fr');
            const status = liveTranslationService.getStatus();
            
            if (status.sourceLanguage === 'en' && status.targetLanguage === 'fr') {
                console.log('✅ Language setting successful');
                this.testResults.push({ test: 'Language Settings', status: 'PASS', result: status });
            } else {
                throw new Error('Languages not set correctly');
            }
        } catch (error) {
            console.log(`❌ Language setting failed: ${error.message}`);
            this.testResults.push({ test: 'Language Settings', status: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testTranslationFunctionality() {
        console.log('🎤 Test 4: Translation Functionality Check');
        try {
            const supportedLanguages = liveTranslationService.getSupportedLanguages();
            const languageCount = Object.keys(supportedLanguages).length;
            
            console.log(`✅ Supported languages: ${languageCount}`);
            console.log('Available languages:', Object.keys(supportedLanguages).slice(0, 10).join(', '), '...');
            
            this.testResults.push({ 
                test: 'Translation Functionality', 
                status: 'PASS', 
                result: `${languageCount} languages supported` 
            });
        } catch (error) {
            console.log(`❌ Functionality check failed: ${error.message}`);
            this.testResults.push({ 
                test: 'Translation Functionality', 
                status: 'FAIL', 
                error: error.message 
            });
        }
        console.log('');
    }

    printResults() {
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));
        
        let passCount = 0;
        let failCount = 0;

        this.testResults.forEach((result, index) => {
            const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
            console.log(`${index + 1}. ${result.test}: ${status}`);
            
            if (result.status === 'PASS') {
                passCount++;
                if (result.result) {
                    console.log(`   Result: ${typeof result.result === 'object' ? JSON.stringify(result.result, null, 2) : result.result}`);
                }
            } else {
                failCount++;
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('=' .repeat(50));
        console.log(`📈 Summary: ${passCount} passed, ${failCount} failed`);
        
        if (failCount === 0) {
            console.log('🎉 All tests passed! Live translation is ready to use.');
        } else {
            console.log('⚠️  Some tests failed. Please check the errors above.');
        }
    }

    // Test speech recognition availability
    testSpeechRecognition() {
        console.log('🎤 Testing Speech Recognition Availability...');
        
        if (typeof window !== 'undefined') {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                console.log('✅ Speech Recognition is available');
                return true;
            } else {
                console.log('❌ Speech Recognition is not available in this browser');
                return false;
            }
        } else {
            console.log('⚠️  Running in Node.js environment - Speech Recognition test skipped');
            return null;
        }
    }

    // Test text-to-speech availability
    testTextToSpeech() {
        console.log('🔊 Testing Text-to-Speech Availability...');
        
        if (typeof window !== 'undefined') {
            if ('speechSynthesis' in window) {
                console.log('✅ Text-to-Speech is available');
                const voices = window.speechSynthesis.getVoices();
                console.log(`   Available voices: ${voices.length}`);
                return true;
            } else {
                console.log('❌ Text-to-Speech is not available in this browser');
                return false;
            }
        } else {
            console.log('⚠️  Running in Node.js environment - Text-to-Speech test skipped');
            return null;
        }
    }

    // Full browser compatibility test
    async testBrowserCompatibility() {
        console.log('🌐 Testing Browser Compatibility...\n');
        
        const speechRecognition = this.testSpeechRecognition();
        const textToSpeech = this.testTextToSpeech();
        
        console.log('\n📋 Browser Compatibility Results:');
        console.log(`   Speech Recognition: ${speechRecognition === true ? '✅ Supported' : speechRecognition === false ? '❌ Not Supported' : '⚠️  Cannot test'}`);
        console.log(`   Text-to-Speech: ${textToSpeech === true ? '✅ Supported' : textToSpeech === false ? '❌ Not Supported' : '⚠️  Cannot test'}`);
        
        return {
            speechRecognition,
            textToSpeech,
            compatible: speechRecognition === true && textToSpeech === true
        };
    }
}

// Usage example:
export const runTranslationTests = async () => {
    const tester = new TranslationTester();
    await tester.runTests();
    
    // Also test browser compatibility
    const compatibility = await tester.testBrowserCompatibility();
    
    return {
        allTestsPassed: tester.testResults.every(r => r.status === 'PASS'),
        compatibility,
        results: tester.testResults
    };
};

export default TranslationTester;
