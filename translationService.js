// LiveChatApp/translationService.js

// Google Translate Configuration
const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyCJALQzXTUdWubtI2VnGzPZBk2Do20Ec28'; // Replace with your API key from JSON file
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

// Supported languages with their codes and display names (Google Translate supported languages)
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ru: { name: 'Russian', nativeName: 'Русский' },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  tr: { name: 'Turkish', nativeName: 'Türkçe' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  sv: { name: 'Swedish', nativeName: 'Svenska' },
  da: { name: 'Danish', nativeName: 'Dansk' },
  no: { name: 'Norwegian', nativeName: 'Norsk' },
  fi: { name: 'Finnish', nativeName: 'Suomi' },
  pl: { name: 'Polish', nativeName: 'Polski' },
  cs: { name: 'Czech', nativeName: 'Čeština' },
  hu: { name: 'Hungarian', nativeName: 'Magyar' },
  ro: { name: 'Romanian', nativeName: 'Română' },
  bg: { name: 'Bulgarian', nativeName: 'Български' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina' },
  et: { name: 'Estonian', nativeName: 'Eesti' },
  lv: { name: 'Latvian', nativeName: 'Latviešu' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių' },
  mt: { name: 'Maltese', nativeName: 'Malti' },
  el: { name: 'Greek', nativeName: 'Ελληνικά' },
  he: { name: 'Hebrew', nativeName: 'עברית' },
  th: { name: 'Thai', nativeName: 'ไทย' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu' },
  fil: { name: 'Filipino', nativeName: 'Filipino' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  ur: { name: 'Urdu', nativeName: 'اردو' },
  fa: { name: 'Persian', nativeName: 'فارسی' },
  am: { name: 'Amharic', nativeName: 'አማርኛ' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili' },
  zu: { name: 'Zulu', nativeName: 'isiZulu' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans' },
  sq: { name: 'Albanian', nativeName: 'Shqip' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  eu: { name: 'Basque', nativeName: 'Euskara' },
  be: { name: 'Belarusian', nativeName: 'Беларуская' },
  bs: { name: 'Bosnian', nativeName: 'Bosanski' },
  ca: { name: 'Catalan', nativeName: 'Català' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg' },
  eo: { name: 'Esperanto', nativeName: 'Esperanto' },
  fo: { name: 'Faroese', nativeName: 'Føroyskt' },
  gl: { name: 'Galician', nativeName: 'Galego' },
  ka: { name: 'Georgian', nativeName: 'ქართული' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  ha: { name: 'Hausa', nativeName: 'Hausa' },
  is: { name: 'Icelandic', nativeName: 'Íslenska' },
  ig: { name: 'Igbo', nativeName: 'Igbo' },
  ga: { name: 'Irish', nativeName: 'Gaeilge' },
  jw: { name: 'Javanese', nativeName: 'Basa Jawa' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  kk: { name: 'Kazakh', nativeName: 'Қазақ' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ' },
  ky: { name: 'Kyrgyz', nativeName: 'Кыргызча' },
  lo: { name: 'Lao', nativeName: 'ລາວ' },
  la: { name: 'Latin', nativeName: 'Latina' },
  lb: { name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  mk: { name: 'Macedonian', nativeName: 'Македонски' },
  mg: { name: 'Malagasy', nativeName: 'Malagasy' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  mi: { name: 'Maori', nativeName: 'Māori' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  mn: { name: 'Mongolian', nativeName: 'Монгол' },
  ne: { name: 'Nepali', nativeName: 'नेपाली' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  ps: { name: 'Pashto', nativeName: 'پښتو' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  qu: { name: 'Quechua', nativeName: 'Runasimi' },
  rw: { name: 'Kinyarwanda', nativeName: 'Kinyarwanda' },
  sm: { name: 'Samoan', nativeName: 'Gagana Samoa' },
  gd: { name: 'Scottish Gaelic', nativeName: 'Gàidhlig' },
  nso: { name: 'Sepedi', nativeName: 'Sepedi' },
  sr: { name: 'Serbian', nativeName: 'Српски' },
  st: { name: 'Sesotho', nativeName: 'Sesotho' },
  sn: { name: 'Shona', nativeName: 'chiShona' },
  sd: { name: 'Sindhi', nativeName: 'سنڌي' },
  si: { name: 'Sinhala', nativeName: 'සිංහල' },
  so: { name: 'Somali', nativeName: 'Soomaali' },
  su: { name: 'Sundanese', nativeName: 'Basa Sunda' },
  tg: { name: 'Tajik', nativeName: 'Тоҷикӣ' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  tk: { name: 'Turkmen', nativeName: 'Türkmen' },
  uk: { name: 'Ukrainian', nativeName: 'Українська' },
  uz: { name: 'Uzbek', nativeName: 'O\'zbek' },
  xh: { name: 'Xhosa', nativeName: 'isiXhosa' },
  yi: { name: 'Yiddish', nativeName: 'יידיש' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá' }
};

// Function to translate text using Google Translate
export const translateText = async (text, targetLanguage, sourceLanguage = 'auto') => {
  try {
    if (!text || text.trim() === '') {
      return { translatedText: text, detectedLanguage: sourceLanguage };
    }

    // If source and target are the same, return original text
    if (sourceLanguage === targetLanguage) {
      return { translatedText: text, detectedLanguage: sourceLanguage };
    }

    // Prepare the request URL
    const url = `${GOOGLE_TRANSLATE_ENDPOINT}?key=${GOOGLE_TRANSLATE_API_KEY}`;

    const requestBody = {
      q: text,
      target: targetLanguage,
      format: 'text'
    };

    // Add source language if specified (not 'auto')
    if (sourceLanguage !== 'auto') {
      requestBody.source = sourceLanguage;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.translations && data.data.translations[0]) {
      return {
        translatedText: data.data.translations[0].translatedText,
        detectedLanguage: data.data.translations[0].detectedSourceLanguage || sourceLanguage,
        confidence: 1.0, // Google Translate doesn't provide confidence scores in the same way
      };
    } else {
      throw new Error('Invalid response from Google Translate API');
    }
  } catch (error) {
    console.error('Google Translate error:', error);
    // Return original text if translation fails
    return {
      translatedText: text,
      detectedLanguage: sourceLanguage,
      error: error.message,
    };
  }
};

// Function to detect language using Google Translate
export const detectLanguage = async (text) => {
  try {
    if (!text || text.trim() === '') {
      return { language: 'en', confidence: 0 };
    }

    const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${GOOGLE_TRANSLATE_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text
      })
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.detections && data.data.detections[0] && data.data.detections[0][0]) {
      const detection = data.data.detections[0][0];
      return {
        language: detection.language,
        confidence: detection.confidence || 0,
      };
    } else {
      return { language: 'en', confidence: 0 };
    }
  } catch (error) {
    console.error('Language detection error:', error);
    return { language: 'en', confidence: 0, error: error.message };
  }
};

// Function to get supported languages from Google Translate
export const getSupportedLanguages = async () => {
  try {
    const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_TRANSLATE_API_KEY}&target=en`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.languages) {
      return data.data.languages.map(lang => ({
        code: lang.language,
        name: lang.name,
        nativeName: lang.name, // Google Translate doesn't provide native names in this endpoint
      }));
    } else {
      return getSupportedLanguagesArray(); // Fallback to our predefined list
    }
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    return getSupportedLanguagesArray(); // Fallback to our predefined list
  }
};

// Function to get language name by code
export const getLanguageName = (languageCode) => {
  return SUPPORTED_LANGUAGES[languageCode]?.name || languageCode;
};

// Function to get native language name by code
export const getNativeLanguageName = (languageCode) => {
  return SUPPORTED_LANGUAGES[languageCode]?.nativeName || languageCode;
};

// Function to get all supported languages as an array
export const getSupportedLanguagesArray = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code,
    name: info.name,
    nativeName: info.nativeName,
  }));
};

// Mock translation function for development/testing (when Google Translate is not configured)
export const mockTranslateText = async (text, targetLanguage, sourceLanguage = 'auto') => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simple mock translations for common phrases
  const mockTranslations = {
    'hello': {
      es: 'hola',
      fr: 'bonjour',
      de: 'hallo',
      it: 'ciao',
      pt: 'olá',
      ru: 'привет',
      zh: '你好',
      ja: 'こんにちは',
      ko: '안녕하세요',
      ar: 'مرحبا',
      hi: 'नमस्ते',
      tr: 'merhaba',
      nl: 'hallo',
      sv: 'hej',
      da: 'hej',
      no: 'hei',
      fi: 'hei',
      pl: 'cześć',
      cs: 'ahoj',
      hu: 'szia',
      ro: 'salut',
      bg: 'здравей',
      hr: 'zdravo',
      sk: 'ahoj',
      sl: 'zdravo',
      et: 'tere',
      lv: 'sveiki',
      lt: 'labas',
      mt: 'bonġu',
      el: 'γεια',
      he: 'שלום',
      th: 'สวัสดี',
      vi: 'xin chào',
      id: 'halo',
      ms: 'halo',
      fil: 'kumusta',
      bn: 'হ্যালো',
      ur: 'ہیلو',
      fa: 'سلام',
      am: 'ሰላም',
      sw: 'jambo',
      zu: 'sawubona'
    },
    'thank you': {
      es: 'gracias',
      fr: 'merci',
      de: 'danke',
      it: 'grazie',
      pt: 'obrigado',
      ru: 'спасибо',
      zh: '谢谢',
      ja: 'ありがとう',
      ko: '감사합니다',
      ar: 'شكرا',
      hi: 'धन्यवाद',
      tr: 'teşekkürler',
      nl: 'dank je',
      sv: 'tack',
      da: 'tak',
      no: 'takk',
      fi: 'kiitos',
      pl: 'dziękuję',
      cs: 'děkuji',
      hu: 'köszönöm',
      ro: 'mulțumesc',
      bg: 'благодаря',
      hr: 'hvala',
      sk: 'ďakujem',
      sl: 'hvala',
      et: 'aitäh',
      lv: 'paldies',
      lt: 'ačiū',
      mt: 'grazzi',
      el: 'ευχαριστώ',
      he: 'תודה',
      th: 'ขอบคุณ',
      vi: 'cảm ơn',
      id: 'terima kasih',
      ms: 'terima kasih',
      fil: 'salamat',
      bn: 'ধন্যবাদ',
      ur: 'شکریہ',
      fa: 'متشکرم',
      am: 'አመሰግናለሁ',
      sw: 'asante',
      zu: 'ngiyabonga'
    }
  };

  const lowerText = text.toLowerCase().trim();
  
  // Check if we have a mock translation for this text
  if (mockTranslations[lowerText] && mockTranslations[lowerText][targetLanguage]) {
    return {
      translatedText: mockTranslations[lowerText][targetLanguage],
      detectedLanguage: 'en',
      confidence: 0.9,
    };
  }

  // For other text, return a simple mock translation
  return {
    translatedText: `[${targetLanguage.toUpperCase()}] ${text}`,
    detectedLanguage: 'en',
    confidence: 0.8,
  };
};

// Export the main translation function (use mock if Google Translate is not configured)
const isUsingMock = GOOGLE_TRANSLATE_API_KEY === 'YOUR_GOOGLE_TRANSLATE_API_KEY' || GOOGLE_TRANSLATE_API_KEY === '' || !GOOGLE_TRANSLATE_API_KEY;
console.log('Translation Service Debug:', {
  hasKey: !!GOOGLE_TRANSLATE_API_KEY,
  keyLength: GOOGLE_TRANSLATE_API_KEY?.length,
  isUsingMock,
  service: 'Google Translate'
});

export const translateMessage = isUsingMock ? mockTranslateText : translateText;

// Test function to verify Google Translate is working
export const testTranslation = async () => {
  console.log('Testing Google Translate...');
  try {
    const result = await translateMessage('Hello, how are you?', 'es', 'en');
    console.log('Translation test result:', result);
    return result;
  } catch (error) {
    console.error('Translation test failed:', error);
    return null;
  }
}; 