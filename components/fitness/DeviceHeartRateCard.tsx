import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ConnectedDeviceInfo } from '@/src/services/bluetoothService';
import Colors from '@/constants/Colors';
import { deviceHeartRateCardStyles as styles } from '@/src/styles/components/deviceHeartRateCardStyles';

interface DeviceHeartRateCardProps {
  deviceInfo: ConnectedDeviceInfo;
  heartRate: number | null;
  onDisconnect: () => void;
  compact?: boolean;
}

export const DeviceHeartRateCard: React.FC<DeviceHeartRateCardProps> = ({
  deviceInfo,
  heartRate,
  onDisconnect,
  compact = false,
}) => {
  const getHeartRateColor = (hr: number | null): string => {
    if (!hr) return '#9CA3AF'; // Gray
    if (hr < 100) return '#60A5FA'; // Light blue
    if (hr < 120) return '#34D399'; // Green
    if (hr < 140) return '#FBBF24'; // Yellow
    if (hr < 160) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactDeviceName} numberOfLines={1}>
            {deviceInfo.device.name || 'Unknown Device'}
          </Text>
          <Pressable onPress={onDisconnect} style={styles.compactDisconnectButton}>
            <Text style={styles.compactDisconnectText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.compactHRContainer}>
          <Text style={[styles.compactHR, { color: getHeartRateColor(heartRate) }]}>
            {heartRate || '--'}
          </Text>
          <Text style={styles.compactBPM}>bpm</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.deviceIcon}>⌚</Text>
          <View>
            <Text style={styles.deviceName}>{deviceInfo.device.name || 'Unknown Device'}</Text>
            <Text style={styles.deviceId}>{deviceInfo.device.id.substring(0, 8)}...</Text>
          </View>
        </View>
        <Pressable onPress={onDisconnect} style={styles.disconnectButton}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </Pressable>
      </View>
      
      <View style={styles.hrSection}>
        <View style={styles.hrDisplay}>
          <Text style={[styles.hrValue, { color: getHeartRateColor(heartRate) }]}>
            {heartRate || '--'}
          </Text>
          <Text style={styles.hrUnit}>bpm</Text>
          <Text style={styles.heartIcon}>❤️</Text>
        </View>
        
        {deviceInfo.lastHeartRateTime && (
          <Text style={styles.lastUpdate}>
            Last update: {new Date(deviceInfo.lastHeartRateTime).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </View>
  );
};
