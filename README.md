# Healthcare Live Chat Application with Voice/Video Calls

A comprehensive healthcare chat application with integrated voice and video calling functionality, built with React Native, Firebase, and Agora RTC SDK.

## 🚀 Features

### Chat System
- **Real-time messaging** with Firebase Firestore
- **Multi-language support** (20+ languages)
- **Department routing** (Doctor, Payments)
- **Agent assignment** and management
- **Translation services** for global healthcare

### Voice & Video Calls
- **HD voice calls** with Agora RTC SDK v4.24.2
- **Video calling** with camera controls
- **TypeScript implementation** for enhanced reliability
- **Healthcare-grade audio quality** (48kHz)
- **Cross-platform compatibility** (Web, Mobile)

### Healthcare-Specific
- **Patient data privacy** considerations
- **Multi-language patient support**
- **Department-based agent routing**
- **Secure authentication** with Firebase Auth

## 📁 Project Structure

```
LiveChatApp_Working_v2/
├── screens/
│   ├── ChatPopup.js              # Main chat interface with voice call integration
│   ├── HomeScreen.js             # Application home screen
│   ├── AdminScreen.js            # Administrative interface
│   └── AgentChatScreen.js        # Agent chat interface
├── components/
│   └── WorkingVoiceCallModal.tsx # Voice/video call UI component (TypeScript)
├── services/
│   ├── workingVoiceCallService.ts # Main Agora SDK service (TypeScript)
│   └── directCallService.ts      # Call management service (TypeScript)
├── config/
│   └── agoraConfigWeb.ts         # Agora configuration (TypeScript)
├── firebaseConfig.js             # Firebase setup
├── translationService.js         # Multi-language support
├── App.js                        # Main application entry
└── package.json                  # Dependencies
```

## 🛠️ Technology Stack

- **Frontend**: React Native 0.79.5 with Expo
- **Backend**: Firebase (Firestore, Authentication)
- **Voice/Video**: Agora RTC SDK v4.24.2
- **Languages**: JavaScript + TypeScript (voice components)
- **Translation**: Google Translate API integration
- **UI**: React Native Vector Icons, responsive design

## 🎯 TypeScript Conversion (Latest Update)

All voice call components have been converted to TypeScript for enhanced type safety:

- ✅ **`components/WorkingVoiceCallModal.tsx`** - React component with full prop typing
- ✅ **`services/workingVoiceCallService.ts`** - Agora SDK service with comprehensive interfaces
- ✅ **`services/directCallService.ts`** - Call management with type-safe service methods  
- ✅ **`config/agoraConfigWeb.ts`** - Configuration with complete type definitions

### Benefits
- 🛡️ **Type Safety**: Catch errors at compile time
- 📚 **Better Documentation**: Inline types and interfaces
- 🎯 **IntelliSense**: Enhanced code completion
- 🏥 **Healthcare Grade**: More reliable for medical applications

## 📋 Setup Instructions

### Prerequisites
- Node.js 16+ and npm/yarn
- React Native development environment
- Firebase project with Firestore enabled
- Agora.io account with App ID

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd LiveChatApp_Working_v2
   npm install
   ```

2. **Configure Firebase**:
   - Update `firebaseConfig.js` with your Firebase project credentials
   - Set up Firestore security rules

3. **Configure Agora**:
   - Update `config/agoraConfigWeb.ts` with your Agora App ID
   - Enable voice and video calling in Agora console

4. **Set Agent UIDs**:
   - Update `AGENT_DOCTOR_UID` and `AGENT_PAYMENTS_UID` in `ChatPopup.js`
   - Replace with actual Firebase Authentication UIDs

5. **Start the application**:
   ```bash
   npm start
   # or
   expo start
   ```

## 📖 Documentation

- **[Voice Call Implementation Guide](VOICE_CALL_IMPLEMENTATION_GUIDE.md)** - Complete setup and usage guide
- **[Agora Setup Guide](AGORA_SETUP.md)** - Agora-specific configuration and features

## 🔧 Configuration

### Agent Setup
Update agent UIDs in `screens/ChatPopup.js`:
```javascript
const AGENT_DOCTOR_UID = 'YOUR_ACTUAL_DOCTOR_UID';
const AGENT_PAYMENTS_UID = 'YOUR_ACTUAL_PAYMENTS_UID';
```

### Agora Configuration
Update your App ID in `config/agoraConfigWeb.ts`:
```typescript
export const AGORA_CONFIG: AgoraConfig = {
    APP_ID: 'YOUR_ACTUAL_AGORA_APP_ID',
    // ... other configurations
};
```

## 🚀 Usage

### Customer Flow
1. Open chat popup and select user type (Customer)
2. Provide name, phone, and language preference  
3. Select department (Doctor/Payments)
4. Chat with assigned agent
5. Click voice call button (orange phone icon) for voice/video calls

### Agent Flow
1. Select "I'm an Agent" from chat popup
2. Navigate to agent interface
3. View and respond to customer chats
4. Join voice/video calls when customers initiate them

## 🔐 Security & Privacy

- **Firebase Authentication** for secure user management
- **Firestore Security Rules** for data access control
- **HTTPS required** for production voice/video calls
- **Agora token authentication** recommended for production

## 🧪 Testing

- **Voice Calls**: Test in two browser tabs with different user IDs
- **Video Calls**: Verify camera permissions and video streams
- **Multi-language**: Test translation in different languages
- **Cross-platform**: Test on web and mobile devices

## 📱 Supported Platforms

- **Web**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS and Android via React Native
- **Desktop**: Electron wrapper support

## 🛠️ Development

### TypeScript Development
The voice call system uses TypeScript for better development experience:

```typescript
// Example: Type-safe service usage
import { WorkingVoiceCallService } from './services/workingVoiceCallService';

const service = new WorkingVoiceCallService();
const result: CallResult = await service.startCall(channelName);
```

### Adding New Features
1. Follow TypeScript patterns for voice call components
2. Update interfaces when modifying service methods
3. Maintain backward compatibility with existing JavaScript components

## 📈 Production Deployment

- [ ] Update all placeholder UIDs and App IDs
- [ ] Enable HTTPS for voice/video calls
- [ ] Configure Agora token authentication
- [ ] Set up monitoring and analytics
- [ ] Test on target devices and browsers

## 📞 Support

For technical support:
- Check the detailed documentation files
- Review console logs for debugging
- Test components individually
- Verify Firebase and Agora configurations

## 🔄 Version History

- **v2.0** (February 3, 2026) - TypeScript conversion of voice call components
- **v1.0** (February 2, 2026) - Initial release with voice/video calling

---

*Healthcare Live Chat Application - Built with ❤️ for better patient communication*
