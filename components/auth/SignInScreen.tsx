import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { notifyAuthChange } from '@/src/hooks/useAuth';
import { polarOAuthService, PolarUserTokens } from '@/src/services/polarOAuthService';
import { ConsentModal } from './ConsentModal';
import { TERMS_OF_SERVICE } from '@/constants/TermsOfService';

interface SignInScreenProps {
  onSignInSuccess?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ uid: string; displayName: string } | null>(null);
  const [pendingTokens, setPendingTokens] = useState<PolarUserTokens | null>(null);

  useEffect(() => {
    // Warm up the browser to make the login popup appear faster
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const handlePolarLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔵 Starting Polar Login');
      
      const result = await polarOAuthService.login();
      
      if (result) {
        const { user, isNewUser, tokens } = result;
        
        if (isNewUser) {
          // Show consent modal for new users
          setPendingUser(user);
          if (tokens) {
            setPendingTokens(tokens);
          }
          setShowConsentModal(true);
        } else {
          // Existing user, log in directly
          await completeLogin(user);
        }
      } else {
        // Login cancelled or failed silently
        setLoading(false);
      }
    } catch (err: any) {
      console.error('🔴 Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in with Polar');
      setLoading(false);
    }
  };

  const completeLogin = async (user: { uid: string; displayName: string }) => {
    try {
      // Store user info locally
      await AsyncStorage.setItem('USER_ID', user.uid);
      await AsyncStorage.setItem('USER_NAME', user.displayName);
      
      // Legacy keys for backward compatibility if needed
      await AsyncStorage.setItem('CURRENT_TEST_USER', user.displayName);
      await AsyncStorage.setItem('CURRENT_TEST_USER_UID', user.uid);
      
      console.log('✅ Signed in as:', user.displayName, '(UID:', user.uid, ')');
      
      // Notify auth change listeners
      notifyAuthChange();
      onSignInSuccess?.();
    } catch (err) {
      console.error('Error completing login:', err);
      setError('Failed to save login session');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAccept = async () => {
    if (!pendingUser) return;
    
    try {
      setConsentLoading(true);
      let finalUser = pendingUser;
      
      if (pendingTokens) {
        // New user flow: Create user and register with Polar
        // This now returns the updated display name from Polar
        const { displayName } = await polarOAuthService.createUserAfterConsent(pendingUser.uid, pendingTokens);
        finalUser = { ...pendingUser, displayName };
      } else {
        // Fallback/Legacy flow: User exists but needs consent flag update
        await polarOAuthService.setConsentGiven(pendingUser.uid);
      }
      
      setShowConsentModal(false);
      await completeLogin(finalUser);
    } catch (error) {
      console.error('Error recording consent:', error);
      Alert.alert('Error', 'Failed to record consent. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleConsentDecline = async () => {
    if (!pendingUser) return;
    
    try {
      setConsentLoading(true);
      
      // If we have pending tokens, it means the user wasn't created yet.
      // So we just clear the state.
      if (pendingTokens) {
        console.log('Consent declined for new user. No data was saved.');
      } else {
        // Legacy: If user existed, disconnect them
        await polarOAuthService.disconnectPolarAccount(pendingUser.uid);
      }
      
      setShowConsentModal(false);
      setPendingUser(null);
      setPendingTokens(null);
      setLoading(false);
      Alert.alert('Declined', 'Login cancelled. You must accept the terms to use QuestFit.');
    } catch (error) {
      console.error('Error declining consent:', error);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
      setConsentLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>QuestFit</Text>
          <Text style={styles.tagline}>Transform Your Fitness Into An Adventure</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🏃</Text>
            <Text style={styles.featureText}>Track workouts from your Polar Watch</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🎯</Text>
            <Text style={styles.featureText}>Catch virtual creatures</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>⭐</Text>
            <Text style={styles.featureText}>Level up and unlock rewards</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🏆</Text>
            <Text style={styles.featureText}>Earn achievements</Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Sign In Button */}
        <Pressable
          style={[styles.signInButton, loading && styles.signInButtonDisabled]}
          onPress={handlePolarLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.polarIcon}>❄️</Text>
              <Text style={styles.signInText}>Log in with Polar Flow</Text>
            </>
          )}
        </Pressable>

        {/* Terms */}
        <Pressable onPress={() => setShowTosModal(true)}>
          <Text style={styles.termsText}>
            By signing in, you agree to our <Text style={styles.termsLink}>Terms of Service</Text>
          </Text>
        </Pressable>
      </View>

      {/* Consent Modal */}
      <ConsentModal
        visible={showConsentModal}
        onConsent={handleConsentAccept}
        onDecline={handleConsentDecline}
        loading={consentLoading}
      />

      {/* TOS Modal */}
      <Modal
        visible={showTosModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTosModal(false)}
      >
        <View style={styles.tosContainer}>
          <View style={styles.tosHeader}>
            <Text style={styles.tosTitle}>Terms of Service</Text>
            <Pressable onPress={() => setShowTosModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.tosContent}>
            <Text style={styles.tosText}>{TERMS_OF_SERVICE}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  featuresContainer: {
    marginVertical: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#007AFF', // Polar Blue
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  polarIcon: {
    fontSize: 20,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  termsLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  tosContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  tosContent: {
    flex: 1,
    padding: 20,
  },
  tosText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 40,
  },
});
