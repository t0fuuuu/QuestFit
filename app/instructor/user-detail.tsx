import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
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
  const [hoveredPoint, setHoveredPoint] = useState<{time: string, hr: number} | null>(null);

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
              {stats?.today.cardioLoad?.data?.cardio_load_ratio ? (
                <>
                  <Text style={styles.statValue}>
                    {stats.today.cardioLoad.data.cardio_load_ratio.toFixed(2)}
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
              <>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Duration</Text>
                    {stats.today.sleep.sleep_start_time && stats.today.sleep.sleep_end_time ? (
                      <Text style={styles.statValue}>
                        {(() => {
                          const start = new Date(stats.today.sleep.sleep_start_time);
                          const end = new Date(stats.today.sleep.sleep_end_time);
                          const durationMs = end.getTime() - start.getTime();
                          const hours = Math.floor(durationMs / (1000 * 60 * 60));
                          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          return `${hours}h ${minutes}m`;
                        })()}
                      </Text>
                    ) : (
                      <Text style={styles.noData}>No data</Text>
                    )}
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Deep Sleep</Text>
                    {(() => {
                      const deepSleep = stats.today.sleep.deep_sleep ?? stats.today.sleep.data?.deep_sleep;
                      if (deepSleep) {
                        const hours = Math.floor(deepSleep / 3600);
                        const minutes = Math.floor((deepSleep % 3600) / 60);
                        return (
                          <Text style={styles.statValue}>
                            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                          </Text>
                        );
                      }
                      return <Text style={styles.noData}>No data</Text>;
                    })()}
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Sleep Score</Text>
                    {stats.today.sleep.sleep_score ? (
                      <Text style={styles.statValue}>
                        {stats.today.sleep.sleep_score}
                      </Text>
                    ) : (
                      <Text style={styles.noData}>No data</Text>
                    )}
                  </View>
                </View>
                
                {/* Heart Rate Chart */}
                {stats.today.sleep.heart_rate_samples && (
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Heart Rate During Sleep</Text>
                    {(() => {
                      const hrSamples = stats.today.sleep.heart_rate_samples;
                      
                      // Sort data by time
                      const sortedEntries = Object.entries(hrSamples).sort((a, b) => {
                        const [hoursA, minutesA] = a[0].split(':').map(Number);
                        const [hoursB, minutesB] = b[0].split(':').map(Number);
                        
                        // Convert to minutes, handling overnight
                        let timeA = hoursA * 60 + minutesA;
                        let timeB = hoursB * 60 + minutesB;
                        
                        // If hour is small (0-11), it's likely after midnight
                        if (hoursA < 12 && hoursA < 20) timeA += 24 * 60;
                        if (hoursB < 12 && hoursB < 20) timeB += 24 * 60;
                        
                        return timeA - timeB;
                      });
                      
                      const times = sortedEntries.map(e => e[0]);
                      const values = sortedEntries.map(e => e[1]) as number[];
                      
                      if (times.length === 0) {
                        return <Text style={styles.noData}>No heart rate data</Text>;
                      }

                      const minHR = Math.min(...values);
                      const maxHR = Math.max(...values);
                      const range = maxHR - minHR;
                      const chartHeight = 150;
                      
                      // Convert time strings to minutes, handling overnight sleep
                      const parseTime = (timeStr: string) => {
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        let totalMinutes = hours * 60 + minutes;
                        
                        // If hour is small (0-11), assume it's after midnight
                        if (hours < 12 && hours < 20) {
                          totalMinutes += 24 * 60;
                        }
                        
                        return totalMinutes;
                      };
                      
                      const timeValues = times.map(time => parseTime(time));
                      const minTime = timeValues[0];
                      const maxTime = timeValues[timeValues.length - 1];
                      const timeRange = maxTime - minTime;
                      
                      return (
                        <View style={{ position: 'relative' }}>
                          {hoveredPoint && (
                            <View style={styles.tooltip}>
                              <Text style={styles.tooltipText}>
                                {hoveredPoint.time} - {hoveredPoint.hr} bpm
                              </Text>
                            </View>
                          )}
                          <View style={styles.chartRow}>
                            <View style={styles.yAxisLabels}>
                              <Text style={styles.yAxisLabel}>{maxHR}</Text>
                              <Text style={styles.yAxisLabel}>{Math.round((maxHR + minHR) / 2)}</Text>
                              <Text style={styles.yAxisLabel}>{minHR}</Text>
                            </View>
                            <View style={styles.chart}>
                              {values.map((hr, index) => {
                                // Scale x based on actual time difference
                                const timeInMinutes = timeValues[index];
                                const xPercent = ((timeInMinutes - minTime) / timeRange) * 100;
                                const y = chartHeight - ((hr - minHR) / range) * chartHeight;
                                
                                return (
                                  <View
                                    key={index}
                                    onPointerEnter={() => setHoveredPoint({ time: times[index], hr })}
                                    onPointerLeave={() => setHoveredPoint(null)}
                                    style={{
                                      position: 'absolute',
                                      left: `${xPercent}%`,
                                      top: y - 12,
                                      width: 24,
                                      height: 24,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginLeft: -12,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <View
                                      style={{
                                        width: 6,
                                        height: 6,
                                        backgroundColor: '#FF6B35',
                                        borderRadius: 3,
                                      }}
                                    />
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                          <View style={styles.chartLabels}>
                            <Text style={styles.chartLabel}>{times[0]}</Text>
                            <Text style={styles.chartLabel}>{times[Math.floor(times.length / 2)]}</Text>
                            <Text style={styles.chartLabel}>{times[times.length - 1]}</Text>
                          </View>
                          <View style={styles.chartStats}>
                            <View>
                              <Text style={styles.chartStatLabel}>Min</Text>
                              <Text style={styles.chartStatValue}>{minHR} bpm</Text>
                            </View>
                            <View>
                              <Text style={styles.chartStatLabel}>Max</Text>
                              <Text style={styles.chartStatValue}>{maxHR} bpm</Text>
                            </View>
                            <View>
                              <Text style={styles.chartStatLabel}>Avg</Text>
                              <Text style={styles.chartStatValue}>
                                {stats.today.nightlyRecharge?.heart_rate_avg || Math.round(values.reduce((a, b) => a + b, 0) / values.length)} bpm
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </>
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
                  {stats.today.nightlyRecharge.ans_charge ? (
                    <Text style={styles.statValue}>
                      {stats.today.nightlyRecharge.ans_charge}
                    </Text>
                  ) : (
                    <Text style={styles.noData}>No data</Text>
                  )}
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sleep Charge</Text>
                  {stats.today.nightlyRecharge.sleep_charge ? (
                    <Text style={styles.statValue}>
                      {stats.today.nightlyRecharge.sleep_charge}
                    </Text>
                  ) : (
                    <Text style={styles.noData}>No data</Text>
                  )}
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>HRV Avg</Text>
                  {stats.today.nightlyRecharge.heart_rate_variability_avg ? (
                    <Text style={styles.statValue}>
                      {stats.today.nightlyRecharge.heart_rate_variability_avg}
                    </Text>
                  ) : (
                    <Text style={styles.noData}>No data</Text>
                  )}
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Breathing Rate</Text>
                  {stats.today.nightlyRecharge.breathing_rate_avg ? (
                    <Text style={styles.statValue}>
                      {stats.today.nightlyRecharge.breathing_rate_avg} /min
                    </Text>
                  ) : (
                    <Text style={styles.noData}>No data</Text>
                  )}
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
    alignItems: 'flex-start',
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
  chartContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chartTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabels: {
    height: 150,
    justifyContent: 'space-between',
    paddingRight: 8,
    width: 35,
  },
  yAxisLabel: {
    color: '#666',
    fontSize: 10,
    textAlign: 'right',
  },
  chart: {
    height: 150,
    flex: 1,
    position: 'relative',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartLabel: {
    color: '#666',
    fontSize: 11,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chartStatLabel: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
  chartStatValue: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  tooltip: {
    position: 'absolute',
    top: -35,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#000000',
    padding: 8,
    borderRadius: 6,
    zIndex: 1000,
    alignSelf: 'center',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

