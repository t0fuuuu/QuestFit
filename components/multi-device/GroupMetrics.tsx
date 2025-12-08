import React from 'react';
import { Text, View } from '@/components/Themed';
import { liveStyles as styles } from '@/src/styles';

interface GroupMetricsProps {
  duration: number;
  averageHeartRate: number;
  maxHeartRate: number;
  caloriesBurned: number;
}

export const GroupMetrics: React.FC<GroupMetricsProps> = ({
  duration,
  averageHeartRate,
  maxHeartRate,
  caloriesBurned,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Group Metrics</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </Text>
          <Text style={styles.metricLabel}>Duration</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{averageHeartRate}</Text>
          <Text style={styles.metricLabel}>Avg HR</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{maxHeartRate}</Text>
          <Text style={styles.metricLabel}>Max HR</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{caloriesBurned}</Text>
          <Text style={styles.metricLabel}>Total Cals</Text>
        </View>
      </View>
    </View>
  );
};
