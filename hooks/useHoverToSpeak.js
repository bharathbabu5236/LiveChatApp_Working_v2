// LiveChatApp/hooks/useHoverToSpeak.js
import { useRef, useEffect } from 'react';
import { useTextToSpeech } from '../context/TextToSpeechContext';

export const useHoverToSpeak = (text, options = {}) => {
    const elementRef = useRef(null);
    const { speak, stopSpeech, isEnabled } = useTextToSpeech();
    const hoverTimeoutRef = useRef(null);
    const isHoveringRef = useRef(false);

    const {
        delay = 500, // Delay before starting speech (ms)
        stopOnLeave = true, // Stop speech when mouse leaves
        cleanText = true, // Clean text before speaking
        enabled = true, // Local enable/disable for this element
    } = options;

    const cleanTextContent = (textContent) => {
        if (!cleanText || !textContent) return textContent;
        
        // Remove extra whitespace and normalize text
        return textContent
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
            .trim();
    };

    const handleMouseEnter = () => {
        if (!isEnabled || !enabled) return;

        isHoveringRef.current = true;
        
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        // Set a delay before speaking
        hoverTimeoutRef.current = setTimeout(() => {
            if (isHoveringRef.current) {
                const textToSpeak = text || elementRef.current?.textContent || elementRef.current?.innerText;
                if (textToSpeak) {
                    const cleanedText = cleanTextContent(textToSpeak);
                    speak(cleanedText, options);
                }
            }
        }, delay);
    };

    const handleMouseLeave = () => {
        isHoveringRef.current = false;
        
        // Clear timeout if mouse leaves before delay
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        // Stop speech if configured to do so
        if (stopOnLeave) {
            stopSpeech();
        }
    };

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Add visual indicators for hover-to-speak
        if (isEnabled && enabled) {
            element.style.cursor = 'pointer';
            element.style.transition = 'background-color 0.2s ease';
        }

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            
            // Clear timeout on cleanup
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [isEnabled, enabled, text, delay, stopOnLeave]);

    // Add hover effect styles
    useEffect(() => {
        const element = elementRef.current;
        if (!element || !isEnabled || !enabled) return;

        const handleMouseOver = () => {
            element.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
            element.style.borderRadius = '4px';
        };

        const handleMouseOut = () => {
            element.style.backgroundColor = 'transparent';
        };

        element.addEventListener('mouseover', handleMouseOver);
        element.addEventListener('mouseout', handleMouseOut);

        return () => {
            element.removeEventListener('mouseover', handleMouseOver);
            element.removeEventListener('mouseout', handleMouseOut);
        };
    }, [isEnabled, enabled]);

    return elementRef;
};

export default useHoverToSpeak;
