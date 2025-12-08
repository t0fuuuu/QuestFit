import React from 'react';
import { Text, View } from '@/components/Themed';
import { liveStyles as styles } from '@/src/styles';

interface ActiveWorkoutProps {
  currentHeartRate: number;
  currentZone?: number;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  currentHeartRate,
  currentZone,
}) => {
  const getHeartRateZoneColor = (zone: number): string => {
    switch (zone) {
      case 1: return '#60A5FA'; // nice light blue for easy zone
      case 2: return '#34D399'; // green for moderate
      case 3: return '#FBBF24'; // yellow for getting harder
      case 4: return '#F97316'; // orange for intense
      case 5: return '#EF4444'; // red for max effort
      default: return '#9CA3AF'; // gray if we dont know
    }
  };

  return (
    <View style={styles.heartRateSection}>
      <Text style={styles.heartRateLabel}>Current Heart Rate</Text>
      <View style={styles.heartRateDisplay}>
        <Text style={styles.heartRateValue}>
          {currentHeartRate || '--'}
        </Text>
        <Text style={styles.heartRateUnit}>bpm</Text>
        <Text style={styles.heartIcon}>❤️</Text>
      </View>
      {currentZone && (
        <View style={[styles.zoneIndicator, { backgroundColor: getHeartRateZoneColor(currentZone) }]}>
          <Text style={styles.zoneText}>Zone {currentZone}</Text>
        </View>
      )}
    </View>
  );
};
