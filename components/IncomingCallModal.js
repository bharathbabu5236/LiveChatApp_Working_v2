// IncomingCallModal.js - Component to show incoming call notification
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const IncomingCallModal = ({ 
    visible, 
    callerName, 
    onAccept, 
    onReject,
    onMissed 
}) => {
    const [isRinging, setIsRinging] = useState(true);

    useEffect(() => {
        if (visible) {
            setIsRinging(true);
            // Auto-miss call after 30 seconds
            const timeout = setTimeout(() => {
                if (onMissed) {
                    onMissed();
                }
            }, 30000);

            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const handleAccept = () => {
        setIsRinging(false);
        if (onAccept) {
            onAccept();
        }
    };

    const handleReject = () => {
        setIsRinging(false);
        if (onReject) {
            onReject();
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleReject}
        >
            <View style={styles.overlay}>
                <View style={styles.callContainer}>
                    {/* Caller Avatar */}
                    <View style={[styles.avatar, isRinging && styles.ringingAvatar]}>
                        <MaterialIcons name="person" size={60} color="#ffffff" />
                    </View>

                    {/* Caller Information */}
                    <Text style={styles.callerName}>{callerName}</Text>
                    <Text style={styles.callStatus}>Incoming voice call...</Text>

                    {/* Call Actions */}
                    <View style={styles.actionContainer}>
                        {/* Reject Button */}
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.rejectButton]} 
                            onPress={handleReject}
                            accessibilityLabel="Reject call"
                        >
                            <MaterialIcons name="call-end" size={32} color="#ffffff" />
                        </TouchableOpacity>

                        {/* Accept Button */}
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.acceptButton]} 
                            onPress={handleAccept}
                            accessibilityLabel="Accept call"
                        >
                            <MaterialIcons name="phone" size={32} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    {/* Additional Info */}
                    <Text style={styles.infoText}>
                        Voice call via HealthBuddy
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    callContainer: {
        backgroundColor: '#2c3e50',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        width: '100%',
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    ringingAvatar: {
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    callerName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
    },
    callStatus: {
        fontSize: 16,
        color: '#bdc3c7',
        textAlign: 'center',
        marginBottom: 40,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 200,
        marginBottom: 30,
    },
    actionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    acceptButton: {
        backgroundColor: '#27ae60',
    },
    rejectButton: {
        backgroundColor: '#e74c3c',
    },
    infoText: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default IncomingCallModal;
