import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import { xpStyles as styles } from '@/src/styles';

interface ActionButtonsProps {
  show: boolean;
  onShowConsent: () => void;
  onDeleteAccount: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  show,
  onShowConsent,
  onDeleteAccount,
}) => {
  if (!show) return null;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.showConsentButton}
        onPress={onShowConsent}
      >
        <Text style={styles.showConsentButtonText}>📋 Show Consent</Text>
      </Pressable>

      <Pressable
        style={styles.disconnectPolarButton}
        onPress={onDeleteAccount}
      >
        <Text style={styles.disconnectPolarButtonText}>🗑️ Delete Account</Text>
      </Pressable>
    </View>
  );
};
