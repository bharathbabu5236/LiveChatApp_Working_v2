# Agora Voice Calling Setup Guide - Web Version

## 🚀 Setup Instructions

### 1. Update Agora App ID
1. Open `config/agoraConfigWeb.js`
2. Replace `YOUR_AGORA_APP_ID_HERE` with your actual Agora App ID
3. Your App ID can be found in the [Agora Console](https://console.agora.io/)

### 2. Voice Call Features

#### ✅ Implemented Features:
- **Web-native voice calling** using Agora Web SDK
- **Real-time audio communication**
- **Modern web UI** with CSS animations
- **Microphone permissions handling**
- **Mute/unmute functionality**
- **Volume control**
- **Call duration tracking**
- **Connection quality indicators**
- **Automatic channel management**
- **Device selection** (microphone switching)

#### 🎯 How It Works:
1. **Start a chat** with a department (Doctor or Payments)
2. **Voice call button** appears in the chat header (phone icon)
3. **Click the phone button** to start a voice call
4. **Browser will request microphone permission**
5. **Both parties** will be connected to the same voice channel
6. **Use controls** to mute/unmute and adjust volume during the call
7. **End call** using the red button

### 3. File Structure (Web Version)
```
config/
  └── agoraConfigWeb.js       # Web-specific Agora configuration
services/
  └── agoraWebVoiceService.js # Web voice calling service
components/
  ├── VoiceCallWebModal.js    # Web voice call UI component
  └── VoiceCallModal.css      # Styling for voice call interface
screens/
  └── ChatScreen.js           # Updated with web voice call integration
```

### 4. Web-Specific Features
- **Browser microphone access** with proper permission handling
- **CSS-based modern UI** with animations and responsive design
- **Web audio APIs** for optimal audio quality
- **Device enumeration** for microphone selection
- **Browser compatibility** checks and fallbacks

### 5. Required Browser Permissions
The voice calling will request:
- **Microphone access** (required for voice calls)
- Automatically handled by the browser and Agora Web SDK
- User-friendly permission request flow

### 6. Testing Your Web Voice Call
1. **Open your web app** in a modern browser (Chrome, Firefox, Safari, Edge)
2. **Start a chat** in one browser tab/window
3. **Open another browser tab** as a different user or agent
4. **Join the same chat** 
5. **Click the phone icon** in either chat to start voice call
6. **Allow microphone access** when prompted
7. **Both users** should be connected for voice communication

### 7. Browser Compatibility
- ✅ **Chrome** (recommended)
- ✅ **Firefox**
- ✅ **Safari** (macOS/iOS)
- ✅ **Edge**
- ⚠️ **Mobile browsers** (limited functionality)

### 8. Production Considerations
- **Token-based authentication**: Currently using `null` token for testing
- **HTTPS required**: Voice calling requires secure connection in production
- **Error handling**: Comprehensive error handling implemented
- **Call quality**: Optimized audio settings for clear communication
- **Responsive design**: Works on desktop and mobile browsers

### 🔧 Advanced Features
- **Connection quality monitoring**
- **Network statistics tracking**
- **Device switching during calls**
- **Volume level control**
- **Call duration display**
- **Visual connection indicators**

### 📋 Next Steps for Production
1. **Set up Agora token server** for security
2. **Enable HTTPS** on your web server
3. **Add video calling capability** 
4. **Implement call recording features**
5. **Add call history/logging**
6. **Optimize for mobile web browsers**

### 🔧 Troubleshooting
1. **No voice call button**: Ensure chat is connected and you have an agent assigned
2. **Microphone permission denied**: Check browser settings and allow microphone access
3. **Can't hear audio**: Check volume settings and audio output device
4. **Connection issues**: Verify your Agora App ID is correct and HTTPS is enabled
5. **Browser compatibility**: Use a modern browser (Chrome recommended)

### ⚠️ Important Notes
- **Replace the App ID** in `config/agoraConfigWeb.js` before testing
- **HTTPS is required** for microphone access in production
- **Both users need to be in the same chat** for voice calls to work
- **Microphone permissions** are required and will be requested automatically
- **Web-only implementation** - no mobile app dependencies

## 🎨 Customization
The voice call interface can be customized by modifying:
- `VoiceCallModal.css` - Visual styling and animations
- `VoiceCallWebModal.js` - Functionality and behavior
- `agoraWebVoiceService.js` - Audio settings and service configuration
