import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Creature } from '../../src/types/polar';
import { creatureCardStyles as styles, getRarityColor, getSportColor } from '@/src/styles/components/creatureCardStyles';

interface CreatureCardProps {
  creature: Creature;
  onPress?: () => void;
  captured?: boolean;
}

export const CreatureCard: React.FC<CreatureCardProps> = ({ creature, onPress, captured = false }) => {

  return (
    <View>
      <View style={styles.header}>
          <Text style={styles.name}>{creature.name}</Text>
          <View style={styles.header}>
          <Text style={[
            styles.rarity,
            { color: getRarityColor(creature.rarity) }
          ]}>
            {creature.rarity.toUpperCase()}
            </Text>
            <Text style={[
              styles.sportBadge,
              { backgroundColor: getSportColor(creature.sport)[0],
                color: getSportColor(creature.sport)[1] 
              }
            ]}>
              {creature.sport}
            </Text>
          </View>
        </View>
        <View>
          {captured && (
            <Image 
              source={require('../../assets/images/creatures/placeholder.png')} 
              style={{ width: '100%', height: 100, resizeMode: 'contain', imageRendering: 'pixelated' } as any} 
            />
          )}
          {!captured && (
            <Image 
              source={require('../../assets/images/creatures/placeholder.png')} 
              style={{ width: '100%', height: 100, resizeMode: 'contain', imageRendering: 'pixelated', filter: "grayscale(100%)" } as any} 
            />
          )}
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
                <Text style={styles.statLabel}>🛡️ Endurance</Text>
                <Text style={styles.statValue}>{creature.stats.endurance}</Text>
              </View>
            </View>
            <View style={styles.border}>
              <View style={styles.header}>
              <Text style={styles.desc}>{creature.description}</Text>
              {captured && (
              <View style={styles.capturedBadge}>
                <Text style={styles.capturedText}>CAPTURED!</Text>
              </View>
              )}
              {!captured && (
              <View style={styles.lockedBadge}>
                <Text style={styles.capturedText}>LOCKED</Text>
              </View>
              )}
        </View>
      </View>
    </View>
  );
};

interface CardGridProps {
  cards: CreatureCardProps[];
  onPress?: (id: number) => void;
  area?: number;
  minCardWidth?: number;
}

export const CreatureCardGrid: React.FC<CardGridProps> = ({
  cards,
  minCardWidth = 325, // minimum size a card can shrink to
  onPress
}: CardGridProps) => {
  const [cardWidth, setCardWidth] = useState(2);

  useEffect(() => {
    const calculateCardDims = () => {
      const screenWidth = Dimensions.get("window").width;
      const columns = Math.max(Math.floor(screenWidth/minCardWidth), 1); // at least 1 column
      const width = Dimensions.get("window").width/columns;
      setCardWidth(width);
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
          borderColor: getRarityColor(card.creature.rarity)
        }]}
        onPress={() => onPress?.(parseInt(card.creature.id))}
        >
          <CreatureCard 
            creature={card.creature} 
            captured={card.captured} 
          />
      </Pressable>
      </View>
      ))}
    </View>
  );
}
