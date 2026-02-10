/**
 * ULTRA SIMPLE TTS Test
 * 
 * This is the absolute simplest approach - just play TTS through speakers
 * and let the user manage their microphone.
 */

export const testSimpleTTS = async (text: string, language: string = 'en-US'): Promise<boolean> => {
    try {
        console.log(`🔊 ULTRA SIMPLE TTS: "${text}" in ${language}`);

        // Check if speech synthesis is available
        if (!('speechSynthesis' in window)) {
            alert('❌ Speech synthesis not supported in this browser');
            return false;
        }

        // Show user instructions
        const proceed = confirm(
            `🎤 Simple TTS for Voice Call\n\n` +
            `I'll speak: "${text}"\n\n` +
            `For the remote user to hear it:\n` +
            `✓ Keep your microphone unmuted in the call\n` +
            `✓ Turn up your speaker volume\n` +
            `✓ Your microphone will pick up the speakers\n\n` +
            `Ready?`
        );

        if (!proceed) {
            return false;
        }

        // Create and configure speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.8;  // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find best voice
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => 
            v.lang.toLowerCase().startsWith(language.toLowerCase())
        ) || voices[0];
        
        if (voice) {
            utterance.voice = voice;
            console.log(`🗣️ Using voice: ${voice.name}`);
        }

        // Speak it
        speechSynthesis.cancel(); // Clear any pending speech
        speechSynthesis.speak(utterance);

        console.log('✅ Simple TTS played - should be heard through microphone');
        return true;

    } catch (error) {
        console.error('❌ Simple TTS failed:', error);
        alert(`TTS Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
};

export default testSimpleTTS;
