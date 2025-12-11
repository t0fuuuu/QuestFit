import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useMultiDeviceWorkout } from '@/src/hooks/useMultiDeviceWorkout';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { BluetoothDevice } from '@/src/services/bluetoothTypes';
import { liveStyles as styles } from '@/src/styles';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/services/firebase';

// Components
import { MultiDeviceScanner } from '@/components/multi-device/MultiDeviceScanner';
import { ConnectedDevicesList } from '@/components/multi-device/ConnectedDevicesList';
import { MultiDeviceControls } from '@/components/multi-device/MultiDeviceControls';
import { GroupMetrics } from '@/components/multi-device/GroupMetrics';

export default function MultiDeviceLiveWorkoutScreen() {
  const colorScheme = useColorScheme();
  const {
    isScanning,
    availableDevices,
    connectedDevices,
    deviceHeartRates,
    workoutActive,
    workoutPaused,
    pauseReason,
    countdown,
    workoutMetrics,
    error,
    bluetoothEnabled,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    disconnectAll,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    checkBluetoothStatus,
  } = useMultiDeviceWorkout();
  const [deviceOwners, setDeviceOwners] = useState<Record<string, string>>({});

  useEffect(() => {
    checkBluetoothStatus();
  }, []);

  useEffect(() => {
    const fetchDeviceOwners = async () => {
      if (availableDevices.length === 0) return;

      console.log('🔍 Fetching owners for devices:', availableDevices.map(d => ({ id: d.id, name: d.name })));

      try {
        const deviceIds = availableDevices.map(d => d.id);
        const nameToIdMap: Record<string, string> = {};

        // Also extract IDs from names (e.g. "Polar Pacer E5C6EC25" -> "E5C6EC25")
        availableDevices.forEach(d => {
          if (d.name) {
            const parts = d.name.split(' ');
            const lastPart = parts[parts.length - 1];
            // Check if last part looks like a device ID (hex string, usually 8 chars)
            if (/^[0-9A-F]{8}$/i.test(lastPart)) {
               console.log(`   Extracted ID from name: ${lastPart} -> maps to device ID: ${d.id}`);
               nameToIdMap[lastPart] = d.id;
               if (!deviceIds.includes(lastPart)) {
                 deviceIds.push(lastPart);
               }
            }
          }
        });

        console.log('   Querying Firestore for IDs:', deviceIds);

        // Firestore 'in' query limit is 10
        const chunks = [];
        for (let i = 0; i < deviceIds.length; i += 10) {
          chunks.push(deviceIds.slice(i, i + 10));
        }

        const newOwners: Record<string, string> = {};

        for (const chunk of chunks) {
          console.log(`   Querying users where deviceID or deviceId is in:`, chunk);
          
          // Check 'deviceID' (new schema)
          const q1 = query(collection(db, 'users'), where('deviceID', 'in', chunk));
          const snap1 = await getDocs(q1);
          
          // Check 'deviceId' (old schema)
          const q2 = query(collection(db, 'users'), where('deviceId', 'in', chunk));
          const snap2 = await getDocs(q2);

          const processDoc = (doc: any) => {
            const data = doc.data();
            const id = data.deviceID || data.deviceId;
            console.log('   Found user doc:', doc.id, 'id:', id, 'name:', data.displayName);
            
            if (id && data.displayName) {
              // If direct match with device ID
              if (availableDevices.some(d => d.id === id)) {
                console.log(`   MATCH (Direct): ${id} -> ${data.displayName}`);
                newOwners[id] = data.displayName;
              }
              // If match with extracted ID from name
              if (nameToIdMap[id]) {
                console.log(`   MATCH (Extracted): ${id} (maps to ${nameToIdMap[id]}) -> ${data.displayName}`);
                newOwners[nameToIdMap[id]] = data.displayName;
              }
            }
          };

          snap1.forEach(processDoc);
          snap2.forEach(processDoc);
        }

        console.log('   Final newOwners map:', newOwners);
        setDeviceOwners(prev => ({ ...prev, ...newOwners }));
      } catch (error) {
        console.error('Error fetching device owners:', error);
      }
    };

    fetchDeviceOwners();
  }, [availableDevices.length]); // Re-run when new devices are found

  const handleScan = async () => {
    if (!bluetoothEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to scan for devices.');
      return;
    }
    await scanForDevices();
  };

  const handleConnect = async (device: BluetoothDevice) => {
    try {
      await connectToDevice(device);
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not connect to device. Please try again.');
    }
  };

  const handleDisconnectDevice = async (deviceId: string, deviceName?: string) => {
    Alert.alert(
      'Disconnect',
      `Disconnect from ${deviceName || 'this device'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectDevice(deviceId);
          },
        },
      ]
    );
  };

  const handleDisconnectAll = async () => {
    Alert.alert(
      'Disconnect All',
      'Are you sure you want to disconnect all devices?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect All',
          style: 'destructive',
          onPress: async () => {
            await disconnectAll();
            Alert.alert('Disconnected', 'All devices disconnected successfully');
          },
        },
      ]
    );
  };

  const handleStartWorkout = () => {
    startWorkout();
  };

  const handleEndWorkout = () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: () => {
            const metrics = endWorkout();
            if (metrics) {
              Alert.alert(
                'Workout Complete!',
                `Duration: ${Math.floor(metrics.duration / 60)}m ${metrics.duration % 60}s\n` +
                `Avg HR: ${metrics.averageHeartRate} bpm\n` +
                `Max HR: ${metrics.maxHeartRate} bpm\n` +
                `Calories: ${metrics.caloriesBurned} kcal`
              );
            }
          },
        },
      ]
    );
  };

  // Calculate aggregate heart rate from all devices
  const aggregateHeartRate = connectedDevices.length > 0 
    ? (() => {
        const validHRs = Array.from(deviceHeartRates.values()).filter((hr): hr is number => hr !== null && hr > 0);
        if (validHRs.length === 0) return null;
        return Math.round(validHRs.reduce((sum, hr) => sum + hr, 0) / validHRs.length);
      })()
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Instructor's Dashboard</Text>
        <Text style={styles.subtitle}>Connect multiple Polar watches for team tracking</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Connected Devices */}
      <ConnectedDevicesList
        connectedDevices={connectedDevices}
        deviceHeartRates={deviceHeartRates}
        deviceOwners={deviceOwners}
        onDisconnect={handleDisconnectDevice}
        onDisconnectAll={handleDisconnectAll}
        aggregateHeartRate={aggregateHeartRate}
        currentZone={workoutMetrics?.currentZone}
      />

      {/* Connection Status */}
      <MultiDeviceScanner
        isScanning={isScanning}
        bluetoothEnabled={bluetoothEnabled}
        availableDevices={availableDevices}
        connectedDevices={connectedDevices}
        deviceOwners={deviceOwners}
        onScan={handleScan}
        onConnect={handleConnect}
      />

      {/* Workout Controls */}
      <MultiDeviceControls
        workoutActive={workoutActive}
        workoutPaused={workoutPaused}
        pauseReason={pauseReason}
        hasConnectedDevices={connectedDevices.length > 0}
        onStart={handleStartWorkout}
        onPause={pauseWorkout}
        onResume={resumeWorkout}
        onEnd={handleEndWorkout}
      />

      {/* Workout Metrics */}
      {workoutActive && workoutMetrics && (
        <GroupMetrics
          duration={workoutMetrics.duration}
          averageHeartRate={workoutMetrics.averageHeartRate}
          maxHeartRate={workoutMetrics.maxHeartRate}
          caloriesBurned={workoutMetrics.caloriesBurned}
        />
      )}

      {/* Previous Workout Results */}
      {!workoutActive && workoutMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Workout Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              🏃 Duration: {Math.floor(workoutMetrics.duration / 60)} minutes {workoutMetrics.duration % 60} seconds
            </Text>
            <Text style={styles.summaryText}>
              ❤️ Average HR: {workoutMetrics.averageHeartRate} bpm
            </Text>
            <Text style={styles.summaryText}>
              📈 Max HR: {workoutMetrics.maxHeartRate} bpm
            </Text>
            <Text style={styles.summaryText}>
              📉 Min HR: {workoutMetrics.minHeartRate} bpm
            </Text>
            <Text style={styles.summaryText}>
              🔥 Calories Burned: {workoutMetrics.caloriesBurned} kcal
            </Text>
            <Text style={styles.summaryText}>
              🎯 Peak Zone: Zone {workoutMetrics.currentZone}
            </Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.instructionsTitle}>How to Use Multi-Device Mode:</Text>
        <Text style={styles.instructionText}>1. Make sure all Polar watches are on and nearby</Text>
        <Text style={styles.instructionText}>2. Tap "Scan for Polar Devices"</Text>
        <Text style={styles.instructionText}>3. Connect to each device one by one</Text>
        <Text style={styles.instructionText}>4. Start your workout to track all devices together</Text>
        <Text style={styles.instructionText}>5. Heart rates will update in real-time for all connected devices</Text>
        <Text style={styles.instructionText}>6. View team average and individual heart rates</Text>
      </View>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Starting workout...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
