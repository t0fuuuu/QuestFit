import React from 'react';
import { View, Text } from 'react-native';
import { UserGameProfile } from '../../src/types/polar';
import { statsDisplayStyles as styles } from '@/src/styles/components/statsDisplayStyles';
import { getNextReward, getRewardProgress } from '../../src/utils/rewardsSystem';

interface StatsDisplayProps {
  profile: UserGameProfile;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ profile }) => {
  const nextReward = getNextReward(profile.xp);
  const progress = getRewardProgress(profile.xp);

  // use safe defaults in case any of these fields are missing
  const totalWorkouts = profile.totalWorkouts ?? 0;
  const totalCalories = profile.totalCalories ?? 0;
  const totalDistance = profile.totalDistance ?? 0;
  const capturedCreatures = profile.capturedCreatures ?? [];
  const achievements = profile.achievements ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Stats</Text>
      </View>

      <View style={styles.experienceSection}>
        <View style={styles.experienceHeader}>
          <Text style={styles.experienceText}>Total XP: {profile.xp}</Text>
          {nextReward && (
            <Text style={styles.nextRewardText}>Next: {nextReward.name}</Text>
          )}
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        
        {/* <View style={styles.statItem}>
          <Text style={styles.statValue}>{(totalDistance / 1000).toFixed(1)}km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View> */}
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{capturedCreatures.length}</Text>
          <Text style={styles.statLabel}>Creatures</Text>
        </View>
      </View>

      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        {achievements.length > 0 ? (
          achievements.slice(-3).map((achievement, index) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noAchievements}>No achievements yet. Keep working out!</Text>
        )}
      </View>
    </View>
  );
};
