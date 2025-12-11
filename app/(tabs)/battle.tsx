import { View, Text } from '@/components/Themed';
import { battleStyles as styles } from '@/src/styles';
import creatureService from '@/src/services/creatureService';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, ImageSourcePropType, Easing } from 'react-native';
import { Creature } from '@/src/types/polar';

type IconProps = {
  creature: Creature;
};

function IdleIcon ({ creature }: IconProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -5,
          duration: 25,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(creature.stats.speed * 5),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 25,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(creature.stats.speed * 5)
      ])
    ).start();
  }, []);

  return (
    <Animated.Image
      source={getCreatureImage(creature.id)}
      style={[
        styles.creatureIcon,
        {
        width: 50,
        height: 50,
        transform: [{ translateY }],
        }
      ]}
      resizeMode="contain"
    />
  );
}

const creatureImages = require.context(
  '../../assets/images/creatures',
  false,
  /^\.\/creature_icon_\d+\.png$/
);

function getCreatureImage(id: string) {
  return creatureImages(`./creature_icon_${id}.png`);
}

export default function BattleScreen() {

  const user = 'PlaceholderUser'; // Placeholder for user
  const opponent = 'PlaceholderOpponent'; // Placeholder for opponent

  const allCreatures = creatureService.getAllCreatures(); // This is just for the placeholders lol
  const userCreatures = [allCreatures[0], allCreatures[3], allCreatures[5]]; // Placeholder for user's creatures
  const opponentCreatures = [allCreatures[6], allCreatures[21], allCreatures[22]]; // Placeholder for opponent's creatures

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.username, {color: '#3B82F6'}]}>{user}</Text>
        <Text style={[styles.username, {color: '#EF4444'}]}>{opponent}</Text>
      </View>
      <View style={[styles.header, {borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}]}>
        <View style={styles.creatureHeader}>
          <View style={[styles.creatureIconContainer, {borderColor: '#3B82F6'}]}>
            <Image 
              source={getCreatureImage(userCreatures[0].id)}
              style={styles.creatureIcon} 
            />
          </View>
          <View style={[styles.creatureIconContainer, {borderColor: '#3B82F6'}]}>
            <Image 
              source={getCreatureImage(userCreatures[1].id)}
              style={styles.creatureIcon} 
            />
          </View>
          <View style={[styles.creatureIconContainer, {borderColor: '#3B82F6'}]}>
            <Image 
              source={getCreatureImage(userCreatures[2].id)}
              style={styles.creatureIcon} 
            />
          </View>
        </View>
        <View style={styles.creatureHeader}>
          <View style={[styles.creatureIconContainer, {borderColor: '#EF4444'}]}>
            <Image 
              source={getCreatureImage(opponentCreatures[0].id)}
              style={styles.creatureIcon} 
            />
          </View>
          <View style={[styles.creatureIconContainer, {borderColor: '#EF4444'}]}>
            <Image 
              source={getCreatureImage(opponentCreatures[1].id)}
              style={styles.creatureIcon} 
            />
          </View>
          <View style={[styles.creatureIconContainer, {borderColor: '#EF4444'}]}>
            <Image 
              source={getCreatureImage(opponentCreatures[2].id)}
              style={styles.creatureIcon} 
            />
          </View>
        </View>
      </View>
      <View> 
        <IdleIcon 
            creature={userCreatures[0]}
        />
      </View>
    </View>
  );
}
