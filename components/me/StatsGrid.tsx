import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import { xpStyles as styles } from '@/src/styles';

interface StatsGridProps {
  totalWorkouts: number;
  totalCalories: number;
  totalDuration: number;
  totalAvgHeartRate: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  totalWorkouts,
  totalCalories,
  totalDuration,
  totalAvgHeartRate,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.round(totalDuration)}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.round(totalAvgHeartRate)}</Text>
          <Text style={styles.statLabel}>Avg HR</Text>
        </View>
      </View>
    </View>
  );
};
