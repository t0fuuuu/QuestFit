import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { useLiveWorkout } from '@/src/hooks/useLiveWorkout';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Device } from 'react-native-ble-plx';
import { liveStyles as styles } from '@/src/styles';
import { useAuth } from '@/src/hooks/useAuth';
import workoutCompletionService from '@/src/services/workoutCompletionService';
import { CreatureUnlockModal } from '@/components/game/CreatureUnlockModal';
import { Creature } from '@/src/types/polar';

// Components
import { DeviceScanner } from '@/components/workout/DeviceScanner';
import { ActiveWorkout } from '@/components/workout/ActiveWorkout';
import { WorkoutControls } from '@/components/workout/WorkoutControls';
import { WorkoutMetrics } from '@/components/workout/WorkoutMetrics';
import { WorkoutTypeSelector, WorkoutType } from '@/components/workout/WorkoutTypeSelector';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';

export default function LiveWorkoutScreen() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockedCreatures, setUnlockedCreatures] = useState<Creature[]>([]);
  const [isProcessingWorkout, setIsProcessingWorkout] = useState(false);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('FITNESS');

  const {
    isScanning,
    availableDevices,
    connectedDevice,
    currentHeartRate,
    workoutActive,
    workoutPaused,
    pauseReason,
    countdown,
    workoutMetrics,
    error,
    bluetoothEnabled,
    scanForDevices,
    connectToDevice,
    disconnect,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    checkBluetoothStatus,
  } = useLiveWorkout();

  useEffect(() => {
    checkBluetoothStatus();
  }, []);

  const handleScan = async () => {
    if (!bluetoothEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to scan for devices.');
      return;
    }
    await scanForDevices();
  };

  const handleConnect = async (device: Device) => {
    try {
      await connectToDevice(device);
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not connect to device. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            Alert.alert('Disconnected', 'Device disconnected successfully');
          },
        },
      ]
    );
  };

  const handleStartWorkout = () => {
    startWorkout();
  };

  const handleEndWorkout = async () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            const metrics = endWorkout();
            if (metrics && user) {
              setIsProcessingWorkout(true);
              try {
                // time to process the workout and give them XP and creatures
                const result = await workoutCompletionService.completeLiveWorkout(
                  user.uid,
                  metrics,
                  workoutType
                );

                // if they caught any creatures show the unlock modal
                if (result.unlockedCreatures.length > 0) {
                  setUnlockedCreatures(result.unlockedCreatures);
                  setShowUnlockModal(true);
                }

                // display a nice summary of what they accomplished
                const summary = workoutCompletionService.getWorkoutSummary(result);
                Alert.alert('Workout Complete!', summary);
              } catch (error) {
                console.error('Error processing workout:', error);
                Alert.alert(
                  'Workout Saved',
                  `Duration: ${Math.floor(metrics.duration / 60)}m ${metrics.duration % 60}s\n` +
                  `Avg HR: ${metrics.averageHeartRate} bpm\n` +
                  `Max HR: ${metrics.maxHeartRate} bpm\n` +
                  `Calories: ${metrics.caloriesBurned} kcal\n\n` +
                  `Note: Could not process rewards. Please check your connection.`
                );
              } finally {
                setIsProcessingWorkout(false);
              }
            } else if (metrics) {
              Alert.alert(
                'Workout Complete!',
                `Duration: ${Math.floor(metrics.duration / 60)}m ${metrics.duration % 60}s\n` +
                `Avg HR: ${metrics.averageHeartRate} bpm\n` +
                `Max HR: ${metrics.maxHeartRate} bpm\n` +
                `Calories: ${metrics.caloriesBurned} kcal\n\n` +
                `Sign in to earn XP and unlock creatures!`
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]} edges={['left', 'right', 'bottom']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Workout</Text>
        <Text style={styles.subtitle}>Connect your Polar watch for real-time tracking</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Device Scanner / Connected Device */}
      <DeviceScanner
        connectedDevice={connectedDevice}
        isScanning={isScanning}
        bluetoothEnabled={bluetoothEnabled}
        availableDevices={availableDevices}
        onScan={handleScan}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {connectedDevice && (
        <>
          {/* Heart Rate Display */}
          <ActiveWorkout
            currentHeartRate={currentHeartRate}
            currentZone={workoutMetrics?.currentZone}
          />

          {/* Workout Type Selector */}
          {!workoutActive && (
            <WorkoutTypeSelector
              selectedType={workoutType}
              onSelect={setWorkoutType}
            />
          )}

          {/* Workout Controls */}
          <WorkoutControls
            workoutActive={workoutActive}
            workoutPaused={workoutPaused}
            pauseReason={pauseReason}
            onStart={handleStartWorkout}
            onPause={pauseWorkout}
            onResume={resumeWorkout}
            onEnd={handleEndWorkout}
          />

          {/* Workout Metrics */}
          {workoutActive && workoutMetrics && (
            <WorkoutMetrics
              duration={workoutMetrics.duration}
              averageHeartRate={workoutMetrics.averageHeartRate}
              maxHeartRate={workoutMetrics.maxHeartRate}
              caloriesBurned={workoutMetrics.caloriesBurned}
            />
          )}

          {/* Previous Workout Results */}
          {!workoutActive && workoutMetrics && (
            <WorkoutSummary
              duration={workoutMetrics.duration}
              averageHeartRate={workoutMetrics.averageHeartRate}
              maxHeartRate={workoutMetrics.maxHeartRate}
              minHeartRate={workoutMetrics.minHeartRate}
              caloriesBurned={workoutMetrics.caloriesBurned}
              currentZone={workoutMetrics.currentZone}
            />
          )}
        </>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.instructionsTitle}>How to Use:</Text>
        <Text style={styles.instructionText}>1. Make sure your Polar watch is on and nearby</Text>
        <Text style={styles.instructionText}>2. Tap "Scan for Polar Devices"</Text>
        <Text style={styles.instructionText}>3. Select your device from the list</Text>
        <Text style={styles.instructionText}>4. Once connected, start your workout</Text>
        <Text style={styles.instructionText}>5. Your heart rate will update in real-time</Text>
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

      {/* Processing Overlay */}
      {isProcessingWorkout && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownBox}>
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
            <Text style={styles.countdownLabel}>Processing workout...</Text>
          </View>
        </View>
      )}

      {/* Creature Unlock Modal */}
      <CreatureUnlockModal
        visible={showUnlockModal}
        creatures={unlockedCreatures}
        onClose={() => {
          setShowUnlockModal(false);
          setUnlockedCreatures([]);
        }}
      />
    </ScrollView>
    </SafeAreaView>
  );
}
