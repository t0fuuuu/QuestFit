import React, { useState, useEffect } from 'react';
import { ScrollView, Pressable, ActivityIndicator, Alert, TextInput, FlatList, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRarityColor, getSportColor } from '@/src/styles/components/creatureCardStyles';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/services/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { xpStyles as styles } from '@/src/styles';
import { Creature } from '@/src/types/polar';
import creatureService from '@/src/services/creatureService';
import { polarOAuthService } from '@/src/services/polarOAuthService';
import { ConsentModal } from '@/components/auth/ConsentModal';
import { getNextReward, getRewardProgress } from '@/src/utils/rewardsSystem';

interface WorkoutHistoryItem {
  sessionId: string;
  date: Date;
  xpEarned: number;
  sport: string;
}

export default function XPManagementScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut } = useAuth();
  const [currentXP, setCurrentXP] = useState<number>(0);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [capturedCreatures, setCapturedCreatures] = useState<Creature[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalAvgHeartRate, setTotalAvgHeartRate] = useState<number>(0);
  const [weight, setWeight] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [xpAmount, setXpAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  const nextReward = getNextReward(currentXP);
  const progress = getRewardProgress(currentXP);

  useEffect(() => {
    if (user && !hasLoadedOnce) {
      loadUserXP();
      setHasLoadedOnce(true);
    }
  }, [user]);

  const loadUserXP = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('No user logged in');
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      
      try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentXP(data.xp || 0);
          setTotalWorkouts(data.totalWorkouts || 0);
          setTotalCalories(data.totalCalories || 0);
          setTotalDuration(data.totalDuration || 0);
          setTotalAvgHeartRate(data.totalAvgHeartRate || 0);
          setWeight(data.weight || null);
          setAge(data.age || null);
          setGender(data.gender || null);
          
          // grab the full creature data from just the IDs we have stored
          const creatureIds = data.capturedCreatures || [];
          const creatures = creatureIds
            .map((id: string) => creatureService.getCreatureById(id))
            .filter((c: Creature | null) => c !== null) as Creature[];
          setCapturedCreatures(creatures);
          
          // pull in workout history and only show the last 10 workouts
          const history = data.workoutHistory || [];
          const sortedHistory = history
            .map((item: any) => ({
              ...item,
              date: item.date?.toDate ? item.date.toDate() : new Date(item.date)
            }))
            .sort((a: WorkoutHistoryItem, b: WorkoutHistoryItem) => 
              b.date.getTime() - a.date.getTime()
            )
            .slice(0, 10);
          setWorkoutHistory(sortedHistory);
        } else {
          // user doc doesnt exist yet - set defaults
          console.log('User document does not exist, using defaults');
          setCurrentXP(0);
          setTotalWorkouts(0);
          setTotalCalories(0);
          setTotalDuration(0);
          setTotalAvgHeartRate(0);
          setWorkoutHistory([]);
          setCapturedCreatures([]);
        }
      } catch (firebaseErr) {
        // Handle Firebase permission errors gracefully
        console.error('Firebase permission error:', firebaseErr);
        setError('Unable to access user data. Please check Firebase permissions.');
        // Set defaults when we can't access Firebase
        setCurrentXP(0);
        setTotalWorkouts(0);
        setTotalCalories(0);
        setTotalDuration(0);
        setTotalAvgHeartRate(0);
      }
    } catch (err) {
      console.error('Failed to load XP:', err);
      setError(err instanceof Error ? err.message : 'Failed to load XP');
    } finally {
      setLoading(false);
    }
  };

  const updateXP = async (amount: number) => {
    try {
      setUpdating(true);
      setError(null);

      if (!user) {
        setError('No user logged in');
        return;
      }

      const newXP = Math.max(0, currentXP + amount); // dont let XP go negitive

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { xp: newXP });

      setCurrentXP(newXP);
      setXpAmount('');

      Alert.alert(
        'Success!',
        `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} XP\nNew total: ${newXP} XP`
      );
    } catch (err) {
      console.error('Failed to update XP:', err);
      setError(err instanceof Error ? err.message : 'Failed to update XP');
      Alert.alert('Error', 'Failed to update XP. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddXP = () => {
    const amount = parseInt(xpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number');
      return;
    }
    updateXP(amount);
  };

  const handleRemoveXP = () => {
    const amount = parseInt(xpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number');
      return;
    }
    updateXP(-amount);
  };

  const handleQuickAdd = (amount: number) => {
    updateXP(amount);
  };

  const performAccountDeletion = async () => {
    if (!user) return;
    
    try {
      console.log('🚀 Starting account deletion...');
      setLoading(true);
      // 1. Disconnect from Polar (API + Firebase fields)
      await polarOAuthService.disconnectPolarAccount(user.uid);
      
      // 2. Delete User Document from Firebase
      await deleteDoc(doc(db, 'users', user.uid));
      
      console.log('✅ Account deleted successfully');
      
      // 3. Sign Out
      await signOut();
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
      if (confirmed) {
        await performAccountDeletion();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performAccountDeletion,
          },
        ]
      );
    }
  };

  const handleConsentAccept = async () => {
    if (!user) return;
    try {
      setConsentLoading(true);
      await polarOAuthService.setConsentGiven(user.uid);
      setShowConsentModal(false);
      Alert.alert('Success', 'Your consent has been recorded.');
    } catch (error) {
      console.error('Error recording consent:', error);
      Alert.alert('Error', 'Failed to record consent. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'dark'].tint} />
        <Text style={styles.loadingText}>Loading XP...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
      showsVerticalScrollIndicator={false} // Hide vertical scrollbar
      showsHorizontalScrollIndicator={false} // Hide horizontal scrollbar
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Me</Text>
          <Text style={styles.subtitle}>Manage your Profile</Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Pressable onPress={loadUserXP} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Physical Attributes Display */}
        {(weight !== null || age !== null || gender !== null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Physical Attributes</Text>
            <View style={styles.attributesContainer}>
              {weight !== null && (
                <View style={styles.attributeBox}>
                  <Text style={styles.attributeLabel}>Weight</Text>
                  <Text style={styles.attributeValue}>{weight} kg</Text>
                </View>
              )}
              {age !== null && (
                <View style={styles.attributeBox}>
                  <Text style={styles.attributeLabel}>Age</Text>
                  <Text style={styles.attributeValue}>{age} years</Text>
                </View>
              )}
              {gender !== null && (
                <View style={styles.attributeBox}>
                  <Text style={styles.attributeLabel}>Gender</Text>
                  <Text style={styles.attributeValue}>{gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Current XP Display */}
        <View style={styles.xpDisplaySection}>
          <Text style={styles.xpLabel}>Total Experience</Text>
          <View style={styles.xpDisplay}>
            <Text style={styles.xpValue}>{currentXP}</Text>
            <Text style={styles.xpUnit}>XP</Text>
            <Text style={styles.xpIcon}>⭐</Text>
          </View>
          
          {nextReward && (
            <View style={{ width: '100%', marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Next: {nextReward.name}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{nextReward.xpThreshold - currentXP} XP to go</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: '#3B82F6', width: `${progress * 100}%` }} />
              </View>
            </View>
          )}

          <Pressable onPress={loadUserXP} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </Pressable>
        </View>

        {/* Stats Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(totalDuration)}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(totalAvgHeartRate)}</Text>
              <Text style={styles.statLabel}>Avg HR</Text>
            </View>
          </View>
        </View>

        {/* Captured Creatures */}
        {capturedCreatures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Captured Creatures ({capturedCreatures.length})</Text>
            <View style={styles.creaturesGrid}>
              {capturedCreatures.map((creature, index) => (
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
        )}

        {/* Workout History */}
        {workoutHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {workoutHistory.map((item, index) => (
              <View key={`${item.sessionId}-${index}`} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>
                    {item.date.toLocaleDateString()} {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.historySport}>{item.sport}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyXP}>+{item.xpEarned} XP</Text>
                </View>
             </View>
            ))}
          </View>
        )}

        {/* Manual XP Input
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add/Remove XP</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter XP amount"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={xpAmount}
            onChangeText={setXpAmount}
            editable={!updating}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.actionButton, styles.addButton, updating && styles.buttonDisabled]}
              onPress={handleAddXP}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>➕ Add XP</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.removeButton, updating && styles.buttonDisabled]}
              onPress={handleRemoveXP}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>➖ Remove XP</Text>
              )}
            </Pressable>
          </View>
        </View> */}

        {/* Quick Add Buttons */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {[10, 25, 50, 100, 250, 500].map((amount) => (
              <Pressable
                key={amount}
                style={[styles.quickAddButton, updating && styles.buttonDisabled]}
                onPress={() => handleQuickAdd(amount)}
                disabled={updating}
              >
                <Text style={styles.quickAddButtonText}>+{amount}</Text>
              </Pressable>
            ))}
          </View>
        </View> */}

        {/* XP Guide */}
        <View style={styles.section}>
          <Text style={styles.guideTitle}>💡 XP Guide</Text>
          <Text style={styles.guideText}>• Complete workouts to earn XP</Text>
          <Text style={styles.guideText}>• Earn XP to unlock rewards</Text>
          <Text style={styles.guideText}>• Higher intensity = more XP earned</Text>
          <Text style={styles.guideText}>• Track your progress over time</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <Text style={styles.infoText}>User ID: {user?.uid.slice(0, 20)}...</Text>
          <Text style={styles.infoText}>
            Status: {user ? '✅ Logged In' : '❌ Not Logged In'}
          </Text>
          <Text style={styles.infoText}>
            Username: {user?.displayName || 'N/A'}
          </Text>
        </View>

        {/* Polar Disconnect Button and Show Consent Button */}
        {(weight !== null || age !== null || gender !== null) && (
          <View style={styles.section}>
            <Pressable
              style={styles.showConsentButton}
              onPress={() => setShowConsentModal(true)}
            >
              <Text style={styles.showConsentButtonText}>📋 Show Consent</Text>
            </Pressable>

            <Pressable
              style={styles.disconnectPolarButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.disconnectPolarButtonText}>🗑️ Delete Account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Consent Modal */}
      <ConsentModal
        visible={showConsentModal}
        onConsent={handleConsentAccept}
        onDecline={handleConsentDecline}
        loading={consentLoading}
      />
    </>
  );
}
