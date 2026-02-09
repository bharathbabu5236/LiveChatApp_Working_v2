// Simple test for Google Translate API using Node.js
const fetch = require('node-fetch');

const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyC-KeQ39iD_HAwGVbQt830FP8EzEY7Ez5s';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

async function testTranslation() {
    console.log('🧪 Testing Google Translate API...');
    
    try {
        const url = `${GOOGLE_TRANSLATE_ENDPOINT}?key=${GOOGLE_TRANSLATE_API_KEY}`;
        
        const requestBody = {
            q: 'Hello world, how are you?',
            target: 'es',
            format: 'text'
        };

        console.log('📦 Request URL:', `${GOOGLE_TRANSLATE_ENDPOINT}?key=***`);
        console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📡 Response Status:', response.status);
        console.log('📡 Response Status Text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('📥 API Response Data:', JSON.stringify(data, null, 2));

        if (data && data.data && data.data.translations && data.data.translations[0]) {
            const result = data.data.translations[0];
            console.log('✅ Translation Successful!');
            console.log('📄 Original Text: Hello world, how are you?');
            console.log('📄 Translated Text:', result.translatedText);
            console.log('🔍 Detected Language:', result.detectedSourceLanguage);
        } else {
            console.error('❌ Invalid API response structure');
        }
    } catch (error) {
        console.error('💥 Translation Test Error:', error.message);
    }
}

testTranslation();
