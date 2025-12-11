import React from 'react';
import { Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { liveStyles as styles } from '@/src/styles';
import { DeviceHeartRateCard } from '@/components/fitness/DeviceHeartRateCard';
import { ConnectedDeviceInfo } from '@/src/services/bluetoothTypes';

interface ConnectedDevicesListProps {
  connectedDevices: ConnectedDeviceInfo[];
  deviceHeartRates: Map<string, number | null>;
  deviceOwners: Record<string, string>;
  onDisconnect: (deviceId: string, deviceName?: string) => void;
  onDisconnectAll: () => void;
  aggregateHeartRate: number | null;
  currentZone?: number;
}

export const ConnectedDevicesList: React.FC<ConnectedDevicesListProps> = ({
  connectedDevices,
  deviceHeartRates,
  deviceOwners,
  onDisconnect,
  onDisconnectAll,
  aggregateHeartRate,
  currentZone,
}) => {
  if (connectedDevices.length === 0) return null;

  const getHeartRateZoneColor = (zone: number): string => {
    switch (zone) {
      case 1: return '#60A5FA'; // Light blue
      case 2: return '#34D399'; // Green
      case 3: return '#FBBF24'; // Yellow
      case 4: return '#F97316'; // Orange
      case 5: return '#EF4444'; // Red
      default: return '#9CA3AF'; // Gray
    }
  };

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={styles.sectionTitle}>
          Connected Devices ({connectedDevices.length})
        </Text>
        {connectedDevices.length > 1 && (
          <Pressable onPress={onDisconnectAll}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>
              Disconnect All
            </Text>
          </Pressable>
        )}
      </View>
      
      {connectedDevices.map((deviceInfo) => {
        // Try to find owner by device ID or by extracted ID from name
        let ownerName = deviceOwners[deviceInfo.device.id];
        
        if (!ownerName && deviceInfo.device.name) {
          const parts = deviceInfo.device.name.split(' ');
          const lastPart = parts[parts.length - 1];
          if (/^[0-9A-F]{8}$/i.test(lastPart)) {
            ownerName = deviceOwners[lastPart];
          }
        }

        return (
          <DeviceHeartRateCard
            key={deviceInfo.device.id}
            deviceInfo={deviceInfo}
            heartRate={deviceHeartRates.get(deviceInfo.device.id) || null}
            onDisconnect={() => onDisconnect(deviceInfo.device.id, deviceInfo.device.name || undefined)}
            compact={connectedDevices.length > 2}
            ownerName={ownerName}
          />
        );
      })}

      {/* Aggregate Heart Rate */}
      {connectedDevices.length > 1 && (
        <View style={[styles.heartRateSection, { marginTop: 12, backgroundColor: '#0F172A' }]}>
          <Text style={styles.heartRateLabel}>Team Average Heart Rate</Text>
          <View style={styles.heartRateDisplay}>
            <Text style={styles.heartRateValue}>
              {aggregateHeartRate || '--'}
            </Text>
            <Text style={styles.heartRateUnit}>bpm</Text>
            <Text style={styles.heartIcon}>👥❤️</Text>
          </View>
          {currentZone && (
            <View style={[styles.zoneIndicator, { backgroundColor: getHeartRateZoneColor(currentZone) }]}>
              <Text style={styles.zoneText}>Zone {currentZone}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

