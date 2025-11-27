import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Creature } from '../../src/types/polar';
import { creatureCardStyles as styles } from '@/src/styles/components/creatureCardStyles';

interface CreatureCardProps {
  creature: Creature;
  onPress?: () => void;
  captured?: boolean;
}

export const CreatureCard: React.FC<CreatureCardProps> = ({ creature, onPress, captured = false }) => {
  const getRarityColor = (type: Creature['rarity']) => {
    switch (type) {
      case 'common': return '#9CA3AF';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  return (
    <Pressable 
      style={[styles.container, { borderColor: getRarityColor(creature.rarity) }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{creature.name}</Text>
        <Text style={[styles.rarity, { color: getRarityColor(creature.rarity) }]}>
          {creature.rarity.toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>⚔️ Power</Text>
          <Text style={styles.statValue}>{creature.stats.power}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>⚡ Speed</Text>
          <Text style={styles.statValue}>{creature.stats.speed}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>💪 Endurance</Text>
          <Text style={styles.statValue}>{creature.stats.endurance}</Text>
        </View>
      </View>

      {captured && (
        <View style={styles.capturedBadge}>
          <Text style={styles.capturedText}>CAPTURED</Text>
        </View>
      )}

      <View style={styles.requirements}>
        <Text style={styles.requirementsTitle}>Requirements:</Text>
        {creature.unlockRequirements.minCalories && (
          <Text style={styles.requirement}>• {creature.unlockRequirements.minCalories} calories</Text>
        )}
        {creature.unlockRequirements.minDistance && (
          <Text style={styles.requirement}>• {(creature.unlockRequirements.minDistance / 1000).toFixed(1)}km distance</Text>
        )}
        {creature.unlockRequirements.minDuration && (
          <Text style={styles.requirement}>• {creature.unlockRequirements.minDuration} minutes</Text>
        )}
        {creature.sport != 'NEUTRAL' && (
          <Text style={styles.requirement}>• {creature.sport} workout</Text>
        )}
      </View>
    </Pressable>
  );
};
