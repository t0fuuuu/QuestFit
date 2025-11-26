import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyAuthChange } from '@/src/hooks/useAuth';
import { polarOAuthService } from '@/src/services/polarOAuthService';
import { ConsentModal } from './ConsentModal';

interface SignInScreenProps {
  onSignInSuccess?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ uid: string; displayName: string } | null>(null);

  const handlePolarLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔵 Starting Polar Login');
      
      const result = await polarOAuthService.login();
      
      if (result) {
        const { user, isNewUser } = result;
        
        if (isNewUser) {
          // Show consent modal for new users
          setPendingUser(user);
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
      await polarOAuthService.setConsentGiven(pendingUser.uid);
      setShowConsentModal(false);
      await completeLogin(pendingUser);
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
      await polarOAuthService.disconnectPolarAccount(pendingUser.uid);
      setShowConsentModal(false);
      setPendingUser(null);
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
        <Text style={styles.termsText}>
          By signing in, you agree to our Terms of Service
        </Text>
      </View>

      {/* Consent Modal */}
      <ConsentModal
        visible={showConsentModal}
        onConsent={handleConsentAccept}
        onDecline={handleConsentDecline}
        loading={consentLoading}
      />
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
});
