import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { polarOAuthService } from '@/src/services/polarOAuthService';
import { ConsentModal } from './ConsentModal';
import { useRouter } from 'expo-router';
import { polarLinkScreenStyles as styles } from '@/src/styles/components/polarLinkScreenStyles';

interface PolarLinkScreenProps {
  userId: string;
  onLinkSuccess?: () => void;
  onSkip?: () => void;
}

export const PolarLinkScreen: React.FC<PolarLinkScreenProps> = ({ 
  userId, 
  onLinkSuccess,
  onSkip 
}) => {
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const router = useRouter();

  const handleLinkPolar = async () => {
    try {
      setLoading(true);
      console.log('🔗 Starting Polar OAuth flow...');

      const result = await polarOAuthService.startOAuthFlow(userId);

      if (result) {
        console.log('✅ Polar account linked successfully!');
        // Show consent modal instead of alert
        setShowConsentModal(true);
      } else {
        console.log('❌ Polar linking failed or was cancelled');
        Alert.alert(
          'Link Cancelled',
          'You can link your Polar account later from the settings.',
          [
            {
              text: 'OK',
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error linking Polar account:', error);
      Alert.alert(
        'Error',
        'Failed to link Polar account. Please try again later.',
        [
          {
            text: 'OK',
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConsentAccept = async () => {
    try {
      setConsentLoading(true);
      await polarOAuthService.setConsentGiven(userId);
      setShowConsentModal(false);
      
      Alert.alert(
        'Success!',
        'Your Polar account has been linked and you have consented to data usage.',
        [
          {
            text: 'OK',
            onPress: () => {
              onLinkSuccess?.();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting consent:', error);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleConsentDecline = async () => {
    try {
      setConsentLoading(true);
      await polarOAuthService.disconnectPolarAccount(userId);
      setShowConsentModal(false);
      
      Alert.alert(
        'Consent Declined',
        'Your Polar account has been disconnected. You can link it again anytime.',
        [
          {
            text: 'OK',
          }
        ]
      );
    } catch (error) {
      console.error('Error declining consent:', error);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Polar Linking?',
      'You can link your Polar Flow account later from the settings to unlock real-time heart rate tracking.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            onSkip?.();
          },
          style: 'destructive',
        }
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>🏃‍♂️</Text>
            <Text style={styles.title}>Link Your Polar Account</Text>
            <Text style={styles.subtitle}>
              Connect your Polar Flow account to unlock real-time heart rate tracking and enhance your workout experience.
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Why Link?</Text>
            
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>📊</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Real-Time Heart Rate</Text>
                <Text style={styles.benefitDescription}>
                  Track your heart rate live during workouts
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🎯</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Training Zones</Text>
                <Text style={styles.benefitDescription}>
                  Optimize your workouts with heart rate zone tracking
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>📈</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Workout History</Text>
                <Text style={styles.benefitDescription}>
                  Access your complete workout history from Polar Flow
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🐉</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Unlock Creatures</Text>
                <Text style={styles.benefitDescription}>
                  Capture more creatures with accurate heart rate data
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLinkPolar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Link Polar Account</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </Pressable>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              You'll be redirected to Polar Flow to authorize QuestFit.
              Your credentials are secure and never stored by QuestFit.
            </Text>
          </View>
        </View>
      </View>

      {/* Consent Modal */}
      <ConsentModal
        visible={showConsentModal}
        onConsent={handleConsentAccept}
        onDecline={handleConsentDecline}
        loading={consentLoading}
      />
    </>
  );
};
