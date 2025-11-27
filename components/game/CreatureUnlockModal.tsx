import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  Pressable, 
  Animated,
  Dimensions 
} from 'react-native';
import { Creature } from '../../src/types/polar';
import { creatureUnlockModalStyles as styles } from '@/src/styles/components/creatureUnlockModalStyles';

interface CreatureUnlockModalProps {
  visible: boolean;
  creatures: Creature[];
  onClose: () => void;
}

export const CreatureUnlockModal: React.FC<CreatureUnlockModalProps> = ({
  visible,
  creatures,
  onClose
}) => {
  if (creatures.length === 0) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
          <Text style={styles.subtitle}>You've unlocked new creatures!</Text>

          <View style={styles.creaturesContainer}>
            {creatures.map((creature, index) => (
              <View 
                key={creature.id} 
                style={[
                  styles.creatureCard,
                  { borderColor: getRarityColor(creature.rarity) }
                ]}
              >
                <View style={styles.creatureHeader}>
                  <Text style={styles.creatureName}>{creature.name}</Text>
                  <View style={[styles.creatureHeader, {marginBottom: 0}]}>
                    <Text 
                      style={[
                        styles.rarity,
                        { color: getRarityColor(creature.rarity) }
                      ]}
                    >
                      {creature.rarity.toUpperCase()}
                    </Text>
                    <Text 
                      style={[
                        styles.sportBadge,
                        { backgroundColor: getSportColor(creature.sport)[0],
                          color: getSportColor(creature.sport)[1] 
                        }
                      ]}
                    >
                      {creature.sport}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Power</Text>
                    <Text style={styles.statValue}>{creature.stats.power}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Speed</Text>
                    <Text style={styles.statValue}>{creature.stats.speed}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Endurance</Text>
                    <Text style={styles.statValue}>{creature.stats.endurance}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Awesome!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
