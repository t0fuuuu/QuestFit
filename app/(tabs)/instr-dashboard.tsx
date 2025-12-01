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
import { db } from '@/src/services/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where } from 'firebase/firestore';
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
  totalMonthExercises?: number;
}

// Updated SleepScoreLineChart Component
// Replace the existing SleepScoreLineChart component in your code with this one

// Updated SleepScoreLineChart Component
// Replace the existing SleepScoreLineChart component in your code with this one

// Updated SleepScoreLineChart Component
// Replace the existing SleepScoreLineChart component in your code with this one

const SleepScoreLineChart = ({ 
  sleepData, 
  dates, 
  allUsers 
}: { 
  sleepData: Map<string, Array<{date: string, score: number | null}>>, 
  dates: string[],
  allUsers: {id: string, displayName: string}[]
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    type: 'user' | 'average';
    userId?: string;
    date: string;
    score: number;
    x: number;
    y: number;
  } | null>(null);
  
  const colors = ['#FF6B35', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#E74C3C', '#3498DB'];
  const averageLineColor = '#CC0000';
  
  const chartHeight = 300;
  const padding = { top: 25, right: 40, bottom: 40, left: 50 };
  const plotHeight = chartHeight - padding.top - padding.bottom;
  
  const plotWidth = containerWidth > 0 ? containerWidth - padding.left - padding.right : 400;
  
  const maxScore = 100;
  const minScore = 0;
  const yAxisSteps = 5;
  const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) => 
    minScore + (maxScore - minScore) / yAxisSteps * (yAxisSteps - i)
  );
  
  const getX = (index: number) => {
    if (dates.length <= 1) return padding.left;
    return padding.left + (plotWidth / (dates.length - 1)) * index;
  };
  const getY = (score: number) => padding.top + plotHeight - ((score - minScore) / (maxScore - minScore)) * plotHeight;
  
  const normalizeScore = (score: number | null | undefined): number => {
    if (score === null || score === undefined || isNaN(score) || score < 0) {
      return 0;
    }
    return score;
  };
  
  const calculateDailyAverages = (): Array<{date: string, average: number}> => {
    return dates.map((date, dateIndex) => {
      const validScores: number[] = [];
      
      sleepData.forEach((scores) => {
        const scoreForDate = scores[dateIndex];
        if (scoreForDate) {
          const normalizedScore = normalizeScore(scoreForDate.score);
          if (normalizedScore > 0) {
            validScores.push(normalizedScore);
          }
        }
      });
      
      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, score) => acc + score, 0);
        const average = Math.round(sum / validScores.length);
        return { date, average };
      }
      
      return { date, average: 0 };
    });
  };
  
  const dailyAverages = calculateDailyAverages();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleUserSelect = (userId: string | null) => {
    if (userId === null) {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(selectedUserId === userId ? null : userId);
    }
  };

  const handlePointClick = (
    type: 'user' | 'average',
    date: string,
    score: number,
    x: number,
    y: number,
    userId?: string
  ) => {
    // Toggle tooltip - if clicking same point, hide it
    if (tooltip && tooltip.date === date && tooltip.userId === userId && tooltip.type === type) {
      setTooltip(null);
      // Also deselect the user line
      if (type === 'user') {
        setSelectedUserId(null);
      }
    } else {
      setTooltip({ type, date, score, x, y, userId });
      // Highlight the user's line when clicking their datapoint
      if (type === 'user' && userId) {
        setSelectedUserId(userId);
      }
    }
  };

  const handleOutsideClick = () => {
    setTooltip(null);
    setSelectedUserId(null);
  };

  return (
    <View 
      style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8 }}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width - 32);
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#000' }}>
        Sleep Score - Last 7 Days
      </Text>
      
      {containerWidth > 0 && (
        <View style={{ width: '100%' }}>
          <Pressable 
            style={{ position: 'relative', height: chartHeight }}
            onPress={handleOutsideClick}
          >
            {/* Y-axis */}
            <View style={{ position: 'absolute', left: 0, top: padding.top, height: plotHeight, width: padding.left }}>
              {yAxisValues.map((value, index) => (
                <View key={index} style={{ position: 'absolute', top: (plotHeight / yAxisSteps) * index, right: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#666', textAlign: 'right' }}>
                    {Math.round(value)}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Grid lines */}
            {yAxisValues.map((_, index) => (
              <View 
                key={index}
                style={{ 
                  position: 'absolute', 
                  left: padding.left, 
                  top: padding.top + (plotHeight / yAxisSteps) * index,
                  width: plotWidth,
                  height: 1,
                  backgroundColor: '#E0E0E0'
                }} 
              />
            ))}
            
            {/* Border */}
            <View style={{ position: 'absolute', left: padding.left, top: padding.top, width: plotWidth, height: plotHeight, borderWidth: 1, borderColor: '#E0E0E0' }} />
            
            {/* Individual user lines and points */}
            {Array.from(sleepData.entries()).map(([userId, scores], userIndex) => {
              const color = colors[userIndex % colors.length];
              const isSelected = selectedUserId === userId;
              const hasSelection = selectedUserId !== null;
              
              const lineOpacity = hasSelection ? (isSelected ? 1 : 0.2) : 0.8;
              const pointOpacity = hasSelection ? (isSelected ? 1 : 0.2) : 1;
              
              return (
                <View key={userId}>
                  {/* Line segments */}
                  {scores.map((point, index) => {
                    if (index === 0) return null;
                    
                    const prevScore = normalizeScore(scores[index - 1].score);
                    const currentScore = normalizeScore(point.score);
                    
                    const x1 = getX(index - 1);
                    const y1 = getY(prevScore);
                    const x2 = getX(index);
                    const y2 = getY(currentScore);
                    
                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    
                    return (
                      <Pressable
                        key={`line-${index}`}
                        style={{
                          position: 'absolute',
                          left: x1,
                          top: y1,
                          width: length,
                          height: isSelected ? 3 : 2,
                          backgroundColor: color,
                          transform: [{ rotate: `${angle}deg` }],
                          transformOrigin: 'left center',
                          opacity: lineOpacity
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleUserSelect(userId);
                          setTooltip(null);
                        }}
                      />
                    );
                  })}
                  
                  {/* Data points - smaller size */}
                  {scores.map((point, index) => {
                    const normalizedScore = normalizeScore(point.score);
                    const x = getX(index);
                    const y = getY(normalizedScore);
                    
                    // Smaller point size: 8px (was 12px), selected: 10px
                    const pointSize = isSelected ? 7 : 5;
                    const pointOffset = pointSize / 2;
                    
                    return (
                      <Pressable
                        key={`point-${index}`}
                        style={{
                          position: 'absolute',
                          left: x - pointOffset,
                          top: y - pointOffset,
                          width: pointSize,
                          height: pointSize,
                          borderRadius: pointSize / 2,
                          backgroundColor: color,
                          borderWidth: 1.5,
                          borderColor: '#fff',
                          zIndex: isSelected ? 20 : 10,
                          opacity: pointOpacity
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePointClick('user', point.date, normalizedScore, x, y, userId);
                        }}
                      />
                    );
                  })}
                </View>
              );
            })}
            
            {/* Average Line */}
            <View>
              {/* Average line segments */}
              {dailyAverages.map((point, index) => {
                if (index === 0) return null;
                
                const prevAvg = dailyAverages[index - 1].average;
                const currentAvg = point.average;
                
                const x1 = getX(index - 1);
                const y1 = getY(prevAvg);
                const x2 = getX(index);
                const y2 = getY(currentAvg);
                
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                
                return (
                  <View
                    key={`avg-line-${index}`}
                    style={{
                      position: 'absolute',
                      left: x1,
                      top: y1,
                      width: length,
                      height: 2,
                      backgroundColor: averageLineColor,
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: 'left center',
                      zIndex: 5
                    }}
                  />
                );
              })}
              
              {/* Average data points - smaller size */}
              {dailyAverages.map((point, index) => {
                const x = getX(index);
                const y = getY(point.average);
                
                // Smaller average point: 10px (was 14px)
                const pointSize = 7;
                const pointOffset = pointSize / 2;
                
                return (
                  <Pressable
                    key={`avg-point-${index}`}
                    style={{
                      position: 'absolute',
                      left: x - pointOffset,
                      top: y - pointOffset,
                      width: pointSize,
                      height: pointSize,
                      borderRadius: pointSize / 2,
                      backgroundColor: averageLineColor,
                      borderWidth: 1.5,
                      borderColor: '#fff',
                      zIndex: 15
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePointClick('average', point.date, point.average, x, y);
                    }}
                  />
                );
              })}
            </View>
            
            {/* Tooltip */}
            {tooltip && (
              <View
                style={{
                  position: 'absolute',
                  left: Math.min(Math.max(tooltip.x - 75, 10), containerWidth - 160),
                  top: tooltip.y - 45,
                  backgroundColor: tooltip.type === 'average' ? averageLineColor : '#333',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  zIndex: 100,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 5,
                  minWidth: 150,
                  alignItems: 'center'
                }}
              >
                {tooltip.type === 'average' ? (
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    Average Sleep Score ({formatDate(tooltip.date)}): {tooltip.score}
                  </Text>
                ) : (
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {allUsers.find(u => u.id === tooltip.userId)?.displayName || tooltip.userId} ({formatDate(tooltip.date)}): {tooltip.score}
                  </Text>
                )}
                {/* Tooltip arrow */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    left: '50%',
                    marginLeft: -6,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 6,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: tooltip.type === 'average' ? averageLineColor : '#333',
                  }}
                />
              </View>
            )}
            
            {/* X-axis labels */}
            <View style={{ position: 'absolute', top: padding.top + plotHeight + 8, left: padding.left, width: plotWidth, flexDirection: 'row', justifyContent: 'space-between' }}>
              {dates.map((date, index) => (
                <Text 
                  key={index}
                  style={{ 
                    fontSize: 10, 
                    color: '#666',
                    textAlign: 'center',
                    position: 'absolute',
                    left: dates.length > 1 ? (plotWidth / (dates.length - 1)) * index - 15 : 0,
                    width: 30
                  }}
                >
                  {formatDate(date)}
                </Text>
              ))}
            </View>
          </Pressable>
          
          {/* Legend */}
          <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {/* Average legend item */}
            <View 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingVertical: 4,
                paddingHorizontal: 8,
                backgroundColor: '#FFF0F0',
                borderRadius: 4,
                borderWidth: 1,
                borderColor: averageLineColor
              }}
            >
              <View style={{ 
                width: 10, 
                height: 10, 
                borderRadius: 5, 
                backgroundColor: averageLineColor, 
                marginRight: 6 
              }} />
              <Text style={{ 
                fontSize: 11, 
                color: averageLineColor, 
                fontWeight: 'bold' 
              }}>
                Average
              </Text>
            </View>
            
            {/* Individual user legend items */}
            {Array.from(sleepData.keys()).map((userId, index) => {
              const user = allUsers.find(u => u.id === userId);
              const color = colors[index % colors.length];
              const isSelected = selectedUserId === userId;
              const hasSelection = selectedUserId !== null;
              
              return (
                <Pressable 
                  key={userId}
                  onPress={() => {
                    handleUserSelect(userId);
                    setTooltip(null);
                  }}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    opacity: hasSelection ? (isSelected ? 1 : 0.3) : 1,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: isSelected ? '#F0F0F0' : 'transparent',
                    borderRadius: 4
                  }}
                >
                  <View style={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: 5, 
                    backgroundColor: color, 
                    marginRight: 4 
                  }} />
                  <Text style={{ 
                    fontSize: 11, 
                    color: '#000', 
                    fontWeight: isSelected ? 'bold' : 'normal' 
                  }}>
                    {user?.displayName || userId}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const DailyStepsBarChart = ({ chartData }: { chartData: { name: string; steps: number }[] }) => {
  const maxSteps = Math.max(...chartData.map(d => d.steps), 1);
  const axisMax = maxSteps + 400;
  const yAxisSteps = 5;
  const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) => 
    Math.round((axisMax / yAxisSteps) * i)
  );
  
  return (
    <View style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#000' }}>
        Today's Steps by User
      </Text>
      <View style={{ flexDirection: 'row' }}>
        {/* Y-axis */}
        <View style={{ width: 50, justifyContent: 'space-between', height: 200, paddingRight: 8 }}>
          {yAxisValues.reverse().map((value, index) => (
            <Text key={index} style={{ fontSize: 10, color: '#666', textAlign: 'right' }}>
              {value.toLocaleString()}
            </Text>
          ))}
        </View>
        
        {/* Chart area */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#E0E0E0', paddingLeft: 8 }}>
            {chartData.map((item, index) => {
              const barHeight = (item.steps / axisMax) * 200;
              return (
                <View key={index} style={{ alignItems: 'center', flex: 1, marginHorizontal: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, color: '#000' }}>
                    {item.steps.toLocaleString()}
                  </Text>
                  <View 
                    style={{ 
                      width: '100%',
                      maxWidth: 40,
                      height: Math.max(barHeight, 5),
                      backgroundColor: '#4ECDC4',
                      borderRadius: 4,
                    }} 
                  />
                </View>
              );
            })}
          </View>
          
          {/* X-axis labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingLeft: 8 }}>
            {chartData.map((item, index) => (
              <Text 
                key={index}
                style={{ 
                  fontSize: 10, 
                  color: '#666',
                  textAlign: 'center',
                  flex: 1,
                  marginHorizontal: 4
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const MonthlyExercisesBarChart = ({ chartData }: { chartData: { name: string; value: number }[] }) => {
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const axisMax = maxValue + 5;
  
  return (
    <View style={{ padding: 16, backgroundColor: 'white', marginBottom: 20, borderRadius: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#000' }}>
        Monthly Exercises by User
      </Text>
      <View style={{ paddingLeft: 8 }}>
        {chartData.map((item, index) => {
          const barWidth = (item.value / axisMax) * 100;
          return (
            <View key={index} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* User name */}
                <Text 
                  style={{ 
                    fontSize: 12, 
                    color: '#000',
                    width: 100,
                    fontWeight: '500'
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                
                {/* Bar container */}
                <View style={{ flex: 1, height: 30, justifyContent: 'center', position: 'relative' }}>
                  {/* Background grid lines */}
                  <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', height: '100%' }}>
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <View 
                        key={percent}
                        style={{ 
                          position: 'absolute', 
                          left: `${percent}%`, 
                          height: '100%', 
                          width: 1, 
                          backgroundColor: '#E0E0E0' 
                        }} 
                      />
                    ))}
                  </View>
                  
                  {/* Actual bar */}
                  <View 
                    style={{ 
                      width: `${Math.max(barWidth, 2)}%`,
                      height: 24,
                      backgroundColor: '#FF6B35',
                      borderRadius: 4,
                      justifyContent: 'center',
                      paddingRight: 8,
                      zIndex: 1
                    }} 
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', textAlign: 'right' }}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        
        {/* X-axis scale */}
        <View style={{ flexDirection: 'row', marginTop: 8, marginLeft: 100 }}>
          {[0, Math.round(axisMax * 0.25), Math.round(axisMax * 0.5), Math.round(axisMax * 0.75), axisMax].map((value, index) => (
            <Text 
              key={index}
              style={{ 
                fontSize: 10, 
                color: '#666',
                flex: 1,
                textAlign: index === 0 ? 'left' : index === 4 ? 'right' : 'center'
              }}
            >
              {value}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  const { selectedUserIds, loading: studentsLoading, toggleUser } = useInstructorStudents(user?.uid);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [sleepScoreData, setSleepScoreData] = useState<Map<string, Array<{date: string, score: number | null}>>>(new Map());
  const [sleepDates, setSleepDates] = useState<string[]>([]);
  const [loadingSleepData, setLoadingSleepData] = useState(false);

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
      loadSleepData();
    }
  }, [selectedUserIds]);

  const loadSleepData = async () => {
    setLoadingSleepData(true);
    const { sleepData, dates } = await loadSleepScoreData();
    setSleepScoreData(sleepData);
    setSleepDates(dates);
    setLoadingSleepData(false);
  };

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
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
        const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const exercisesRef = collection(db, `users/${userId}/polarData/exercises/all`);

        const monthQuery = query(
          exercisesRef,
          where("__name__", ">=", monthStart),
          where("__name__", "<=", monthEnd),
          orderBy("__name__")
        );

        const exercisesSnapshot = await getDocs(monthQuery);

        let totalMonthExercises = 0;
        exercisesSnapshot.forEach(doc => {
          totalMonthExercises += doc.data()?.count || 0;
        });

        overview.totalMonthExercises = totalMonthExercises;

        overviews.set(userId, overview);
      } catch (error) {
        console.error(`Error loading overview for ${userId}:`, error);
      }
    }

    setUserOverviews(overviews);
    setLoadingOverviews(false);
  };

  const loadSleepScoreData = async () => {
    const sleepData: Map<string, Array<{date: string, score: number | null}>> = new Map();
    const dates: string[] = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    for (const userId of selectedUserIds) {
      const userScores: Array<{date: string, score: number | null}> = [];
      
      for (const date of dates) {
        try {
          const sleepDoc = await getDoc(
            doc(db, `users/${userId}/polarData/sleep/all/${date}`)
          );
          
          if (sleepDoc.exists()) {
            const score = sleepDoc.data()?.sleep_score;
            userScores.push({ date, score: score || null });
          } else {
            userScores.push({ date, score: null });
          }
        } catch (error) {
          console.error(`Error loading sleep score for ${userId} on ${date}:`, error);
          userScores.push({ date, score: null });
        }
      }
      
      sleepData.set(userId, userScores);
    }

    return { sleepData, dates };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const users = await loadAllUsers();
    await loadUserOverviews(users);
    await loadSleepData();
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
          <View style={styles.overviewsContainer}>
            {selectedUserIds.map(userId => {
              const overview = userOverviews.get(userId);
              const user = allUsers.find(u => u.id === userId);
              const displayName = user?.displayName || userId;

              return (
                <Pressable
                  key={userId}
                  style={styles.userCard}
                  onPress={() =>
                    router.push(`/instructor/user-detail?userId=${userId}`)
                  }
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
                      <Text style={styles.statLabel}>No. of Exercises (This month)</Text>
                      <Text style={styles.statValue}>
                        {overview?.totalMonthExercises || 0}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.viewDetails}>Tap to view details →</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}