import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler'; // Add this line at the very top
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
