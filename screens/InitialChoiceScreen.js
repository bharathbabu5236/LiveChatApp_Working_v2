// LiveChatApp/screens/InitialChoiceScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, authReadyPromise } from '../firebaseConfig'; // Import auth and authReadyPromise
import { onAuthStateChanged } from 'firebase/auth';

const InitialChoiceScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuthAndNavigate = async () => {
            await authReadyPromise; // Ensure Firebase auth is initialized
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    // If a user is logged in, check if it's an agent
                    // A simple check: if user has an email and is not anonymous, assume agent.
                    // For more robust solutions, use Firebase Custom Claims for roles.
                    if (user.email && !user.isAnonymous) {
                        navigation.replace('AgentStack'); // Redirect to agent flow
                    } else {
                        // If it's an anonymous user or not an agent, show the choice screen
                        setLoading(false);
                    }
                } else {
                    // No user logged in, show choices
                    setLoading(false);
                }
            });
            return unsubscribe; // Clean up listener
        };

        checkAuthAndNavigate();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Initializing application...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Live Best Services</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('CustomerStack')}
            >
                <Text style={styles.buttonText}>I'm a Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.agentButton]}
                onPress={() => navigation.navigate('AgentStack')}
            >
                <Text style={styles.buttonText}>I'm an Agent</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#2c3e50',
    },
    button: {
        backgroundColor: '#2ecc71', // Green for customer
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    agentButton: {
        backgroundColor: '#3498db', // Blue for agent
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default InitialChoiceScreen;