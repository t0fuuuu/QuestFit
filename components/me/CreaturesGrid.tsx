import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Themed';
import { xpStyles as styles } from '@/src/styles';
import { Creature } from '@/src/types/polar';
import { getRarityColor, getSportColor } from '@/src/styles/components/creatureCardStyles';

interface CreaturesGridProps {
  creatures: Creature[];
}

export const CreaturesGrid: React.FC<CreaturesGridProps> = ({ creatures }) => {
  if (creatures.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Captured Creatures ({creatures.length})</Text>
      <View style={styles.creaturesGrid}>
        {creatures.map((creature, index) => (
          <View 
            key={`${creature.id}-${index}`} 
            style={[
              styles.creatureCard,
              { borderLeftColor: getRarityColor(creature.rarity) }
            ]}
          >
            <Text style={styles.creatureName}>{creature.name}</Text>
            <View style={styles.header}>
            <Text style={[styles.creatureRarity, { color: getRarityColor(creature.rarity) }]}>
              {creature.rarity.toUpperCase()}
            </Text>
            <Text style={[styles.creatureSportBadge, { 
              backgroundColor: getSportColor(creature.sport)[0],
              color: getSportColor(creature.sport)[1] }]}>
              {creature.sport}
            </Text>
            </View>
            <View style={styles.creatureStats}>
              <Text style={styles.creatureStat}>⚔️ {creature.stats.power}</Text>
              <Text style={styles.creatureStat}>⚡ {creature.stats.speed}</Text>
              <Text style={styles.creatureStat}>🛡️ {creature.stats.endurance}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
