import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '@/src/services/firebase';
import { collection, getDocs, doc, getDoc, query, where, documentId } from 'firebase/firestore';
import Colors from '@/constants/Colors';

interface SleepData {
  id: string; // using date as ID
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string; // ISO duration string usually
  sleepScore: number;
  continuity: number;
  completeness: number;
}

interface UserProfile {
  id: string;
  displayName: string;
}

export default function AllSleepScreen() {
  const params = useLocalSearchParams();
  const userIdsParam = params.userIds as string;
  const initialDateParam = params.initialDate as string;

  const [loading, setLoading] = useState(true);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = initialDateParam ? new Date(initialDateParam) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = initialDateParam ? new Date(initialDateParam) : new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'score-asc'>('date-desc');
  
  // UI State
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Define functions first to avoid hoisting issues
  const loadData = React.useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const ids = userIdsParam ? userIdsParam.split(',') : [];
      
      // 1. Fetch User Profiles
      const userProfiles: UserProfile[] = [];
      for (const id of ids) {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          userProfiles.push({
            id,
            displayName: userDoc.data().displayName || 'Unknown User'
          });
        } else {
            userProfiles.push({ id, displayName: 'Unknown User' });
        }
      }
      setUsers(userProfiles);

      // 2. Fetch Sleep Data
      const allSleep: SleepData[] = [];
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      for (const user of userProfiles) {
        // Query documents by ID range (dates)
        const q = query(
          collection(db, `users/${user.id}/polarData/sleep/all`),
          where(documentId(), '>=', startStr),
          where(documentId(), '<=', endStr)
        );

        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
          const data = doc.data();
          // Polar sleep data structure check
          // Assuming data contains fields like sleep_start_time, sleep_end_time, sleep_score, etc.
          
          allSleep.push({
            id: doc.id, // Date is the ID
            userId: user.id,
            userName: user.displayName,
            date: data.date,
            startTime: data.sleep_start_time,
            endTime: data.sleep_end_time,
            duration: data.total_sleep_time || data.duration, // Check field name
            sleepScore: data.sleep_score || 0,
            continuity: data.continuity || 0,
            completeness: data.completeness || 0,
          });
        });
      }

      setSleepData(allSleep);
    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      setLoading(false);
    }
  }, [userIdsParam]);

  // Reload data when date range changes
  useEffect(() => {
    loadData(startDate, endDate);
  }, [startDate, endDate, loadData]);

  // Re-apply filters when data or filter settings change
  const filteredSleep = useMemo(() => {
    let result = [...sleepData];

    // User Filter
    if (selectedUserId !== 'all') {
      result = result.filter(item => item.userId === selectedUserId);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      if (sortOrder === 'date-desc') {
          return dateB - dateA;
      } else if (sortOrder === 'date-asc') {
          return dateA - dateB;
      } else if (sortOrder === 'score-desc') {
          return b.sleepScore - a.sleepScore;
      } else if (sortOrder === 'score-asc') {
          return a.sleepScore - b.sleepScore;
      }
      return 0;
    });

    return result;
  }, [sleepData, selectedUserId, sortOrder]);

  const handleRefresh = () => {
    loadData(startDate, endDate);
  };

  const formatDuration = (isoDuration: string) => {
    if (!isoDuration) return '-';
    // Handle PT8H30M format
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (!match) return isoDuration;
    const h = match[1] ? `${match[1]}h ` : '';
    const m = match[2] ? `${match[2]}m` : '';
    return `${h}${m}`.trim() || '0m';
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 70) return '#FFC107'; // Amber
    return '#F44336'; // Red
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'All Sleep Data' }} />
      
      {/* Filters Header */}
      <View style={styles.filtersContainer}>
        <View style={styles.dateRow}>
            <Pressable onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
                <Text style={styles.dateLabel}>From: {startDate.toLocaleDateString()}</Text>
            </Pressable>
            <Ionicons name="arrow-forward" size={16} color="#666" />
            <Pressable onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
                <Text style={styles.dateLabel}>To: {endDate.toLocaleDateString()}</Text>
            </Pressable>
            <Pressable onPress={handleRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color="#FF6B35" />
            </Pressable>
        </View>

        <View style={styles.filterRow}>
            <Pressable onPress={() => setShowUserModal(true)} style={styles.filterButton}>
                <Ionicons name="person" size={16} color="#333" style={{ marginRight: 8 }} />
                <Text style={styles.filterText}>
                    {selectedUserId === 'all' ? 'All Users' : users.find(u => u.id === selectedUserId)?.displayName}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 'auto' }} />
            </Pressable>

            <Pressable onPress={() => setShowSortModal(true)} style={styles.filterButton}>
                <Ionicons name="filter" size={16} color="#333" style={{ marginRight: 8 }} />
                <Text style={styles.filterText}>
                    {sortOrder === 'date-desc' ? 'Newest First' : 
                     sortOrder === 'date-asc' ? 'Oldest First' :
                     sortOrder === 'score-desc' ? 'Highest Score' : 'Lowest Score'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 'auto' }} />
            </Pressable>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={{ marginTop: 10 }}>Loading sleep data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
            <Text style={styles.resultsCount}>{filteredSleep.length} records found</Text>
            
            {filteredSleep.map((item) => (
                <View key={`${item.userId}-${item.id}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    
                    <View style={styles.cardBody}>
                        <View style={styles.scoreRow}>
                            <View style={styles.scoreContainer}>
                                <Text style={styles.scoreLabel}>Sleep Score</Text>
                                <Text style={[styles.scoreValue, { color: getScoreColor(item.sleepScore) }]}>
                                    {item.sleepScore}
                                </Text>
                            </View>
                            <View style={styles.timeContainer}>
                                <Text style={styles.timeLabel}>Duration</Text>
                                <Text style={styles.timeValue}>{formatDuration(item.duration)}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Ionicons name="moon" size={14} color="#666" />
                                <Text style={styles.detailText}>{formatTime(item.startTime)} - {formatTime(item.endTime)}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Continuity: {item.continuity.toFixed(1)}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            ))}
            <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Date Pickers */}
      {(showStartDatePicker || showEndDatePicker) && (
        <DateTimePicker
          value={showStartDatePicker ? startDate : endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
            }
            if (date) {
                if (showStartDatePicker) setStartDate(date);
                else setEndDate(date);
            }
          }}
        />
      )}

      {/* User Selection Modal */}
      <Modal visible={showUserModal} transparent animationType="fade" onRequestClose={() => setShowUserModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUserModal(false)}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filter by User</Text>
                <Pressable 
                    style={[styles.modalOption, selectedUserId === 'all' && styles.selectedOption]}
                    onPress={() => { setSelectedUserId('all'); setShowUserModal(false); }}
                >
                    <Text style={selectedUserId === 'all' ? styles.selectedOptionText : styles.optionText}>All Users</Text>
                </Pressable>
                {users.map(u => (
                    <Pressable 
                        key={u.id}
                        style={[styles.modalOption, selectedUserId === u.id && styles.selectedOption]}
                        onPress={() => { setSelectedUserId(u.id); setShowUserModal(false); }}
                    >
                        <Text style={selectedUserId === u.id ? styles.selectedOptionText : styles.optionText}>{u.displayName}</Text>
                    </Pressable>
                ))}
            </View>
        </Pressable>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Sort By</Text>
                {[
                    { label: 'Date (Newest First)', value: 'date-desc' },
                    { label: 'Date (Oldest First)', value: 'date-asc' },
                    { label: 'Sleep Score (High to Low)', value: 'score-desc' },
                    { label: 'Sleep Score (Low to High)', value: 'score-asc' },
                ].map((opt) => (
                    <Pressable 
                        key={opt.value}
                        style={[styles.modalOption, sortOrder === opt.value && styles.selectedOption]}
                        onPress={() => { setSortOrder(opt.value as any); setShowSortModal(false); }}
                    >
                        <Text style={sortOrder === opt.value ? styles.selectedOptionText : styles.optionText}>{opt.label}</Text>
                    </Pressable>
                ))}
            </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'right',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  cardBody: {
    gap: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#555',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '80%',
    borderRadius: 12,
    padding: 16,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#fff5f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
});
