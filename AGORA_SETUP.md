# Agora Voice & Video Calling Setup Guide - Web Version (TypeScript)

## 🚀 Setup Instructions

### 1. Update Agora App ID (TypeScript **TypeScript Safety Features:**
- ✅ Full type coverage for all Agora SDK methods
- ✅ Interface definitions for all props and callbacks  
- ✅ Compile-time error checking
- ✅ Enhanced IDE support with auto-completion

### 8. Dependencies and Installation. Open `config/agoraConfigWeb.ts` (now in TypeScript!)
2. Replace `YOUR_AGORA_APP_ID_HERE` with your actual Agora App ID from [Agora Console](https://console.agora.io/)
3. Ensure your Agora project has both **Voice Calling** and **Video Calling** enabled

```typescript
// config/agoraConfigWeb.ts
export const AGORA_CONFIG: AgoraConfig = {
    APP_ID: 'YOUR_ACTUAL_AGORA_APP_ID', // Replace with your App ID
    USE_TOKEN: false, // Set to true for production
    TOKEN: null,
    CHANNEL_PREFIX: 'healthcare_chat_',
    AUDIO_PROFILE: {
        sampleRate: 48000,
        stereo: false,
        bitrate: 128,
    }
};
```

### 2. TypeScript Conversion Complete! 🎉

All voice call components have been upgraded to TypeScript for better type safety:

- ✅ **`components/WorkingVoiceCallModal.tsx`** - React component with TypeScript
- ✅ **`services/workingVoiceCallService.ts`** - Main service with Agora SDK types
- ✅ **`services/directCallService.ts`** - Call management with interfaces
- ✅ **`config/agoraConfigWeb.ts`** - Configuration with type definitions

### 3. TypeScript Benefits for Healthcare Applications

**Enhanced Type Safety:**
```typescript
// Type-safe Agora SDK integration
import type { 
    IAgoraRTCClient, 
    IAgoraRTCRemoteUser, 
    ILocalVideoTrack,
    ILocalAudioTrack 
} from 'agora-rtc-sdk-ng';

interface CallStatus {
    isConnected: boolean;
    isLocalAudioMuted: boolean;
    isLocalVideoEnabled: boolean;
    connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
}
```

**Better Development Experience:**
- 🎯 **IntelliSense**: Auto-complete for all Agora SDK methods
- 🔍 **Error Detection**: Catch type errors before runtime
- 📚 **Documentation**: Inline docs for all interfaces
- 🛡️ **Reliability**: Healthcare-grade code safety

### 4. Voice & Video Call Features

#### ✅ Implemented Features:

**Voice Calling Features:**
- **Web-native voice calling** using Agora Web SDK
- **Real-time audio communication** with low latency
- **Microphone permissions handling** with user-friendly prompts
- **Mute/unmute functionality** during calls
- **Volume control** and audio level monitoring
- **Call duration tracking** with live timer
- **Connection quality indicators** and network stats
- **Automatic channel management** with unique room IDs
- **Device selection** (microphone switching)

**Video Calling Features:**
- **HD video calling** with camera support
- **Local video preview** for self-view
- **Remote video streaming** for participant view
- **Video toggle** (enable/disable during call)
- **Camera switching** (front/back camera)
- **Responsive video containers** with optimal sizing
- **Video quality optimization** (480p default, configurable)
- **Picture-in-picture layout** for dual video streams

**Shared Features:**
- **Modern web UI** with CSS animations and responsive design
- **Cross-browser compatibility** (Chrome, Firefox, Safari, Edge)
- **Error handling** with user-friendly messages
- **Permission management** for camera and microphone
- **Real-time status updates** and connection monitoring

#### 🎯 How It Works:
1. **Start a chat** with a department (Doctor or Payments)
2. **Voice call button** appears in the chat header (phone icon)
3. **Click the phone button** to start a voice call
4. **Browser will request microphone permission** 
5. **Both parties** will be connected to the same voice channel
6. **Enable video** by clicking the video camera button during the call
7. **Camera permission** will be requested when enabling video
8. **Use controls** to mute/unmute, toggle video, and switch cameras
9. **End call** using the red button

### 6. Video Call Controls

#### 📹 Video Features:
- **Video Toggle**: Enable/disable video during an active call
- **Local Preview**: See your own video feed before and during calls
- **Remote Video**: View the other participant's video stream
- **Camera Switch**: Toggle between front/back cameras (mobile/laptop)
- **Video Quality**: Automatic optimization based on network conditions
- **Layout Management**: Responsive containers that adjust to video presence

#### 🎮 Call Controls:
```typescript
// Available controls in the call interface (TypeScript):
- 🎤 Mute/Unmute microphone
- 📹 Enable/Disable video
- 🔄 Switch camera (front/back)
- 📞 End call
- 🔊 Volume control
```

### 7. File Structure (TypeScript Version)
```
config/
  └── agoraConfigWeb.ts          # TypeScript Agora configuration with interfaces
services/  
  ├── workingVoiceCallService.ts # Main Agora SDK service (TypeScript)
  └── directCallService.ts       # Call management service (TypeScript)
components/
  └── WorkingVoiceCallModal.tsx  # React voice/video UI component (TypeScript)
screens/
  └── ChatPopup.js              # Main chat with voice call integration
```

**TypeScript Safety Features:**
- ✅ Full type coverage for all Agora SDK methods
- ✅ Interface definitions for all props and callbacks  
- ✅ Compile-time error checking
- ✅ Enhanced IDE support with auto-completion
services/
  ├── agoraWebVoiceService.js    # Web voice calling service (alternative)
  └── workingVoiceCallService.js # Primary voice & video service (recommended)
components/
  ├── WorkingVoiceCallModal.js   # Main voice & video call UI component
  └── ChatPopup.js              # Chat interface with call integration
screens/
  └── ChatScreen.js             # Updated with voice & video call features
```

### 5. Core Implementation Files

#### 📋 Primary Service: `workingVoiceCallService.js`
```javascript
// Main service handling both voice and video calls
class WorkingVoiceCallService {
  // Voice call methods
  async startVoiceCall(channelName, userId)
  async enableMicrophone()
  async setMicrophoneMuted(muted)
  
  // Video call methods
  async enableVideo()
  async disableVideo() 
  async switchCamera()
  getLocalVideoTrack()
  getRemoteVideoTrack()
  
  // Call management
  async endVoiceCall()
  async cleanup()
}
```

#### 🎨 UI Component: `WorkingVoiceCallModal.js`
```javascript
// React component with full voice & video UI
const WorkingVoiceCallModal = ({
  visible,
  onClose, 
  currentUserId,
  targetUserId,
  targetUserName
}) => {
  // State management for call status, video, audio
  // Local and remote video refs
  // Call control handlers
  // Real-time status updates
}
```

### 6. Web-Specific Features
- **Browser microphone & camera access** with proper permission handling
- **CSS-based modern UI** with animations and responsive design
- **Web audio/video APIs** for optimal quality
- **Device enumeration** for microphone and camera selection
- **Browser compatibility** checks and fallbacks
- **Responsive video containers** that adapt to screen size
- **Real-time video element styling** with object-fit optimization

### 7. Required Browser Permissions
The voice & video calling will request:
- **Microphone access** (required for voice calls)
- **Camera access** (required when enabling video)
- Automatically handled by the browser and Agora Web SDK
- User-friendly permission request flow with guidance

### 8. Testing Your Web Voice & Video Call

#### 🔬 Basic Testing Steps:
1. **Open your web app** in a modern browser (Chrome recommended)
2. **Start a chat** in one browser tab/window
3. **Open another browser tab** as a different user or agent
4. **Join the same chat**
5. **Click the phone icon** in either chat to start voice call
6. **Allow microphone access** when prompted
7. **Both users** should be connected for voice communication

#### 📹 Video Testing Steps:
1. **Start a voice call** (follow steps above)
2. **Click the video camera button** in the call interface
3. **Allow camera access** when prompted by browser
4. **Verify local video preview** appears in your container
5. **Check remote video** appears in the other participant's view
6. **Test video controls**: toggle video on/off, switch camera
7. **Verify video quality** and proper container sizing

#### 🧪 Advanced Testing:
```bash
# Test different scenarios:
- Voice-only calls
- Video-enabled calls
- Camera switching during calls
- Mute/unmute during video calls
- Network quality changes
- Browser permission denial/recovery
```

### 9. Browser Compatibility

#### ✅ Fully Supported:
- **Chrome 70+** (recommended for best performance)
- **Firefox 75+** 
- **Safari 13+** (macOS/iOS)
- **Edge 79+** (Chromium-based)

#### ⚠️ Limited Support:
- **Mobile browsers** (video may have limitations)
- **Older browsers** (fallback to voice-only)

#### 📱 Mobile Browser Notes:
- iOS Safari: Video calling supported on iOS 13+
- Android Chrome: Full video support on Android 8+
- Mobile video quality automatically optimized

### 10. Video Quality & Performance

#### 📊 Video Quality Settings:
```javascript
// Default video configuration
const videoConfig = {
  encoderConfig: "480p_1",           // 640x480 resolution
  optimizationMode: "motion",        // Better for video calls
  facingMode: "user"                 // Front camera default
};

// Available quality options:
- 120p: 160x120 (low bandwidth)
- 240p: 320x240 (mobile optimized) 
- 480p: 640x480 (default, balanced)
- 720p: 1280x720 (high quality)
- 1080p: 1920x1080 (premium quality)
```

#### ⚡ Performance Optimization:
- **Adaptive bitrate**: Automatically adjusts based on network
- **Hardware acceleration**: Uses device GPU when available
- **Bandwidth management**: Optimizes for call quality
- **CPU usage**: Minimal impact on device performance

### 11. Production Considerations
#### 🔐 Security & Authentication:
- **Token-based authentication**: Currently using `null` token for testing
- **Channel encryption**: Enable for production environments
- **User authentication**: Integrate with your user management system
- **HTTPS required**: Voice & video calling requires secure connection

#### 🚀 Performance & Scaling:
- **Concurrent calls**: Agora supports thousands of simultaneous calls
- **Global infrastructure**: Low-latency servers worldwide
- **Auto-scaling**: Handles traffic spikes automatically
- **Analytics**: Built-in call quality and usage analytics

#### 🏥 Healthcare Considerations:
- **HIPAA compliance**: Configure for healthcare environments
- **Data retention**: Control call recording and storage
- **Privacy controls**: Ensure patient data protection
- **Audit logging**: Track call activities for compliance

### 12. Advanced Features

#### 🛠️ Call Management:
```javascript
// Advanced call features available
const callFeatures = {
  // Audio features
  audioLevelMonitoring: true,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  
  // Video features  
  beautificationFilters: false,    // Can be enabled
  virtualBackgrounds: false,       // Premium feature
  screenSharing: false,           // Can be implemented
  
  // Analytics
  networkQualityReporting: true,
  callQualityStats: true,
  connectionStateTracking: true
};
```

#### 📊 Real-time Monitoring:
- **Connection quality indicators**: Visual network status
- **Audio/video quality metrics**: Real-time performance stats
- **User presence detection**: Know when participants join/leave
- **Error tracking**: Comprehensive error reporting and recovery

### 13. API Integration

#### 🔗 Key Service Methods:

**Voice Call Management:**
```javascript
// Start a voice call
await workingVoiceCallService.startVoiceCall(channelName, userId);

// Manage audio
await workingVoiceCallService.enableMicrophone();
await workingVoiceCallService.setMicrophoneMuted(true/false);

// End call
await workingVoiceCallService.endVoiceCall();
```

**Video Call Management:**
```javascript
// Enable video during call
await workingVoiceCallService.enableVideo();

// Get video tracks for UI
const localVideo = workingVoiceCallService.getLocalVideoTrack();
const remoteVideo = workingVoiceCallService.getRemoteVideoTrack();

// Camera controls
await workingVoiceCallService.switchCamera();
await workingVoiceCallService.disableVideo();
```

**Event Handling:**
```javascript
// Set up event callbacks
workingVoiceCallService.onUserJoined = (user) => { /* handle */ };
workingVoiceCallService.onRemoteVideoAvailable = (videoTrack) => { /* handle */ };
workingVoiceCallService.onError = (error) => { /* handle */ };
```

### 14. 🔧 Advanced Configuration

#### Agora Client Settings:
```javascript
// config/agoraConfigWeb.js example
export const AGORA_CONFIG = {
  APP_ID: 'YOUR_AGORA_APP_ID_HERE',
  
  CLIENT_CONFIG: {
    mode: 'rtc',        // Real-time communication
    codec: 'vp8'        // Video codec (vp8/h264)
  },
  
  AUDIO_PROFILE: {
    encoderConfig: 'music_standard',
    microphoneId: undefined
  },
  
  VIDEO_PROFILE: {
    encoderConfig: '480p_1',
    optimizationMode: 'motion',
    facingMode: 'user'
  }
};
```

#### Video Container Styling:
```css
/* Responsive video containers */
.video-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 10px;
}

.local-video, .remote-video {
  flex: 1;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.local-video video, .remote-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 15. 📋 Next Steps for Production

#### 🚀 Essential Production Setup:
1. **Set up Agora token server** for security
   ```javascript
   // Token-based authentication
   const token = await generateAgoraToken(channelName, userId);
   await client.join(APP_ID, channelName, token, userId);
   ```

2. **Enable HTTPS** on your web server (required for camera/mic access)

3. **Configure video quality** based on your bandwidth requirements

4. **Implement call recording** features for healthcare compliance
   ```javascript
   // Start recording
   await agoraRecordingService.startRecording(channelName);
   ```

5. **Add call history/logging** for audit trails

6. **Optimize for mobile** web browsers

#### 🏥 Healthcare-Specific Features:
1. **HIPAA compliance** configuration
2. **Patient data encryption** 
3. **Call audit logging**
4. **Secure token generation**
5. **Data retention policies**

#### � Analytics & Monitoring:
1. **Call quality metrics** dashboard
2. **Usage analytics** and billing
3. **Error tracking** and debugging
4. **Performance monitoring**

### 16. �🔧 Troubleshooting

#### 🎤 Audio Issues:
| Problem | Solution |
|---------|----------|
| No voice call button | Ensure chat is connected and agent assigned |
| Microphone permission denied | Check browser settings, allow mic access |
| Can't hear audio | Check volume settings and audio output device |
| Echo or feedback | Use headphones or enable echo cancellation |

#### 📹 Video Issues:
| Problem | Solution |
|---------|----------|
| Camera permission denied | Allow camera access in browser settings |
| Video not showing | Check camera device selection and permissions |
| Poor video quality | Adjust video quality settings or check bandwidth |
| Video container sizing | Verify CSS styling and responsive design |
| Camera switching fails | Ensure multiple cameras available on device |

#### 🌐 Connection Issues:
| Problem | Solution |
|---------|----------|
| Connection failed | Verify Agora App ID is correct |
| HTTPS errors | Enable HTTPS for production deployment |
| Network quality poor | Check internet connection and bandwidth |
| Call dropping | Implement network quality monitoring |

#### 🛠️ Development Issues:
| Problem | Solution |
|---------|----------|
| Agora SDK not loading | Check SDK installation and imports |
| Console errors | Enable debug logging and check error messages |
| Browser compatibility | Use supported browser versions |
| Permission handling | Implement proper permission request flow |

### 17. ⚠️ Important Notes

#### 🔑 Security Requirements:
- **Replace the App ID** in `config/agoraConfigWeb.js` before testing
- **HTTPS is required** for microphone and camera access in production
- **Token authentication** recommended for production (currently using null tokens)
- **Channel encryption** should be enabled for sensitive communications

#### 👥 User Requirements:
- **Both users need to be in the same chat** for voice/video calls to work
- **Microphone permissions** are required and will be requested automatically
- **Camera permissions** needed only when enabling video features
- **Modern browser** required (Chrome recommended for best experience)

#### 🌐 Implementation Notes:
- **Web-only implementation** - no mobile app dependencies
- **Responsive design** works on desktop and mobile browsers
- **Real-time optimization** for live conversation scenarios
- **Fallback handling** for older browsers and limited devices

### 18. 🎨 Customization Options

#### 🎨 UI Customization:
The voice & video call interface can be customized by modifying:

```javascript
// Component styling
WorkingVoiceCallModal.js - Main UI component structure
// Add custom themes, colors, layouts

// Service configuration  
workingVoiceCallService.js - Audio/video settings and behavior
// Modify quality settings, error handling, features

// CSS styling
// Custom styles for video containers, buttons, animations
.videoContainer { /* Custom video layout */ }
.controlButton { /* Custom control styling */ }
```

#### ⚙️ Feature Customization:
```javascript
// Customize call features
const callConfig = {
  // Audio options
  enableNoiseSuppression: true,
  enableEchoCancellation: true,
  enableAutoGainControl: true,
  
  // Video options
  defaultVideoQuality: '480p',
  enableBeautification: false,
  enableVirtualBackground: false,
  
  // UI options
  showCallDuration: true,
  showConnectionQuality: true,
  enableCameraSwitching: true
};
```

#### 🎵 Audio/Video Quality Settings:
```javascript
// Audio quality presets
const audioProfiles = {
  voice: { encoderConfig: 'speech_low_quality' },
  music: { encoderConfig: 'music_standard' },
  hifi: { encoderConfig: 'music_high_quality' }
};

// Video quality presets  
const videoProfiles = {
  low: { encoderConfig: '240p' },
  medium: { encoderConfig: '480p' },
  high: { encoderConfig: '720p' },
  ultra: { encoderConfig: '1080p' }
};
```

---

## 🚀 Quick Start Checklist

### ✅ Pre-Development:
- [ ] Agora account created at [console.agora.io](https://console.agora.io/)
- [ ] App ID obtained and voice/video features enabled
- [ ] HTTPS setup for production (required for camera/mic access)
- [ ] TypeScript development environment ready

### ✅ Development Setup:
- [ ] Update `config/agoraConfigWeb.ts` with your App ID (TypeScript!)
- [ ] Test voice calling in two browser tabs
- [ ] Test video calling with camera permissions
- [ ] Verify all controls work (mute, video toggle, camera switch)
- [ ] TypeScript compilation successful with no type errors

### ✅ Production Ready:
- [ ] Token-based authentication implemented
- [ ] HTTPS enabled on web server
- [ ] Error handling and user feedback implemented
- [ ] Call quality monitoring added
- [ ] Cross-browser testing completed
- [ ] TypeScript build optimized for production

---

## 🎉 TypeScript Conversion Complete!

Your voice call system is now fully TypeScript-enabled:
- ✅ **Type-safe Agora SDK integration**
- ✅ **Healthcare-grade code reliability**  
- ✅ **Enhanced development experience**
- ✅ **Better error handling at compile time**

---

## 📞 Support & Resources

- **Agora Documentation**: [docs.agora.io](https://docs.agora.io/)
- **TypeScript Documentation**: [typescriptlang.org](https://www.typescriptlang.org/)
- **Web SDK Reference**: [docs.agora.io/web](https://docs.agora.io/web)
- **Community Support**: [stackoverflow.com/questions/tagged/agora](https://stackoverflow.com/questions/tagged/agora)
- **GitHub Issues**: Report implementation-specific issues in your project repository

*Last Updated: February 3, 2026 - TypeScript Conversion Complete*

---

**🎉 You now have a complete voice and video calling solution using Agora Web SDK with modern web technologies!**
