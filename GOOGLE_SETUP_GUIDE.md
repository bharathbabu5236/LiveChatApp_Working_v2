# Google Cloud Console Setup Guide

## 🎯 Quick Setup Instructions

### 1. Create Google Cloud Project
- Go to: https://console.cloud.google.com/
- Click "New Project"
- Enter project name: "Live-Translation-App"
- Click "Create"

### 2. Enable Translation API
- Navigate to: https://console.cloud.google.com/apis/library
- Search for: "Cloud Translation API"
- Click on "Cloud Translation API"
- Click "ENABLE"

### 3. Create API Key
- Go to: https://console.cloud.google.com/apis/credentials
- Click "CREATE CREDENTIALS"
- Select "API key"
- Copy the generated API key
- **IMPORTANT**: Restrict the API key for security

### 4. Restrict API Key (Security)
- Click on the pencil icon next to your API key
- Under "API restrictions":
  - Select "Restrict key"
  - Choose "Cloud Translation API"
- Under "Application restrictions" (optional):
  - Select "HTTP referrers (web sites)"
  - Add your domain: `https://yourdomain.com/*`
- Click "Save"

### 5. Configure in Your App

#### Option A: Environment Variable (Recommended)
Create a `.env` file in your project root:
```
GOOGLE_TRANSLATE_API_KEY=your-actual-api-key-here
```

#### Option B: Direct Configuration
Edit `/config/translationApiConfig.js`:
```javascript
googleTranslate: {
    apiKey: 'your-actual-api-key-here', // Replace this
    endpoint: 'https://translation.googleapis.com/language/translate/v2',
    enabled: true
}
```

### 6. Test Configuration
After setting up the API key:
1. Refresh your app
2. Open the Translation Debug Console
3. Click "Run Tests"
4. Look for: ✅ Translation API: Working

## 💰 Pricing Information
- **Free Tier**: $10 credit per month (~500,000 characters)
- **Paid**: $20 per million characters
- **Monthly limit**: You can set spending limits in Google Cloud Console

## 🔒 Security Best Practices
1. **Never commit API keys to code**
2. **Use environment variables**
3. **Restrict API key to specific APIs**
4. **Add domain restrictions for web apps**
5. **Monitor usage in Google Cloud Console**

## 🔗 Useful Links
- **Google Cloud Console**: https://console.cloud.google.com/
- **Translation API Docs**: https://cloud.google.com/translate/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator
- **API Usage Dashboard**: https://console.cloud.google.com/apis/api/translate.googleapis.com/usage

## ⚠️ Common Issues & Solutions

### "API key not valid"
- Check if Translation API is enabled
- Verify API key is copied correctly
- Check if API key restrictions allow your domain

### "Quota exceeded"
- Check usage in Google Cloud Console
- Verify billing account is active
- Consider upgrading if needed

### "Permission denied"
- Enable billing for the project
- Check if Translation API is enabled
- Verify API key has correct permissions
