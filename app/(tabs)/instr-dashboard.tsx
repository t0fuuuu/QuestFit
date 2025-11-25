import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstructor } from '@/src/hooks/useInstructor';
import { useInstructorStudents } from '@/src/hooks/useInstructorStudents';
import { db } from '@/src/services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

interface UserOverview {
  userId: string;
  lastSync?: string;
  todayActivity?: {
    steps?: number;
    calories?: number;
    distance?: number;
  };
  todayCardioLoad?: number;
  todaySleep?: {
    duration?: string;
    quality?: number;
  };
  todayExercises?: number;
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  const { selectedUserIds, loading: studentsLoading, toggleUser } = useInstructorStudents(user?.uid);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [userOverviews, setUserOverviews] = useState<Map<string, UserOverview>>(new Map());
  const [loadingOverviews, setLoadingOverviews] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);

  useEffect(() => {
    if (isInstructor) {
      loadAllUsers();
    }
  }, [isInstructor]);

  useEffect(() => {
    if (selectedUserIds.length > 0) {
      loadUserOverviews();
    }
  }, [selectedUserIds]);

  const loadAllUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = usersSnapshot.docs.map(doc => doc.id);
      setAllUsers(userIds);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadUserOverviews = async () => {
    setLoadingOverviews(true);
    const today = new Date().toISOString().split('T')[0];
    const overviews = new Map<string, UserOverview>();

    for (const userId of selectedUserIds) {
      try {
        const overview: UserOverview = { userId };

        // Get summary
        const summaryDoc = await getDoc(
          doc(db, `users/${userId}/polarData/syncSummary/all/${today}`)
        );
        if (summaryDoc.exists()) {
          overview.lastSync = summaryDoc.data()?.syncedAt;
        }

        // Get activity
        const activityDoc = await getDoc(
          doc(db, `users/${userId}/polarData/activities/all/${today}`)
        );
        if (activityDoc.exists()) {
          const data = activityDoc.data();
          overview.todayActivity = {
            steps: data?.steps,
            calories: data?.calories,
            distance: data?.distance_from_steps,
          };
        }

        // Get cardio load
        const cardioDoc = await getDoc(
          doc(db, `users/${userId}/polarData/cardioLoad/all/${today}`)
        );
        if (cardioDoc.exists()) {
          overview.todayCardioLoad = cardioDoc.data()?.data?.cardio_load_ratio;
        }

        // Get sleep
        const sleepDoc = await getDoc(
          doc(db, `users/${userId}/polarData/sleep/all/${today}`)
        );
        if (sleepDoc.exists()) {
          const data = sleepDoc.data();
          overview.todaySleep = {
            duration: data?.sleep_time,
            quality: data?.sleep_score,
          };
        }

        // Get exercises
        const exercisesDoc = await getDoc(
          doc(db, `users/${userId}/polarData/exercises/all/${today}`)
        );
        if (exercisesDoc.exists()) {
          overview.todayExercises = exercisesDoc.data()?.count || 0;
        }

        overviews.set(userId, overview);
      } catch (error) {
        console.error(`Error loading overview for ${userId}:`, error);
      }
    }

    setUserOverviews(overviews);
    setLoadingOverviews(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserOverviews();
    setRefreshing(false);
  };

  const filteredUsers = allUsers.filter(userId =>
    userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (instructorLoading || studentsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isInstructor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Denied</Text>
        <Text style={styles.subtitle}>
          This dashboard is only available for instructors.
        </Text>
      </View>
    );
  }

  if (showUserSelection) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Users to Monitor</Text>
          <Pressable
            style={styles.doneButton}
            onPress={() => setShowUserSelection(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search user ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />

        <ScrollView style={styles.userList}>
          {filteredUsers.map(userId => (
            <Pressable
              key={userId}
              style={[
                styles.userItem,
                selectedUserIds.includes(userId) && styles.userItemSelected,
              ]}
              onPress={() => toggleUser(userId)}
            >
              <Text style={styles.userIdText}>{userId}</Text>
              {selectedUserIds.includes(userId) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Instructor Dashboard</Text>
        <Pressable
          style={styles.selectButton}
          onPress={() => setShowUserSelection(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedUserIds.length > 0 ? 'Edit Users' : 'Select Users'}
          </Text>
        </Pressable>
      </View>

      {selectedUserIds.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No users selected. Tap "Select Users" to start monitoring.
          </Text>
        </View>
      ) : loadingOverviews ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      ) : (
        <View style={styles.overviewsContainer}>
          {selectedUserIds.map(userId => {
            const overview = userOverviews.get(userId);
            return (
              <Pressable
                key={userId}
                style={styles.userCard}
                onPress={() => router.push(`/instructor/user-detail?userId=${userId}`)}
              >
                <View style={styles.userCardHeader}>
                  <Text style={styles.userCardId}>{userId}</Text>
                  {overview?.lastSync && (
                    <Text style={styles.lastSync}>
                      Last sync: {new Date(overview.lastSync).toLocaleTimeString()}
                    </Text>
                  )}
                </View>

                <View style={styles.statsGrid}>
                  {/* Activity Stats */}
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Activity</Text>
                    {overview?.todayActivity ? (
                      <>
                        <Text style={styles.statValue}>
                          {overview.todayActivity.steps?.toLocaleString() || 0} steps
                        </Text>
                        <Text style={styles.statSubValue}>
                          {overview.todayActivity.calories || 0} cal
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.noData}>No data</Text>
                    )}
                  </View>

                  {/* Cardio Load */}
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Cardio Load</Text>
                    {overview?.todayCardioLoad ? (
                      <Text style={styles.statValue}>
                        {overview.todayCardioLoad.toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={styles.noData}>No data</Text>
                    )}
                  </View>

                  {/* Sleep */}
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Sleep</Text>
                    {overview?.todaySleep ? (
                      <>
                        <Text style={styles.statValue}>
                          {overview.todaySleep.duration || 'N/A'}
                        </Text>
                        {overview.todaySleep.quality && (
                          <Text style={styles.statSubValue}>
                            Score: {overview.todaySleep.quality}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noData}>No data</Text>
                    )}
                  </View>

                  {/* Exercises */}
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Exercises</Text>
                    <Text style={styles.statValue}>
                      {overview?.todayExercises || 0}
                    </Text>
                  </View>
                </View>

                <Text style={styles.viewDetails}>Tap to view details →</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  selectButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: '#1A1F3A',
    borderRadius: 10,
    padding: 12,
    margin: 20,
    marginTop: 0,
    color: '#FFFFFF',
    fontSize: 16,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userItem: {
    backgroundColor: '#1A1F3A',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userItemSelected: {
    backgroundColor: '#2A3F5A',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  userIdText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
  },
  overviewsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userCardId: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastSync: {
    color: '#999',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0A0E27',
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statSubValue: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  noData: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  viewDetails: {
    color: '#FF6B35',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
  },
});
