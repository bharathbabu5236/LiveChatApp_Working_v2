// LiveChatApp/components/SpeakableText.js
import React from 'react';
import { Text, View } from 'react-native';
import { useHoverToSpeak } from '../hooks/useHoverToSpeak';

const SpeakableText = ({ 
    children, 
    text, 
    style, 
    component: Component = Text,
    hoverOptions = {},
    ...props 
}) => {
    const textToSpeak = text || (typeof children === 'string' ? children : '');
    const hoverRef = useHoverToSpeak(textToSpeak, hoverOptions);

    // For web platform, we can use refs directly
    if (typeof window !== 'undefined') {
        return (
            <Component
                ref={hoverRef}
                style={[style, { position: 'relative' }]}
                {...props}
            >
                {children}
            </Component>
        );
    }

    // For React Native (mobile), hover doesn't apply, so return normal component
    return (
        <Component style={style} {...props}>
            {children}
        </Component>
    );
};

export default SpeakableText;
