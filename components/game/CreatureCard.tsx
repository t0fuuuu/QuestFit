import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Creature } from '../../src/types/polar';
import { creatureCardStyles as styles } from '@/src/styles/components/creatureCardStyles';

// ayd stuff, but i made stylesheets 
// import { getRarityColor, getSportColor, black, white } from '@/constants/Colors';


interface CreatureCardProps {
  creature: Creature;
  onPress?: () => void;
  captured?: boolean;
}

export const CreatureCard: React.FC<CreatureCardProps> = ({ creature, onPress, captured = false }) => {

  return (
    <Pressable 
      style={[styles.container, { borderColor: getRarityColor(creature.rarity) }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{creature.name}</Text>
        <View style={styles.header}>
          <Text style={[styles.rarity, { color: getRarityColor(creature.rarity) }]}>
            {creature.rarity.toUpperCase()}
          </Text>
          <Text style={[styles.sportBadge, { 
            backgroundColor: getSportColor(creature.sport)[0], 
            color: getSportColor(creature.sport)[1] }]}>
            {creature.sport}
          </Text>
        </View>
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
