// Test translation functionality
import { translateText } from './translationService.js';

async function testTranslation() {
    console.log('🧪 Testing translation functionality...');
    
    try {
        // Test English to Spanish
        console.log('\n1. Testing English to Spanish:');
        const result1 = await translateText('Hello, how are you?', 'es', 'en');
        console.log('Original:', 'Hello, how are you?');
        console.log('Translated:', result1.translatedText);
        console.log('Result:', result1);
        
        // Test Spanish to English
        console.log('\n2. Testing Spanish to English:');
        const result2 = await translateText('Hola, ¿cómo estás?', 'en', 'es');
        console.log('Original:', 'Hola, ¿cómo estás?');
        console.log('Translated:', result2.translatedText);
        console.log('Result:', result2);
        
        // Test English to Filipino
        console.log('\n3. Testing English to Filipino:');
        const result3 = await translateText('Good morning, how are you today?', 'fil', 'en');
        console.log('Original:', 'Good morning, how are you today?');
        console.log('Translated:', result3.translatedText);
        console.log('Result:', result3);
        
        console.log('\n✅ Translation tests completed!');
        
    } catch (error) {
        console.error('❌ Translation test failed:', error);
    }
}

// Run the test
testTranslation();
