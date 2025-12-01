import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstructor } from '@/src/hooks/useInstructor';
import { useInstructorStudents } from '@/src/hooks/useInstructorStudents';
import { instructorDashboardStyles as styles } from '@/src/styles/screens/instructorDashboardStyles';

import { useDashboardData } from '@/components/instr-dashboard/hooks/useDashboardData';
import { SleepScoreLineChart } from '@/components/instr-dashboard/components/SleepScoreLineChart';
import { DailyStepsBarChart } from '@/components/instr-dashboard/components/DailyStepsBarChart';
import { MonthlyExercisesBarChart } from '@/components/instr-dashboard/components/MonthlyExercisesBarChart';
import { UserSelectionView } from '@/components/instr-dashboard/components/UserSelectionView';
import { UserCard } from '@/components/instr-dashboard/components/UserCard';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  const { selectedUserIds, loading: studentsLoading, toggleUser } = useInstructorStudents(user?.uid);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);

  const {
    allUsers,
    userOverviews,
    loadingOverviews,
    sleepScoreData,
    sleepDates,
    loadingSleepData,
    loadAllUsers,
    loadUserOverviews,
    loadSleepScoreData,
  } = useDashboardData(selectedUserIds);

  useEffect(() => {
    if (isInstructor) {
      loadAllUsers();
    }
  }, [isInstructor, loadAllUsers]);

  useEffect(() => {
    if (selectedUserIds.length > 0) {
      loadUserOverviews();
      loadSleepScoreData();
    }
  }, [selectedUserIds, loadUserOverviews, loadSleepScoreData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const users = await loadAllUsers();
    await loadUserOverviews(users);
    await loadSleepScoreData();
    setRefreshing(false);
  };

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
      <UserSelectionView
        allUsers={allUsers}
        selectedUserIds={selectedUserIds}
        onToggleUser={toggleUser}
        onDone={() => setShowUserSelection(false)}
      />
    );
  }

  const chartData = selectedUserIds
    .map(userId => {
      const user = allUsers.find(u => u.id === userId);
      const overview = userOverviews.get(userId);

      return {
        name: user?.displayName || userId,
        value: overview?.totalMonthExercises || 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  const stepsChartData = selectedUserIds
    .map(userId => {
      const user = allUsers.find(u => u.id === userId);
      const overview = userOverviews.get(userId);

      return {
        name: user?.displayName || userId,
        steps: overview?.todayActivity?.steps || 0,
      };
    })
    .sort((a, b) => b.steps - a.steps);

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
        <View>
          {/* Daily Steps Vertical Bar Chart */}
          <DailyStepsBarChart chartData={stepsChartData} />

          {/* Monthly Exercise Bar Chart */}
          <MonthlyExercisesBarChart chartData={chartData} />

          {/* Sleep Score Line Chart */}
          {loadingSleepData ? (
            <View style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={{ color: '#666', marginTop: 8, fontSize: 12 }}>Loading sleep data...</Text>
            </View>
          ) : (
            <SleepScoreLineChart 
              sleepData={sleepScoreData} 
              dates={sleepDates}
              allUsers={allUsers}
            />
          )}

          {/* Existing user cards container */}

          {/* <View style={styles.overviewsContainer}>
            {selectedUserIds.map(userId => {
              const overview = userOverviews.get(userId);
              const user = allUsers.find(u => u.id === userId);

              if (!user) return null;

              return (
                <UserCard
                  key={userId}
                  user={user}
                  overview={overview}
                />
              );
            })}
          </View> */}
          
        </View>
      )}
    </ScrollView>
  );
}
