import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
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

interface AISummary {
  insights: string;
  recommendations: string;
  "[short]insights": string;
  "[short]recommendations": string;
}

export default function UserDetailScreen() {
  const { userId, date } = useLocalSearchParams<{ userId: string, date?: string }>();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{time: string, hr: number} | null>(null);
  const [selectedDate, setSelectedDate] = useState(date ? new Date(date) : new Date());
  
  // AI State
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserStats();
      checkExistingAISummary();
    }
  }, [userId, selectedDate]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkExistingAISummary = async () => {
    if (!userId) return;
    try {
      const dateStr = formatDate(selectedDate);
      const summaryDoc = await getDoc(doc(db, `users/${userId}/openAIGen/${dateStr}`));
      if (summaryDoc.exists()) {
        setAiSummary(summaryDoc.data() as AISummary);
      } else {
        setAiSummary(null);
      }
    } catch (error) {
      console.log("No existing summary found");
      setAiSummary(null);
    }
  };

  const generateInsights = async () => {
    if (!userId) return;
    setLoadingAI(true);
    try {
      let apiUrl = '/api/openai/generate-summary';
      if (Platform.OS !== 'web') {
        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
          apiUrl = `http://${hostUri}/api/openai/generate-summary`;
        }
      }

      const dateStr = formatDate(selectedDate);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          date: dateStr,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to generate insights';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAiSummary(data);
    } catch (error: any) {
      console.error('Error generating insights:', error);
      alert(error.message || 'Failed to generate insights. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const loadUserStats = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const userStats: UserStats = {
        today: {},
        historical: {},
      };

      const dateStr = formatDate(selectedDate);

      // Get selected date's data
      const todayActivity = await getDoc(
        doc(db, `users/${userId}/polarData/activities/all/${dateStr}`)
      );
      if (todayActivity.exists()) {
        userStats.today.activity = todayActivity.data();
      }

      const todayCardio = await getDoc(
        doc(db, `users/${userId}/polarData/cardioLoad/all/${dateStr}`)
      );
      if (todayCardio.exists()) {
        userStats.today.cardioLoad = todayCardio.data();
      }

      const todaySleep = await getDoc(
        doc(db, `users/${userId}/polarData/sleep/all/${dateStr}`)
      );
      if (todaySleep.exists()) {
        userStats.today.sleep = todaySleep.data();
      }

      const todayRecharge = await getDoc(
        doc(db, `users/${userId}/polarData/nightlyRecharge/all/${dateStr}`)
      );
      if (todayRecharge.exists()) {
        userStats.today.nightlyRecharge = todayRecharge.data();
      }

      const todayExercises = await getDoc(
        doc(db, `users/${userId}/polarData/exercises/all/${dateStr}`)
      );
      if (todayExercises.exists()) {
        userStats.today.exercises = todayExercises.data();
      }

      const todayHR = await getDoc(
        doc(db, `users/${userId}/polarData/continuousHeartRate/all/${dateStr}`)
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

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString(undefined, { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
        <TouchableOpacity 
          onPress={() => changeDate(1)} 
          style={[styles.dateButton, isSameDay(selectedDate, new Date()) && styles.dateButtonDisabled]}
          disabled={isSameDay(selectedDate, new Date())}
        >
          <Text style={[styles.dateButtonText, isSameDay(selectedDate, new Date()) && styles.dateButtonDisabledText]}>→</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* AI Insights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Insights & Recommendations</Text>
          
          {aiSummary ? (
            <View style={styles.card}>
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.cardSubtitle, { color: '#2E7D32' }]}>Insights</Text>
                <Text style={styles.infoText}>{aiSummary.insights}</Text>
              </View>
              <View>
                <Text style={[styles.cardSubtitle, { color: '#1565C0' }]}>Recommendations</Text>
                <Text style={styles.infoText}>{aiSummary.recommendations}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.button, loadingAI && styles.buttonDisabled]} 
              onPress={generateInsights}
              disabled={loadingAI}
            >
              {loadingAI ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Get Insights & Recommendations</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Activity</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.columnLabel}>
                {isSameDay(selectedDate, new Date()) ? 'Today' : 'Selected'}
              </Text>
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
              <Text style={styles.columnLabel}>
                {isSameDay(selectedDate, new Date()) ? 'Today' : 'Selected'}
              </Text>
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
            {stats?.today.sleep ? (
              <>
                <Text style={styles.cardSubtitle}>
                  {isSameDay(selectedDate, new Date()) ? 'Last Night' : 'Sleep Session'}
                </Text>
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
  button: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
    minWidth: 40,
    alignItems: 'center',
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  dateButtonDisabledText: {
    color: '#999999',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

