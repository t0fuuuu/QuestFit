import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/Themed';

interface ConsentModalProps {
  visible: boolean;
  onConsent?: () => void;
  onDecline?: () => void;
  loading?: boolean;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  visible,
  onConsent,
  onDecline,
  loading = false,
}) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
    setScrolledToBottom(isAtBottom);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDecline}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Data Consent Agreement</Text>
          <Text style={styles.headerSubtitle}>
            Please read and agree to continue with Polar integration
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>1</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Purpose</Text>
                <Text style={styles.sectionText}>
                  By connecting your Polar account to this service, you agree that your activity
                  and wellness data may be used to provide feedback, monitoring, and support
                  within this platform.
                </Text>
              </View>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>2</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Who Can View Your Data</Text>
                <Text style={styles.sectionText}>
                  You understand and agree that your data can be accessed and viewed only by
                  authorised instructors and administrators within this system. These people are
                  approved by the organisation running this service.
                </Text>
              </View>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>3</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>How Your Data Will Be Handled</Text>
                <Text style={styles.sectionText}>
                  We will only use your data for purposes related to training, performance
                  monitoring, safety, or support. Your data will not be shared outside of this
                  platform or with anyone not authorised.
                </Text>
              </View>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>4</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Your Control</Text>
                <Text style={styles.sectionText}>
                  You may withdraw your consent at any time by disconnecting your Polar account.
                  If you withdraw consent, instructors and administrators will no longer receive
                  new data from your account.
                </Text>
              </View>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>5</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Security</Text>
                <Text style={styles.sectionText}>
                  We take reasonable steps to protect your data from unauthorised access and
                  limit access strictly to approved instructors and administrators.
                </Text>
              </View>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionNumber}>6</Text>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Your Responsibility</Text>
                <Text style={styles.sectionText}>
                  By agreeing, you confirm that the information you provide is accurate and that
                  you understand how your data will be used inside this service.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Scroll Indicator */}
        {!scrolledToBottom && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll to view full consent ↓</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, styles.declineButton, loading && styles.buttonDisabled]}
            onPress={onDecline}
            disabled={loading}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.acceptButton,
              (!scrolledToBottom || loading) && styles.buttonDisabled,
            ]}
            onPress={onConsent}
            disabled={!scrolledToBottom || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptButtonText}>I Agree & Accept</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
    flexShrink: 0,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  scrollIndicator: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  declineButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#444444',
  },
  declineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
