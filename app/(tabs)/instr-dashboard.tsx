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
import { router } from 'expo-router';

import { useDashboardData } from '@/components/instr-dashboard/hooks/useDashboardData';
import { SleepScoreLineChart } from '@/components/instr-dashboard/components/SleepScoreLineChart';
import { DailyStepsBarChart } from '@/components/instr-dashboard/components/DailyStepsBarChart';
import { MonthlyExercisesBarChart } from '@/components/instr-dashboard/components/MonthlyExercisesBarChart';
import { UserSelectionView } from '@/components/instr-dashboard/components/UserSelectionView';
import { UserFilterDropdown } from '@/components/instr-dashboard/components/UserFilterDropdown';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  const { selectedUserIds, loading: studentsLoading, toggleUser } = useInstructorStudents(user?.uid);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [filteredUserId, setFilteredUserId] = useState<string>('all'); // 'all' = show all users

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
    // Reset filter when selected users change
    setFilteredUserId('all');
  }, [selectedUserIds, loadUserOverviews, loadSleepScoreData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const users = await loadAllUsers();
    await loadUserOverviews(users);
    await loadSleepScoreData();
    setRefreshing(false);
  };

  // ============================================================
  // FILTERING LOGIC
  // ============================================================
  
  // Get the user IDs to display (respects filter)
  const getDisplayedUserIds = (): string[] => {
    if (filteredUserId === 'all') {
      return selectedUserIds; // Show all selected users
    }
    // Single user selected - check if they exist in selectedUserIds
    if (selectedUserIds.includes(filteredUserId)) {
      return [filteredUserId];
    }
    return selectedUserIds; // Fallback to all if filtered user not found
  };

  const displayedUserIds = getDisplayedUserIds();

  // Users available for filtering (only those that are selected for monitoring)
  const selectableUsers = allUsers.filter(u => selectedUserIds.includes(u.id));

  // Get the dynamic title
  const getDynamicTitle = (): string => {
    if (filteredUserId === 'all') {
      return 'Overview';
    }
    const foundUser = allUsers.find(u => u.id === filteredUserId);
    const displayName = foundUser?.displayName || filteredUserId;
    return `${displayName}'s Statistics`;
  };

  // Check if a single user is selected (not "all")
  const isSingleUserSelected = filteredUserId !== 'all';

  // Navigate to user detail page
  const handleViewDetails = () => {
    if (isSingleUserSelected) {
      router.push(`/instructor/user-detail?userId=${filteredUserId}`);
    }
  };

  // ============================================================
  // LOADING / ACCESS STATES
  // ============================================================

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

  // ============================================================
  // CHART DATA - USES displayedUserIds
  // ============================================================

  const chartData = displayedUserIds.map(userId => {
    const foundUser = allUsers.find(u => u.id === userId);
    const overview = userOverviews.get(userId);

    return {
      name: foundUser?.displayName || userId,
      value: overview?.totalMonthExercises || 0,
    };
  }).sort((a, b) => b.value - a.value);

  const stepsChartData = displayedUserIds.map(userId => {
    const foundUser = allUsers.find(u => u.id === userId);
    const overview = userOverviews.get(userId);

    return {
      name: foundUser?.displayName || userId,
      steps: overview?.todayActivity?.steps || 0,
    };
  }).sort((a, b) => b.steps - a.steps);

  // Filter sleep data to only include displayed users (for individual lines)
  const filteredSleepData = new Map(
    Array.from(sleepScoreData.entries()).filter(([userId]) => 
      displayedUserIds.includes(userId)
    )
  );

  // ============================================================
  // RENDER
  // ============================================================

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
          {/* User Filter Dropdown */}
          <UserFilterDropdown
            allUsers={selectableUsers}
            selectedUserId={filteredUserId}
            onFilterChange={setFilteredUserId}
          />

          {/* Dynamic Title */}
          <Text style={{
            fontSize: 22,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: isSingleUserSelected ? 8 : 20,
            marginTop: 8,
          }}>
            {getDynamicTitle()}
          </Text>

          {/* Tap to view details - only shown when single user is selected */}
          {isSingleUserSelected && (
            <Pressable 
              onPress={handleViewDetails}
              style={{
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text style={{
                fontSize: 14,
                color: '#FF6B35',
                fontWeight: '500',
              }}>
                Tap to view details →
              </Text>
            </Pressable>
          )}

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
              sleepData={filteredSleepData}      // Filtered data for individual lines
              allSleepData={sleepScoreData}       // Full data for average calculation
              dates={sleepDates}
              allUsers={allUsers}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}