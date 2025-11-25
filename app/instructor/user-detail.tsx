import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, router } from 'expo-router';
import { db } from '@/src/services/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Helper function to convert ISO8601 duration to readable format
function formatDuration(iso8601Duration: string): string {
  if (!iso8601Duration) return 'N/A';
  
  const match = iso8601Duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return iso8601Duration;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseFloat(match[3] || '0');
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${Math.round(seconds)}s`);
  
  return parts.length > 0 ? parts.join(' ') : '0s';
}

interface UserStats {
  today: {
    activity?: any;
    cardioLoad?: any;
    sleep?: any;
    nightlyRecharge?: any;
    exercises?: any;
    continuousHR?: any;
  };
  historical: {
    avgActivity?: any;
    avgCardioLoad?: number;
    avgSleep?: any;
    recentExercises?: any[];
  };
}

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserStats();
    }
  }, [userId]);

  const loadUserStats = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const userStats: UserStats = {
        today: {},
        historical: {},
      };

      // Get today's data
      const todayActivity = await getDoc(
        doc(db, `users/${userId}/polarData/activities/all/${today}`)
      );
      if (todayActivity.exists()) {
        userStats.today.activity = todayActivity.data();
      }

      const todayCardio = await getDoc(
        doc(db, `users/${userId}/polarData/cardioLoad/all/${today}`)
      );
      if (todayCardio.exists()) {
        userStats.today.cardioLoad = todayCardio.data();
      }

      const todaySleep = await getDoc(
        doc(db, `users/${userId}/polarData/sleep/all/${today}`)
      );
      if (todaySleep.exists()) {
        userStats.today.sleep = todaySleep.data();
      }

      const todayRecharge = await getDoc(
        doc(db, `users/${userId}/polarData/nightlyRecharge/all/${today}`)
      );
      if (todayRecharge.exists()) {
        userStats.today.nightlyRecharge = todayRecharge.data();
      }

      const todayExercises = await getDoc(
        doc(db, `users/${userId}/polarData/exercises/all/${today}`)
      );
      if (todayExercises.exists()) {
        userStats.today.exercises = todayExercises.data();
      }

      const todayHR = await getDoc(
        doc(db, `users/${userId}/polarData/continuousHeartRate/all/${today}`)
      );
      if (todayHR.exists()) {
        userStats.today.continuousHR = todayHR.data();
      }

      // Get historical data (last 7 days)
      const exercisesQuery = query(
        collection(db, `users/${userId}/polarData/exercises/all`),
        orderBy('date', 'desc'),
        limit(7)
      );
      const exercisesSnapshot = await getDocs(exercisesQuery);
      userStats.historical.recentExercises = exercisesSnapshot.docs.map(doc => ({
        date: doc.id,
        ...doc.data(),
      }));

      // Calculate historical averages
      const activityQuery = query(
        collection(db, `users/${userId}/polarData/activities/all`),
        orderBy('date', 'desc'),
        limit(7)
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activityDocs = activitySnapshot.docs.map(d => d.data());
      
      if (activityDocs.length > 0) {
        const totalSteps = activityDocs.reduce((sum, d) => sum + (d.steps || 0), 0);
        const totalCalories = activityDocs.reduce((sum, d) => sum + (d.calories || 0), 0);
        userStats.historical.avgActivity = {
          steps: Math.round(totalSteps / activityDocs.length),
          calories: Math.round(totalCalories / activityDocs.length),
        };
      }

      const cardioQuery = query(
        collection(db, `users/${userId}/polarData/cardioLoad/all`),
        orderBy('date', 'desc'),
        limit(7)
      );
      const cardioSnapshot = await getDocs(cardioQuery);
      const cardioDocs = cardioSnapshot.docs.map(d => d.data());
      
      if (cardioDocs.length > 0) {
        const totalCardio = cardioDocs.reduce(
          (sum, d) => sum + (d.data?.cardio_load_ratio || 0),
          0
        );
        userStats.historical.avgCardioLoad = totalCardio / cardioDocs.length;
      }

      setStats(userStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{userId}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{userId}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Activity</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnLabel}>Today</Text>
              {stats?.today.activity ? (
                <>
                  <Text style={styles.statValue}>
                    {stats.today.activity.steps?.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>steps</Text>
                  <Text style={styles.statSubValue}>
                    {stats.today.activity.calories || 0} cal
                  </Text>
                  <Text style={styles.statSubValue}>
                    {(stats.today.activity.distance_from_steps || 0).toFixed(2)} km
                  </Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnLabel}>7-Day Avg</Text>
              {stats?.historical.avgActivity ? (
                <>
                  <Text style={styles.statValue}>
                    {stats.historical.avgActivity.steps.toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>steps</Text>
                  <Text style={styles.statSubValue}>
                    {stats.historical.avgActivity.calories} cal
                  </Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
          </View>
        </View>

        {/* Cardio Load Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cardio Load</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnLabel}>Today</Text>
              {stats?.today.cardioLoad ? (
                <>
                  <Text style={styles.statValue}>
                    {stats.today.cardioLoad.data?.cardio_load_ratio?.toFixed(2) || 'N/A'}
                  </Text>
                  <Text style={styles.statLabel}>ratio</Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnLabel}>7-Day Avg</Text>
              {stats?.historical.avgCardioLoad ? (
                <>
                  <Text style={styles.statValue}>
                    {stats.historical.avgCardioLoad.toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>ratio</Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
          </View>
        </View>

        {/* Sleep Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep & Recovery</Text>
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Last Night</Text>
            {stats?.today.sleep ? (
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{formatDuration(stats.today.sleep.sleep_time)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Quality</Text>
                  <Text style={styles.statValue}>
                    {stats.today.sleep.sleep_score || 'N/A'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Interruptions</Text>
                  <Text style={styles.statValue}>
                    {stats.today.sleep.interruptions || 0}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noData}>No sleep data</Text>
            )}
          </View>

          {stats?.today.nightlyRecharge && (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Nightly Recharge</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>ANS Charge</Text>
                  <Text style={styles.statValue}>
                    {stats.today.nightlyRecharge.ans_charge || 'N/A'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sleep Charge</Text>
                  <Text style={styles.statValue}>
                    {stats.today.nightlyRecharge.sleep_charge || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Recent Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Exercises (Last 7 Days)</Text>
          {stats?.historical.recentExercises && stats.historical.recentExercises.length > 0 ? (
            stats.historical.recentExercises.map((dayExercises: any, idx: number) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.cardSubtitle}>{dayExercises.date}</Text>
                <Text style={styles.exerciseCount}>
                  {dayExercises.count || 0} exercise(s)
                </Text>
                {dayExercises.exercises?.map((ex: any, exIdx: number) => (
                  <View key={exIdx} style={styles.exerciseItem}>
                    <Text style={styles.exerciseSport}>{ex.sport || 'Unknown'}</Text>
                    <Text style={styles.exerciseDetail}>
                      Duration: {formatDuration(ex.duration)}
                    </Text>
                    {ex.calories && (
                      <Text style={styles.exerciseDetail}>
                        Calories: {ex.calories}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No recent exercises</Text>
          )}
        </View>

        {/* Heart Rate Section */}
        {stats?.today.continuousHR && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heart Rate (Today)</Text>
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Continuous HR Data Available</Text>
              <Text style={styles.infoText}>
                {stats.today.continuousHR.samples?.length || 0} samples recorded
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  comparisonCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  comparisonColumn: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  columnLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardSubtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubValue: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  noData: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  exerciseCount: {
    color: '#FF6B35',
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  exerciseSport: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetail: {
    color: '#666',
    fontSize: 13,
  },
  infoText: {
    color: '#666',
    fontSize: 14,
  },
});
