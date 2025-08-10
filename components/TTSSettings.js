// LiveChatApp/components/TTSSettings.js
import React, { useState } from 'react';
import {
    View,
    Text,
    Switch,
    Slider,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTextToSpeech } from '../context/TextToSpeechContext';
import { useTranslation } from '../context/TranslationContext';

const TTSSettings = ({ buttonStyle, iconColor = '#2c3e50', iconSize = 24, iconName = 'settings' }) => {
    const [showModal, setShowModal] = useState(false);
    const {
        isEnabled,
        speechRate,
        speechPitch,
        speechVolume,
        toggleEnabled,
        setSpeechRate,
        setSpeechPitch,
        setSpeechVolume,
        speak,
        stopSpeech,
        isReading,
        initializeAudioPermissions
    } = useTextToSpeech();
    
    const { t } = useTranslation();

    const testSpeech = () => {
        // Initialize audio permissions first
        initializeAudioPermissions();
        
        setTimeout(() => {
            const testText = t('welcome_title') || 'Hello! This is a test of the text-to-speech feature.';
            speak(testText);
        }, 500);
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.ttsButton, buttonStyle]}
                onPress={() => setShowModal(true)}
            >
                <MaterialIcons 
                    name={iconName} 
                    size={iconSize} 
                    color={iconColor} 
                />
            </TouchableOpacity>

            <Modal
                visible={showModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('text_to_speech_settings') || 'Text-to-Speech Settings'}</Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#2c3e50" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.settingsContent}>
                            {/* Enable/Disable TTS */}
                            <View style={styles.settingRow}>
                                <View style={styles.settingLabel}>
                                    <MaterialIcons name="volume-up" size={20} color="#2c3e50" />
                                    <Text style={styles.settingText}>{t('enable_text_to_speech') || 'Enable Text-to-Speech'}</Text>
                                </View>
                                <Switch
                                    value={isEnabled}
                                    onValueChange={toggleEnabled}
                                    trackColor={{ false: '#767577', true: '#3498db' }}
                                    thumbColor={isEnabled ? '#2980b9' : '#f4f3f4'}
                                />
                            </View>

                            {isEnabled && (
                                <>
                                    {/* Speech Rate */}
                                    <View style={styles.settingSection}>
                                        <View style={styles.settingLabelWithValue}>
                                            <View style={styles.settingLabel}>
                                                <MaterialIcons name="speed" size={20} color="#2c3e50" />
                                                <Text style={styles.settingText}>{t('speech_rate') || 'Speech Rate'}</Text>
                                            </View>
                                            <Text style={styles.settingValue}>{speechRate.toFixed(1)}x</Text>
                                        </View>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={0.5}
                                            maximumValue={2.0}
                                            value={speechRate}
                                            onValueChange={setSpeechRate}
                                            step={0.1}
                                            minimumTrackTintColor="#3498db"
                                            maximumTrackTintColor="#bdc3c7"
                                            thumbTintColor="#2980b9"
                                        />
                                        <View style={styles.sliderLabels}>
                                            <Text style={styles.sliderLabel}>{t('slow') || 'Slow'}</Text>
                                            <Text style={styles.sliderLabel}>{t('fast') || 'Fast'}</Text>
                                        </View>
                                    </View>

                                    {/* Speech Pitch */}
                                    <View style={styles.settingSection}>
                                        <View style={styles.settingLabelWithValue}>
                                            <View style={styles.settingLabel}>
                                                <MaterialIcons name="tune" size={20} color="#2c3e50" />
                                                <Text style={styles.settingText}>{t('speech_pitch') || 'Speech Pitch'}</Text>
                                            </View>
                                            <Text style={styles.settingValue}>{speechPitch.toFixed(1)}</Text>
                                        </View>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={0.5}
                                            maximumValue={2.0}
                                            value={speechPitch}
                                            onValueChange={setSpeechPitch}
                                            step={0.1}
                                            minimumTrackTintColor="#3498db"
                                            maximumTrackTintColor="#bdc3c7"
                                            thumbTintColor="#2980b9"
                                        />
                                        <View style={styles.sliderLabels}>
                                            <Text style={styles.sliderLabel}>{t('low') || 'Low'}</Text>
                                            <Text style={styles.sliderLabel}>{t('high') || 'High'}</Text>
                                        </View>
                                    </View>

                                    {/* Speech Volume */}
                                    <View style={styles.settingSection}>
                                        <View style={styles.settingLabelWithValue}>
                                            <View style={styles.settingLabel}>
                                                <MaterialIcons name="volume-up" size={20} color="#2c3e50" />
                                                <Text style={styles.settingText}>{t('speech_volume') || 'Volume'}</Text>
                                            </View>
                                            <Text style={styles.settingValue}>{Math.round(speechVolume * 100)}%</Text>
                                        </View>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={0.1}
                                            maximumValue={1.0}
                                            value={speechVolume}
                                            onValueChange={setSpeechVolume}
                                            step={0.1}
                                            minimumTrackTintColor="#3498db"
                                            maximumTrackTintColor="#bdc3c7"
                                            thumbTintColor="#2980b9"
                                        />
                                        <View style={styles.sliderLabels}>
                                            <Text style={styles.sliderLabel}>{t('quiet') || 'Quiet'}</Text>
                                            <Text style={styles.sliderLabel}>{t('loud') || 'Loud'}</Text>
                                        </View>
                                    </View>

                                    {/* Test Speech */}
                                    <View style={styles.testSection}>
                                        <TouchableOpacity
                                            style={styles.testButton}
                                            onPress={testSpeech}
                                            disabled={isReading}
                                        >
                                            <MaterialIcons 
                                                name={isReading ? "stop" : "play-arrow"} 
                                                size={20} 
                                                color="white" 
                                            />
                                            <Text style={styles.testButtonText}>
                                                {isReading ? (t('stop_test') || 'Stop Test') : (t('test_speech') || 'Test Speech')}
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        {isReading && (
                                            <TouchableOpacity
                                                style={styles.stopButton}
                                                onPress={stopSpeech}
                                            >
                                                <MaterialIcons name="stop" size={20} color="#e74c3c" />
                                                <Text style={styles.stopButtonText}>{t('stop') || 'Stop'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Usage Instructions */}
                                    <View style={styles.instructionsSection}>
                                        <Text style={styles.instructionsTitle}>{t('how_to_use') || 'How to Use:'}</Text>
                                        <Text style={styles.instructionsText}>
                                            {t('hover_to_speak_instructions') || 'Hover your mouse over any text to hear it read aloud. Text will be spoken in your selected language.'}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    ttsButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    closeButton: {
        padding: 5,
    },
    settingsContent: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    settingSection: {
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    settingLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabelWithValue: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    settingText: {
        fontSize: 16,
        color: '#2c3e50',
        marginLeft: 10,
        fontWeight: '500',
    },
    settingValue: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '600',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    testSection: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    stopButtonText: {
        color: '#e74c3c',
        fontSize: 14,
        marginLeft: 4,
    },
    instructionsSection: {
        paddingVertical: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 15,
        marginTop: 10,
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 13,
        color: '#5a6c7d',
        lineHeight: 18,
    },
});

export default TTSSettings;
