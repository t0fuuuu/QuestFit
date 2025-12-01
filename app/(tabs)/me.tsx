import React, { useState, useEffect } from 'react';
import { ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/src/hooks/useAuth';
import { db } from '@/src/services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { xpStyles as styles } from '@/src/styles';
import { Creature } from '@/src/types/polar';
import creatureService from '@/src/services/creatureService';
import { polarOAuthService } from '@/src/services/polarOAuthService';
import { ConsentModal } from '@/components/auth/ConsentModal';
import { getNextReward, getRewardProgress } from '@/src/utils/rewardsSystem';

// Components
import { PhysicalAttributes } from '@/components/me/PhysicalAttributes';
import { XPDisplay } from '@/components/me/XPDisplay';
import { StatsGrid } from '@/components/me/StatsGrid';
import { CreaturesGrid } from '@/components/me/CreaturesGrid';
import { WorkoutHistory, WorkoutHistoryItem } from '@/components/me/WorkoutHistory';
import { AccountInfo } from '@/components/me/AccountInfo';
import { ActionButtons } from '@/components/me/ActionButtons';

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
  const [height, setHeight] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [maxHr, setMaxHr] = useState<number | null>(null);
  const [restingHr, setRestingHr] = useState<number | null>(null);
  const [aerobicThreshold, setAerobicThreshold] = useState<number | null>(null);
  const [anaerobicThreshold, setAnaerobicThreshold] = useState<number | null>(null);
  const [vo2Max, setVo2Max] = useState<number | null>(null);
  const [lastPhysicalSync, setLastPhysicalSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
          setHeight(data.height || null);
          setAge(data.age || null);
          setGender(data.gender || null);
          setMaxHr(data['maximum-hr'] || null);
          setRestingHr(data['resting-hr'] || null);
          setAerobicThreshold(data['aerobic-threshold'] || null);
          setAnaerobicThreshold(data['anaerobic-threshold'] || null);
          setVo2Max(data['vo2-max'] || null);
          setLastPhysicalSync(data.lastPhysicalSync || null);
          
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

        <PhysicalAttributes
          weight={weight}
          height={height}
          age={age}
          gender={gender}
          vo2Max={vo2Max}
          maxHr={maxHr}
          restingHr={restingHr}
          aerobicThreshold={aerobicThreshold}
          anaerobicThreshold={anaerobicThreshold}
          lastPhysicalSync={lastPhysicalSync}
        />

        <XPDisplay
          currentXP={currentXP}
          nextReward={nextReward}
          progress={progress}
          onRefresh={loadUserXP}
        />

        <StatsGrid
          totalWorkouts={totalWorkouts}
          totalCalories={totalCalories}
          totalDuration={totalDuration}
          totalAvgHeartRate={totalAvgHeartRate}
        />

        <CreaturesGrid creatures={capturedCreatures} />

        <WorkoutHistory history={workoutHistory} />

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

        <AccountInfo user={user} />

        <ActionButtons
          show={weight !== null || age !== null || gender !== null || height !== null}
          onShowConsent={() => setShowConsentModal(true)}
          onDeleteAccount={handleDeleteAccount}
        />
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
