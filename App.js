// LiveChatApp/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all screens
import HomeScreen from './screens/HomeScreen';
import InitialChoiceScreen from './screens/InitialChoiceScreen';
import ChatScreen from './screens/ChatScreen';
import LoginScreen from './screens/LoginScreen';
import AgentChatListScreen from './screens/AgentChatListScreen';
import AgentChatScreen from './screens/AgentChatScreen';
import AdminScreen from './screens/AdminScreen';

const Stack = createStackNavigator();

// Define Customer Stack
const CustomerStack = () => (
  <Stack.Navigator initialRouteName="ChatScreen">
    <Stack.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{
        headerTitle: 'Live Chat Support',
        headerStyle: { backgroundColor: '#3498db' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  </Stack.Navigator>
);

// Define Agent Stack
const AgentStack = () => (
  <Stack.Navigator initialRouteName="Login">
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AgentChatList"
      component={AgentChatListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AgentChat"
      component={AgentChatScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

// Main App component with full navigation
export default function App() {
  return (
    <NavigationContainer
      onReady={() => {
        console.log('LiveChatApp: Navigation container is ready');
      }}
      onStateChange={(state) => {
        console.log('LiveChatApp: Navigation state changed:', state);
      }}
    >
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InitialChoice"
          component={InitialChoiceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CustomerStack"
          component={CustomerStack}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AgentStack"
          component={AgentStack}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}