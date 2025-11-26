import axios from 'axios';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Enable web browser to be dismissed when OAuth flow completes
WebBrowser.maybeCompleteAuthSession();

const POLAR_CLIENT_ID = '9aa62ce1-7014-42ad-9bcf-e234b764623f';
const POLAR_CLIENT_SECRET = '9415171f-cb3f-40b3-89f3-1ac5eab68974';
const POLAR_AUTH_URL = 'https://flow.polar.com/oauth2/authorization';
const POLAR_TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';

// Helper function to convert string to base64 (React Native compatible)
function base64Encode(str: string): string {
  // Use the built-in btoa for web, or a polyfill for React Native
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // For React Native, we'll use a simple base64 encoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : Number.NaN;
    const c = i < str.length ? str.charCodeAt(i++) : Number.NaN;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += chars.charAt(isNaN(b) ? 64 : (bitmap >> 6) & 63);
    result += chars.charAt(isNaN(c) ? 64 : bitmap & 63);
  }
  
  return result;
}

// Create the Basic Auth header for token exchange
const BASIC_AUTH = base64Encode(`${POLAR_CLIENT_ID}:${POLAR_CLIENT_SECRET}`);

interface PolarTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  x_user_id?: string;
}

export interface PolarUserTokens {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  polarUserId?: string;
  linkedAt: Date;
}

class PolarOAuthService {
  /**
   * Check if user has Polar access token stored in Firebase
   */
  async hasAccessToken(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return !!(data?.polarAccessToken);
      }
      return false;
    } catch (error) {
      console.error('Error checking Polar access token:', error);
      return false;
    }
  }

  /**
   * Get the user's Polar access token from Firebase
   */
  async getAccessToken(userId: string): Promise<string | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return data?.polarAccessToken || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting Polar access token:', error);
      return null;
    }
  }

  /**
   * Generate the authorization URL for the OAuth flow
   * Returns the URL to redirect the user to
   */
  getAuthorizationUrl(): string {
    // Determine redirect URI based on platform
    let redirectUri = 'https://questfit-pi.vercel.app';
    
    if (Platform.OS !== 'web') {
      // On mobile, use the Vercel function that redirects to the app scheme
      redirectUri = 'https://questfit-pi.vercel.app/api/auth/mobile-callback';
    }
    
    // Request all available scopes including webhook management
    const scope = "accesslink.read_all";
    const url = `${POLAR_AUTH_URL}?response_type=code&client_id=${POLAR_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    return url;
  }

  /**
   * Handle the full Polar login flow
   * 1. Start OAuth
   * 2. Get Tokens & Polar User ID
   * 3. Check if user exists in Firebase
   * 4. Create/Update user document
   * 5. Return user info
   */
  async login(): Promise<{ user: any; isNewUser: boolean; tokens?: PolarUserTokens } | null> {
    try {
      // Determine redirect URI based on platform for the token exchange
      let redirectUri = 'https://questfit-pi.vercel.app';
      if (Platform.OS !== 'web') {
        redirectUri = 'https://questfit-pi.vercel.app/api/auth/mobile-callback';
      }

      const authUrl = this.getAuthorizationUrl();
      
      // Open browser for OAuth
      // On mobile, we expect the redirect to come back to questfit://oauth/polar
      // The second argument is the deep link that the browser will redirect to
      const deepLink = Platform.OS === 'web' ? redirectUri : 'questfit://oauth/polar';
      const result = await WebBrowser.openAuthSessionAsync(authUrl, deepLink);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          // Exchange code for tokens
          const tokens = await this.exchangeCodeForToken(code);
          
          if (tokens && tokens.polarUserId) {
            const polarUserId = tokens.polarUserId.toString(); // Ensure string
            const userDocRef = doc(db, 'users', polarUserId);
            const userDoc = await getDoc(userDocRef);
            
            let isNewUser = false;

            if (!userDoc.exists()) {
              // DO NOT create user yet. Wait for consent.
              isNewUser = true;
              return {
                user: {
                  uid: polarUserId,
                  displayName: 'Polar Athlete',
                },
                isNewUser,
                tokens // Return tokens so we can create user later
              };
            } else {
              // Check if consent was previously given
              const userData = userDoc.data();
              if (!userData.consent) {
                // User exists but hasn't consented yet (e.g. reloaded page during consent flow)
                // In this case, we treat them as new again to force consent
                isNewUser = true;
                return {
                  user: {
                    uid: polarUserId,
                    displayName: userData.displayName || 'Polar Athlete',
                  },
                  isNewUser,
                  tokens
                };
              }

              // Update existing user tokens
              await updateDoc(userDocRef, {
                polarAccessToken: tokens.accessToken,
                polarUserId: polarUserId,
                lastLogin: new Date(),
              });
            }

            return {
              user: {
                uid: polarUserId,
                displayName: userDoc.exists() ? userDoc.data().displayName : 'Polar Athlete',
              },
              isNewUser
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error during Polar login:', error);
      throw error;
    }
  }

  /**
   * Create user document after consent is given
   */
  async createUserAfterConsent(userId: string, tokens: PolarUserTokens): Promise<{ displayName: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      // Initial creation with default name
      await setDoc(userDocRef, {
        userId: userId,
        polarUserId: userId,
        polarAccessToken: tokens.accessToken,
        username: `Polar User ${userId.slice(-4)}`,
        displayName: 'Polar Athlete',
        level: 1,
        xp: 0,
        totalWorkouts: 0,
        totalCalories: 0,
        totalDistance: 0,
        capturedCreatures: [],
        achievements: [],
        createdAt: new Date(),
        consent: true,
        consentGivenAt: new Date(),
      });

      console.log('✅ User created with consent:', userId);

      // Register with Polar AccessLink and get real name
      const displayName = await this.registerPolarUser(tokens.accessToken, userId, userId);
      
      return { displayName: displayName || 'Polar Athlete' };
    } catch (error) {
      console.error('Error creating user after consent:', error);
      throw error;
    }
  }

  /**
   * Start the OAuth flow using expo-web-browser
   * This handles the entire OAuth flow and returns the tokens
   */
  async startOAuthFlow(userId: string): Promise<PolarUserTokens | null> {
    try {
      // Determine redirect URI based on platform
      let redirectUri = 'https://questfit-pi.vercel.app';
      if (Platform.OS !== 'web') {
        redirectUri = 'https://questfit-pi.vercel.app/api/auth/mobile-callback';
      }

      const authUrl = this.getAuthorizationUrl();
      
    //   console.log('Opening Polar authorization URL...');
    //   console.log('Auth URL:', authUrl);
      
      // Open the browser for OAuth with automatic code capture
      const deepLink = Platform.OS === 'web' ? redirectUri : 'questfit://oauth/polar';
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        deepLink
      );

      //console.log('OAuth result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the URL to get the code
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          //console.log('Received authorization code');
          
          // Exchange the code for an access token
          const tokens = await this.exchangeCodeForToken(code);
          
          if (tokens) {
            // Store the tokens in Firebase
            await this.storeTokens(userId, tokens);
            return tokens;
          }
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled OAuth flow');
      }

      return null;
    } catch (error) {
      console.error('Error during OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Exchange the authorization code for an access token
   */
  async exchangeCodeForToken(code: string): Promise<PolarUserTokens | null> {
    try {
    //   console.log('Exchanging authorization code for access token...');
      console.log('Authorization Code:', code);
      
      // Determine redirect URI based on platform for the token exchange
      // This MUST match what was sent in the authorization request
      let redirectUri = 'https://questfit-pi.vercel.app';
      if (Platform.OS !== 'web') {
        redirectUri = 'https://questfit-pi.vercel.app/api/auth/mobile-callback';
      }

      const response = await axios.post<PolarTokenResponse>(
        POLAR_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${BASIC_AUTH}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json;charset=UTF-8',
          },
        }
      );

      const data = response.data;
      
      if (data.access_token) {
        // console.log('Successfully obtained access token');
        console.log('Access Token:', data.access_token);
        console.log('Polar User ID:', data.x_user_id);
        
        return {
          accessToken: data.access_token,
          tokenType: data.token_type,
          expiresIn: data.expires_in,
          polarUserId: data.x_user_id,
          linkedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Response data:', error.response?.data);
        console.error('❌ Response status:', error.response?.status);
        console.error('❌ Request URL:', POLAR_TOKEN_URL);
        console.error('❌ Request headers:', error.config?.headers);
        console.error('❌ Request body:', error.config?.data);
      }
      throw error;
    }
  }

  /**
   * Register user with Polar AccessLink API via backend
   */
  async registerPolarUser(accessToken: string, userId: string, polarUserId: string): Promise<string | null> {
    try {
      const response = await axios.post(
        'https://questfit-pi.vercel.app/api/polar/register-user',
        {
          accessToken: accessToken,
          userId: userId,
        }
      );

      console.log('✅ Successfully registered with Polar AccessLink');
      
      // Fetch and store physical data, return the display name
      return await this.getUserPhysicalData(accessToken, polarUserId, userId);
    } catch (error) {
      console.error('❌ Registration error:', error);
      return null;
    }
  }

  /**
   * Get user physical data from Polar AccessLink API and store in Firebase
   */
  async getUserPhysicalData(accessToken: string, polarUserId: string, userId: string): Promise<string | null> {
    try {
      console.log('Fetching user physical data from Polar via API...');
      
      // Call our backend API endpoint to avoid CORS issues
      const response = await axios.post(
        'https://questfit-pi.vercel.app/api/polar/user-data',
        {
          accessToken: accessToken,
          polarUserId: polarUserId,
        }
      );

      console.log('✅ User physical data received:', response.data);
      
      const physicalData = response.data;
      const weight = physicalData.weight || null;
      const age = physicalData.birthdate ? this.calculateAge(physicalData.birthdate) : null;
      const gender = physicalData.gender || null;
      
      // Extract and combine names for display name
      const firstName = physicalData['first-name'] || '';
      const lastName = physicalData['last-name'] || '';
      const displayName = `${firstName} ${lastName}`.trim();

      console.log('Parsed data - Weight:', weight, 'Age:', age, 'Gender:', gender);
      if (displayName) console.log('Parsed name:', displayName);
      
      // Store in users collection
      const userRef = doc(db, 'users', userId);
      const updates: any = {
        weight: weight,
        age: age,
        gender: gender,
        updatedAt: new Date(),
      };

      // Only update display name if we got a valid one from Polar
      if (displayName) {
        updates.displayName = displayName;
      }

      await updateDoc(userRef, updates);

      console.log('✅ User physical data and profile stored successfully in Firebase');
      return displayName || null;
      
    } catch (error) {
      console.error('❌ Error fetching user physical data:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Status:', error.response?.status);
        console.error('Response headers:', error.response?.headers);
        console.error('Request URL:', error.config?.url);
      }
      return null;
    }
  }

  /**
   * Calculate age from birthdate
   */
  calculateAge(birthdate: string): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Store the Polar tokens in Firebase
   */
  async storeTokens(userId: string, tokens: PolarUserTokens): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        polarAccessToken: tokens.accessToken,
        polarUserId: tokens.polarUserId,
      });

      console.log('Polar Access Token:', tokens.accessToken);
      console.log('Polar User ID:', tokens.polarUserId);
      
      // Register user with Polar AccessLink API
      // Moved to setConsentGiven to ensure we don't fetch data before consent
      /* if (tokens.polarUserId) {
        await this.registerPolarUser(tokens.accessToken, userId, tokens.polarUserId);
      } */
    } catch (error) {
      console.error('Error storing Polar tokens:', error);
      throw error;
    }
  }

  /**
   * Set consent flag to true in Firebase
   */
  async setConsentGiven(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Fetch tokens to register with Polar now that we have consent
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.polarAccessToken && data.polarUserId) {
          console.log('Consent given, registering with Polar AccessLink...');
          await this.registerPolarUser(data.polarAccessToken, userId, data.polarUserId);
        }
      }

      await updateDoc(userRef, {
        consent: true,
        consentGivenAt: new Date(),
      });
      console.log('✅ Consent flag set to true for user:', userId);
    } catch (error) {
      console.error('Error setting consent:', error);
      throw error;
    }
  }

  /**
   * Check if user has given consent
   */
  async hasConsentGiven(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data()?.consent === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Disconnect Polar account - Delete from Polar API and remove from Firebase
   */
  async disconnectPolarAccount(userId: string): Promise<void> {
    try {
      // Get the access token and polar user ID
      const userDoc = await getDoc(doc(db, 'users', userId));
      const accessToken = userDoc.exists() ? userDoc.data()?.polarAccessToken : null;
      const polarUserId = userDoc.exists() ? userDoc.data()?.polarUserId : null;

      // Delete user from Polar AccessLink API via backend
      if (accessToken && polarUserId) {
        try {
          await axios.delete(
            'https://questfit-pi.vercel.app/api/polar/disconnect-user',
            {
              data: {
                accessToken: accessToken,
                polarUserId: polarUserId,
              },
            }
          );
          console.log('User deleted from Polar AccessLink');
        } catch (error) {
          console.error('Error deleting from Polar API (continuing with local removal):', error);
        }
      }

      // Remove all Polar data from Firebase and set consent to false
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        polarAccessToken: null,
        polarUserId: null,
        weight: null,
        age: null,
        gender: null,
        consent: false, // Reset consent when disconnecting
      });

      console.log('Polar account disconnected and consent revoked');
    } catch (error) {
      console.error('Error disconnecting Polar account:', error);
      throw error;
    }
  }

  /**
   * Remove the Polar tokens from Firebase (unlink account)
   * @deprecated Use disconnectPolarAccount instead
   */
  async unlinkAccount(userId: string): Promise<void> {
    return this.disconnectPolarAccount(userId);
  }
}

export const polarOAuthService = new PolarOAuthService();
export default polarOAuthService;
