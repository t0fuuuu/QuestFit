import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { CreatureCard, CreatureCardGrid } from '@/components/game/CreatureCard';
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
  
  useEffect(() => {
    // load all creatures, with locked creatures first
    const creatures = creatureService.getAllCreatures();
    setAllCreatures(creatures);
  }, [capturedCreatureIds.length]);

  const cards = creatureService.getAllCreatures().map(creature => ({
    creature: creature,
    captured: capturedCreatureIds.includes(creature.id),
    onPress: (() => {
        // handle creature selection zzzzzzzzzzzzzzzzzzzzzzzzzz sleeeeep
        console.log('Selected creature:', creature.name);
        const lore = creatureService.getCreatureLore(creature.id);
        if (lore) {
          console.log('Lore:', lore);
        }
      })
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
      <CreatureCardGrid
      cards={cards}
      onPress={(id) => {
        console.log("Pressed card", cards[id]);
        const lore = cards[id].creature.lore;
            if (lore) {
              console.log('Lore:', lore);
            }
      }}
      />
      </ScrollView>
    </View>
  );
}
