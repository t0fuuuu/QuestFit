# Polar OAuth Implementation Summary

## ✅ Implementation Complete

I've successfully implemented the Polar Flow OAuth integration for QuestFit. Here's what was created:

## 🔑 Redirect URL Answer

**For your Polar Flow application settings, use this redirect URL:**

### Mobile (iOS/Android):
```
questfit://oauth/polar
```

This is a **deep link** that redirects back to your mobile app. The `questfit` scheme is already configured in your `app.json` file.

### How it works:
1. User clicks "Link Polar Account"
2. App opens browser with authorization URL: `https://flow.polar.com/oauth2/authorization?response_type=code&client_id=9aa62ce1-7014-42ad-9bcf-e234b764623f&redirect_uri=questfit://oauth/polar`
3. User authorizes on Polar Flow website
4. Polar redirects to: `questfit://oauth/polar?code=<authorization-code>`
5. Your app captures this deep link
6. App exchanges code for access token
7. Token is stored in Firebase

---

## 📁 Files Created/Modified

### New Files:
1. **`src/services/polarOAuthService.ts`** - Handles OAuth flow, token exchange, and Firebase storage
2. **`components/auth/PolarLinkScreen.tsx`** - UI screen prompting users to link their Polar account
3. **`app/oauth/polar.tsx`** - Deep link callback route handler
4. **`POLAR_OAUTH_SETUP.md`** - Complete documentation

### Modified Files:
1. **`src/services/polarApi.ts`** - Added `initializeForUser()` method to load tokens from Firebase
2. **`components/auth/SignInScreen.tsx`** - Added check for Polar token after sign-in

---

## 🔄 User Flow

1. **Sign In** → User signs in with test account
2. **Check Token** → App checks if user has Polar access token in Firebase
3. **Prompt if Missing** → If no token, show `PolarLinkScreen`
4. **Link Account** → User clicks "Link Polar Account"
5. **OAuth Flow** → Browser opens, user authorizes
6. **Token Exchange** → App exchanges code for access token
7. **Store Token** → Token saved to Firebase user document
8. **Continue** → User proceeds to app

---

## 🔒 Token Exchange Details

The authorization code is exchanged for an access token using:

```bash
POST https://polarremote.com/v2/oauth2/token
Authorization: Basic OWFhNjJjZTEtNzAxNC00MmFkLTliY2YtZTIzNGI3NjQ2MjNmOjk0MTUxNzFmLWNiM2YtNDBiMy04OWYzLTFhYzVlYWI2ODk3NA==
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<authorization-code>
```

The token is then stored in Firebase:
```typescript
{
  polarAccessToken: string,
  polarTokenType: string,
  polarExpiresIn: number,
  polarUserId: string,
  polarLinkedAt: Date
}
```

---

## 🎯 Next Steps

### To Test:
1. Run the app: `npm start`
2. Sign in as a test user
3. You'll see the Polar linking screen
4. Click "Link Polar Account"
5. Authorize on Polar Flow
6. Token will be saved

### To Use Polar API:
```typescript
import polarApiService from '@/src/services/polarApi';

// Initialize with user's token
await polarApiService.initializeForUser(userId);

// Make API calls
const workouts = await polarApiService.getWorkouts();
const heartRate = await polarApiService.getHeartRateData(exerciseId);
```

---

## ⚠️ Important Notes

1. **Security**: The client secret is currently in the code. Consider moving token exchange to a backend/serverless function for production.

2. **Dependencies**: All required packages are already installed:
   - `expo-web-browser` ✅
   - `expo-linking` ✅
   - `buffer` ✅
   - `axios` ✅

3. **Deep Link**: The `questfit://` scheme is configured in `app.json`. After changing schemes, you must rebuild the app.

4. **Skip Option**: Users can skip linking and do it later from settings (you'll need to add this feature).

---

## 📱 Polar Application Configuration

In your Polar Flow Developer Portal, configure:

**Redirect URI**: `questfit://oauth/polar`

**Scopes**: (Select what data you need)
- `user.read` - User profile data
- `training.read` - Workout/training data
- `exercise.read` - Exercise details

---

## 🐛 Troubleshooting

### OAuth flow cancelled
- User closed browser without authorizing
- Try again or skip for now

### Token exchange failed
- Check network connection
- Verify client credentials
- Check Polar API status

### Deep link not working
- Rebuild app after scheme changes
- Verify scheme in `app.json`
- Check iOS Info.plist URL types

---

## 📚 Additional Documentation

See `POLAR_OAUTH_SETUP.md` for comprehensive documentation including:
- Detailed OAuth flow
- Security considerations
- API usage examples
- Configuration details
- Testing procedures
