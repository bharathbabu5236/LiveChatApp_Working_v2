// LiveChatApp/screens/AdminScreen.js
import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AdminScreen = () => {
    const navigation = useNavigation();

    const handleBackToHome = () => {
        navigation.goBack();
    };

    const handleAgentPress = () => {
        console.log('Agent Login pressed, navigating to AgentStack');
        navigation.navigate('AgentStack');
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <MaterialIcons name="people" size={40} color="#3498db" />
                    <Text style={styles.statNumber}>24</Text>
                    <Text style={styles.statLabel}>Active Users</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="chat" size={40} color="#2ecc71" />
                    <Text style={styles.statNumber}>156</Text>
                    <Text style={styles.statLabel}>Total Chats</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="support-agent" size={40} color="#f39c12" />
                    <Text style={styles.statNumber}>8</Text>
                    <Text style={styles.statLabel}>Online Agents</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="schedule" size={40} color="#e74c3c" />
                    <Text style={styles.statNumber}>2.3s</Text>
                    <Text style={styles.statLabel}>Avg Response</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton}>
                    <MaterialIcons name="settings" size={24} color="white" />
                    <Text style={styles.actionButtonText}>System Settings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                    <MaterialIcons name="people-alt" size={24} color="white" />
                    <Text style={styles.actionButtonText}>Manage Agents</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, styles.agentButton]} onPress={handleAgentPress}>
                    <MaterialIcons name="support-agent" size={24} color="white" />
                    <Text style={styles.actionButtonText}>Agent Login</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                    <MaterialIcons name="analytics" size={24} color="white" />
                    <Text style={styles.actionButtonText}>Analytics</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                    <MaterialIcons name="security" size={24} color="white" />
                    <Text style={styles.actionButtonText}>Security</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: 'white',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    backButton: {
        padding: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    statCard: {
        backgroundColor: 'white',
        width: (width - 60) / 2,
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 10,
    },
    statLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 5,
        textAlign: 'center',
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    actionButton: {
        backgroundColor: '#3498db',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    agentButton: {
        backgroundColor: '#e74c3c', // Red color for agent button
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 15,
    },
});

export default AdminScreen; 