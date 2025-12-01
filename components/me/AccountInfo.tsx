import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import { xpStyles as styles } from '@/src/styles';

interface AccountInfoProps {
  user: any;
}

export const AccountInfo: React.FC<AccountInfoProps> = ({ user }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Info</Text>
      <Text style={styles.infoText}>User ID: {user?.uid.slice(0, 20)}...</Text>
      <Text style={styles.infoText}>
        Status: {user ? '✅ Logged In' : '❌ Not Logged In'}
      </Text>
      <Text style={styles.infoText}>
        Username: {user?.displayName || 'N/A'}
      </Text>
    </View>
  );
};
