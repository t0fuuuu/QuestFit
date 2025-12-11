import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/hooks/useAuth';
import { useInstructor } from '@/src/hooks/useInstructor';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/src/services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { StudentCard, StudentStats, ChartType } from '@/components/instr-dashboard/StudentCard';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { isInstructor, loading: instructorLoading } = useInstructor(user?.uid);
  
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering & Selection State
  const [daysToFetch, setDaysToFetch] = useState<7 | 14 | 30>(7);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Chart Configuration State
  const [chartConfig, setChartConfig] = useState<Record<'hr' | 'distance' | 'sleep' | 'calories', ChartType>>({
    hr: 'line',
    distance: 'bar',
    sleep: 'line',
    calories: 'area'
  });

  // Load saved selection and settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedSelection = await AsyncStorage.getItem('instructor_selected_cadets');
        if (savedSelection) {
          setSelectedIds(new Set(JSON.parse(savedSelection)));
        }
        
        const savedConfig = await AsyncStorage.getItem('instructor_chart_config');
        if (savedConfig) {
          setChartConfig(JSON.parse(savedConfig));
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };
    loadData();
  }, []);

  // Save selection whenever it changes
  useEffect(() => {
    const saveSelection = async () => {
      try {
        await AsyncStorage.setItem('instructor_selected_cadets', JSON.stringify(Array.from(selectedIds)));
      } catch (e) {
        console.error('Failed to save selection', e);
      }
    };
    saveSelection();
  }, [selectedIds]);

  // Save chart config whenever it changes
  useEffect(() => {
    const saveConfig = async () => {
      try {
        await AsyncStorage.setItem('instructor_chart_config', JSON.stringify(chartConfig));
      } catch (e) {
        console.error('Failed to save chart config', e);
      }
    };
    saveConfig();
  }, [chartConfig]);

  const fetchStudentsData = useCallback(async (days = daysToFetch) => {
    try {
      // 1. Fetch all users (In a real app, you might filter by class/instructor)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      const studentsData = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
        try {
          const userData = userDoc.data();
          const userId = userDoc.id;

          // 2. Fetch recent exercises
          const hrHistory: number[] = [];
          const distanceHistory: number[] = [];
          const caloriesHistory: number[] = [];
          const sleepHistory: number[] = []; // Placeholder for now
          
          let lastActive = 'N/A';
          
          const today = new Date();
          const datesToCheck = [];
          // Fetch X days for the charts
          for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            datesToCheck.push(d.toISOString().split('T')[0]);
          }

          const exercisesDocs = await Promise.all(datesToCheck.map(date => 
            getDoc(doc(db, `users/${userId}/polarData/exercises/all/${date}`))
          ));

          exercisesDocs.forEach((docSnap) => {
            if (docSnap.exists()) {
              if (lastActive === 'N/A') lastActive = docSnap.id;
              const data = docSnap.data();
              
              if (data.exercises && Array.isArray(data.exercises)) {
                // Calculate daily totals/averages
                let dayHrSum = 0;
                let dayHrCount = 0;
                let dayDist = 0;
                let dayCals = 0;

                data.exercises.forEach((ex: any) => {
                  if (ex.heart_rate?.average) {
                    dayHrSum += ex.heart_rate.average;
                    dayHrCount++;
                  }
                  if (ex.distance) dayDist += ex.distance;
                  if (ex.calories) dayCals += ex.calories;
                });
                
                hrHistory.push(dayHrCount > 0 ? Math.round(dayHrSum / dayHrCount) : 0);
                distanceHistory.push(Math.round(dayDist));
                caloriesHistory.push(Math.round(dayCals));
              } else {
                hrHistory.push(0);
                distanceHistory.push(0);
                caloriesHistory.push(0);
              }
            } else {
              hrHistory.push(0);
              distanceHistory.push(0);
              caloriesHistory.push(0);
            }
            // Sleep placeholder
            sleepHistory.push(0);
          });

          // Reverse to get chronological order (Oldest -> Newest)
          hrHistory.reverse();
          distanceHistory.reverse();
          caloriesHistory.reverse();
          sleepHistory.reverse();
          
          // Generate labels (MM/DD)
          const labels = datesToCheck.reverse().map(dateStr => {
            const [y, m, d] = dateStr.split('-');
            return `${parseInt(m)}/${parseInt(d)}`;
          });
          
          // Calculate Averages (ignoring 0s for HR, but maybe keeping them for others? 
          // Usually average daily steps/cals includes rest days as 0 or low, but let's exclude 0 for "active" stats if preferred.
          // For now, let's exclude 0s for HR, include 0s for others or exclude? 
          // Let's exclude 0s to show "Active Day Average")
          
          const validHrs = hrHistory.filter(v => v > 0);
          const avgHr = validHrs.length > 0 ? Math.round(validHrs.reduce((a, b) => a + b, 0) / validHrs.length) : 0;

          const validDist = distanceHistory.filter(v => v > 0);
          const avgDistance = validDist.length > 0 ? Math.round(validDist.reduce((a, b) => a + b, 0) / validDist.length) : 0;

          const validCals = caloriesHistory.filter(v => v > 0);
          const avgCalories = validCals.length > 0 ? Math.round(validCals.reduce((a, b) => a + b, 0) / validCals.length) : 0;

          // Determine trend based on Calories (or HR?) - Let's use Calories as "Effort"
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (validCals.length >= 2) {
            const recent = validCals[validCals.length - 1];
            const previous = validCals[validCals.length - 2];
            if (recent > previous + 50) trend = 'up';
            else if (recent < previous - 50) trend = 'down';
          }

          return {
            id: userId,
            displayName: userData.displayName || 'Unknown Cadet',
            photoURL: userData.photoURL,
            lastActive,
            hrHistory,
            distanceHistory,
            sleepHistory,
            caloriesHistory,
            labels,
            avgHr,
            avgDistance,
            avgSleep: 0, // Placeholder
            avgCalories,
            trend
          } as StudentStats;
        } catch (err) {
          console.warn(`Failed to fetch data for user ${userDoc.id}`, err);
          return null;
        }
      }));

      setStudents(studentsData.filter((s): s is StudentStats => s !== null));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isInstructor) {
      fetchStudentsData(daysToFetch);
    }
  }, [isInstructor, fetchStudentsData, daysToFetch]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentsData(daysToFetch);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    // If in selection mode and we have selections, maybe we want to filter?
    // For now, let's just show all and let the user select.
    // Or if the user wants to "view selected", we can add a toggle for that.
    return matchesSearch;
  });

  // Main view shows ONLY selected students (or all if none selected? No, user wants to choose)
  // If no selection, show empty state prompting to select.
  const displayedStudents = students.filter(s => selectedIds.has(s.id));

  if (instructorLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!isInstructor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Denied</Text>
        <Text>You must be an instructor to view this page.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Instructor Dashboard</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setSettingsVisible(true)}
            >
              <Ionicons name="settings-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.selectButtonText}>Manage Cadets</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.subtitle}>{students.length} Cadets Enrolled</Text>
        
        {/* Date Range Selector */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Range:</Text>
          <View style={styles.rangeButtons}>
            {[7, 14, 30].map((days) => (
              <TouchableOpacity 
                key={days} 
                style={[styles.rangeButton, daysToFetch === days && styles.rangeButtonActive]}
                onPress={() => setDaysToFetch(days as 7 | 14 | 30)}
              >
                <Text style={[styles.rangeButtonText, daysToFetch === days && styles.rangeButtonTextActive]}>
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Only show search if we have items to search */}
        {displayedStudents.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tracked cadets..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        )}
      </View>

      <FlatList
        data={displayedStudents.filter(s => s.displayName.toLowerCase().includes(searchQuery.toLowerCase()))}
        renderItem={({ item }) => (
          <StudentCard 
            item={item} 
            isSelectionMode={false}
            chartConfig={chartConfig}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No cadets being tracked.</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Select Cadets to View</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Cadets</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={students}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem} 
                  onPress={() => toggleSelection(item.id)}
                >
                  <View style={[styles.checkbox, selectedIds.has(item.id) && styles.checkboxSelected]}>
                    {selectedIds.has(item.id) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                  <Text style={styles.modalItemText}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chart Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsContent}>
              <Text style={styles.sectionTitle}>Customize Graphs</Text>
              
              {Object.entries(chartConfig).map(([metric, type]) => (
                <View key={metric} style={styles.settingRow}>
                  <Text style={styles.settingLabel}>
                    {metric === 'hr' ? 'Heart Rate' : 
                     metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Text>
                  <View style={styles.typeSelector}>
                    {(['line', 'bar', 'area', 'scatter'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeOption,
                          type === t && styles.typeOptionSelected
                        ]}
                        onPress={() => setChartConfig(prev => ({ ...prev, [metric]: t }))}
                      >
                        <Text style={[
                          styles.typeOptionText,
                          type === t && styles.typeOptionTextSelected
                        ]}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  selectButtonActive: {
    backgroundColor: '#FF6B35',
  },
  selectButtonText: {
    color: '#636E72',
    fontWeight: '600',
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#636E72',
    marginRight: 12,
  },
  rangeButtons: {
    flexDirection: 'row',
  },
  rangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  rangeButtonActive: {
    backgroundColor: '#2D3436',
  },
  rangeButtonText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
  },
  selectionText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    marginRight: 8,
  },
  selectionHint: {
    color: '#FF6B35',
    fontSize: 12,
  },
  clearButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#636E72',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  modalItemText: {
    fontSize: 16,
    color: '#2D3436',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
  },
  settingsContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
});
