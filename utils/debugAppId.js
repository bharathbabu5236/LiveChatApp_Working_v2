// Simple App ID Debug Test
import { AGORA_CONFIG } from '../config/agoraConfigWeb';

export const debugAppId = () => {
    console.log('=== APP ID DEBUG ===');
    console.log('AGORA_CONFIG object:', AGORA_CONFIG);
    console.log('APP_ID value:', AGORA_CONFIG?.APP_ID);
    console.log('APP_ID type:', typeof AGORA_CONFIG?.APP_ID);
    console.log('APP_ID length:', AGORA_CONFIG?.APP_ID?.length);
    
    if (AGORA_CONFIG?.APP_ID) {
        const appId = AGORA_CONFIG.APP_ID;
        console.log('Raw App ID:', JSON.stringify(appId));
        console.log('Trimmed:', JSON.stringify(appId.trim()));
        console.log('Has quotes?:', appId.includes('"') || appId.includes("'"));
        console.log('Hex pattern test:', /^[a-f0-9]{32}$/i.test(appId));
        
        // Character analysis
        for (let i = 0; i < appId.length; i++) {
            const char = appId[i];
            if (!/[a-f0-9]/i.test(char)) {
                console.log(`Invalid character at position ${i}: '${char}' (code: ${char.charCodeAt(0)})`);
            }
        }
    }
    console.log('===================');
};
