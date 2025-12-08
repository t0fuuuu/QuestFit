import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Creature } from '../../src/types/polar';
import { creatureCardStyles as styles, getRarityColor, getSportColor } from '@/src/styles/components/creatureCardStyles';

const creatureImages = require.context(
  '../../assets/images/creatures',
  false,
  /^\.\/creature_icon_\d+\.png$/
);

function getCreatureImage(id: string) {
  return creatureImages(`./creature_icon_${id}.png`);
}

interface CreatureCardProps {
  creature: Creature;
  captured?: boolean;
}

export const CreatureCard: React.FC<CreatureCardProps> = ({ creature, captured = false }) => {

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.header}>
          <Text style={styles.name}>
            {creature.name}{" "}
            <Text style={styles.id}>#{creature.id}</Text>
          </Text>
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
              source={getCreatureImage(creature.id)}
              style={{ width: '100%', height: 75, resizeMode: 'contain', imageRendering: 'pixelated' } as any} 
            />
          )}
          {!captured && (
            <Image 
              source={getCreatureImage(creature.id)}
              style={{ width: '100%', height: 75, resizeMode: 'contain', imageRendering: 'pixelated', filter: "grayscale(100%)" } as any} 
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
      </View>
  );
};

interface CardGridProps {
  cards: CreatureCardProps[];
  onPress?: (id: number) => void;
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
          <View style={styles.border}>
            <View style={styles.header}>
              <Text style={styles.desc}>{card.creature.description}</Text>
              {card.captured && (
              <View style={styles.capturedBadge}>
                <Text style={styles.capturedText}>CAPTURED!</Text>
              </View>
              )}
              {!card.captured && (
              <View style={styles.lockedBadge}>
                <Text style={styles.capturedText}>LOCKED</Text>
              </View>
              )}
            </View>
          </View>
      </Pressable>
      </View>
      ))}
    </View>
  );
}

interface CreatureDetailsModalProps {
  visible: boolean;
  creature: Creature;
  captured: boolean;
  onClose: () => void;
}

export const CreatureDetailsModal: React.FC<CreatureDetailsModalProps> = ({
  visible,
  creature,
  captured,
  onClose
}) => {

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, {borderColor: getRarityColor(creature.rarity)}]}>
          <CreatureCard 
            creature={creature} 
            captured={captured}
          />
          <View style={styles.border}>
              {captured && (
                <View style={styles.header}>
                  <Text style={styles.desc}>{creature.lore}</Text>
                  <View style={styles.capturedBadge}>
                    <Text style={styles.capturedText}>CAPTURED!</Text>
                  </View>
                </View>
              )}
              {!captured && (
                <View>
                  <View style={styles.header}>
                    <Text style={styles.requirementsTitle}>Unlock Requirements:</Text>
                    <View style={styles.lockedBadge}>
                      <Text style={styles.capturedText}>LOCKED</Text>
                    </View>
                  </View>
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
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

