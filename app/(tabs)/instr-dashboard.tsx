import React, { useState, useEffect } from 'react';
import {
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
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { router } from 'expo-router';
import { instructorDashboardStyles as styles } from '@/src/styles/screens/instructorDashboardStyles';

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
    goalDiff?: string;
  };
  todayExercises?: number;
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  const { selectedUserIds, loading: studentsLoading, toggleUser } = useInstructorStudents(user?.uid);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<{id: string, displayName: string, lastSync?: string}[]>([]);
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
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || doc.id,
        lastSync: doc.data().lastSync
      }));
      setAllUsers(users);
      return users;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const loadUserOverviews = async (usersList?: typeof allUsers) => {
    setLoadingOverviews(true);
    const today = new Date().toISOString().split('T')[0];
    const overviews = new Map<string, UserOverview>();
    const sourceUsers = usersList || allUsers;

    for (const userId of selectedUserIds) {
      try {
        const overview: UserOverview = { userId };
        
        // Get lastSync from sourceUsers if available
        const user = sourceUsers.find(u => u.id === userId);
        if (user?.lastSync) {
          overview.lastSync = user.lastSync;
        } else {
          // Fallback: Query the most recent sync summary
          try {
            const summaryQuery = query(
              collection(db, `users/${userId}/polarData/syncSummary/all`),
              orderBy('syncedAt', 'desc'),
              limit(1)
            );
            const summarySnapshot = await getDocs(summaryQuery);
            if (!summarySnapshot.empty) {
              overview.lastSync = summarySnapshot.docs[0].data().syncedAt;
            }
          } catch (e) {
            console.log(`Error fetching last sync fallback for ${userId}:`, e);
          }
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
          
          // Calculate sleep duration from start and end times
          let calculatedDuration = 'N/A';
          let goalDiff = '';
          
          if (data?.sleep_start_time && data?.sleep_end_time) {
            const startTime = new Date(data.sleep_start_time);
            const endTime = new Date(data.sleep_end_time);
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationSeconds = Math.floor(durationMs / 1000);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            calculatedDuration = `${hours}h ${minutes}m`;
            
            // Calculate difference from sleep goal
            if (data?.sleep_goal) {
              const diffSeconds = durationSeconds - data.sleep_goal;
              const absDiffSeconds = Math.abs(diffSeconds);
              const diffHours = Math.floor(absDiffSeconds / 3600);
              const diffMinutes = Math.floor((absDiffSeconds % 3600) / 60);
              
              if (diffSeconds > 0) {
                // Exceeded goal
                if (diffHours > 0) {
                  goalDiff = `Exceeded by ${diffHours}h ${diffMinutes}m`;
                } else if (diffMinutes > 0) {
                  goalDiff = `Exceeded by ${diffMinutes}m`;
                } else {
                  goalDiff = 'Goal achieved';
                }
              } else if (diffSeconds < 0) {
                // Below goal
                if (diffHours > 0) {
                  goalDiff = `${diffHours}h ${diffMinutes}m to goal`;
                } else if (diffMinutes > 0) {
                  goalDiff = `${diffMinutes}m to goal`;
                } else {
                  goalDiff = 'Goal achieved';
                }
              } else {
                goalDiff = 'Goal achieved';
              }
            }
          }
          
          overview.todaySleep = {
            duration: calculatedDuration,
            quality: data?.sleep_score,
            goalDiff: goalDiff,
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
    const users = await loadAllUsers();
    await loadUserOverviews(users);
    setRefreshing(false);
  };

  const filteredUsers = allUsers.filter(user =>
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
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
          {filteredUsers.map(user => (
            <Pressable
              key={user.id}
              style={[
                styles.userItem,
                selectedUserIds.includes(user.id) && styles.userItemSelected,
              ]}
              onPress={() => toggleUser(user.id)}
            >
              <View>
                <Text style={styles.userNameText}>{user.displayName}</Text>
                <Text style={styles.userIdSubText}>{user.id}</Text>
              </View>
              {selectedUserIds.includes(user.id) && (
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
            const user = allUsers.find(u => u.id === userId);
            const displayName = user?.displayName || userId;
            
            return (
              <Pressable
                key={userId}
                style={styles.userCard}
                onPress={() => router.push(`/instructor/user-detail?userId=${userId}`)}
              >
                <View style={styles.userCardHeader}>
                  <View>
                    <Text style={styles.userCardName}>{displayName}</Text>
                    <Text style={styles.userCardId}>{userId}</Text>
                  </View>
                  <Text style={styles.lastSync}>
                    {overview?.lastSync 
                      ? `Last sync: ${new Date(overview.lastSync).toLocaleTimeString()}`
                      : 'Last sync not found'}
                  </Text>
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
                        {overview.todaySleep.goalDiff && (
                          <Text style={styles.statSubValue}>
                            {overview.todaySleep.goalDiff}
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
