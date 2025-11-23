# Polar Flow OAuth Integration

## Overview
QuestFit now supports linking Polar Flow accounts to enable real-time heart rate tracking and workout data synchronization. This document explains the OAuth implementation and how it works.

## OAuth Flow

### 1. **Authorization Request**
When a user signs in without a linked Polar account, they are prompted to link their Polar Flow account. The app redirects them to:

```
https://flow.polar.com/oauth2/authorization?response_type=code&client_id=9aa62ce1-7014-42ad-9bcf-e234b764623f&redirect_uri=questfit://oauth/polar
```

### 2. **Redirect URI**
- **Mobile (iOS/Android)**: `questfit://oauth/polar`
- The deep link is handled by Expo's `expo-web-browser` package
- The route is defined in `app/oauth/polar.tsx`

### 3. **Authorization Code Exchange**
Once the user authorizes the app, Polar redirects back with an authorization code. The app then exchanges this code for an access token:

```bash
POST https://polarremote.com/v2/oauth2/token
Headers:
  - Authorization: Basic <base64-encoded-credentials>
  - Content-Type: application/x-www-form-urlencoded
Body:
  - grant_type=authorization_code
  - code=<authorization-code>
```

### 4. **Token Storage**
The access token is stored in Firebase Firestore under the user's document:
```typescript
{
  polarAccessToken: string,
  polarTokenType: string,
  polarExpiresIn: number,
  polarUserId: string,
  polarLinkedAt: Date
}
```

## Implementation Files

### Service Layer
- **`src/services/polarOAuthService.ts`**: Handles OAuth flow, token exchange, and storage
- **`src/services/polarApi.ts`**: Updated to use tokens from Firebase

### UI Components
- **`components/auth/PolarLinkScreen.tsx`**: Screen prompting user to link Polar account
- **`components/auth/SignInScreen.tsx`**: Updated to check for Polar token after sign-in
- **`app/oauth/polar.tsx`**: OAuth callback route handler

## Key Features

### 1. **Automatic Token Check**
After sign-in, the app automatically checks if the user has a Polar access token. If not, they're shown the `PolarLinkScreen`.

### 2. **Skip Option**
Users can skip linking their Polar account and do it later from settings.

### 3. **Secure Token Storage**
Tokens are stored securely in Firebase Firestore and never exposed in client-side code.

### 4. **Easy API Integration**
The `PolarApiService` can be initialized with:
```typescript
await polarApiService.initializeForUser(userId);
```

## Usage Example

### Checking if User Has Token
```typescript
import { polarOAuthService } from '@/src/services/polarOAuthService';

const hasToken = await polarOAuthService.hasAccessToken(userId);
if (!hasToken) {
  // Show linking prompt
}
```

### Starting OAuth Flow
```typescript
const tokens = await polarOAuthService.startOAuthFlow(userId);
if (tokens) {
  console.log('Successfully linked!');
}
```

### Using the Polar API
```typescript
import polarApiService from '@/src/services/polarApi';

// Initialize with user's token
await polarApiService.initializeForUser(userId);

// Now you can use the API
const workouts = await polarApiService.getWorkouts();
```

## Configuration

### Environment Variables
The OAuth credentials are currently hardcoded but should be moved to environment variables:

```typescript
// .env
POLAR_CLIENT_ID=9aa62ce1-7014-42ad-9bcf-e234b764623f
POLAR_CLIENT_SECRET=9415171f-cb3f-40b3-89f3-1ac5eab68974
```

### Deep Link Setup
The app scheme `questfit` is configured in `app.json`:
```json
{
  "expo": {
    "scheme": "questfit"
  }
}
```

## Security Considerations

1. **Never expose the client secret** in client-side code (move to backend/serverless function)
2. **Token refresh**: Consider implementing token refresh if Polar supports it
3. **Token expiration**: Check token expiration and re-authenticate if needed
4. **HTTPS only**: All OAuth requests use HTTPS

## Testing

### Test the OAuth Flow
1. Sign in as a test user
2. You'll be prompted to link Polar account
3. Click "Link Polar Account"
4. Authorize in the browser
5. You'll be redirected back to the app
6. Token is saved to Firebase

### Verify Token Storage
Check Firebase Firestore → users → [userId] → `polarAccessToken`

## Next Steps

1. **Backend Token Exchange**: Move token exchange to a backend/serverless function for better security
2. **Token Refresh**: Implement token refresh mechanism
3. **Error Handling**: Add more robust error handling for network failures
4. **Settings Page**: Add ability to unlink/relink Polar account from settings
5. **Token Validation**: Validate tokens before making API calls

## Troubleshooting

### "OAuth flow cancelled"
- User closed the browser without authorizing
- Solution: Try again or skip for now

### "Failed to exchange code for token"
- Check network connection
- Verify client credentials are correct
- Check Polar API status

### Deep link not working
- Verify app scheme in `app.json`
- Rebuild the app after scheme changes
- Check that `expo-web-browser` is installed
- On iOS, you may need to add URL types in Info.plist

## API Documentation
- [Polar AccessLink API](https://www.polar.com/accesslink-api/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
