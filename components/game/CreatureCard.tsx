import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Creature } from '../../src/types/polar';
import { creatureCardStyles as styles, getRarityColor, getSportColor } from '@/src/styles/components/creatureCardStyles';

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
          <Text style={styles.capturedText}>CAPTURED!</Text>
        </View>
      )}

      {!captured && (
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
        )}
    </Pressable>
  );
};

interface CardGridProps {
  cards: CreatureCardProps[];
  onPress?: (id: number) => void;
  maxColumns?: number;
  area?: number;
  minCardWidth?: number;
  minCardHeight?: number;
}

export const CreatureCardGrid: React.FC<CardGridProps> = ({
  cards,
  minCardWidth = 325, // minimum size a card can shrink to
  minCardHeight = 100,
  area = minCardWidth*minCardHeight*1.15, // default area of a card
  maxColumns = 999,
  onPress
}: CardGridProps) => {
  const [cardWidth, setCardWidth] = useState(2);
  const [cardHeight, setCardHeight] = useState(2);

  useEffect(() => {
    const calculateCardDims = () => {
      const screenWidth = Dimensions.get("window").width;
      const columns = Math.max(Math.min(Math.floor(screenWidth/minCardWidth), maxColumns), 1); // at least 1 column
      const width = Dimensions.get("window").width/columns; // spacing-friendly width
      console.log(width, "width", area/width, "height for", columns, "columns");
      setCardWidth(width);
      setCardHeight(area/width);
    };

    calculateCardDims();

    const subscription = Dimensions.addEventListener("change", calculateCardDims);
    return () => subscription.remove();
  }, [minCardWidth]);

  return (
    <View style={styles.grid}>
      {cards.map(card => (
        <View style={{ width: cardWidth, minWidth: minCardWidth }} key={card.creature.id}>
        <Pressable 
        style={[styles.card, { 
          borderColor: getRarityColor(card.creature.rarity),
          height: cardHeight,
          minHeight: minCardHeight
        }]}
        onPress={() => onPress?.(parseInt(card.creature.id))}
        >
        <View style={styles.header}>
          <Text style={styles.name}>{card.creature.name}</Text>
          <View style={[styles.header, {marginBottom: 0}]}>
          <Text style={[
            styles.rarity,
            { color: getRarityColor(card.creature.rarity) }
          ]}
          >
            {card.creature.rarity.toUpperCase()}
            </Text>
            <Text style={[
              styles.sportBadge,
              { backgroundColor: getSportColor(card.creature.sport)[0],
                color: getSportColor(card.creature.sport)[1] 
              }
            ]}
            >
              {card.creature.sport}
            </Text>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Power</Text>
            <Text style={styles.statValue}>{card.creature.stats.power}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Speed</Text>
              <Text style={styles.statValue}>{card.creature.stats.speed}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Endurance</Text>
                <Text style={styles.statValue}>{card.creature.stats.endurance}</Text>
              </View>
            </View>
      </Pressable>
      </View>
      ))}
    </View>
  );
}
