// API Test Utility for Live Translation
// Comprehensive testing for all custom translation APIs

import speechToTextAPI from '../api/speechToTextAPI';
import textTranslationAPI from '../api/textTranslationAPI';
import textToSpeechAPI from '../api/textToSpeechAPI';
import audioProcessingAPI from '../api/audioProcessingAPI';
import liveTranslationService from '../services/liveTranslationService';
import { validateApiConfig, getAllSupportedLanguages } from '../config/translationApiConfig';

class TranslationAPITester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
    }

    // Run all API tests
    async runAllTests() {
        console.log('🧪 Starting comprehensive API testing...\n');
        
        this.isRunning = true;
        this.testResults = [];

        try {
            // Test 1: Configuration validation
            await this.testConfiguration();

            // Test 2: Speech-to-Text API
            await this.testSpeechToText();

            // Test 3: Text Translation API
            await this.testTextTranslation();

            // Test 4: Text-to-Speech API
            await this.testTextToSpeech();

            // Test 5: Audio Processing API
            await this.testAudioProcessing();

            // Test 6: Live Translation Service
            await this.testLiveTranslationService();

            // Test 7: Browser compatibility
            await this.testBrowserCompatibility();

            // Print final results
            this.printFinalResults();

        } catch (error) {
            console.error('❌ Testing failed:', error);
            this.addResult('Overall Testing', 'FAIL', error.message);
        } finally {
            this.isRunning = false;
        }

        return {
            success: this.testResults.every(r => r.status === 'PASS'),
            results: this.testResults,
            summary: this.getTestSummary()
        };
    }

    // Test 1: Configuration validation
    async testConfiguration() {
        console.log('⚙️ Testing Configuration...');
        
        try {
            const validation = validateApiConfig();
            
            if (validation.isValid) {
                this.addResult('Configuration Validation', 'PASS', 'All settings valid');
            } else {
                this.addResult('Configuration Validation', 'WARN', 
                    `Issues found: ${validation.issues.join(', ')}`);
            }

            // Test supported languages
            const languages = getAllSupportedLanguages();
            const languageCount = Object.keys(languages).length;
            
            this.addResult('Supported Languages', 'PASS', 
                `${languageCount} languages configured`);

        } catch (error) {
            this.addResult('Configuration Validation', 'FAIL', error.message);
        }
    }

    // Test 2: Speech-to-Text API
    async testSpeechToText() {
        console.log('🎤 Testing Speech-to-Text API...');
        
        try {
            const testResult = await speechToTextAPI.testAPI();
            
            if (testResult.success) {
                this.addResult('Speech-to-Text API', 'PASS', 
                    'API initialized successfully');
                
                // Test language support
                const languages = speechToTextAPI.getSupportedLanguages();
                this.addResult('STT Language Support', 'PASS', 
                    `${Object.keys(languages).length} languages supported`);
                    
            } else {
                this.addResult('Speech-to-Text API', 'FAIL', testResult.error);
            }

        } catch (error) {
            this.addResult('Speech-to-Text API', 'FAIL', error.message);
        }
    }

    // Test 3: Text Translation API
    async testTextTranslation() {
        console.log('🌍 Testing Text Translation API...');
        
        try {
            const testResult = await textTranslationAPI.testAPI();
            
            if (testResult.success) {
                this.addResult('Text Translation API', 'PASS', 
                    `Translation test successful: "${testResult.result.translatedText}"`);
                    
                // Test multiple languages
                const multiTest = await this.testMultipleTranslations();
                if (multiTest.success) {
                    this.addResult('Multi-Language Translation', 'PASS', 
                        `${multiTest.successCount}/${multiTest.totalCount} translations successful`);
                } else {
                    this.addResult('Multi-Language Translation', 'WARN', multiTest.error);
                }
                    
            } else {
                this.addResult('Text Translation API', 'FAIL', testResult.error);
            }

        } catch (error) {
            this.addResult('Text Translation API', 'FAIL', error.message);
        }
    }

    // Test 4: Text-to-Speech API
    async testTextToSpeech() {
        console.log('🔊 Testing Text-to-Speech API...');
        
        try {
            const testResult = await textToSpeechAPI.testAPI();
            
            if (testResult.success) {
                this.addResult('Text-to-Speech API', 'PASS', 
                    'TTS test completed successfully');
                
                // Test voice availability
                const status = textToSpeechAPI.getStatus();
                this.addResult('TTS Voice Support', 'PASS', 
                    `${status.voiceCount} voices available`);
                    
            } else {
                this.addResult('Text-to-Speech API', 'FAIL', testResult.error);
            }

        } catch (error) {
            this.addResult('Text-to-Speech API', 'FAIL', error.message);
        }
    }

    // Test 5: Audio Processing API
    async testAudioProcessing() {
        console.log('🎧 Testing Audio Processing API...');
        
        try {
            const testResult = await audioProcessingAPI.testAPI();
            
            if (testResult.success) {
                this.addResult('Audio Processing API', 'PASS', 
                    'Audio initialization successful');
                
                // Test microphone access
                if (testResult.devices && testResult.devices.success) {
                    this.addResult('Microphone Access', 'PASS', 
                        `${testResult.devices.devices.length} audio devices found`);
                } else {
                    this.addResult('Microphone Access', 'WARN', 
                        'Could not enumerate audio devices');
                }
                    
            } else {
                this.addResult('Audio Processing API', 'FAIL', testResult.error);
            }

        } catch (error) {
            this.addResult('Audio Processing API', 'FAIL', error.message);
        }
    }

    // Test 6: Live Translation Service
    async testLiveTranslationService() {
        console.log('🌐 Testing Live Translation Service...');
        
        try {
            const status = liveTranslationService.getStatus();
            this.addResult('Live Translation Service', 'PASS', 
                `Service ready with ${status.supportedLanguagesCount} languages`);
                
            // Test language setting
            liveTranslationService.setLanguages('en', 'es');
            const updatedStatus = liveTranslationService.getStatus();
            
            if (updatedStatus.sourceLanguage === 'en' && updatedStatus.targetLanguage === 'es') {
                this.addResult('Language Configuration', 'PASS', 
                    'Language setting successful');
            } else {
                this.addResult('Language Configuration', 'FAIL', 
                    'Language setting failed');
            }

        } catch (error) {
            this.addResult('Live Translation Service', 'FAIL', error.message);
        }
    }

    // Test 7: Browser compatibility
    async testBrowserCompatibility() {
        console.log('🌐 Testing Browser Compatibility...');
        
        try {
            const compatibility = {
                speechRecognition: false,
                speechSynthesis: false,
                mediaRecorder: false,
                getUserMedia: false
            };

            if (typeof window !== 'undefined') {
                compatibility.speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
                compatibility.speechSynthesis = 'speechSynthesis' in window;
                compatibility.mediaRecorder = 'MediaRecorder' in window;
                compatibility.getUserMedia = 'navigator' in window && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
            }

            const compatibleFeatures = Object.values(compatibility).filter(Boolean).length;
            const totalFeatures = Object.keys(compatibility).length;

            if (compatibleFeatures === totalFeatures) {
                this.addResult('Browser Compatibility', 'PASS', 
                    'All features supported');
            } else {
                this.addResult('Browser Compatibility', 'WARN', 
                    `${compatibleFeatures}/${totalFeatures} features supported`);
            }

            // Individual feature results
            Object.entries(compatibility).forEach(([feature, supported]) => {
                this.addResult(`${feature} Support`, supported ? 'PASS' : 'FAIL', 
                    supported ? 'Supported' : 'Not supported');
            });

        } catch (error) {
            this.addResult('Browser Compatibility', 'FAIL', error.message);
        }
    }

    // Test multiple language translations
    async testMultipleTranslations() {
        const testPhrases = [
            { text: 'Hello, how are you?', from: 'en', to: 'es' },
            { text: 'Good morning', from: 'en', to: 'fr' },
            { text: 'Thank you very much', from: 'en', to: 'de' }
        ];

        let successCount = 0;
        let totalCount = testPhrases.length;

        for (const phrase of testPhrases) {
            try {
                const result = await textTranslationAPI.translateText(
                    phrase.text, phrase.from, phrase.to
                );
                
                if (result.success) {
                    successCount++;
                    console.log(`✅ ${phrase.from} → ${phrase.to}: "${phrase.text}" → "${result.translatedText}"`);
                } else {
                    console.log(`❌ ${phrase.from} → ${phrase.to}: Failed - ${result.error}`);
                }
            } catch (error) {
                console.log(`❌ ${phrase.from} → ${phrase.to}: Error - ${error.message}`);
            }
        }

        return {
            success: successCount > 0,
            successCount,
            totalCount,
            error: successCount === 0 ? 'No translations successful' : null
        };
    }

    // Add test result
    addResult(testName, status, details) {
        const result = {
            test: testName,
            status, // 'PASS', 'FAIL', 'WARN'
            details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${statusIcon} ${testName}: ${details}`);
    }

    // Get test summary
    getTestSummary() {
        const summary = {
            total: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'PASS').length,
            failed: this.testResults.filter(r => r.status === 'FAIL').length,
            warnings: this.testResults.filter(r => r.status === 'WARN').length
        };
        
        summary.passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;
        
        return summary;
    }

    // Print final results
    printFinalResults() {
        const summary = this.getTestSummary();
        
        console.log('\n📊 FINAL TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${summary.total}`);
        console.log(`✅ Passed: ${summary.passed}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`⚠️  Warnings: ${summary.warnings}`);
        console.log(`📈 Pass Rate: ${summary.passRate}%`);
        console.log('='.repeat(50));

        if (summary.failed === 0) {
            console.log('🎉 All critical tests passed! Translation system is ready to use.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above before using the translation system.');
        }

        // Show failed tests
        if (summary.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => {
                    console.log(`   • ${r.test}: ${r.details}`);
                });
        }

        // Show warnings
        if (summary.warnings > 0) {
            console.log('\n⚠️  Warnings:');
            this.testResults
                .filter(r => r.status === 'WARN')
                .forEach(r => {
                    console.log(`   • ${r.test}: ${r.details}`);
                });
        }
    }

    // Quick health check (minimal testing)
    async quickHealthCheck() {
        console.log('🏥 Running quick health check...');
        
        const checks = [];
        
        try {
            // Check configuration
            const config = validateApiConfig();
            checks.push({ 
                name: 'Configuration', 
                status: config.isValid ? 'OK' : 'WARN',
                details: config.issues.length > 0 ? config.issues.join(', ') : 'Valid'
            });

            // Check browser support
            const browserOK = typeof window !== 'undefined' && 
                              'speechSynthesis' in window &&
                              ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
            
            checks.push({
                name: 'Browser Support',
                status: browserOK ? 'OK' : 'FAIL',
                details: browserOK ? 'All features supported' : 'Missing required features'
            });

            // Check translation API
            try {
                const translationTest = await textTranslationAPI.translateText('test', 'en', 'es');
                checks.push({
                    name: 'Translation API',
                    status: translationTest.success ? 'OK' : 'FAIL',
                    details: translationTest.success ? 'Working' : translationTest.error
                });
            } catch (error) {
                checks.push({
                    name: 'Translation API',
                    status: 'FAIL',
                    details: error.message
                });
            }

            // Print results
            console.log('\n🏥 Health Check Results:');
            checks.forEach(check => {
                const icon = check.status === 'OK' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
                console.log(`${icon} ${check.name}: ${check.details}`);
            });

            const allOK = checks.every(c => c.status === 'OK');
            console.log(`\n${allOK ? '🟢' : '🔴'} Overall Status: ${allOK ? 'HEALTHY' : 'ISSUES DETECTED'}`);

            return {
                healthy: allOK,
                checks
            };

        } catch (error) {
            console.error('❌ Health check failed:', error);
            return { healthy: false, error: error.message };
        }
    }

    // Get current status
    getStatus() {
        return {
            isRunning: this.isRunning,
            testsCompleted: this.testResults.length,
            lastResults: this.testResults.slice(-5) // Last 5 results
        };
    }
}

// Create singleton instance
const translationAPITester = new TranslationAPITester();

// Export functions for easy use
export const runAllTests = () => translationAPITester.runAllTests();
export const quickHealthCheck = () => translationAPITester.quickHealthCheck();
export const getTestStatus = () => translationAPITester.getStatus();

export default translationAPITester;
