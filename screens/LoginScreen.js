// LiveChatApp/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, signInWithEmailAndPassword } from '../firebaseConfig'; // Import auth and signInWithEmailAndPassword
import { onAuthStateChanged } from 'firebase/auth';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email && !user.isAnonymous) { // If an agent is already logged in
                navigation.replace('AgentChatList'); // Navigate to AgentChatList
            }
        });
        return unsubscribe; // Unsubscribe on component unmount
    }, []);

    const handleLogin = async () => {
        setError(''); // Clear previous errors
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("Agent logged in successfully!");
            // Navigation handled by onAuthStateChanged listener
        } catch (err) {
            console.error("Login failed:", err.message);
            setError(err.message);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Agent Login</Text>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
    },
    card: {
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 30,
    },
    errorText: {
        color: 'red',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#3498db',
        width: '100%',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
