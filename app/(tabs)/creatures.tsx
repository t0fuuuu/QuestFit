import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { CreatureDetailsModal, CreatureCardGrid } from '@/components/game/CreatureCard';
import { twoStyles as styles } from '@/src/styles';
import creatureService from '@/src/services/creatureService';
import { useGameProfile } from '@/src/hooks/useGameProfile';
import { useAuth } from '@/src/hooks/useAuth';
import { Creature } from '@/src/types/polar';

export default function CreaturesScreen() {
  const { user } = useAuth();
  const { profile } = useGameProfile(user?.uid || null);
  const [allCreatures, setAllCreatures] = useState<Creature[]>([]);

  const capturedCreatureIds = profile?.capturedCreatures || [];

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedCreature, setSelectedCreature] = useState(creatureService.getAllCreatures()[0]);
  const [selectedCaptured, setSelectedCaptured] = useState(false);
  
  useEffect(() => {
    // load all creatures by ID
    const creatures = creatureService.getAllCreatures();
    setAllCreatures(creatures);
  }, [capturedCreatureIds.length]);

  const cards = creatureService.getAllCreatures().map(creature => ({
    creature: creature,
    captured: capturedCreatureIds.includes(creature.id)
  }))

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Creatures</Text>
        <Text style={styles.subtitle}>
          View your captured creatures here. Complete workout challenges to unlock even more creatures!
        </Text>
        <Text style={styles.stats}>
          {capturedCreatureIds.length} captured, {allCreatures.length-capturedCreatureIds.length} remaining
        </Text>
      </View>
      <ScrollView 
      showsVerticalScrollIndicator={false} // Hide vertical scrollbar
      showsHorizontalScrollIndicator={false} // Hide horizontal scrollbar
      >
      
      {/* Creature Card Grid */}
      <CreatureCardGrid
      cards={cards}
      onPress={(id) => {
        // handle creature selection
        const card = cards[id-1];
        setSelectedCreature(card.creature);
        setSelectedCaptured(card.captured);
        setShowUnlockModal(true);
      }}
      />
      </ScrollView>

      {/* Creature Details Modal */}
      <CreatureDetailsModal
        visible={showUnlockModal}
        creature={selectedCreature}
        captured={selectedCaptured}
        onClose={() => {
          setShowUnlockModal(false);
        }}
      />
    </View>
  );
}
